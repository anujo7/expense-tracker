import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, BarChart3, Settings, Wallet, Users } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/split', icon: Users, label: 'Split' },
  { to: '/summary', icon: BarChart3, label: 'Summary' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="hidden sm:flex flex-col w-64 h-screen backdrop-blur-2xl bg-white/[0.02] border-r border-white/[0.08] fixed left-0 top-0 z-20">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-white/[0.08]">
        <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
          <Wallet size={16} className="text-violet-400" />
        </div>
        <span className="font-semibold text-white/90 text-base">Expense Tracker</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/20 shadow-sm shadow-violet-500/10'
                  : 'text-white/50 hover:text-white/85 hover:bg-white/[0.06] border border-transparent'
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
