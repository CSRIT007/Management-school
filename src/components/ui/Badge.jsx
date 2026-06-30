const styles = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-500/30',
  warning: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-500/30',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-500/30',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-400 dark:ring-sky-500/30',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600/30',
}

const statusMap = {
  Paid: 'success',
  Completed: 'success',
  Returned: 'success',
  Issued: 'warning',
  Pending: 'warning',
  Overdue: 'danger',
  Failed: 'danger',
}

export default function Badge({ status, variant, children }) {
  const tone = variant || statusMap[status] || 'neutral'
  const label = children || status

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        styles[tone],
      ].join(' ')}
    >
      {label}
    </span>
  )
}
