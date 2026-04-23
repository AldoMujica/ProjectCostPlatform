const express = require('express');
const { WorkOrderApproval, WorkOrder, User } = require('../models');
const { verificarRol } = require('../middleware/auth');
const configService = require('../services/configService');

const router = express.Router();

// Phase-5b — step order and per-step role gating come from `system_config`
// at request time so admins can tune the flujo de liberación without a
// code change. Fallbacks below are the original Phase-3 defaults, used
// if the config keys are missing (fresh DB before seed ran).
const DEFAULT_STEPS = ['cotizacion', 'compras', 'produccion', 'calidad', 'liberacion_final'];
const DEFAULT_ROLES = {
  cotizacion:       ['admin', 'ventas', 'jefe_area'],
  compras:          ['admin', 'compras', 'jefe_area'],
  produccion:       ['admin', 'jefe_area', 'supervisor'],
  calidad:          ['admin', 'jefe_area'],
  liberacion_final: ['admin', 'jefe_area'],
};

async function getSteps() {
  const steps = await configService.get('approval.steps', DEFAULT_STEPS);
  return Array.isArray(steps) && steps.length > 0 ? steps : DEFAULT_STEPS;
}

async function getRolesForStep(step) {
  const roles = await configService.get(`approval.roles.${step}`, DEFAULT_ROLES[step] || ['admin']);
  return Array.isArray(roles) && roles.length > 0 ? roles : (DEFAULT_ROLES[step] || ['admin']);
}

// List approvals for one OT. Auto-creates the pending rows the first time
// an OT is inspected so the UI can render the flow without pre-seeding.
// Step list comes from `approval.steps` in system_config.
router.get('/:workOrderId', async (req, res) => {
  try {
    const wo = await WorkOrder.findByPk(req.params.workOrderId);
    if (!wo) return res.status(404).json({ error: 'OT no encontrada' });
    const steps = await getSteps();
    let rows = await WorkOrderApproval.findAll({
      where: { workOrderId: wo.id },
      include: [{ model: User, as: 'decidedByUser', attributes: ['id', 'nombre', 'rol'] }],
      order: [['createdAt', 'ASC']],
    });
    if (rows.length === 0) {
      await WorkOrderApproval.bulkCreate(steps.map((step) => ({ workOrderId: wo.id, step })));
      rows = await WorkOrderApproval.findAll({
        where: { workOrderId: wo.id },
        include: [{ model: User, as: 'decidedByUser', attributes: ['id', 'nombre', 'rol'] }],
        order: [['createdAt', 'ASC']],
      });
    }
    // Return in canonical (configured) step order; rows for steps no longer
    // in the config list get pushed to the end.
    rows.sort((a, b) => {
      const ia = steps.indexOf(a.step); const ib = steps.indexOf(b.step);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transition a step. Role gating and step ordering both read from config
// at request time — admins can edit them without touching code.
router.post('/:id/transition', async (req, res) => {
  try {
    const row = await WorkOrderApproval.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Paso no encontrado' });
    const { status, comments } = req.body;
    if (!['aprobada', 'rechazada', 'pendiente'].includes(status)) {
      return res.status(400).json({ error: 'status debe ser pendiente, aprobada o rechazada' });
    }
    const [allowed, steps] = await Promise.all([getRolesForStep(row.step), getSteps()]);
    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({ error: `Rol ${req.user.rol} no puede decidir el paso ${row.step}. Roles permitidos: ${allowed.join(', ')}` });
    }
    if (status === 'aprobada') {
      const earlier = await WorkOrderApproval.findAll({ where: { workOrderId: row.workOrderId } });
      const idx = steps.indexOf(row.step);
      for (const r of earlier) {
        const rIdx = steps.indexOf(r.step);
        if (rIdx !== -1 && idx !== -1 && rIdx < idx && r.status !== 'aprobada') {
          return res.status(400).json({ error: `Paso previo "${r.step}" aún no está aprobado` });
        }
      }
    }
    await row.update({
      status,
      decidedBy: req.user.id,
      decidedAt: new Date(),
      comments: comments || row.comments,
    });
    // When the final liberation step is approved, flip the OT to Liberada.
    // The "final step" is the last entry in `approval.steps` from config.
    const finalStep = steps[steps.length - 1];
    if (row.step === finalStep && status === 'aprobada') {
      await WorkOrder.update({ status: 'Liberada' }, { where: { id: row.workOrderId } });
    }
    res.json(row);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin-only reset for a whole OT's approvals (useful for demos / restart).
router.delete('/:workOrderId/reset', verificarRol('admin'), async (req, res) => {
  try {
    await WorkOrderApproval.destroy({ where: { workOrderId: req.params.workOrderId } });
    res.json({ message: 'Flujo reiniciado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
