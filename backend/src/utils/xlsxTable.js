const ExcelJS = require('exceljs');

/**
 * Build and stream a single-sheet XLSX workbook to `res`.
 *
 * Used by the Phase-2 "Descargar XLSX" buttons (ADR-004: server-side,
 * one endpoint per table, shared helper).
 *
 * @param {import('express').Response} res
 * @param {object} opts
 * @param {string}   opts.filename    e.g. 'ordenes-trabajo-2026-04-21.xlsx'
 * @param {string}   opts.sheetName   e.g. 'Órdenes de Trabajo'
 * @param {Array<{header:string, key:string, width?:number, fmt?:(v:any,row:any)=>any}>} opts.columns
 * @param {Array<object>} opts.rows   raw model rows (Sequelize `.toJSON()` or plain)
 */
async function sendTableXlsx(res, { filename, sheetName, columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName || 'Hoja 1');

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 15,
  }));

  // Styled header row.
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  header.alignment = { horizontal: 'center', vertical: 'center' };

  for (const row of rows) {
    const out = {};
    for (const c of columns) {
      const raw = row[c.key];
      out[c.key] = c.fmt ? c.fmt(raw, row) : raw;
    }
    sheet.addRow(out);
  }

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { sendTableXlsx };
