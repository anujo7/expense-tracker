import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { CategoryIcon } from '../ui/CategoryIcon'
import { useCategories } from '../../hooks/useCategories'
import { useExpenses } from '../../hooks/useExpenses'
import { toLocalDatetimeString } from '../../utils/format'
import { Wifi, Banknote } from 'lucide-react'
import type { Expense, ExpenseFormData } from '../../types'

interface ExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  expense?: Expense | null
  onSaved?: () => void
}

export function ExpenseModal({ isOpen, onClose, expense, onSaved }: ExpenseModalProps) {
  const { categories } = useCategories()
  const { addExpense, updateExpense } = useExpenses()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ExpenseFormData>({
    amount: '',
    category_id: '',
    note: '',
    expense_date: toLocalDatetimeString(new Date()),
    payment_mode: 'online',
  })

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setForm({
          amount: String(expense.amount),
          category_id: expense.category_id || '',
          note: expense.note || '',
          expense_date: toLocalDatetimeString(new Date(expense.expense_date)),
          payment_mode: expense.payment_mode || 'online',
        })
      } else {
        setForm({
          amount: '',
          category_id: categories[0]?.id || '',
          note: '',
          expense_date: toLocalDatetimeString(new Date()),
          payment_mode: 'online',
        })
      }
    }
  }, [isOpen, expense, categories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setLoading(true)
    const formData = {
      ...form,
      expense_date: new Date(form.expense_date).toISOString(),
    }

    const { error } = expense
      ? await updateExpense(expense.id, formData)
      : await addExpense(formData)

    setLoading(false)
    if (error) {
      toast.error(`Failed to ${expense ? 'update' : 'add'} expense`)
    } else {
      toast.success(`Expense ${expense ? 'updated' : 'added'}`)
      onSaved?.()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={expense ? 'Edit Expense' : 'Add Expense'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-white/50 mb-1.5">Amount (₹)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            className="w-full backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-4 text-white/90 text-2xl font-semibold placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all duration-200"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/50 mb-2">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, category_id: cat.id }))}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-200 ${
                  form.category_id === cat.id
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size={18} />
                <span className="text-[10px] text-white/40 truncate w-full text-center">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/50 mb-2">Payment Mode</label>
          <div className="grid grid-cols-2 gap-2">
            {(['online', 'cash'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm(f => ({ ...f, payment_mode: mode }))}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  form.payment_mode === mode
                    ? mode === 'online'
                      ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                      : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/[0.06] text-white/40 hover:border-white/[0.12]'
                }`}
              >
                {mode === 'online' ? <Wifi size={15} /> : <Banknote size={15} />}
                {mode === 'online' ? 'Online' : 'Cash'}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Note (optional)"
          type="text"
          placeholder="What was this for?"
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
        />

        <Input
          label="Date & Time"
          type="datetime-local"
          value={form.expense_date}
          onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
        />

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {expense ? 'Update' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
