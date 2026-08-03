export default function DataTable({ columns, rows, emptyMessage = 'No data found' }) {
  return (
    <div className="-mx-3 overflow-hidden rounded-none border-y border-slate-200/80 bg-white shadow-sm sm:mx-0 sm:rounded-2xl sm:border dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    'whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-4 sm:py-3 dark:text-slate-400',
                    col.headerClassName,
                    col.className,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/60"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        'px-3 py-2.5 text-slate-700 sm:px-4 sm:py-3.5 dark:text-slate-300',
                        col.cellClassName || col.className,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
