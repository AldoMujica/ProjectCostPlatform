const express = require('express');
const { Op } = require('sequelize');
const { WorkOrder, MaterialCost, LaborCost, sequelize } = require('../models');
const { sendTableXlsx } = require('../utils/xlsxTable');

const router = express.Router();

// G-PRON-3 — Variance + semáforo rules, codified once here so the FE, the
// XLSX export, and any future acceptance test read the same thresholds.
//
//   real = 0     + status is active  →  "En ejecución"  (blue)
//   real = 0     + status inactive    →  "Sin iniciar"   (neutral)
//   real ≤ 70 % cot                   →  "OK"            (green)
//   70 % < real ≤ 100 % cot           →  "Atención"      (amber)
//   real > cot                        →  "Crítico"       (red)
//
// Thresholds are a pragmatic default pending client signoff; swap the
// constants below when operations confirm their preferred bands.
const SEMAFORO_OK_MAX       = 0.70;
const SEMAFORO_ATENCION_MAX = 1.00;

const ACTIVE_STATUSES = new Set(['En ejecución', 'En revisión']);

function classify({ quotedCost, actualCost, status }) {
  const cot = Number(quotedCost) || 0;
  const real = Number(actualCost) || 0;
  if (real === 0) {
    if (ACTIVE_STATUSES.has(status)) return { semaforo: 'En ejecución', color: 'blue' };
    return { semaforo: 'Sin iniciar', color: 'neutral' };
  }
  if (cot === 0) return { semaforo: 'Sin cotización', color: 'neutral' };
  const ratio = real / cot;
  if (ratio <= SEMAFORO_OK_MAX)       return { semaforo: 'OK',       color: 'green' };
  if (ratio <= SEMAFORO_ATENCION_MAX) return { semaforo: 'Atención', color: 'amber' };
  return { semaforo: 'Crítico', color: 'red' };
}

function varianceLabel({ quotedCost, actualCost }) {
  const cot = Number(quotedCost) || 0;
  const real = Number(actualCost) || 0;
  if (real === 0) return { varianza: null, label: 'Sin iniciar' };
  if (cot === 0)  return { varianza: null, label: 'Sin cotización' };
  const pct = (real - cot) / cot * 100;
  const sign = pct > 0 ? '+' : (pct < 0 ? '−' : '');
  const rounded = Math.abs(pct).toFixed(0);
  const label = pct > 0
    ? `${sign}${rounded}% sobre presup.`
    : (pct < 0 ? `${sign}${rounded}% bajo presup.` : 'En rango');
  return { varianza: Number(pct.toFixed(2)), label };
}

// Sum material + labor cost for all active OTs in a single round-trip.
// Currency-normalized to USD using each WO's exchangeRate when currency=MXN;
// rows without an exchangeRate are kept in their native currency so the FE
// can show both values side-by-side.
async function fetchRollup({ year } = {}) {
  const where = {};
  if (year) {
    where.createdAt = {
      [Op.gte]: new Date(`${year}-01-01`),
      [Op.lt]:  new Date(`${year + 1}-01-01`),
    };
  }

  const workOrders = await WorkOrder.findAll({ where, order: [['createdAt', 'DESC']], raw: true });
  if (workOrders.length === 0) return { rows: [], kpi: emptyKpi() };

  const woIds = workOrders.map((w) => w.id);

  const [matSums, labSums] = await Promise.all([
    MaterialCost.findAll({
      attributes: [
        'workOrderId',
        'currency',
        [sequelize.fn('SUM', sequelize.col('total_cost')), 'total'],
      ],
      where: { workOrderId: woIds },
      group: ['workOrderId', 'currency'],
      raw: true,
    }),
    LaborCost.findAll({
      attributes: [
        'workOrderId',
        'currency',
        [sequelize.fn('SUM', sequelize.col('total_cost')), 'total'],
        [sequelize.fn('SUM', sequelize.col('hours_worked')), 'hours'],
      ],
      where: { workOrderId: woIds },
      group: ['workOrderId', 'currency'],
      raw: true,
    }),
  ]);

  // Aggregate per-WO, splitting MXN/USD so we can normalize without
  // double-counting.
  const perWo = new Map();
  for (const wo of workOrders) perWo.set(wo.id, { mat: { MXN: 0, USD: 0 }, lab: { MXN: 0, USD: 0 }, hours: 0 });
  for (const r of matSums) {
    const bucket = perWo.get(r.workOrderId);
    if (!bucket) continue;
    const cur = (r.currency || 'MXN').toUpperCase();
    if (cur === 'USD') bucket.mat.USD += Number(r.total) || 0;
    else               bucket.mat.MXN += Number(r.total) || 0;
  }
  for (const r of labSums) {
    const bucket = perWo.get(r.workOrderId);
    if (!bucket) continue;
    const cur = (r.currency || 'MXN').toUpperCase();
    if (cur === 'USD') bucket.lab.USD += Number(r.total) || 0;
    else               bucket.lab.MXN += Number(r.total) || 0;
    bucket.hours += Number(r.hours) || 0;
  }

  const rows = workOrders.map((wo) => {
    const agg = perWo.get(wo.id);
    const fx  = Number(wo.exchange_rate) || Number(wo.exchangeRate) || 0;
    const quotedCurrency = (wo.currency || 'USD').toUpperCase();
    const quotedCost = Number(wo.quoted_cost) || Number(wo.quotedCost) || 0;

    // Per-OT costed-to-date, expressed both in the OT's quoted currency
    // (comparable against `quotedCost`) and in both raw buckets so ops
    // can see the split without recomputing.
    const realMxn = agg.mat.MXN + agg.lab.MXN;
    const realUsd = agg.mat.USD + agg.lab.USD;
    // Normalize real → quoted currency.
    let actualCost;
    if (quotedCurrency === 'USD') {
      actualCost = realUsd + (fx > 0 ? realMxn / fx : 0);
    } else {
      actualCost = realMxn + (fx > 0 ? realUsd * fx : 0);
    }

    const quotedCostMxn = quotedCurrency === 'USD' && fx > 0 ? quotedCost * fx : (quotedCurrency === 'MXN' ? quotedCost : null);

    const status = wo.status;
    const { semaforo, color } = classify({ quotedCost, actualCost, status });
    const { varianza, label: varianzaLabel } = varianceLabel({ quotedCost, actualCost });

    return {
      otId: wo.id,
      otNumber: wo.ot_number || wo.otNumber,
      client: wo.client,
      description: wo.description,
      status,
      progress: Number(wo.progress) || 0,
      quotedCost,
      quotedCurrency,
      quotedCostMxn,
      exchangeRate: fx || null,
      actualCost: Number(actualCost.toFixed(2)),
      actualCostNative: { MXN: Number(realMxn.toFixed(2)), USD: Number(realUsd.toFixed(2)) },
      hoursWorked: Number(agg.hours.toFixed(2)),
      varianza,
      varianzaLabel,
      semaforo,
      semaforoColor: color,
    };
  });

  return { rows, kpi: kpiFromRows(rows) };
}

