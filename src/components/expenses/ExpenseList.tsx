import { useState } from 'react'
import { Pencil, Trash2, Wifi, Banknote } from 'lucide-react'
import { format, isSameDay, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { CategoryIcon } from '../ui/CategoryIcon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { ExpenseModal } from './ExpenseModal'
import { useExpenses } from '../../hooks/useExpenses'
import { formatINR, formatTime } from '../../utils/format'
import type { Expense } from '../../types'

interface ExpenseListProps {
  expenses: Expense[]
  onUpdate?: () => void
}

export function ExpenseList({ expenses, onUpdate }: ExpenseListProps) {
  const { deleteExpense } = useExpenses()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDelete = async () => {
    if (!deletingExpense) return
    setDeleteLoading(true)
    const { error } = await deleteExpense(deletingExpense.id)
    setDeleteLoading(false)
    if (error) {
      toast.error('Failed to delete expense')
    } else {
      toast.success('Expense deleted')
      onUpdate?.()
    }
    setDeletingExpense(null)
  }

  const today = new Date()
  const yesterday = subDays(today, 1)

  const grouped = (() => {
    const map = new Map<string, Expense[]>()
    for (const expense of expenses) {
      const key = format(new Date(expense.expense_date), 'yyyy-MM-dd')
      const group = map.get(key) || []
      group.push(expense)
      map.set(key, group)
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  })()

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isSameDay(date, today)) return 'Today'
    if (isSameDay(date, yesterday)) return 'Yesterday'
    return format(date, 'EEEE, d MMM')
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        title="No expenses yet"
        subtitle="Tap the + button to add your first expense"
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        {grouped.map(([dateKey, groupExpenses]) => {
          const dayTotal = groupExpenses.reduce((sum, e) => sum + e.amount, 0)
          return (
            <div key={dateKey}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-medium text-white/40 uppercase tracking-wide">
                  {getDayLabel(dateKey)}
                </span>
                <span className="text-xs font-medium text-white/40">
                  {formatINR(dayTotal)}
                </span>
              </div>
              <div className="space-y-2">
                {groupExpenses.map((expense, index) => (
                  <motion.div
                    key={expense.id}
                    className="flex items-center gap-3 p-3.5 backdrop-blur-xl bg-white/[0.03] rounded-xl border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-200 group"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                  >
                    <CategoryIcon
                      icon={expense.category?.icon || 'tag'}
                      color={expense.category?.color || '#6b7280'}
                      size={18}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-white/90 truncate">
                          {expense.category?.name || 'Uncategorized'}
                        </span>
                        {expense.note && (
                          <span className="text-xs text-white/30 truncate">{expense.note}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-white/30">{formatTime(expense.expense_date)}</span>
                        {expense.payment_mode === 'cash'
                          ? <Banknote size={11} className="text-emerald-500/60" />
                          : <Wifi size={11} className="text-violet-500/60" />}
                      </div>
                    </div>

                    <span className="text-sm font-semibold text-white/90 whitespace-nowrap">
                      {formatINR(expense.amount)}
                    </span>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-200"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingExpense(expense)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <ExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        onSaved={onUpdate}
      />

      <ConfirmDialog
        isOpen={!!deletingExpense}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Are you sure you want to delete this ${formatINR(deletingExpense?.amount || 0)} expense?`}
        loading={deleteLoading}
      />
    </>
  )
}
