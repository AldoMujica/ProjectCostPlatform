const ExcelJS = require('exceljs');
const moment = require('moment');

class ExcelExporter {
  constructor() {
    this.workbook = new ExcelJS.Workbook();
  }

  /**
   * Generar reporte de nómina en Excel
   */
  async generarReporte(datos) {
    const worksheet = this.workbook.addWorksheet('Nómina Conciliada');

    // Configurar columnas
    const columns = [
      { header: 'Número Lista', key: 'numero_lista', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Turno', key: 'turno', width: 15 },
      { header: 'Área', key: 'area', width: 20 },
      { header: 'Periodo', key: 'periodo', width: 20 },
      { header: 'L', key: 'l', width: 8 },
      { header: 'K', key: 'k', width: 8 },
      { header: 'M', key: 'n', width: 8 },
      { header: 'J', key: 'j', width: 8 },
      { header: 'V', key: 'v', width: 8 },
      { header: 'Total Hrs', key: 'total_hrs', width: 12 },
      { header: 'Estado', key: 'estado', width: 15 }
    ];

    worksheet.columns = columns;

    // Estilos de header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center' };

    // Agregar datos
    let totalHorasGeneral = 0;
    let row_number = 2;

    for (const empleado of datos) {
      const periodo = `${moment(empleado.fecha_inicio).format('DD/MM')} - ${moment(empleado.fecha_fin).format('DD/MM/YYYY')}`;
      
      const detalles = empleado.detalles || [];
      const horasPorDia = {
        l: 0, k: 0, n: 0, j: 0, v: 0
      };
      let totalHoras = 0;
      let estadoGeneral = 'OK';

      // Procesar detalles y asignar a días de la semana
      const diaMap = { 0: 'v', 1: 'l', 2: 'k', 3: 'n', 4: 'j', 5: 'v', 6: 'v' }; // domingo=0
      
      for (const detalle of detalles) {
        if (detalle.horas_clasificadas > 0) {
          const diaFecha = new Date(detalle.fecha);
          const diaSemana = diaMap[diaFecha.getDay()];
          if (Object.hasOwn(horasPorDia, diaSemana)) {
            horasPorDia[diaSemana] += parseFloat(detalle.horas_clasificadas || 0);
          }
          totalHoras += parseFloat(detalle.horas_clasificadas || 0);
        }

        if (detalle.estado === 'conflicto') estadoGeneral = 'CONFLICTO';
        else if (detalle.estado === 'alerta' && estadoGeneral !== 'CONFLICTO') estadoGeneral = 'ALERTA';
      }

      totalHorasGeneral += totalHoras;

      const rowData = {
        numero_lista: empleado.numero_lista,
        nombre: empleado.nombre,
        turno: empleado.turno,
        area: empleado.area,
        periodo,
        l: horasPorDia.l > 0 ? horasPorDia.l : '',
        k: horasPorDia.k > 0 ? horasPorDia.k : '',
        n: horasPorDia.n > 0 ? horasPorDia.n : '',
        j: horasPorDia.j > 0 ? horasPorDia.j : '',
        v: horasPorDia.v > 0 ? horasPorDia.v : '',
        total_hrs: totalHoras,
        estado: estadoGeneral
      };

      worksheet.addRow(rowData);

      // Aplicar estilos según estado
      const currentRow = worksheet.getRow(row_number);
      if (estadoGeneral === 'OK') {
        currentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
      } else if (estadoGeneral === 'ALERTA') {
        currentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBCC' } };
      } else {
        currentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
      }

      // Alinear números
      currentRow.getCell('l').alignment = { horizontal: 'center' };
      currentRow.getCell('k').alignment = { horizontal: 'center' };
      currentRow.getCell('n').alignment = { horizontal: 'center' };
      currentRow.getCell('j').alignment = { horizontal: 'center' };
      currentRow.getCell('v').alignment = { horizontal: 'center' };
      currentRow.getCell('total_hrs').alignment = { horizontal: 'center' };
      currentRow.getCell('total_hrs').font = { bold: true };

      row_number++;
    }

    // Fila de totales
    worksheet.addRow({});
    const totalRow = worksheet.addRow({
      nombre: 'TOTAL',
      total_hrs: totalHorasGeneral
    });

    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
    totalRow.getCell('total_hrs').font = { bold: true, size: 12 };

    return this.workbook.xlsx.writeBuffer();
  }

  /**
   * Generar reporte detallado día a día
   */
  async generarReporteDetallado(datos) {
    const worksheet = this.workbook.addWorksheet('Detalle Diario');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Día', key: 'dia', width: 12 },
      { header: 'Número Lista', key: 'numero_lista', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Checador', key: 'horas_checador', width: 12 },
      { header: 'Clasificadas', key: 'horas_clasificadas', width: 12 },
      { header: 'Diferencia', key: 'diferencia', width: 12 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Justificación', key: 'justificacion', width: 35 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    for (const empleado of datos) {
      const detalles = empleado.detalles || [];

      for (const detalle of detalles) {
        const fecha = new Date(detalle.fecha);
        const dia = dias[fecha.getDay()];

        worksheet.addRow({
          fecha: moment(detalle.fecha).format('DD/MM/YYYY'),
          dia,
          numero_lista: empleado.numero_lista,
          nombre: empleado.nombre,
          horas_checador: detalle.horas_checador || 0,
          horas_clasificadas: detalle.horas_clasificadas || 0,
          diferencia: Math.abs((detalle.horas_checador || 0) - (detalle.horas_clasificadas || 0)),
          estado: detalle.estado.toUpperCase(),
          justificacion: detalle.justificacion || ''
        });
      }
    }

    return this.workbook.xlsx.writeBuffer();
  }
}

module.exports = { ExcelExporter };
