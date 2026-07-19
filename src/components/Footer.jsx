import {
  SCHOOL_NAME,
  SCHOOL_WEBSITE,
  SCHOOL_EMAIL,
  SCHOOL_LOCATION_LINE,
} from '../lib/schoolBrand.js'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-col items-center justify-between gap-3 px-6 py-4 text-xs text-slate-500 dark:text-slate-400 sm:flex-row lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white">
            MS
          </div>
          <span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{SCHOOL_NAME}</span>
            {' · '}
            © {year}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span className="hidden sm:inline">{SCHOOL_WEBSITE}</span>
          <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:inline" />
          <span>{SCHOOL_EMAIL}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>{SCHOOL_LOCATION_LINE}</span>
        </div>
      </div>
    </footer>
  )
}
