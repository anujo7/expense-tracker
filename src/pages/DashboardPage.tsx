import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { SpentCard } from '../components/dashboard/SpentCard'
import { BudgetCard } from '../components/dashboard/BudgetCard'
import { ExpenseList } from '../components/expenses/ExpenseList'
import { CardSkeleton, ListSkeleton } from '../components/ui/Skeleton'
import { useExpenses } from '../hooks/useExpenses'
import { useBudgets } from '../hooks/useBudgets'
import { getCurrentMonth } from '../utils/format'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'

export function DashboardPage() {
  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const { expenses, loading: expLoading, refetch } = useExpenses({
    startDate: monthStart,
    endDate: monthEnd,
  })
  const { budget, loading: budgetLoading } = useBudgets(getCurrentMonth())

  const totalThisMonth = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const totalThisWeek = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    return expenses
      .filter(e => {
        const d = new Date(e.expense_date)
        return d >= weekStart && d <= weekEnd
      })
      .reduce((sum, e) => sum + e.amount, 0)
  }, [expenses])

  const recentExpenses = expenses.slice(0, 15)
  const loading = expLoading || budgetLoading

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <div className="sm:hidden">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="grid grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : (
        <>
          <BudgetCard spent={totalThisMonth} budget={budget?.total_budget || 0} />
          <div className="grid grid-cols-2 gap-4">
            <SpentCard total={totalThisMonth} label="This Month" />
            <SpentCard total={totalThisWeek} label="This Week" />
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">Recent Expenses</h2>
          <Link
            to="/expenses"
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? <ListSkeleton /> : <ExpenseList expenses={recentExpenses} onUpdate={refetch} />}
      </div>
    </div>
  )
}
