import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { SplitBill, SplitPerson, SplitItem, SplitPayment } from '../types'

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
    // No user_id filter: RLS returns bills you own *and* bills you're listed on
    // (matched on your email in people[]), so a shared trip shows up for everyone.
    const { data, error } = await supabase
      .from('split_bills')
      .select('*')
      .order('bill_date', { ascending: false })

    if (!error && data) setBills(data.map(b => ({ ...b, payments: b.payments ?? [] })))
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

  const setPayments = async (billId: string, payments: SplitPayment[]) => {
    const { data, error } = await supabase
      .from('split_bills')
      .update({ payments })
      .eq('id', billId)
      .select()
      .single()

    if (!error && data) setBills(prev => prev.map(b => (b.id === billId ? data : b)))
    return { error }
  }

  const recordPayment = (bill: SplitBill, payment: Omit<SplitPayment, 'id' | 'paid_on'>) =>
    setPayments(bill.id, [
      ...(bill.payments ?? []),
      { ...payment, id: crypto.randomUUID(), paid_on: new Date().toISOString().slice(0, 10) },
    ])

  const removePayment = (bill: SplitBill, paymentId: string) =>
    setPayments(bill.id, (bill.payments ?? []).filter(p => p.id !== paymentId))

  const postNotify = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { sent: 0, error: 'Not authenticated' }
    const res = await fetch('/api/split-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    return res.ok ? { sent: json.sent as number } : { sent: 0, error: json.error || 'Failed to send' }
  }

  const notifyPeople = (billId: string) => postNotify({ billId })

  // Invite one person: same email, framed as an invitation if they have no account yet.
  const invitePerson = (billId: string, personId: string) =>
    postNotify({ billId, personId, invite: true })

  const deleteBill = async (id: string) => {
    const { error } = await supabase.from('split_bills').delete().eq('id', id)
    if (!error) setBills(prev => prev.filter(b => b.id !== id))
    return { error }
  }

  return { bills, loading, addBill, updateBill, deleteBill, recordPayment, removePayment, notifyPeople, invitePerson, refetch: fetchBills }
}
