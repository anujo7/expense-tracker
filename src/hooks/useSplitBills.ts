import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { SplitBill, SplitPerson, SplitItem } from '../types'

export interface SplitBillInput {
  title: string
  bill_date: string
  people: SplitPerson[]
  items: SplitItem[]
}

export function useSplitBills() {
  const { user } = useAuth()
  const [bills, setBills] = useState<SplitBill[]>([])
  const [loading, setLoading] = useState(true)

  const fetchBills = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('split_bills')
      .select('*')
      .eq('user_id', user.id)
      .order('bill_date', { ascending: false })

    if (!error && data) setBills(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  const addBill = async (input: SplitBillInput) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }
    const { data, error } = await supabase
      .from('split_bills')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()

    if (!error && data) setBills(prev => [data, ...prev])
    return { data, error }
  }

  const updateBill = async (id: string, input: SplitBillInput) => {
    const { data, error } = await supabase
      .from('split_bills')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setBills(prev => prev.map(b => (b.id === id ? data : b)))
    }
    return { data, error }
  }

  const deleteBill = async (id: string) => {
    const { error } = await supabase.from('split_bills').delete().eq('id', id)
    if (!error) setBills(prev => prev.filter(b => b.id !== id))
    return { error }
  }

  return { bills, loading, addBill, updateBill, deleteBill, refetch: fetchBills }
}
