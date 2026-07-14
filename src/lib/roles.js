export const ROLES = {
  ADMIN: 'admin',
  SCHOOL_ADMIN: 'school_admin',
  FINANCE: 'finance',
  TEACHER: 'teacher',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SCHOOL_ADMIN]: 'School Admin',
  [ROLES.FINANCE]: 'Finance',
  [ROLES.TEACHER]: 'Teacher',
}

const ROUTE_ACCESS = {
  '/': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE, ROLES.TEACHER],
  '/students/register': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE, ROLES.TEACHER],
  '/students/classes': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER],
  '/students/dateline': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER],
  '/students/payment': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/students/book': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER],
  '/students/finish': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.TEACHER],
  '/stock/category': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN],
  '/stock/product': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/stock/pos': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/stock/report': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/overview': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/tuition': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/pos-revenue': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/pending': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/cash-flow': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/methods': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/purpose': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/monthly': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/finance/student-ledger': [ROLES.ADMIN, ROLES.SCHOOL_ADMIN, ROLES.FINANCE],
  '/admin/users': [ROLES.ADMIN],
}

export const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: 'home' }],
  },
  {
    section: 'Student Management',
    items: [
      { to: '/students/register', label: 'Student Register', icon: 'user' },
      { to: '/students/classes', label: 'Class Management', icon: 'class' },
      { to: '/students/dateline', label: 'Student & Dateline', icon: 'calendar' },
      { to: '/students/payment', label: 'Student & Payment', icon: 'payment' },
      { to: '/students/book', label: 'Student & Book', icon: 'book' },
      { to: '/students/finish', label: 'Student & Finish', icon: 'graduate' },
    ],
  },
  {
    section: 'Stock Management',
    items: [
      { to: '/stock/category', label: 'Category', icon: 'tag' },
      { to: '/stock/product', label: 'Product', icon: 'box' },
      { to: '/stock/pos', label: 'Point of Sale', icon: 'cart' },
      { to: '/stock/report', label: 'Stock Report', icon: 'chart' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/finance/overview', label: 'Financial Overview', icon: 'finance' },
      { to: '/finance/tuition', label: 'Tuition & Fees', icon: 'payment' },
      { to: '/finance/pos-revenue', label: 'POS Revenue', icon: 'cart' },
      { to: '/finance/pending', label: 'Pending Payments', icon: 'pending' },
      { to: '/finance/cash-flow', label: 'Daily Cash Flow', icon: 'cashflow' },
      { to: '/finance/methods', label: 'Payment Methods', icon: 'methods' },
      { to: '/finance/purpose', label: 'Fee Purpose Report', icon: 'purpose' },
      { to: '/finance/monthly', label: 'Monthly Summary', icon: 'monthly' },
      { to: '/finance/student-ledger', label: 'Student Ledger', icon: 'ledger' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/admin/users', label: 'User Management', icon: 'users' },
    ],
  },
]

export function canAccessRoute(role, path) {
  const allowed = ROUTE_ACCESS[path]
  if (!allowed) return true
  return allowed.includes(role)
}

/** Roles that can create/edit tuition payments */
export function canEditPayments(role) {
  return role === ROLES.ADMIN || role === ROLES.FINANCE
}

/** Roles that can export finance reports */
export function canExportFinance(role) {
  return role === ROLES.ADMIN || role === ROLES.FINANCE || role === ROLES.SCHOOL_ADMIN
}

export function getNavItemsForRole(role) {
  return NAV_ITEMS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessRoute(role, item.to)),
  })).filter((group) => group.items.length > 0)
}

export function getDefaultRouteForRole(role) {
  if (role === ROLES.FINANCE && canAccessRoute(role, '/finance/overview')) {
    return '/finance/overview'
  }
  if (canAccessRoute(role, '/')) return '/'
  const first = getNavItemsForRole(role)[0]?.items[0]?.to
  return first || '/login'
}

export const ROLE_OPTIONS = Object.values(ROLES).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}))
