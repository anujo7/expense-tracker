import { useMemo } from 'react'
import { LogOut } from 'lucide-react'
import { CategoryManager } from '../components/categories/CategoryManager'
import { BudgetSettings } from '../components/budget/BudgetSettings'
import { Button } from '../components/ui/Button'
import { useAuth } from '../hooks/useAuth'
import { useExpenses } from '../hooks/useExpenses'
import { getCurrentMonth } from '../utils/format'
import { startOfMonth, endOfMonth } from 'date-fns'

export function SettingsPage() {
  const { user, signOut } = useAuth()

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const { expenses } = useExpenses({
    startDate: monthStart,
    endDate: monthEnd,
  })

  const currentMonthExpenses = useMemo(() => expenses, [expenses])

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-xl font-bold text-white">Settings</h1>

      <BudgetSettings expenses={currentMonthExpenses} />

      <CategoryManager />

      <div className="bg-dark-card border border-dark-border rounded-2xl p-5 space-y-4">
        <h3 className="text-lg font-semibold text-white">Account</h3>
        <p className="text-sm text-gray-400">{user?.email}</p>
        <Button variant="danger" onClick={signOut}>
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>
    </div>
  )
}
