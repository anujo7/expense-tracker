import { useMemo } from 'react'
import { LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
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
    <motion.div
      className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/50">
        Settings
      </h1>

      <BudgetSettings expenses={currentMonthExpenses} />

      <CategoryManager />

      <motion.div
        className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-white/90">Account</h3>
        <p className="text-sm text-white/40">{user?.email}</p>
        <Button variant="danger" onClick={signOut}>
          <LogOut size={16} />
          Sign Out
        </Button>
      </motion.div>
    </motion.div>
  )
}
