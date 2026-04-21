-- Audit trail for conciliación actions (checador import, forzado, cierre, etc.).
-- parserChecadorService.importarRegistrosABD and related flows write to this
-- table; originally omitted from 20260420-0003-asistencia-conciliacion.sql.
CREATE TABLE IF NOT EXISTS auditoria_conciliacion (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(50) NOT NULL,
  semana_id INTEGER REFERENCES semanas_nomina(id) ON DELETE CASCADE,
  detalles JSONB,
  fecha_accion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_conciliacion_semana
  ON auditoria_conciliacion(semana_id, fecha_accion DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_conciliacion_usuario
  ON auditoria_conciliacion(usuario_id, fecha_accion DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_conciliacion_accion
  ON auditoria_conciliacion(accion);
