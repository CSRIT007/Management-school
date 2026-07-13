export default function TableExportHeader({ title, subtitle, count, children }) {
  const heading = count == null ? title : `${title} (${count})`

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{heading}</h3>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
