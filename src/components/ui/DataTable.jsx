export default function DataTable({ columns, rows, emptyMessage = 'No data found' }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 dark:bg-slate-800/80 dark:border-slate-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400',
                    col.className,
                  ].join(' ')}
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
                <tr key={row.id ?? i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={['px-4 py-3.5 text-slate-700 dark:text-slate-300', col.className].join(' ')}>
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
