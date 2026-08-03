export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:mb-6 sm:gap-4 sm:pb-6 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
