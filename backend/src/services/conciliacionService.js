const pool = require('../db/config');
const moment = require('moment');

const TOLERANCIA = parseFloat(process.env.TOLERANCIA_HORAS || 0.5);
const UMBRAL_ALERTA = parseFloat(process.env.UMBRAL_ALERTA || 2.0);
const INCIDENCIAS_VALIDAS = ['vacacion', 'incapacidad', 'festivo'];

/**
 * Obtener horas registradas en checador para un empleado en una fecha
 */
async function getHorasChecador(empleadoId, fecha, semanaId) {
  const query = `
    SELECT horas_real, anomalia, check_in, check_out
    FROM registros_checador
    WHERE empleado_id = $1 AND fecha = $2 AND semana_id = $3
  `;
  const result = await pool.query(query, [empleadoId, fecha, semanaId]);
  return result.rows[0] || { horas_real: 0, anomalia: null };
}

/**
 * Obtener horas clasificadas para un empleado en una fecha
 */
async function getHorasClasificadas(empleadoId, fecha, semanaId) {
  const query = `
    SELECT COALESCE(SUM(horas), 0) as total_horas,
           array_agg(DISTINCT tipo_hora) as tipos,
           json_agg(
             json_build_object(
               'id', id,
               'actividad', actividad,
               'horas', horas,
               'tipo_hora', tipo_hora,
               'proyecto_id', proyecto_id
             )
           ) as detalles
    FROM horas_clasificadas
    WHERE empleado_id = $1 AND fecha = $2 AND semana_id = $3
  `;
  const result = await pool.query(query, [empleadoId, fecha, semanaId]);
  return result.rows[0];
}

/**
 * Obtener incidencias para un empleado en una fecha
 */
async function getIncidencia(empleadoId, fecha, semanaId) {
  const query = `
    SELECT tipo, notas
    FROM incidencias
    WHERE empleado_id = $1 AND fecha = $2 AND semana_id = $3
    LIMIT 1
  `;
  const result = await pool.query(query, [empleadoId, fecha, semanaId]);
  return result.rows[0] || null;
}

/**
 * Motor principal de conciliación por día
 */
async function conciliarEmpleadoDia(empleadoId, fecha, semanaId) {
  const [checador, clasificadas, incidencia] = await Promise.all([
    getHorasChecador(empleadoId, fecha, semanaId),
    getHorasClasificadas(empleadoId, fecha, semanaId),
    getIncidencia(empleadoId, fecha, semanaId)
  ]);

  // Si hay incidencia válida, está automáticamente conciliado
  if (incidencia && INCIDENCIAS_VALIDAS.includes(incidencia.tipo)) {
    return {
      estado: 'ok',
      diferencia: 0,
      razon: `Incidencia válida: ${incidencia.tipo}`,
      horas_checador: 0,
      horas_clasificadas: 0,
      anomalia: null,
      incidencia: incidencia.tipo
    };
  }

  const hrsChecador = parseFloat(checador.horas_real || 0);
  const hrsClasificadas = parseFloat(clasificadas?.total_horas || 0);
  const diferencia = Math.abs(hrsChecador - hrsClasificadas);

  let estado = 'ok';
  let alertas = [];

  if (checador.anomalia) {
    estado = 'conflicto';
    alertas.push(`Anomalía detectada: ${checador.anomalia}`);
  }

  if (hrsChecador === 0 && !incidencia) {
    estado = 'conflicto';
    alertas.push('Sin registro en checador');
  }

  if (hrsClasificadas > hrsChecador && diferencia > TOLERANCIA) {
    estado = 'conflicto';
    alertas.push(`Horas clasificadas (${hrsClasificadas}) > checador (${hrsChecador})`);
  }

  if (diferencia > TOLERANCIA && diferencia <= UMBRAL_ALERTA) {
    estado = estado === 'ok' ? 'alerta' : estado;
    alertas.push(`Diferencia dentro de alerta: ${diferencia.toFixed(2)} hrs`);
  }

  if (diferencia > UMBRAL_ALERTA) {
    estado = 'conflicto';
    alertas.push(`Diferencia crítica: ${diferencia.toFixed(2)} hrs`);
  }

  // Validar horas extra
  if (clasificadas?.tipos?.includes('extra_doble') || clasificadas?.tipos?.includes('extra_triple')) {
    const horasExtra = clasificadas.detalles
      .filter(d => d.tipo_hora !== 'normal')
      .reduce((sum, d) => sum + d.horas, 0);
    
    if (horasExtra > 0) {
      alertas.push(`Horas extra detectadas: ${horasExtra} hrs`);
    }
  }

  return {
    estado,
    diferencia: diferencia,
    horas_checador: hrsChecador,
    horas_clasificadas: hrsClasificadas,
    anomalia: checador.anomalia,
    incidencia: incidencia?.tipo || null,
    alertas,
    detalles_clasificadas: clasificadas?.detalles || []
  };
}