function emptyKpi() {
  return {
    totalQuotedUsd: 0, totalActualUsd: 0,
    avgVariancePct: null, alertCount: 0, activeCount: 0, otCount: 0,
  };
}

// Aggregate KPIs (USD-normalized). OTs without an FX are folded at their
// native currency — USD quotes stay, MXN without FX are dropped from the
// USD sum (and counted via `missingFxCount`) so the number is honest.
function kpiFromRows(rows) {
  let totalQuotedUsd = 0;
  let totalActualUsd = 0;
  let variancesSum = 0;
  let variancesCount = 0;
  let alertCount = 0;
  let activeCount = 0;
  let missingFxCount = 0;

  for (const r of rows) {
    if (r.quotedCurrency === 'USD') {
      totalQuotedUsd += r.quotedCost;
      totalActualUsd += r.actualCost;
    } else if (r.exchangeRate && r.exchangeRate > 0) {
      totalQuotedUsd += r.quotedCost / r.exchangeRate;
      totalActualUsd += r.actualCost / r.exchangeRate;
    } else {
      missingFxCount += 1;
    }
    if (r.varianza != null) { variancesSum += r.varianza; variancesCount += 1; }
    if (r.semaforo === 'Atención' || r.semaforo === 'Crítico') alertCount += 1;
    if (ACTIVE_STATUSES.has(r.status)) activeCount += 1;
  }
  return {
    totalQuotedUsd: Number(totalQuotedUsd.toFixed(2)),
    totalActualUsd: Number(totalActualUsd.toFixed(2)),
    avgVariancePct: variancesCount ? Number((variancesSum / variancesCount).toFixed(2)) : null,
    alertCount,
    activeCount,
    otCount: rows.length,
    missingFxCount,
  };
}

router.get('/', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : null;
    const data = await fetchRollup({ year });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : null;
    const { rows } = await fetchRollup({ year });
    await sendTableXlsx(res, {
      filename: `pronostico-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Pronóstico',
      columns: [
        { header: 'No. OT',        key: 'otNumber',       width: 16 },
        { header: 'Cliente',       key: 'client',         width: 24 },
        { header: 'Descripción',   key: 'description',    width: 42 },
        { header: 'Estado',        key: 'status',         width: 14 },
        { header: 'Avance (%)',    key: 'progress',       width: 10 },
        { header: 'Cotizado',      key: 'quotedCost',     width: 14, fmt: (v) => Number(v) },
        { header: 'Moneda',        key: 'quotedCurrency', width: 10 },
        { header: 'T/C',           key: 'exchangeRate',   width: 10, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Cotizado (MXN)',key: 'quotedCostMxn',  width: 16, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Real',          key: 'actualCost',     width: 14, fmt: (v) => Number(v) },
        { header: 'Horas reales',  key: 'hoursWorked',    width: 12, fmt: (v) => Number(v) },
        { header: 'Varianza (%)',  key: 'varianza',       width: 12, fmt: (v) => (v == null ? '' : Number(v)) },
        { header: 'Varianza',      key: 'varianzaLabel',  width: 22 },
        { header: 'Semáforo',      key: 'semaforo',       width: 14 },
      ],
      rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
