import { useLanguage } from '../../context/LanguageContext.jsx'

const accents = {
  indigo: 'from-indigo-500 to-violet-600',
  emerald: 'from-emerald-500 to-teal-600',
  amber: 'from-amber-500 to-orange-500',
  rose: 'from-rose-500 to-pink-600',
}

export default function StatCard({ label, value, icon, accent = 'indigo' }) {
  const { isKhmer } = useLanguage()

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={
              isKhmer
                ? 'text-sm font-bold leading-snug text-slate-800 dark:text-slate-100'
                : 'text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400'
            }
          >
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
            {value}
          </p>
        </div>
        {icon && (
          <div className={`shrink-0 rounded-xl bg-gradient-to-br ${accents[accent]} p-2.5 text-white shadow-lg`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-gradient-to-br ${accents[accent]} opacity-[0.06] transition-transform group-hover:scale-110`} />
    </div>
  )
}
