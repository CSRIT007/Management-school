import { LANGS } from '../i18n/index.js'
import { useLanguage } from '../context/LanguageContext.jsx'

export default function LanguageSwitcher({ className = '' }) {
  const { lang, setLang, t } = useLanguage()

  return (
    <div
      className={[
        'inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800',
        className,
      ].join(' ')}
      role="group"
      aria-label={t('lang.switch')}
    >
      <button
        type="button"
        onClick={() => setLang(LANGS.EN)}
        className={[
          'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
          lang === LANGS.EN
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
        ].join(' ')}
      >
        {t('lang.en')}
      </button>
      <button
        type="button"
        onClick={() => setLang(LANGS.KM)}
        className={[
          'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
          lang === LANGS.KM
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
        ].join(' ')}
      >
        {t('lang.km')}
      </button>
    </div>
  )
}
