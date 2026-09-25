import ExcelJS from 'exceljs';

const HEADER_COLOR = 'FF1E3A8A';
const CURRENCY_FORMAT = 'R$ #,##0.00';

export type ExportColumn = {
  header: string;
  key: string;
  width?: number;
  currency?: boolean;
};

export async function exportToExcel(
  filename: string,
  sheetName: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? 16,
  }));
  sheet.addRows(rows);
  sheet.autoFilter = { from: 'A1', to: `${columnLetter(columns.length)}${Math.max(rows.length + 1, 1)}` };

  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    if (rowIndex % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
    }
    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      if (column.currency) cell.numFmt = CURRENCY_FORMAT;
    });
  }

  columns.forEach((column, index) => {
    const values = [column.header, ...rows.map((row) => String(row[column.key] ?? ''))];
    const contentWidth = Math.max(...values.map((value) => value.length), 10) + 2;
    sheet.getColumn(index + 1).width = Math.min(Math.max(contentWidth, column.width ?? 12), 42);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function columnLetter(columnNumber: number): string {
  let value = columnNumber;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}