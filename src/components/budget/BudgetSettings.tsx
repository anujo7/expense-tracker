import { useState } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { CategoryIcon } from '../ui/CategoryIcon'
import { ProgressBar } from '../ui/ProgressBar'
import { useBudgets } from '../../hooks/useBudgets'
import { useCategories } from '../../hooks/useCategories'
import { formatINR, getCurrentMonth, getMonthLabel } from '../../utils/format'
import type { Expense } from '../../types'

interface BudgetSettingsProps {
  expenses: Expense[]
}

export function BudgetSettings({ expenses }: BudgetSettingsProps) {
  const { budget, categoryBudgets, setBudgetAmount, setCategoryBudgetAmount } = useBudgets()
  const { categories } = useCategories()
  const [totalInput, setTotalInput] = useState(budget?.total_budget?.toString() || '')
  const [catInputs, setCatInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const currentMonth = getCurrentMonth()

  const handleSaveTotal = async () => {
    const amount = parseFloat(totalInput)
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setSaving('total')
    const { error } = await setBudgetAmount(amount)
    setSaving(null)
    if (error) toast.error('Failed to save budget')
    else toast.success('Budget updated')
  }

  const handleSaveCategoryBudget = async (categoryId: string) => {
    const input = catInputs[categoryId]
    const amount = parseFloat(input)
    if (isNaN(amount) || amount < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setSaving(categoryId)
    const { error } = await setCategoryBudgetAmount(categoryId, amount)
    setSaving(null)
    if (error) toast.error('Failed to save category budget')
    else toast.success('Category budget updated')
  }

  const getSpentForCategory = (categoryId: string) =>
    expenses
      .filter(e => e.category_id === categoryId)
      .reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white/90 mb-1">Budget for {getMonthLabel(currentMonth)}</h3>
        <p className="text-sm text-white/30 mb-4">Set your spending limits</p>
      </div>

      <motion.div
        className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h4 className="text-sm font-medium text-white/60">Overall Monthly Budget</h4>
        <div className="flex gap-3">
          <Input
            type="number"
            inputMode="decimal"
            placeholder="e.g. 30000"
            value={totalInput}
            onChange={e => setTotalInput(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleSaveTotal} loading={saving === 'total'}>
            Save
          </Button>
        </div>
      </motion.div>

      <motion.div
        className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h4 className="text-sm font-medium text-white/60">Per-Category Budgets</h4>
        <div className="space-y-3">
          {categories.map(cat => {
            const catBudget = categoryBudgets.find(cb => cb.category_id === cat.id)
            const spent = getSpentForCategory(cat.id)
            const budgetVal = catBudget?.budget_amount || 0
            const inputVal = catInputs[cat.id] ?? (catBudget?.budget_amount?.toString() || '')

            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <CategoryIcon icon={cat.icon} color={cat.color} size={16} />
                  <span className="text-sm text-white/60 flex-1">{cat.name}</span>
                  {budgetVal > 0 && (
                    <span className="text-xs text-white/30">
                      {formatINR(spent)} / {formatINR(budgetVal)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="No limit"
                    value={inputVal}
                    onChange={e =>
                      setCatInputs(prev => ({ ...prev, [cat.id]: e.target.value }))
                    }
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveCategoryBudget(cat.id)}
                    loading={saving === cat.id}
                  >
                    Set
                  </Button>
                </div>
                {budgetVal > 0 && <ProgressBar value={spent} max={budgetVal} />}
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