/**
 * Conciliar una semana completa para todos los empleados
 */
async function conciliarSemana(semanaId) {
  try {
    // Obtener todos los empleados activos
    const empleadosQuery = `
      SELECT DISTINCT e.id, e.numero_lista, e.nombre, e.area, e.supervisor_id
      FROM empleados e
      WHERE e.activo = TRUE
      ORDER BY e.numero_lista
    `;
    const empleadosResult = await pool.query(empleadosQuery);
    const empleados = empleadosResult.rows;

    // Obtener rango de fechas de la semana
    const semanaQuery = `
      SELECT fecha_inicio, fecha_fin
      FROM semanas_nomina
      WHERE id = $1
    `;
    const semanaResult = await pool.query(semanaQuery, [semanaId]);
    if (semanaResult.rows.length === 0) throw new Error('Semana no encontrada');

    const { fecha_inicio, fecha_fin } = semanaResult.rows[0];
    const fechas = [];
    let current = moment(fecha_inicio);

    while (current.isSameOrBefore(moment(fecha_fin))) {
      fechas.push(current.toDate());
      current.add(1, 'day');
    }

    // Procesar cada empleado
    const resumenPorEmpleado = [];

    for (const empleado of empleados) {
      let totalHrsChecador = 0;
      let totalHrsClasificadas = 0;
      let diasConflicto = 0;
      let diasAlerta = 0;
      let estadoGeneral = 'ok';
      const detallesDia = [];

      // Procesar cada día de la semana
      for (const fecha of fechas) {
        const conciliacion = await conciliarEmpleadoDia(empleado.id, fecha, semanaId);
        
        totalHrsChecador += conciliacion.horas_checador;
        totalHrsClasificadas += conciliacion.horas_clasificadas;

        if (conciliacion.estado === 'conflicto') diasConflicto++;
        if (conciliacion.estado === 'alerta') diasAlerta++;
        if (conciliacion.estado === 'conflicto') estadoGeneral = 'conflicto';
        else if (conciliacion.estado === 'alerta' && estadoGeneral !== 'conflicto') estadoGeneral = 'alerta';

        detallesDia.push({
          fecha,
          ...conciliacion
        });
      }

      // Guardar en tabla de conciliación_detalle para cada día
      for (const detalle of detallesDia) {
        await guardarConciliacionDetalle(
          empleado.id,
          detalle.fecha,
          detalle.horas_checador,
          detalle.horas_clasificadas,
          detalle.diferencia,
          detalle.estado,
          semanaId
        );
      }

      resumenPorEmpleado.push({
        empleado_id: empleado.id,
        numero_lista: empleado.numero_lista,
        nombre: empleado.nombre,
        area: empleado.area,
        supervisor_id: empleado.supervisor_id,
        total_horas_checador: totalHrsChecador,
        total_horas_clasificadas: totalHrsClasificadas,
        diferencia_total: Math.abs(totalHrsChecador - totalHrsClasificadas),
        dias_conflicto: diasConflicto,
        dias_alerta: diasAlerta,
        estado: estadoGeneral,
        detalles_dia: detallesDia
      });
    }

    return {
      semana_id: semanaId,
      fecha_inicio,
      fecha_fin,
      total_empleados: empleados.length,
      resumen_por_empleado: resumenPorEmpleado,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error al conciliar semana:', error);
    throw error;
  }
}

/**
 * Guardar resultado de conciliación en detalle
 */
async function guardarConciliacionDetalle(
  empleadoId,
  fecha,
  hrsChecador,
  hrsClasificadas,
  diferencia,
  estado,
  semanaId
) {
  const query = `
    INSERT INTO conciliacion_detalle 
    (empleado_id, fecha, horas_checador, horas_clasificadas, diferencia, estado, semana_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (empleado_id, fecha, semana_id) 
    DO UPDATE SET
      horas_checador = $3,
      horas_clasificadas = $4,
      diferencia = $5,
      estado = $6,
      updated_at = NOW()
    RETURNING *
  `;
  return pool.query(query, [
    empleadoId,
    fecha,
    hrsChecador,
    hrsClasificadas,
    diferencia,
    estado,
    semanaId
  ]);
}

/**
 * Generar alertas activas para una semana
 */
async function generarAlertas(semanaId) {
  const query = `
    SELECT 
      cd.id,
      cd.empleado_id,
      e.numero_lista,
      e.nombre,
      e.area,
      e.supervisor_id,
      cd.fecha,
      cd.horas_checador,
      cd.horas_clasificadas,
      cd.diferencia,
      cd.estado,
      rc.anomalia,
      i.tipo as incidencia_tipo
    FROM conciliacion_detalle cd
    JOIN empleados e ON e.id = cd.empleado_id
    LEFT JOIN registros_checador rc ON rc.empleado_id = cd.empleado_id 
      AND rc.fecha = cd.fecha AND rc.semana_id = cd.semana_id
    LEFT JOIN incidencias i ON i.empleado_id = cd.empleado_id 
      AND i.fecha = cd.fecha AND i.semana_id = cd.semana_id
    WHERE cd.semana_id = $1 AND cd.estado IN ('alerta', 'conflicto')
    ORDER BY 
      CASE WHEN cd.estado = 'conflicto' THEN 1 ELSE 2 END,
      cd.diferencia DESC,
      cd.fecha DESC
  `;

  const result = await pool.query(query, [semanaId]);
  
  return result.rows.map(row => ({
    id: row.id,
    empleado_id: row.empleado_id,
    numero_lista: row.numero_lista,
    nombre: row.nombre,
    area: row.area,
    supervisor_id: row.supervisor_id,
    fecha: row.fecha,
    tipo_alerta: clasificarAlerta(row),
    severidad: row.estado === 'conflicto' ? 'crítica' : 'media',
    diferencia: row.diferencia,
    detalle: generarMensajeAlerta(row)
  }));
}

/**
 * Clasificar tipo de alerta
 */
function clasificarAlerta(row) {
  if (row.anomalia) return 'anomalia_estructural';
  if (row.horas_checador === 0) return 'sin_checada';
  if (row.horas_clasificadas > row.horas_checador) return 'clasificadas_mayores';
  if (row.horas_clasificadas === 0) return 'sin_clasificar';
  return 'diferencia_significativa';
}

/**
 * Generar mensaje descriptivo de alerta
 */
function generarMensajeAlerta(row) {
  const alertas = [];

  if (row.anomalia) alertas.push(`Anomalía: ${row.anomalia}`);
  if (row.horas_checador === 0) alertas.push('Sin registro en checador');
  if (row.horas_clasificadas === 0) alertas.push('Sin horas clasificadas');
  if (row.horas_clasificadas > row.horas_checador) {
    alertas.push(`Clasificadas (${row.horas_clasificadas}) > Checador (${row.horas_checador})`);
  }
  if (row.diferencia > UMBRAL_ALERTA) {
    alertas.push(`Diferencia crítica: ${row.diferencia.toFixed(2)} horas`);
  }
  if (row.incidencia_tipo) {
    alertas.push(`Incidencia: ${row.incidencia_tipo}`);
  }

  return alertas.join(' | ');
}

/**
 * Registrar justificación de diferencia
 */
async function registrarJustificacion(empleadoId, fecha, semanaId, justificacion, porUsuarioId) {
  const query = `
    UPDATE conciliacion_detalle
    SET 
      estado = 'justificado',
      justificacion = $4,
      justificado_por = $5,
      updated_at = NOW()
    WHERE empleado_id = $1 AND fecha = $2 AND semana_id = $3
    RETURNING *
  `;

  return pool.query(query, [empleadoId, fecha, semanaId, justificacion, porUsuarioId]);
}

/**
 * Forzar conciliación (solo admin/rh)
 */
async function forzarConciliacion(empleadoId, fecha, semanaId, motivo, porUsuarioId, rol) {
  if (!['rh', 'admin'].includes(rol)) {
    throw new Error('No autorizado para forzar conciliación');
  }

  const query = `
    UPDATE conciliacion_detalle
    SET 
      estado = 'forzada',
      justificacion = $4,
      justificado_por = $5,
      updated_at = NOW()
    WHERE empleado_id = $1 AND fecha = $2 AND semana_id = $3
    RETURNING *
  `;

  return pool.query(query, [empleadoId, fecha, semanaId, `[FORZADA] ${motivo}`, porUsuarioId]);
}

/**
 * Verificar si una semana está lista para cerrar
 */
async function verificarReadinessParaCerrar(semanaId) {
  const query = `
    SELECT 
      COUNT(*) as total_registros,
      SUM(CASE WHEN estado IN ('alerta', 'conflicto') THEN 1 ELSE 0 END) as pendientes,
      SUM(CASE WHEN estado NOT IN ('ok', 'justificado', 'forzada') THEN 1 ELSE 0 END) as sin_resolver
    FROM conciliacion_detalle
    WHERE semana_id = $1
  `;

  const result = await pool.query(query, [semanaId]);
  const stats = result.rows[0];

  return {
    puede_cerrar: parseInt(stats.sin_resolver) === 0,
    total_registros: parseInt(stats.total_registros),
    pendientes: parseInt(stats.pendientes),
    sin_resolver: parseInt(stats.sin_resolver),
    mensaje: parseInt(stats.sin_resolver) === 0 
      ? 'Semana lista para cerrar'
      : `${stats.sin_resolver} registros sin resolver`
  };
}

module.exports = {
  conciliarEmpleadoDia,
  conciliarSemana,
  guardarConciliacionDetalle,
  generarAlertas,
  registrarJustificacion,
  forzarConciliacion,
  verificarReadinessParaCerrar,
  getHorasChecador,
  getHorasClasificadas,
  getIncidencia,
  TOLERANCIA,
  UMBRAL_ALERTA
};
