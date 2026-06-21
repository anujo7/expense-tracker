import { useState, useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isSameDay,
} from 'date-fns'
import { SpentCard } from '../components/dashboard/SpentCard'
import { CategoryBreakdown } from '../components/summary/CategoryBreakdown'
import { SpendingChart } from '../components/summary/SpendingChart'
import { CardSkeleton } from '../components/ui/Skeleton'
import { useExpenses } from '../hooks/useExpenses'
import type { TimeRange, Category } from '../types'

const tabs: { key: TimeRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
]

function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const now = new Date()
  switch (range) {
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now) }
  }
}

export function SummaryPage() {
  const [range, setRange] = useState<TimeRange>('month')
  const { start, end } = getDateRange(range)

  const { expenses, loading } = useExpenses({
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  })

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  )

  const categoryData = useMemo(() => {
    const map = new Map<string, { category: Category; amount: number }>()
    for (const e of expenses) {
      if (!e.category) continue
      const key = e.category.id
      const existing = map.get(key)
      if (existing) {
        existing.amount += e.amount
      } else {
        map.set(key, { category: e.category, amount: e.amount })
      }
    }
    const items = Array.from(map.values()).sort((a, b) => b.amount - a.amount)
    return items.map(item => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }))
  }, [expenses, total])

  const chartData = useMemo(() => {
    if (range === 'year') {
      const months = eachMonthOfInterval({ start, end })
      return months.map(m => {
        const monthExpenses = expenses.filter(
          e => format(new Date(e.expense_date), 'yyyy-MM') === format(m, 'yyyy-MM')
        )
        return {
          label: format(m, 'MMM'),
          amount: monthExpenses.reduce((sum, e) => sum + e.amount, 0),
        }
      })
    }

    const days = eachDayOfInterval({ start, end })
    return days.map(d => {
      const dayExpenses = expenses.filter(e => isSameDay(new Date(e.expense_date), d))
      return {
        label: range === 'week' ? format(d, 'EEE') : format(d, 'd'),
        amount: dayExpenses.reduce((sum, e) => sum + e.amount, 0),
      }
    })
  }, [expenses, range, start, end])

  const rangeLabel = range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'This Year'

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-white">Spending Summary</h1>

      <div className="flex bg-dark-card border border-dark-border rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setRange(tab.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              range === tab.key
                ? 'bg-accent text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <>
          <SpentCard total={total} label={rangeLabel} />

          <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              {range === 'year' ? 'Monthly Trend' : 'Daily Spending'}
            </h3>
            <SpendingChart data={chartData} />
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Category Breakdown</h3>
            <CategoryBreakdown data={categoryData} />
          </div>
        </>
      )}
    </div>
  )
}
