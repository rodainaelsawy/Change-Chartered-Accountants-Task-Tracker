import 'server-only'
import ExcelJS from 'exceljs'

export type Column<T> = {
  header: string
  width?: number
  value: (row: T) => string | number | Date | null | undefined
  /** 'date' turns 'YYYY-MM-DD' strings into real Excel dates; 'percent' formats 0–100 numbers. */
  type?: 'date' | 'percent'
}

/** Adds a right-to-left sheet with a styled header row, frozen header and auto-filter. */
export function addSheet<T>(wb: ExcelJS.Workbook, name: string, columns: Column<T>[], rows: T[], title?: string) {
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: title ? 2 : 1 }] })
  if (title) {
    ws.addRow([title])
    ws.mergeCells(1, 1, 1, columns.length)
    const c = ws.getCell(1, 1)
    c.font = { bold: true, size: 13 }
    c.alignment = { horizontal: 'right' }
  }
  const header = ws.addRow(columns.map((c) => c.header))
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
    cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }
  })
  for (const r of rows) {
    const row = ws.addRow(
      columns.map((c) => {
        const v = c.value(r)
        if (c.type === 'date' && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + 'T00:00:00Z')
        return v ?? ''
      }),
    )
    columns.forEach((c, i) => {
      const cell = row.getCell(i + 1)
      cell.alignment = { horizontal: 'right', vertical: 'top', wrapText: true }
      if (c.type === 'date') cell.numFmt = 'yyyy-mm-dd'
      if (c.type === 'percent' && typeof cell.value === 'number') cell.numFmt = '0"%"'
    })
  }
  columns.forEach((c, i) => (ws.getColumn(i + 1).width = c.width ?? 18))
  const headerRow = title ? 2 : 1
  ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: columns.length } }
  return ws
}

export async function xlsxResponse(wb: ExcelJS.Workbook, fileName: string, asciiName: string) {
  const buf = await wb.xlsx.writeBuffer()
  const ascii = asciiName
  return new Response(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'private, no-store',
    },
  })
}

export function newWorkbook() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'متابعة المهام'
  wb.created = new Date()
  return wb
}
