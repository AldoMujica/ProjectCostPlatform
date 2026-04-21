const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const moment = require('moment');
const pool = require('../db/config');

/**
 * Parser universal de checador (soporta CSV y XLSX)
 */
async function parseChecador(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  let registros = [];
  if (ext === '.csv') {
    registros = await parseCSV(filePath);
  } else if (ext === '.xlsx') {
    registros = await parseXLSX(filePath);
  } else {
    throw new Error('Formato no soportado. Use CSV o XLSX');
  }

  // Normalizar y validar datos
  return normalizarRegistros(registros);
}

/**
 * Parser para archivos CSV
 */
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const registros = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().toLowerCase()
      }))
      .on('data', (row) => {
        registros.push(row);
      })
      .on('end', () => {
        resolve(registros);
      })
      .on('error', (error) => {
        reject(new Error(`Error al leer CSV: ${error.message}`));
      });
  });
}

/**
 * Parser para archivos XLSX
 */
function parseXLSX(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convertir con headers=1 para obtener encabezados
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    return rawData;
  } catch (error) {
    throw new Error(`Error al leer XLSX: ${error.message}`);
  }
}

/**
 * Normalizar y validar registros del checador
 */
async function normalizarRegistros(registros) {
  if (!registros || registros.length === 0) {
    throw new Error('Archivo vacío');
  }

  const registrosNormalizados = [];
  const errores = [];

  // Obtener empleados activos de BD
  const empleadosDb = await obtenerEmpleados();
  const empleadosMap = new Map(empleadosDb.map(e => [e.numero_lista.toString(), e]));

  for (let i = 0; i < registros.length; i++) {
    try {
      const registro = normalizarRegistro(registros[i], i + 1, empleadosMap);
      if (registro.errores.length > 0) {
        errores.push({
          fila: i + 1,
          errores: registro.errores
        });
      } else {
        registrosNormalizados.push(registro.datos);
      }
    } catch (error) {
      errores.push({
        fila: i + 1,
        errores: [error.message]
      });
    }
  }

  return {
    registros: registrosNormalizados,
    errores,
    totalLeidos: registros.length,
    totalValidos: registrosNormalizados.length,
    totalErrores: errores.length
  };
}

/**
 * Normalizar un registro individual
 */
