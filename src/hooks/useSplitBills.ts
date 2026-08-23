import { useCallback, useEffect, useId, useState } from 'react'
import { supabase } from '../lib/supabase'
import { billTotal, billBalances, settle, itemShares } from '../utils/split'
import { useAuth } from './useAuth'
import type { SplitBill, SplitPerson, SplitItem, SplitPayment } from '../types'

export interface SplitBillInput {
  title: string
  bill_date: string
  trip: string | null
  people: SplitPerson[]
  items: SplitItem[]
}

export function useSplitBills() {
  const { user } = useAuth()
  const channelId = useId()
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

    if (!error && data) setBills(data.map(b => ({ ...b, payments: b.payments ?? [], trip: b.trip ?? null })))
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchBills()
  }, [fetchBills])

  // ponytail: realtime via supabase channel, refetches on any change — so a
  // friend settling up shows on your screen without a reload.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`split-bills-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_bills' }, () => {
        fetchBills()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, channelId, fetchBills])

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

  // Appends in the database (see append_split_payment) rather than writing back
  // a locally-built array: two people settling at once must not overwrite each
  // other's payment.
  const recordPayment = async (bill: SplitBill, payment: Omit<SplitPayment, 'id' | 'paid_on'>) => {
    const { data, error } = await supabase
      .rpc('append_split_payment', {
        bill_id: bill.id,
        payment: { ...payment, id: crypto.randomUUID(), paid_on: new Date().toISOString().slice(0, 10) },
      })
      .single<SplitBill>()

    if (!error && data) setBills(prev => prev.map(b => (b.id === bill.id ? data : b)))
    return { error }
  }

  const postNotify = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { sent: 0, error: 'Not authenticated' }
    const res = await fetch('/api/split-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    const sent = (json.sent as number) ?? 0
    if (!res.ok || sent === 0) {
      return { sent: 0, error: (json.error as string) || `Failed to send (HTTP ${res.status})` }
    }
    return { sent }
  }

  // The API function cannot import the money math (it lives outside api/, so it
  // is never in the function bundle), so the split is computed here and posted.
  const computeSplit = (bill: SplitBill) => {
    const balances = billBalances(bill.people, bill.items)
    return {
      total: billTotal(bill.items),
      balances,
      settlements: settle(balances, bill.payments ?? []),
      items: bill.items.map(item => ({
        label: item.label,
        amount: item.amount,
        payer_id: item.payer_id,
        shares: Object.fromEntries(
          Object.entries(itemShares(item)).map(([id, paise]) => [id, paise / 100])
        ),
      })),
    }
  }

  const notifyPeople = (bill: SplitBill) => postNotify({ billId: bill.id, computed: computeSplit(bill) })

  // Invite one person: same email, framed as an invitation if they have no account yet.
  const invitePerson = (bill: SplitBill, personId: string) =>
    postNotify({ billId: bill.id, personId, invite: true, computed: computeSplit(bill) })

  // Registered users matching what you have typed, for the people picker.
  const searchPeople = async (q: string) => {
    if (q.trim().length < 2) return []
    const { data, error } = await supabase.rpc('search_app_users', { q: q.trim() })
    if (error) return []
    return (data ?? []) as { email: string; display_name: string }[]
  }

  const deleteBill = async (id: string) => {
    const { error } = await supabase.from('split_bills').delete().eq('id', id)
    if (!error) setBills(prev => prev.filter(b => b.id !== id))
    return { error }
  }

  return { bills, loading, addBill, updateBill, deleteBill, recordPayment, notifyPeople, invitePerson, searchPeople, refetch: fetchBills }
}
