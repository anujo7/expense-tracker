import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, X, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useSplitBills } from '../../hooks/useSplitBills'
import { billTotal, billBalances, settle, itemShares } from '../../utils/split'
import { formatINR } from '../../utils/format'
import type { SplitBill, SplitPerson, SplitItem, SplitMode } from '../../types'

interface SplitBillModalProps {
  isOpen: boolean
  onClose: () => void
  bill?: SplitBill | null
  onSaved?: () => void
}

function emptyItem(): SplitItem {
  return { id: crypto.randomUUID(), label: '', amount: 0, payer_id: '', mode: 'equal', participant_ids: [], exact: {} }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function BillSummary({ people, items }: { people: SplitPerson[]; items: SplitItem[] }) {
  const balances = billBalances(people, items)
  const settlements = settle(balances)
  const nameOf = (id: string) => people.find(p => p.id === id)?.name || '—'

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {balances.map(b => {
          const net = Math.abs(b.net) < 0.005 ? 0 : b.net
          return (
            <div key={b.person_id} className="flex items-center justify-between text-sm">
              <span className="text-white/70">{nameOf(b.person_id)}</span>
              {net === 0 ? (
                <span className="text-white/30">settled</span>
              ) : net > 0 ? (
                <span className="text-emerald-400">{formatINR(Math.abs(net))} gets back</span>
              ) : (
                <span className="text-red-400">{formatINR(Math.abs(net))} owes</span>
              )}
            </div>
          )
        })}
      </div>
      {settlements.length > 0 && (
        <div className="pt-2 mt-2 border-t border-white/[0.06] space-y-1">
          {settlements.map((s, i) => (
            <div key={i} className="text-xs text-white/40">
              {nameOf(s.from_id)} → {nameOf(s.to_id)} <span className="text-white/70">{formatINR(s.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SplitBillModal({ isOpen, onClose, bill, onSaved }: SplitBillModalProps) {
  const { addBill, updateBill } = useSplitBills()
  const [title, setTitle] = useState('')
  const [billDate, setBillDate] = useState(todayStr())
  const [people, setPeople] = useState<SplitPerson[]>([])
  const [items, setItems] = useState<SplitItem[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (bill) {
      setTitle(bill.title)
      setBillDate(bill.bill_date.slice(0, 10))
      setPeople(bill.people)
      setItems(bill.items)
    } else {
      setTitle('')
      setBillDate(todayStr())
      setPeople([])
      setItems([emptyItem()])
    }
    setNewPersonName('')
  }, [isOpen, bill])

  const addPerson = () => {
    const name = newPersonName.trim()
    if (!name) return
    setPeople(prev => [...prev, { id: crypto.randomUUID(), name }])
    setNewPersonName('')
  }

  const removePerson = (id: string) => {
    const remaining = people.filter(p => p.id !== id)
    setPeople(remaining)
    setItems(prev =>
      prev.map(item => {
        const participant_ids = item.participant_ids.filter(pid => pid !== id)
        const exact = { ...item.exact }
        delete exact[id]
        const payer_id = item.payer_id === id ? remaining[0]?.id || '' : item.payer_id
        return { ...item, participant_ids, exact, payer_id }
      })
    )
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id))
  const updateItem = (id: string, patch: Partial<SplitItem>) =>
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)))

  const toggleParticipant = (item: SplitItem, personId: string) => {
    const participant_ids = item.participant_ids.includes(personId)
      ? item.participant_ids.filter(id => id !== personId)
      : [...item.participant_ids, personId]
    updateItem(item.id, { participant_ids })
  }

  const updateExact = (item: SplitItem, personId: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value)
    updateItem(item.id, { exact: { ...item.exact, [personId]: num } })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Please enter a title')
    if (people.length === 0) return toast.error('Add at least one person')
    if (items.length === 0) return toast.error('Add at least one item')
    for (const item of items) {
      if (!item.amount || item.amount <= 0) return toast.error('Each item needs an amount')
      if (!item.payer_id) return toast.error('Each item needs a payer')
    }

    setLoading(true)
    const input = { title: title.trim(), bill_date: billDate, people, items }
    const { error } = bill ? await updateBill(bill.id, input) : await addBill(input)
    setLoading(false)

    if (error) {
      toast.error(`Failed to ${bill ? 'update' : 'add'} bill`)
    } else {
      toast.success('Bill saved')
      onSaved?.()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={bill ? 'Edit bill' : 'New bill'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Dinner at..." />
          <Input label="Date" type="date" value={billDate} onChange={e => setBillDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/50 mb-2">People</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newPersonName}
              onChange={e => setNewPersonName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPerson()
                }
              }}
              placeholder="Add a person"
              className="flex-1 min-w-0 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all duration-200"
            />
            <Button type="button" variant="secondary" onClick={addPerson}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {people.map(p => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-violet-500/50 bg-violet-500/10 text-violet-300"
              >
                {p.name}
                <button type="button" onClick={() => removePerson(p.id)} className="text-violet-300/60 hover:text-white">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/50 mb-2">Items</label>
          <div className="space-y-3">
            {items.map(item => {
              const shares = itemShares(item)
              const assigned = item.participant_ids.reduce((sum, id) => sum + (item.exact[id] || 0), 0)
              const remaining = item.amount - assigned
              return (
                <div key={item.id} className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={item.label}
                      onChange={e => updateItem(item.id, { label: e.target.value })}
                      placeholder="Drinks, Food, Tip..."
                      className="flex-1 min-w-0 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all duration-200"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={item.amount || ''}
                      onChange={e => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-24 shrink-0 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all duration-200"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-white/30 mb-1">Paid by</label>
                    <select
                      value={item.payer_id}
                      onChange={e => updateItem(item.id, { payer_id: e.target.value })}
                      className="w-full backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none focus:border-violet-500/50 transition-all duration-200"
                    >
                      <option value="">Select payer</option>
                      {people.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-white/30">Split between</label>
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, { participant_ids: people.map(p => p.id) })}
                        className="text-xs text-violet-300 hover:text-violet-200"
                      >
                        All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {people.map(p => {
                        const active = item.participant_ids.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleParticipant(item, p.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200 ${
                              active
                                ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                                : 'border-white/[0.08] text-white/40 hover:border-white/[0.15]'
                            }`}
                          >
                            {p.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(['equal', 'exact'] as SplitMode[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateItem(item.id, { mode })}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                          item.mode === mode
                            ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                            : 'border-white/[0.06] text-white/40 hover:border-white/[0.12]'
                        }`}
                      >
                        {mode === 'equal' ? 'Equally' : 'Custom'}
                      </button>
                    ))}
                  </div>

                  {item.mode === 'exact' ? (
                    <div className="space-y-1.5">
                      {item.participant_ids.map(pid => (
                        <div key={pid} className="flex items-center gap-2">
                          <span className="flex-1 min-w-0 text-xs text-white/50 truncate">
                            {people.find(p => p.id === pid)?.name}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            value={item.exact[pid] ?? ''}
                            onChange={e => updateExact(item, pid, e.target.value)}
                            placeholder="0.00"
                            className="w-20 shrink-0 backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1 text-xs text-white/90 placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-all duration-200"
                          />
                        </div>
                      ))}
                      <p className={`text-xs text-right ${Math.abs(remaining) < 0.005 ? 'text-emerald-400' : 'text-white/40'}`}>
                        {remaining >= 0
                          ? `${formatINR(remaining)} left to assign`
                          : `over by ${formatINR(Math.abs(remaining))}`}
                      </p>
                    </div>
                  ) : (
                    item.participant_ids.length > 0 && (
                      <div className="space-y-0.5">
                        {item.participant_ids.map(pid => (
                          <p key={pid} className="text-xs text-white/30">
                            {people.find(p => p.id === pid)?.name}: {formatINR((shares[pid] || 0) / 100)}
                          </p>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={addItem} className="mt-3">
            <Plus size={14} />
            Add item
          </Button>
        </div>

        {people.length > 0 && items.length > 0 && (
          <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.09] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">Total</span>
              <span className="text-sm font-semibold text-white/90">{formatINR(billTotal(items))}</span>
            </div>
            <BillSummary people={people} items={items} />
          </div>
        )}

        <div className="flex gap-3 pt-2 pb-1 border-t border-white/[0.06] -mx-6 px-6">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {bill ? 'Update' : 'Save bill'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
