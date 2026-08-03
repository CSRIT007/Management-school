import {
  SCHOOL_WEBSITE,
  SCHOOL_EMAIL,
  SCHOOL_LOCATION_LINE,
} from '../lib/schoolBrand.js'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function Footer() {
  const year = new Date().getFullYear()
  const { t } = useLanguage()

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="safe-pb flex flex-col items-center justify-between gap-2 px-3 py-3 text-center text-xs text-slate-500 sm:gap-3 sm:px-6 sm:py-4 sm:text-left dark:text-slate-400 sm:flex-row lg:px-8">
        <div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t('footer.rights', { year })}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span className="hidden sm:inline">{SCHOOL_WEBSITE}</span>
          <span className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:inline" />
          <a href={`mailto:${SCHOOL_EMAIL}`} className="hover:text-slate-700 dark:hover:text-slate-200">
            {SCHOOL_EMAIL}
          </a>
        </div>

        <div className="flex max-w-full items-center gap-1.5 truncate">
          <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate">{SCHOOL_LOCATION_LINE}</span>
        </div>
      </div>
    </footer>
  )
}
