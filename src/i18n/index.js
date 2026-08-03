import en from './en.js'
import km from './km.js'

export const LANG_KEY = 'management_lang'
export const LANGS = { EN: 'en', KM: 'km' }

const DICTS = { en, km }

/** Route path → nav i18n key */
export const NAV_LABEL_KEYS = {
  '/': 'nav.dashboard',
  '/students/register': 'nav.studentRegister',
  '/students/classes': 'nav.classManagement',
  '/students/attendance': 'nav.classAttendance',
  '/students/dateline': 'nav.studentDateline',
  '/students/payment': 'nav.studentPayment',
  '/students/book': 'nav.studentBook',
  '/students/finish': 'nav.studentFinish',
  '/stock/category': 'nav.category',
  '/stock/product': 'nav.product',
  '/stock/pos': 'nav.pos',
  '/stock/report': 'nav.stockReport',
  '/finance/overview': 'nav.financeOverview',
  '/finance/tuition': 'nav.tuition',
  '/finance/pos-revenue': 'nav.posRevenue',
  '/finance/pending': 'nav.pendingPayments',
  '/finance/cash-flow': 'nav.cashFlow',
  '/finance/methods': 'nav.paymentMethods',
  '/finance/purpose': 'nav.feePurpose',
  '/finance/monthly': 'nav.monthlySummary',
  '/finance/profit-loss': 'nav.profitLoss',
  '/finance/student-ledger': 'nav.studentLedger',
  '/finance/salary': 'nav.salary',
  '/finance/expenses': 'nav.expenses',
  '/admin/teachers': 'nav.teachers',
  '/admin/staff': 'nav.staff',
  '/admin/users': 'nav.users',
  '/admin/audit-log': 'nav.auditLog',
}

export const SECTION_LABEL_KEYS = {
  Dashboard: 'nav.section.dashboard',
  'Student Management': 'nav.section.students',
  'Stock Management': 'nav.section.stock',
  Finance: 'nav.section.finance',
  Administration: 'nav.section.admin',
}

export function getRoleLabelKey(role) {
  return `roles.${role}`
}

export function translate(lang, key, vars) {
  const dict = DICTS[lang] || en
  let text = dict[key] ?? en[key] ?? key
  if (vars && typeof text === 'string') {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v ?? ''))
    }
  }
  return text
}

export function readStoredLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored === LANGS.EN || stored === LANGS.KM) return stored
  } catch {
    /* ignore */
  }
  return LANGS.EN
}
