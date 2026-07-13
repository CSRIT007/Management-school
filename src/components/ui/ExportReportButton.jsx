import { useEffect, useMemo, useState } from 'react'
import Button from './Button.jsx'
import { reportFilename } from '../../lib/exportCsv.js'

function toggleKey(list, key) {
  return list.includes(key) ? list.filter((k) => k !== key) : [...list, key]
}

export default function ExportReportButton({
  label = 'Download CSV',
  reportTitle,
  modalTitle,
  description,
  columnDefs,
  columnsLabel = 'Columns to include',
  getRows,
  getPreviewCount,
  filters,
  onDownload,
  disabled = false,
  size = 'md',
}) {
  const [open, setOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState(() =>
    columnDefs.filter((c) => c.defaultSelected !== false).map((c) => c.key)
  )
  const [filterState, setFilterState] = useState(() => filters?.initialState ?? {})

  useEffect(() => {
    if (!open) return
    setSelectedKeys(columnDefs.filter((c) => c.defaultSelected !== false).map((c) => c.key))
    setFilterState(filters?.initialState ?? {})
  }, [open, columnDefs, filters?.initialState])

  const selectedColumns = useMemo(
    () => columnDefs.filter((c) => selectedKeys.includes(c.key)),
    [columnDefs, selectedKeys]
  )

  const previewCount = useMemo(() => {
    if (!open) return 0
    if (getPreviewCount) return getPreviewCount(selectedKeys, filterState)
    if (getRows) return getRows(filterState).length
    return 0
  }, [open, getPreviewCount, getRows, filterState, selectedKeys])

  const allSelected = selectedKeys.length === columnDefs.length
  const dialogTitle = modalTitle || `Export ${reportTitle || 'Report'}`

  const handleDownload = () => {
    if (!selectedColumns.length) return
    const rows = getRows ? getRows(filterState) : []
    onDownload({
      columns: selectedColumns,
      rows,
      filterState,
      selectedKeys,
      reportTitle,
    })
    setOpen(false)
  }

  return (
    <>
      <Button type="button" variant="secondary" size={size} disabled={disabled} onClick={() => setOpen(true)}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        {label}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{dialogTitle}</h3>
              {description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
              )}
              {reportTitle && (
                <p className="mt-2 text-xs text-slate-400">
                  File: <span className="font-mono">{reportFilename(reportTitle)}</span>
                </p>
              )}
            </div>

            {filters?.render && (
              <div className="mb-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Filters
                </div>
                {filters.render(filterState, setFilterState)}
              </div>
            )}

            <div className="mb-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {columnsLabel}
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  onClick={() => setSelectedKeys(allSelected ? [] : columnDefs.map((c) => c.key))}
                >
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {columnDefs.map((col) => (
                  <label
                    key={col.key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/80"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedKeys.includes(col.key)}
                      onChange={() => setSelectedKeys((keys) => toggleKey(keys, col.key))}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </div>

            {(getRows || getPreviewCount) && (
              <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-200">{previewCount}</span>
                {' '}row{previewCount === 1 ? '' : 's'} will be exported
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleDownload} disabled={!selectedColumns.length}>
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
