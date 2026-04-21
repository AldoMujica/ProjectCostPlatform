const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const pool = require('../db/config');
const { verificarJWT, verificarRol } = require('../middleware/auth');
const {
  conciliarEmpleadoDia,
  conciliarSemana,
  generarAlertas,
  registrarJustificacion,
  forzarConciliacion,
  verificarReadinessParaCerrar
} = require('../services/conciliacionService');
const {
  parseChecador,
  importarRegistrosABD
} = require('../services/parserChecadorService');
const { ExcelExporter } = require('../utils/excelExporter');

const router = express.Router();

// Configurar multer para uploads
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `checador_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se aceptan archivos CSV o XLSX'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ==================== CARGA DEL CHECADOR ====================

/**
 * POST /api/conciliacion/checador/preview
 * Preview de registros antes de importar
 */
router.post('/checador/preview', verificarJWT, upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se envió archivo' });
    }

    const resultado = await parseChecador(req.file.path);

    // Mantener el archivo temporalmente para importar después
    res.json({
      exitoso: true,
      preview: {
        total_leidos: resultado.totalLeidos,
        total_validos: resultado.totalValidos,
        total_errores: resultado.totalErrores,
        registros: resultado.registros.slice(0, 20), // Primeros 20 registros
        errores: resultado.errores.slice(0, 10) // Primeros 10 errores
      },
      temp_file: req.file.path
    });

    // Limpiar archivo después de 30 minutos
    setTimeout(() => {
      fs.unlink(req.file.path, () => {});
    }, 30 * 60 * 1000);
  } catch (error) {
    res.status(400).json({ error: error.message });
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

/**
 * POST /api/conciliacion/checador/importar
 * Confirmar importación de registros
 */
router.post('/checador/importar', verificarJWT, async (req, res) => {
  try {
    const { temp_file, semana_id } = req.body;
    const usuario_id = req.user.id;

    if (!temp_file || !semana_id) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // Verificar que el archivo existe
    if (!fs.existsSync(temp_file)) {
      return res.status(400).json({ error: 'Archivo temporal no encontrado' });
    }

    // Parsear el archivo
    const resultado = await parseChecador(temp_file);

    // Importar a BD
    const importResult = await importarRegistrosABD(resultado.registros, semana_id, usuario_id);

    // Limpiar archivo
    fs.unlink(temp_file, () => {});

    // Trigger conciliación automática después de importar
    const conciliacionResult = await conciliarSemana(semana_id);

    res.json({
      exitoso: true,
      importacion: importResult,
      conciliacion: {
        total_empleados: conciliacionResult.total_empleados,
        con_conflictos: conciliacionResult.resumen_por_empleado.filter(e => e.estado === 'conflicto').length,
        con_alertas: conciliacionResult.resumen_por_empleado.filter(e => e.estado === 'alerta').length
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== VISTA DE CONCILIACIÓN SEMANAL ====================

/**
 * GET /api/conciliacion/:semana_id
 * Vista semanal con resumen de todos los empleados
 */
router.get('/:semana_id', verificarJWT, async (req, res) => {
  try {
    const { semana_id } = req.params;
    const { area, supervisor, estado } = req.query;
    const usuario_id = req.user.id;
    const usuario_rol = req.user.rol;

    // Build param list + optional supervisor/area clauses inside the CTE.
    // The estado filter is applied via a FILTER clause on the outer json_agg
    // because it depends on cd_resume rollup, not raw empleado columns.
    const params = [semana_id];
    let supervisorClause = '';
    if (usuario_rol === 'supervisor') {
      params.push(usuario_id);
      supervisorClause = `AND e.supervisor_id = $${params.length}`;
    }
    let areaClause = '';
    if (area) {
      params.push(area);
      areaClause = `AND e.area = $${params.length}`;
    }
    let estadoFilter = '';
    if (estado && ['ok', 'alerta', 'conflicto'].includes(estado)) {
      params.push(estado);
      estadoFilter = `AND COALESCE(cdr.estado_general, 'pendiente') = $${params.length}`;
    }

    // Per-employee aggregates live in a CTE so the outer json_agg isn't
    // nested inside SUM/COUNT — Postgres rejects that ("no se pueden
    // anidar llamadas a funciones de agregación").
    const query = `
      WITH stats AS (
        SELECT
          e.id AS empleado_id,
          e.numero_lista,
          e.nombre,
          e.turno,
          e.area,
          e.supervisor_id,
          COALESCE(SUM(rc.horas_real), 0)::numeric AS total_horas_checador,
          COALESCE(SUM(hc.horas), 0)::numeric      AS total_horas_clasificadas,
          COUNT(DISTINCT i.id)                     AS incidencias
        FROM empleados e
        LEFT JOIN registros_checador  rc ON rc.empleado_id = e.id AND rc.semana_id = $1
        LEFT JOIN horas_clasificadas  hc ON hc.empleado_id = e.id AND hc.semana_id = $1
        LEFT JOIN incidencias          i ON  i.empleado_id = e.id AND  i.semana_id = $1
        WHERE e.activo = TRUE
          ${supervisorClause}
          ${areaClause}
        GROUP BY e.id
      ),
      cd_resume AS (
        SELECT
          empleado_id,
          CASE
            WHEN COUNT(CASE WHEN estado = 'ok' THEN 1 END) = COUNT(*)         THEN 'ok'
            WHEN COUNT(CASE WHEN estado = 'conflicto' THEN 1 END) > 0         THEN 'conflicto'
            WHEN COUNT(CASE WHEN estado = 'alerta' THEN 1 END) > 0            THEN 'alerta'
            ELSE 'pendiente'
          END AS estado_general,
          COUNT(CASE WHEN estado = 'ok'        THEN 1 END) AS dias_ok,
          COUNT(CASE WHEN estado = 'alerta'    THEN 1 END) AS dias_alerta,
          COUNT(CASE WHEN estado = 'conflicto' THEN 1 END) AS dias_conflicto
        FROM conciliacion_detalle
        WHERE semana_id = $1
        GROUP BY empleado_id
      )
      SELECT
        sn.id          AS semana_id,
        sn.fecha_inicio,
        sn.fecha_fin,
        sn.descripcion,
        sn.cerrada,
        COALESCE(
          json_agg(
            json_build_object(
              'empleado_id',               s.empleado_id,
              'numero_lista',              s.numero_lista,
              'nombre',                    s.nombre,
              'turno',                     s.turno,
              'area',                      s.area,
              'supervisor_id',             s.supervisor_id,
              'total_horas_checador',      s.total_horas_checador,
              'total_horas_clasificadas',  s.total_horas_clasificadas,
              'diferencia',                ABS(s.total_horas_checador - s.total_horas_clasificadas),
              'incidencias',               s.incidencias,
              'estado',                    COALESCE(cdr.estado_general, 'pendiente'),
              'dias_ok',                   COALESCE(cdr.dias_ok, 0),
              'dias_alerta',               COALESCE(cdr.dias_alerta, 0),
              'dias_conflicto',            COALESCE(cdr.dias_conflicto, 0)
            ) ORDER BY s.numero_lista
          ) FILTER (WHERE s.empleado_id IS NOT NULL ${estadoFilter}),
          '[]'::json
        ) AS empleados
      FROM semanas_nomina sn
      LEFT JOIN stats     s  ON TRUE
      LEFT JOIN cd_resume cdr ON cdr.empleado_id = s.empleado_id
      WHERE sn.id = $1
      GROUP BY sn.id, sn.fecha_inicio, sn.fecha_fin, sn.descripcion, sn.cerrada
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Semana no encontrada' });
    }

    const semana = result.rows[0];
    const empleados = semana.empleados || [];

    // Calcular resumen general
    const resumen = {
      total_empleados: empleados.length,
      total_horas_checador: empleados.reduce((sum, e) => sum + e.total_horas_checador, 0),
      total_horas_clasificadas: empleados.reduce((sum, e) => sum + e.total_horas_clasificadas, 0),
      total_incidencias: empleados.reduce((sum, e) => sum + e.incidencias, 0),
      estado_ok: empleados.filter(e => e.estado === 'ok').length,
      estado_alerta: empleados.filter(e => e.estado === 'alerta').length,
      estado_conflicto: empleados.filter(e => e.estado === 'conflicto').length
    };

    res.json({
      exitoso: true,
      semana: {
        id: semana.semana_id,
        fecha_inicio: semana.fecha_inicio,
        fecha_fin: semana.fecha_fin,
        descripcion: semana.descripcion,
        cerrada: semana.cerrada
      },
      resumen,
      empleados,
      puede_cerrar: resumen.estado_conflicto === 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DETALLE POR EMPLEADO ====================

/**
 * GET /api/conciliacion/:semana_id/:empleado_id
 * Detalle día a día del empleado
 */
router.get('/:semana_id/:empleado_id', verificarJWT, async (req, res) => {
  try {
    const { semana_id, empleado_id } = req.params;
    const usuario_id = req.user.id;
    const usuario_rol = req.user.rol;

    // Verificar permisos
    if (usuario_rol === 'supervisor') {
      const empleado = await pool.query(
        'SELECT supervisor_id FROM empleados WHERE id = $1',
        [empleado_id]
      );
      if (empleado.rows.length === 0 || empleado.rows[0].supervisor_id !== usuario_id) {
        return res.status(403).json({ error: 'No autorizado' });
      }
    }

    const query = `
      SELECT 
        e.id,
        e.numero_lista,
        e.nombre,
        e.turno,
        e.area,
        sn.fecha_inicio,
        sn.fecha_fin,
        json_agg(
          json_build_object(
            'fecha', cd.fecha,
            'dia_semana', to_char(cd.fecha, 'Day'),
            'check_in', rc.check_in,
            'check_out', rc.check_out,
            'horas_checador', rc.horas_real,
            'horas_clasificadas', COALESCE(SUM(hc.horas), 0),
            'proyecto_actividad', (
              SELECT json_agg(
                json_build_object(
                  'id', hc2.id,
                  'proyecto', p.nombre,
                  'actividad', hc2.actividad,
                  'horas', hc2.horas,
                  'tipo_hora', hc2.tipo_hora
                )
              )
              FROM horas_clasificadas hc2
              LEFT JOIN proyectos p ON p.id = hc2.proyecto_id
              WHERE hc2.empleado_id = $2 AND hc2.fecha = cd.fecha AND hc2.semana_id = $1
            ),
            'incidencia', i.tipo,
            'incidencia_notas', i.notas,
            'diferencia', cd.diferencia,
            'estado', cd.estado,
            'justificacion', cd.justificacion,
            'anomalia', rc.anomalia
          ) ORDER BY cd.fecha
        ) as detalles_dia
      FROM empleados e
      JOIN semanas_nomina sn ON TRUE
      LEFT JOIN conciliacion_detalle cd ON cd.empleado_id = e.id AND cd.semana_id = sn.id
      LEFT JOIN registros_checador rc ON rc.empleado_id = e.id AND rc.fecha = cd.fecha AND rc.semana_id = sn.id
      LEFT JOIN horas_clasificadas hc ON hc.empleado_id = e.id AND hc.fecha = cd.fecha AND hc.semana_id = sn.id
      LEFT JOIN incidencias i ON i.empleado_id = e.id AND i.fecha = cd.fecha AND i.semana_id = sn.id
      LEFT JOIN proyectos p ON p.id = hc.proyecto_id
      WHERE e.id = $2 AND sn.id = $1
      GROUP BY e.id, e.numero_lista, e.nombre, e.turno, e.area, sn.id, sn.fecha_inicio, sn.fecha_fin
    `;

    const result = await pool.query(query, [semana_id, empleado_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado o semana no encontrada' });
    }

    const detalle = result.rows[0];
    const detallesDia = (detalle.detalles_dia || []).filter(d => d.fecha !== null);

    res.json({
      exitoso: true,
      empleado: {
        id: detalle.id,
        numero_lista: detalle.numero_lista,
        nombre: detalle.nombre,
        turno: detalle.turno,
        area: detalle.area
      },
      semana: {
        fecha_inicio: detalle.fecha_inicio,
        fecha_fin: detalle.fecha_fin
      },
      detalles_dia: detallesDia
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== JUSTIFICACIONES Y FORZAR ====================

/**
 * POST /api/conciliacion/justificar
 * Agregar justificación a una diferencia
 */
router.post('/justificar', verificarJWT, verificarRol(['supervisor', 'jefe_area', 'rh', 'admin']), async (req, res) => {
  try {
    const { empleado_id, fecha, semana_id, justificacion } = req.body;
    const usuario_id = req.user.id;

    if (!empleado_id || !fecha || !semana_id || !justificacion) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const result = await registrarJustificacion(empleado_id, fecha, semana_id, justificacion, usuario_id);

    res.json({
      exitoso: true,
      mensaje: 'Justificación registrada',
      detalle: result.rows[0]
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/conciliacion/forzar
 * Forzar conciliación (solo admin/rh)
 */
router.post('/forzar', verificarJWT, verificarRol(['rh', 'admin']), async (req, res) => {
  try {
    const { empleado_id, fecha, semana_id, motivo } = req.body;
    const usuario_id = req.user.id;
    const usuario_rol = req.user.rol;

    if (!empleado_id || !fecha || !semana_id || !motivo) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const result = await forzarConciliacion(empleado_id, fecha, semana_id, motivo, usuario_id, usuario_rol);

    res.json({
      exitoso: true,
      mensaje: 'Conciliación forzada exitosamente',
      detalle: result.rows[0]
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== PANEL DE ALERTAS ====================

/**
 * GET /api/conciliacion/:semana_id/alertas
 * Inconsistencias pendientes
 */
router.get('/:semana_id/alertas', verificarJWT, async (req, res) => {
  try {
    const { semana_id } = req.params;

    const alertas = await generarAlertas(semana_id);

    res.json({
      exitoso: true,
      total_alertas: alertas.length,
      alertas_criticas: alertas.filter(a => a.severidad === 'crítica').length,
      alertas_medias: alertas.filter(a => a.severidad === 'media').length,
      alertas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== HORAS CLASIFICADAS ====================

/**
 * POST /api/conciliacion/horas-clasificadas
 * Captura de horas por supervisor
 */
router.post('/horas-clasificadas', verificarJWT, verificarRol(['supervisor', 'jefe_area', 'rh', 'admin']), async (req, res) => {
  try {
    const { empleado_id, fecha, semana_id, proyecto_id, actividad, horas, tipo_hora } = req.body;
    const usuario_id = req.user.id;
    const usuario_rol = req.user.rol;

    if (!empleado_id || !fecha || !semana_id || !actividad || !horas) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    // Validar que sea supervisor del empleado o admin
    if (usuario_rol === 'supervisor') {
      const verificar = await pool.query(
        'SELECT supervisor_id FROM empleados WHERE id = $1',
        [empleado_id]
      );
      if (verificar.rows.length === 0 || verificar.rows[0].supervisor_id !== usuario_id) {
        return res.status(403).json({ error: 'No autorizado' });
      }
    }

    // Validar que haya checada ese día
    const checada = await pool.query(
      'SELECT horas_real FROM registros_checador WHERE empleado_id = $1 AND fecha = $2 AND semana_id = $3',
      [empleado_id, fecha, semana_id]
    );

    if (checada.rows.length === 0) {
      return res.status(400).json({ error: 'No hay registro en checador para este día' });
    }

    // Validar que no exceda horas del checador (con tolerancia)
    const horasChecador = parseFloat(checada.rows[0].horas_real || 0);
    const horasActuales = await pool.query(
      'SELECT COALESCE(SUM(horas), 0) as total FROM horas_clasificadas WHERE empleado_id = $1 AND fecha = $2 AND semana_id = $3 AND id != $4',
      [empleado_id, fecha, semana_id, req.body.id || 0]
    );
    const totalHorasActuales = parseFloat(horasActuales.rows[0].total) + parseFloat(horas);
    const tolerancia = parseFloat(process.env.TOLERANCIA_HORAS || 0.5);

    if (totalHorasActuales > horasChecador + tolerancia && usuario_rol !== 'jefe_area' && usuario_rol !== 'admin') {
      return res.status(400).json({
        error: 'Horas clasificadas exceden las del checador',
        detalle: `Checador: ${horasChecador}, Clasificadas: ${totalHorasActuales}`,
        requiere_aprobacion: true
      });
    }

    const query = `
      INSERT INTO horas_clasificadas 
      (empleado_id, fecha, proyecto_id, actividad, horas, tipo_hora, capturado_por, semana_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(query, [
      empleado_id,
      fecha,
      proyecto_id || null,
      actividad,
      horas,
      tipo_hora || 'normal',
      usuario_id,
      semana_id
    ]);

    // Re-conciliar el día
    const conciliacion = await conciliarEmpleadoDia(empleado_id, fecha, semana_id);

    res.json({
      exitoso: true,
      horas_clasificadas: result.rows[0],
      conciliacion_resultado: conciliacion
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/conciliacion/horas-clasificadas/:semana_id/:empleado_id
 * Obtener horas clasificadas por empleado
 */
router.get('/horas-clasificadas/:semana_id/:empleado_id', verificarJWT, async (req, res) => {
  try {
    const { semana_id, empleado_id } = req.params;

    const query = `
      SELECT 
        hc.*,
        p.codigo as proyecto_codigo,
        p.nombre as proyecto_nombre,
        u.nombre as capturado_por_nombre
      FROM horas_clasificadas hc
      LEFT JOIN proyectos p ON p.id = hc.proyecto_id
      LEFT JOIN usuarios u ON u.id = hc.capturado_por
      WHERE hc.empleado_id = $1 AND hc.semana_id = $2
      ORDER BY hc.fecha DESC, hc.created_at DESC
    `;

    const result = await pool.query(query, [empleado_id, semana_id]);

    res.json({
      exitoso: true,
      total: result.rows.length,
      horas_clasificadas: result.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/conciliacion/horas-clasificadas/:id
 * Actualizar horas clasificadas
 */
router.put('/horas-clasificadas/:id', verificarJWT, verificarRol(['supervisor', 'jefe_area', 'rh', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { actividad, horas, tipo_hora, proyecto_id } = req.body;

    const query = `
      UPDATE horas_clasificadas
      SET 
        actividad = COALESCE($2, actividad),
        horas = COALESCE($3, horas),
        tipo_hora = COALESCE($4, tipo_hora),
        proyecto_id = COALESCE($5, proyecto_id),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, actividad, horas, tipo_hora, proyecto_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json({
      exitoso: true,
      horas_clasificadas: result.rows[0]
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/conciliacion/horas-clasificadas/:id
 * Eliminar horas clasificadas
 */
router.delete('/horas-clasificadas/:id', verificarJWT, verificarRol(['supervisor', 'jefe_area', 'rh', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM horas_clasificadas
      WHERE id = $1
      RETURNING empleado_id, fecha, semana_id
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json({
      exitoso: true,
      mensaje: 'Registro eliminado'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== CIERRE DE SEMANA ====================

/**
 * POST /api/conciliacion/:semana_id/cerrar
 * Cerrar semana (irreversible)
 */
router.post('/:semana_id/cerrar', verificarJWT, verificarRol(['rh', 'admin']), async (req, res) => {
  try {
    const { semana_id } = req.params;
    const { notas } = req.body;
    const usuario_id = req.user.id;

    // Verificar que está lista
    const readiness = await verificarReadinessParaCerrar(semana_id);
    if (!readiness.puede_cerrar) {
      return res.status(400).json({
        error: 'No se puede cerrar la semana',
        detalle: readiness
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener resumen
      const resumenQuery = `
        SELECT 
          COUNT(DISTINCT empleado_id) as total_empleados,
          SUM(horas_checador) as total_horas,
          COUNT(CASE WHEN estado != 'ok' AND estado != 'justificado' THEN 1 END) as diferencias_pendientes
        FROM conciliacion_detalle
        WHERE semana_id = $1
      `;
      const resumenResult = await client.query(resumenQuery, [semana_id]);
      const resumen = resumenResult.rows[0];

      // Marcar semana como cerrada
      await client.query(
        'UPDATE semanas_nomina SET cerrada = TRUE WHERE id = $1',
        [semana_id]
      );

      // Registrar cierre
      const cierreQuery = `
        INSERT INTO cierres_semana 
        (semana_id, aprobado_por, total_empleados, total_horas, diferencias_pendientes, notas)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const cierreResult = await client.query(cierreQuery, [
        semana_id,
        usuario_id,
        resumen.total_empleados,
        resumen.total_horas,
        resumen.diferencias_pendientes,
        notas || null
      ]);

      await client.query('COMMIT');

      res.json({
        exitoso: true,
        mensaje: 'Semana cerrada exitosamente',
        cierre: cierreResult.rows[0]
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/conciliacion/:semana_id/exportar
 * Exportar a Excel
 */
router.get('/:semana_id/exportar', verificarJWT, verificarRol(['jefe_area', 'rh', 'admin']), async (req, res) => {
  try {
    const { semana_id } = req.params;

    const query = `
      SELECT 
        e.numero_lista,
        e.nombre,
        e.turno,
        e.area,
        sn.fecha_inicio,
        sn.fecha_fin,
        json_agg(
          json_build_object(
            'fecha', cd.fecha,
            'horas_checador', cd.horas_checador,
            'horas_clasificadas', cd.horas_clasificadas,
            'diferencia', cd.diferencia,
            'estado', cd.estado,
            'justificacion', cd.justificacion
          ) ORDER BY cd.fecha
        ) as detalles
      FROM empleados e
      JOIN semanas_nomina sn ON sn.id = $1
      LEFT JOIN conciliacion_detalle cd ON cd.empleado_id = e.id AND cd.semana_id = sn.id
      WHERE e.activo = TRUE
      GROUP BY e.id, e.numero_lista, e.nombre, e.turno, e.area, sn.id, sn.fecha_inicio, sn.fecha_fin
      ORDER BY e.numero_lista
    `;

    const result = await pool.query(query, [semana_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Semana no encontrada' });
    }

    const exporter = new ExcelExporter();
    const buffer = await exporter.generarReporte(result.rows);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=nomina_semana_${semana_id}.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
