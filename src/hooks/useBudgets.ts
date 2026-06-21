import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { getCurrentMonth } from '../utils/format'
import type { Budget, CategoryBudget } from '../types'

export function useBudgets(month?: string) {
  const { user } = useAuth()
  const [budget, setBudget] = useState<Budget | null>(null)
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([])
  const [loading, setLoading] = useState(true)
  const currentMonth = month || getCurrentMonth()

  const fetchBudgets = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [budgetRes, catBudgetRes] = await Promise.all([
      supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle(),
      supabase
        .from('category_budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth),
    ])

    if (budgetRes.data) setBudget(budgetRes.data)
    if (catBudgetRes.data) setCategoryBudgets(catBudgetRes.data)
    setLoading(false)
  }, [user, currentMonth])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const setBudgetAmount = async (totalBudget: number) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        { user_id: user.id, month: currentMonth, total_budget: totalBudget },
        { onConflict: 'user_id,month' }
      )
      .select()
      .single()

    if (!error && data) setBudget(data)
    return { data, error }
  }

  const setCategoryBudgetAmount = async (categoryId: string, amount: number) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('category_budgets')
      .upsert(
        {
          user_id: user.id,
          category_id: categoryId,
          month: currentMonth,
          budget_amount: amount,
        },
        { onConflict: 'user_id,category_id,month' }
      )
      .select()
      .single()

    if (!error && data) {
      setCategoryBudgets(prev => {
        const exists = prev.find(cb => cb.category_id === categoryId)
        if (exists) return prev.map(cb => (cb.category_id === categoryId ? data : cb))
        return [...prev, data]
      })
    }
    return { data, error }
  }

  const deleteCategoryBudget = async (categoryId: string) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { error } = await supabase
      .from('category_budgets')
      .delete()
      .eq('user_id', user.id)
      .eq('category_id', categoryId)
      .eq('month', currentMonth)

    if (!error) {
      setCategoryBudgets(prev => prev.filter(cb => cb.category_id !== categoryId))
    }
    return { error }
  }

  return {
    budget,
    categoryBudgets,
    loading,
    setBudgetAmount,
    setCategoryBudgetAmount,
    deleteCategoryBudget,
    refetch: fetchBudgets,
  }
}