function normalizarRegistro(row, numeroFila, empleadosMap) {
  const errores = [];
  const datos = {};

  // Buscar columnas (case-insensitive)
  const columnas = normalizarNombresColumnas(row);

  // Validar y extraer ID del empleado
  const idEmpleado = columnas['id_empleado']?.toString().trim();
  if (!idEmpleado) {
    errores.push('ID_Empleado no encontrado');
    return { datos, errores };
  }

  const empleado = empleadosMap.get(idEmpleado);
  if (!empleado) {
    errores.push(`Empleado ${idEmpleado} no existe en sistema`);
  } else {
    datos.empleado_id = empleado.id;
    datos.numero_lista = empleado.numero_lista;
    datos.nombre_empleado = empleado.nombre;
  }

  // Validar fecha
  let fecha = columnas['fecha'];
  try {
    fecha = moment(fecha, ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY']).toDate();
    if (isNaN(fecha.getTime())) throw new Error();
    datos.fecha = fecha;
  } catch (error) {
    errores.push(`Fecha inválida: ${columnas['fecha']}`);
  }

  // Validar y procesar Primer Checada (Check-in)
  let checkIn = columnas['primer_checada'];
  try {
    checkIn = normalizarTiempo(checkIn);
    datos.check_in = checkIn;
  } catch (error) {
    errores.push(`Primer Checada inválida: ${checkIn}`);
  }

  // Validar y procesar Última Checada (Check-out)
  let checkOut = columnas['ultima_checada'];
  try {
    checkOut = normalizarTiempo(checkOut);
    datos.check_out = checkOut;
  } catch (error) {
    errores.push(`Última Checada inválida: ${checkOut}`);
  }

  // Calcular horas reales (no confiar ciegamente en Tiempo_Total)
  if (datos.check_in && datos.check_out) {
    try {
      datos.horas_real = calcularHoras(datos.check_in, datos.check_out);
    } catch (error) {
      errores.push(`Error al calcular horas: ${error.message}`);
    }
  }

  // Detectar anomalías
  datos.anomalia = detectarAnomalia(datos, row);

  // Limpiar valores sensibles
  if (datos.nombre_empleado) {
    datos.nombre_empleado = limpiarString(datos.nombre_empleado);
  }

  return { datos, errores };
}

/**
 * Normalizar nombres de columnas (busca coincidencias flexibles)
 */
function normalizarNombresColumnas(row) {
  const resultado = {};
  const mapeosEsperados = {
    'id_empleado': ['id_empleado', 'id empleado', 'numero_lista', 'numero lista', 'id', 'empleado_id'],
    'nombre': ['nombre', 'nombre_empleado', 'nombre empleado', 'name'],
    'fecha': ['fecha', 'date', 'dia'],
    'primer_checada': ['primer_checada', 'primer checada', 'check_in', 'checkin', 'entrada', 'primera'],
    'ultima_checada': ['ultima_checada', 'última checada', 'check_out', 'checkout', 'salida', 'ultima'],
    'tiempo_total': ['tiempo_total', 'tiempo total', 'horas', 'time_total']
  };

  Object.keys(row).forEach(key => {
    const keyNormalizado = key.trim().toLowerCase().replace(/\s+/g, '_');
    
    for (const [target, aliases] of Object.entries(mapeosEsperados)) {
      if (aliases.some(alias => keyNormalizado.includes(alias))) {
        resultado[target] = row[key];
        break;
      }
    }
  });

  return resultado;
}

/**
 * Normalizar formato de tiempo
 */
function normalizarTiempo(tiempoStr) {
  if (!tiempoStr) return null;

  const tiempoLimpio = tiempoStr.toString().trim();
  
  // Intentar varios formatos
  const formatos = [
    'HH:mm:ss',
    'HH:mm',
    'HHmm',
    'h:mm A',
    'hh:mm A'
  ];

  for (const formato of formatos) {
    const parsed = moment(tiempoLimpio, formato, true);
    if (parsed.isValid()) {
      return parsed.format('HH:mm:ss');
    }
  }

  throw new Error(`No se puede parsear tiempo: ${tiempoStr}`);
}

/**
 * Calcular horas trabajadas
 */
function calcularHoras(checkInStr, checkOutStr) {
  const checkIn = moment(checkInStr, 'HH:mm:ss');
  const checkOut = moment(checkOutStr, 'HH:mm:ss');

  // Si checkOut es menor que checkIn, asumir que cruzó medianoche
  if (checkOut.isBefore(checkIn)) {
    checkOut.add(1, 'day');
  }

  const diff = checkOut.diff(checkIn, 'hours', true);
  
  if (diff < 0 || diff > 24) {
    throw new Error('Diferencia de horas ilógica');
  }

  return Math.round(diff * 100) / 100; // Redondear a 2 decimales
}

/**
 * Detectar anomalías
 */
function detectarAnomalia(datos, registroOriginal) {
  const anomalias = [];

  // Sin entrada o sin salida
  if (!datos.check_in && datos.check_out) {
    anomalias.push('Salida sin entrada');
  }
  if (datos.check_in && !datos.check_out) {
    anomalias.push('Entrada sin salida');
  }
  if (!datos.check_in && !datos.check_out) {
    anomalias.push('Sin checadas');
  }

  // Horas fuera de rango normal (8-12 horas para turno normal)
  if (datos.horas_real) {
    if (datos.horas_real < 0.5) {
      anomalias.push('Horas muy bajas (< 30 min)');
    }
    if (datos.horas_real > 14) {
      anomalias.push('Horas muy altas (> 14 hrs)');
    }
  }

  return anomalias.length > 0 ? anomalias.join(' | ') : null;
}

/**
 * Limpiar strings (remover caracteres especiales, normalizar espacios)
 */
function limpiarString(str) {
  if (!str) return '';
  
  return str
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Obtener empleados de BD
 */
async function obtenerEmpleados() {
  const query = `
    SELECT id, numero_lista, nombre, turno, area
    FROM empleados
    WHERE activo = TRUE
    ORDER BY numero_lista
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Importar registros normalizados a BD
 */
async function importarRegistrosABD(registros, semanaId, usuarioId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO registros_checador 
      (empleado_id, fecha, check_in, check_out, horas_real, anomalia, semana_id, importado_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (empleado_id, fecha, semana_id) 
      DO UPDATE SET
        check_in = $3,
        check_out = $4,
        horas_real = $5,
        anomalia = $6,
        importado_en = NOW()
      RETURNING id, empleado_id, fecha, anomalia
    `;

    const insertados = [];
    const conAnomalias = [];

    for (const registro of registros) {
      const result = await client.query(query, [
        registro.empleado_id,
        registro.fecha,
        registro.check_in,
        registro.check_out,
        registro.horas_real,
        registro.anomalia,
        semanaId
      ]);

      if (result.rows.length > 0) {
        insertados.push(result.rows[0]);
        if (result.rows[0].anomalia) {
          conAnomalias.push({
            empleado_id: result.rows[0].empleado_id,
            fecha: result.rows[0].fecha,
            anomalia: result.rows[0].anomalia
          });
        }
      }
    }

    // Registrar auditoría
    const auditQuery = `
      INSERT INTO auditoria_conciliacion 
      (usuario_id, accion, semana_id, detalles, fecha_accion)
      VALUES ($1, 'IMPORTACION_CHECADOR', $2, $3, NOW())
      RETURNING id
    `;

    await client.query(auditQuery, [
      usuarioId,
      semanaId,
      JSON.stringify({
        total_importados: insertados.length,
        con_anomalias: conAnomalias.length
      })
    ]);

    await client.query('COMMIT');

    return {
      exitoso: true,
      total_importados: insertados.length,
      con_anomalias: conAnomalias,
      mensaje: `${insertados.length} registros importados (${conAnomalias.length} con anomalías)`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  parseChecador,
  parseCSV,
  parseXLSX,
  normalizarRegistros,
  importarRegistrosABD,
  normalizarTiempo,
  calcularHoras,
  detectarAnomalia
};
