import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { Expense, ExpenseFormData } from '../types'

interface UseExpensesOptions {
  startDate?: string
  endDate?: string
  categoryId?: string
  limit?: number
}

export function useExpenses(options: UseExpensesOptions = {}) {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    if (!user) return
    setLoading(true)

    let query = supabase
      .from('expenses')
      .select('*, category:categories(*)')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })

    if (options.startDate) {
      query = query.gte('expense_date', options.startDate)
    }
    if (options.endDate) {
      query = query.lte('expense_date', options.endDate)
    }
    if (options.categoryId) {
      query = query.eq('category_id', options.categoryId)
    }
    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (!error && data) setExpenses(data)
    setLoading(false)
  }, [user, options.startDate, options.endDate, options.categoryId, options.limit])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const addExpense = async (formData: ExpenseFormData) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        category_id: formData.category_id || null,
        note: formData.note,
        expense_date: formData.expense_date,
        payment_mode: formData.payment_mode,
      })
      .select('*, category:categories(*)')
      .single()

    if (!error && data) {
      setExpenses(prev => [data, ...prev])
    }
    return { data, error }
  }

  const updateExpense = async (id: string, formData: ExpenseFormData) => {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        amount: parseFloat(formData.amount),
        category_id: formData.category_id || null,
        note: formData.note,
        expense_date: formData.expense_date,
        payment_mode: formData.payment_mode,
      })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single()

    if (!error && data) {
      setExpenses(prev => prev.map(e => (e.id === id ? data : e)))
    }
    return { data, error }
  }

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) setExpenses(prev => prev.filter(e => e.id !== id))
    return { error }
  }

  return { expenses, loading, addExpense, updateExpense, deleteExpense, refetch: fetchExpenses }
}
