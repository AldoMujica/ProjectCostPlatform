// Taxonomía A–M de actividades de labor directa. Compartida entre la
// validación de `quotes.labor_breakdown` (cotizado) y la agregación del
// rollup `GET /api/work-orders/:id/costo-mo` (real).
//
// Cambiar esta lista requiere actualizar también el modal del frontend
// (alenstec_app.html, Costo MO) que muestra las mismas 13 filas.

const ACTIVITIES = [
  { code: 'A', label: 'Levantamiento, Ing. y Diseño' },
  { code: 'B', label: 'Corte' },
  { code: 'C', label: 'Fabricación (Soldadura)' },
  { code: 'D', label: 'Otros (Pavonado, Pintura, Temple)' },
  { code: 'E', label: 'Maquinado' },
  { code: 'F', label: 'Hiloerosión' },
  { code: 'G', label: 'Ensamble' },
  { code: 'H', label: 'Labor Eléctrica' },
  { code: 'I', label: 'Automatización' },
  { code: 'J', label: 'Shopper / Picer' },
  { code: 'K', label: 'Certificación Dimensional' },
  { code: 'L', label: 'Empaque y Embalaje' },
  { code: 'M', label: 'Instalación en Campo' },
];

const VALID_CODES = new Set(ACTIVITIES.map((a) => a.code));
const LABEL_BY_CODE = new Map(ACTIVITIES.map((a) => [a.code, a.label]));

function isValidCode(code) {
  return typeof code === 'string' && VALID_CODES.has(code);
}

// Normaliza el array recibido del cliente al guardar labor_breakdown.
// Acepta [{ code, hours, rate }] — descarta filas inválidas y coacciona
// numéricos. Devuelve siempre las 13 filas en orden A–M.
function normalizeBreakdown(input) {
  const byCode = new Map();
  if (Array.isArray(input)) {
    for (const row of input) {
      if (!row || !isValidCode(row.code)) continue;
      const hours = Number(row.hours);
      const rate  = Number(row.rate);
      byCode.set(row.code, {
        code:  row.code,
        label: LABEL_BY_CODE.get(row.code),
        hours: Number.isFinite(hours) ? hours : 0,
        rate:  Number.isFinite(rate)  ? rate  : 0,
      });
    }
  }
  return ACTIVITIES.map((a) => byCode.get(a.code) || {
    code: a.code, label: a.label, hours: 0, rate: 0,
  });
}

module.exports = {
  ACTIVITIES,
  VALID_CODES,
  LABEL_BY_CODE,
  isValidCode,
  normalizeBreakdown,
};
