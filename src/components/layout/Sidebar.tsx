import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, BarChart3, Settings, Wallet } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/summary', icon: BarChart3, label: 'Summary' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="hidden sm:flex flex-col w-64 h-screen bg-dark-card border-r border-dark-border fixed left-0 top-0">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-dark-border">
        <Wallet size={24} className="text-accent" />
        <span className="font-semibold text-white text-lg">Expense Tracker</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
