import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LANG_KEY, LANGS, readStoredLang, translate } from '../i18n/index.js'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.classList.toggle('lang-km', lang === LANGS.KM)
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const setLang = useCallback((next) => {
    if (next === LANGS.EN || next === LANGS.KM) setLangState(next)
  }, [])

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang])

  const value = useMemo(
    () => ({ lang, setLang, t, isKhmer: lang === LANGS.KM }),
    [lang, setLang, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
