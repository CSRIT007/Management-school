import { SCHOOL_NAME } from './schoolBrand.js'
import { APP_TIMEZONE, formatDisplayDate } from './dateFormat.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellValue(column, row) {
  const raw = typeof column.getValue === 'function' ? column.getValue(row) : row[column.key]
  return raw == null ? '' : raw
}

export function exportDateStamp(date = new Date()) {
  return formatDisplayDate(date)
}

export function exportDateTimeStamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return formatDisplayDate(new Date())
  const day = formatDisplayDate(d)
  const time = d.toLocaleTimeString('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${day} ${time}`
}

export function reportFilename(reportTitle, date = new Date()) {
  const slug = String(reportTitle || 'report')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
  return `${slug}-${exportDateStamp(date)}.xls`
}

function excelStyles() {
  return `
    table { border-collapse: collapse; width: 100%; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
    td, th { border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top; }
    th { font-weight: bold; background: #f3f4f6; text-align: left; }
    .meta-school { text-align: left; font-weight: bold; border: none; font-size: 12pt; }
    .meta-title { text-align: center; font-weight: bold; border: none; font-size: 13pt; }
    .meta-download { text-align: right; border: none; color: #4b5563; font-size: 10pt; }
    .meta-gap td { border: none; height: 10px; }
    .section-title td { font-weight: bold; background: #eef2ff; border: 1px solid #c7d2fe; }
  `
}

function buildMetaRows(columnCount, { schoolName = SCHOOL_NAME, reportTitle, downloadedAt }) {
  const cols = Math.max(columnCount, 1)
  return `
    <tr>
      <td colspan="${cols}" class="meta-school">${escapeHtml(schoolName)}</td>
    </tr>
    <tr>
      <td colspan="${cols}" class="meta-title">${escapeHtml(reportTitle)}</td>
    </tr>
    <tr>
      <td colspan="${cols}" class="meta-download">Downloaded: ${escapeHtml(downloadedAt)}</td>
    </tr>
    <tr class="meta-gap"><td colspan="${cols}"></td></tr>
  `
}

function buildHeaderRow(columns) {
  return `<tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>`
}

function buildDataRows(columns, rows) {
  return rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${escapeHtml(cellValue(c, row))}</td>`).join('')}</tr>`
    )
    .join('')
}

function buildTableHtml(columns, rows, reportMeta) {
  const downloadedAt = exportDateTimeStamp()
  const meta = reportMeta
    ? buildMetaRows(columns.length, { ...reportMeta, downloadedAt })
    : ''

  return `
    <table>
      ${meta}
      ${buildHeaderRow(columns)}
      ${buildDataRows(columns, rows)}
    </table>
  `
}

function buildSectionsHtml(sections, reportMeta) {
  const maxCols = Math.max(...sections.map((s) => s.columns?.length || 0), 1)
  const downloadedAt = exportDateTimeStamp()
  const meta = reportMeta
    ? buildMetaRows(maxCols, { ...reportMeta, downloadedAt })
    : ''

  const body = sections
    .map((section, index) => {
      const parts = []
      if (index > 0) parts.push(`<tr class="meta-gap"><td colspan="${maxCols}"></td></tr>`)
      if (section.title) {
        parts.push(
          `<tr class="section-title"><td colspan="${maxCols}">${escapeHtml(section.title)}</td></tr>`
        )
      }
      if (section.columns?.length) {
        parts.push(buildHeaderRow(section.columns))
        parts.push(buildDataRows(section.columns, section.rows || []))
      }
      return parts.join('')
    })
    .join('')

  return `<table>${meta}${body}</table>`
}

function wrapExcelHtml(body) {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8" />
  <style>${excelStyles()}</style>
</head>
<body>${body}</body>
</html>`
}

function triggerDownload(filename, html) {
  const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xls') ? filename : `${filename.replace(/\.csv$/i, '')}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename, columns, rows, reportMeta) {
  if (!columns.length) return
  const html = wrapExcelHtml(buildTableHtml(columns, rows, reportMeta))
  triggerDownload(filename, html)
}

export function downloadCsvSections(filename, sections, reportMeta) {
  const html = wrapExcelHtml(buildSectionsHtml(sections, reportMeta))
  triggerDownload(filename, html)
}
