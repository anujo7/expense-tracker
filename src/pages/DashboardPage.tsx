import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, TrendingDown, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { SpentCard } from '../components/dashboard/SpentCard'
import { InsightCard } from '../components/dashboard/InsightCard'
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
  startOfDay,
  endOfDay,
  subMonths,
  getDate,
} from 'date-fns'

export function DashboardPage() {
  const now = useMemo(() => new Date(), [])
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  const { expenses, loading: expLoading, refetch } = useExpenses({
    startDate: monthStart,
    endDate: monthEnd,
  })
  const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString()
  const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString()
  const { expenses: lastMonthExpenses, loading: lastMonthLoading } = useExpenses({
    startDate: lastMonthStart,
    endDate: lastMonthEnd,
  })
  const { budget, loading: budgetLoading } = useBudgets(getCurrentMonth())

  const totalThisMonth = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const totalLastMonth = useMemo(
    () => lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [lastMonthExpenses]
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
  }, [expenses, now])

  const totalToday = useMemo(() => {
    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)
    return expenses
      .filter(e => {
        const d = new Date(e.expense_date)
        return d >= dayStart && d <= dayEnd
      })
      .reduce((sum, e) => sum + e.amount, 0)
  }, [expenses, now])

  const avgDailySpend = useMemo(() => {
    const dayOfMonth = getDate(now)
    return dayOfMonth > 0 ? totalThisMonth / dayOfMonth : 0
  }, [totalThisMonth, now])

  const momChange = useMemo(() => {
    if (totalLastMonth === 0) return undefined
    return ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
  }, [totalThisMonth, totalLastMonth])

  const recentExpenses = expenses.slice(0, 15)
  const loading = expLoading || budgetLoading || lastMonthLoading

  return (
    <motion.div
      className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="sm:hidden">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/50">
          Dashboard
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <div className="grid grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : (
        <>
          <BudgetCard spent={totalThisMonth} budget={budget?.total_budget || 0} />
          <div className="grid grid-cols-2 gap-4">
            <SpentCard total={totalToday} label="Today" />
            <SpentCard total={totalThisWeek} label="This Week" />
            <div className="col-span-2">
              <SpentCard total={totalThisMonth} label="This Month" prominent />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InsightCard
              value={avgDailySpend}
              label="Avg/day"
              icon={<CalendarDays size={16} />}
            />
            <InsightCard
              value={totalLastMonth}
              label="Last month"
              change={momChange}
              icon={momChange !== undefined && momChange >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            />
          </div>
        </>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white/80">Recent Expenses</h2>
          <Link
            to="/expenses"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {loading ? <ListSkeleton /> : <ExpenseList expenses={recentExpenses} onUpdate={refetch} />}
      </div>
    </motion.div>
  )
}
