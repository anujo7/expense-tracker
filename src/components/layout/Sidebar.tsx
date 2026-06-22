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
    <aside className="hidden sm:flex flex-col w-64 h-screen backdrop-blur-2xl bg-white/[0.02] border-r border-white/[0.06] fixed left-0 top-0 z-20">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-white/[0.06]">
        <Wallet size={24} className="text-violet-400" />
        <span className="font-semibold text-white/90 text-lg">Expense Tracker</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-violet-500/15 text-violet-300'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.05]'
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
