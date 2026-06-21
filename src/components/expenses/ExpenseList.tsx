import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { CategoryIcon } from '../ui/CategoryIcon'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { ExpenseModal } from './ExpenseModal'
import { useExpenses } from '../../hooks/useExpenses'
import { formatINR, formatDate, formatTime } from '../../utils/format'
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

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-1">No expenses yet</p>
        <p className="text-sm">Tap the + button to add your first expense</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {expenses.map(expense => (
          <div
            key={expense.id}
            className="flex items-center gap-3 p-3.5 bg-dark-card rounded-xl border border-dark-border hover:border-gray-700 transition-colors group"
          >
            <CategoryIcon
              icon={expense.category?.icon || 'tag'}
              color={expense.category?.color || '#6b7280'}
              size={18}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-white truncate">
                  {expense.category?.name || 'Uncategorized'}
                </span>
                {expense.note && (
                  <span className="text-xs text-gray-500 truncate">{expense.note}</span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {formatDate(expense.expense_date)} · {formatTime(expense.expense_date)}
              </span>
            </div>

            <span className="text-sm font-semibold text-white whitespace-nowrap">
              {formatINR(expense.amount)}
            </span>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingExpense(expense)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-hover transition-colors"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setDeletingExpense(expense)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
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
