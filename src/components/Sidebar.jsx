import { NavLink, useLocation } from 'react-router-dom'

const primary = '#4361ee'

function SectionTitle({ children }) {
  return (
    <div className="px-4 text-xs font-semibold text-gray-400 tracking-wider mt-5 mb-2">
      {children}
    </div>
  )
}

function Item({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'mx-2 flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
          'hover:bg-gray-100',
          isActive ? 'font-semibold' : 'text-gray-600',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: isActive ? primary : 'transparent' }}
          />
          <span className={""} style={{ color: isActive ? primary : undefined }}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed }) {
  const location = useLocation()
  // Show active section highlight based on current path
  const inStudent = location.pathname.startsWith('/students')
  const inStock = location.pathname.startsWith('/stock')

  return (
    <aside
      className={[
        'h-[calc(100vh-4rem)] sticky top-16 bg-white border-r border-gray-200 shadow-sm',
        'transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      ].join(' ')}
    >
      <nav className="py-4">
        <SectionTitle>STUDENT MANAGEMENT</SectionTitle>
        <div className="flex flex-col">
          <Item to="/students/register" label="Student" />
          <Item to="/students/classes" label="Class Management" />
          <Item to="/students/dateline" label="Student & Dateline" />
          <Item to="/students/payment" label="Student & Payment" />
          <Item to="/students/book" label="Student & Book" />
          <Item to="/students/finish" label="Student & Finish" />
        </div>

        <SectionTitle>STOCK MANAGEMENT</SectionTitle>
        <div className="flex flex-col">
          <Item to="/stock/category" label="Category" />
          <Item to="/stock/product" label="Product" />
          <Item to="/stock/pos" label="POS" />
          <Item to="/stock/report" label="Stock Report" />
        </div>

        {/* Visual cue on active section */}
        <div className="mt-4 px-4">
          <div className="text-xs text-gray-400">
            Active: <span className="font-semibold" style={{ color: primary }}>{inStudent ? 'Student' : inStock ? 'Stock' : 'Home'}</span>
          </div>
        </div>
      </nav>
    </aside>
  )
}

