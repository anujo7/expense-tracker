import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ListSkeleton } from '../components/ui/Skeleton'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { fireSettleUndoToast, type SettledEntry } from '../components/split/SettleUndoToast'
import { useSplitBills } from '../hooks/useSplitBills'
import { useAuth } from '../hooks/useAuth'
import { myPeopleTotals, paymentDelta, type PersonBillShare } from '../utils/split'
import { formatINR, formatDate } from '../utils/format'
import type { SplitBill } from '../types'

// One open tab: what it is, which way it runs, and a box to pay part of it.
function PersonBillRow({
  share,
  bill,
  onPay,
}: {
  share: PersonBillShare
  bill?: SplitBill
  onPay: (share: PersonBillShare, bill: SplitBill, amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const owed = Math.abs(share.net)
  const iPay = share.net < 0

  const submit = async (value: string) => {
    if (!bill) return
    const delta = paymentDelta(value, owed)
    if (delta < 0.005) return toast.error('Enter an amount to pay')
    setBusy(true)
    await onPay(share, bill, delta)
    setBusy(false)
    setAmount('')
  }

  return (
    <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.09] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">{share.title}</p>
          <p className="text-xs text-white/30">
            {bill ? formatDate(bill.bill_date) : '—'}
            {share.trip && ` · ${share.trip}`}
          </p>
        </div>
        <span className={`text-sm font-semibold shrink-0 ${iPay ? 'text-amber-400' : 'text-emerald-400'}`}>
          {iPay ? 'you owe ' : 'owes you '}
          {formatINR(owed)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          max={owed}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit(amount)}
          placeholder={`Part of ${formatINR(owed)}`}
          className="flex-1 min-w-0 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <Button size="sm" variant="secondary" loading={busy} onClick={() => submit(amount)}>
          Pay
        </Button>
        <Button size="sm" variant="ghost" loading={busy} onClick={() => submit(String(owed))}>
          All
        </Button>
      </div>
    </div>
  )
}

export function SplitPersonPage() {
  const { key = '' } = useParams()
  const personKey = decodeURIComponent(key)
  const { bills, loading, recordPayment, settleAll } = useSplitBills()
  const { user } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [settleLoading, setSettleLoading] = useState(false)

  const person = useMemo(
    () => myPeopleTotals(bills, user?.email).find(p => p.key === personKey),
    [bills, user?.email, personKey]
  )

  // Paying one tab: post the delta, then offer to take it straight back.
  const handlePay = async (share: PersonBillShare, bill: SplitBill, amount: number) => {
    const { error, payment } = await recordPayment(bill, {
      from_id: share.from_id,
      to_id: share.to_id,
      amount,
    })
    if (error || !payment) return void toast.error('Could not record that payment')
    fireSettleUndoToast(person?.name ?? '', [{ title: share.title, bill, payment }], recordPayment)
  }

  const handleSettleAll = async () => {
    setSettleLoading(true)
    const { name, results } = await settleAll(personKey, user?.email)
    setSettleLoading(false)
    setConfirmOpen(false)

    if (results.length === 0) return void toast('Nothing left to settle')
    const failed = results.filter(r => r.error)
    if (failed.length) toast.error(`Could not settle: ${failed.map(r => r.title).join(', ')}`)

    const done = results.filter(r => !r.error && r.bill && r.payment) as SettledEntry[]
    fireSettleUndoToast(name ?? '', done, recordPayment)
  }

  const iPay = (person?.net ?? 0) < 0
  const square = Math.abs(person?.net ?? 0) < 0.005

  return (
    <motion.div
      className="p-4 sm:p-8 max-w-2xl mx-auto space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Link to="/split" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
        <ArrowLeft size={14} />
        Split
      </Link>

      {loading ? (
        <ListSkeleton count={3} />
      ) : !person ? (
        <EmptyState
          title="Nothing outstanding"
          subtitle="Every bill with this person is settled"
          icon={<Users size={28} className="text-white/30" />}
        />
      ) : (
        <>
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/50 truncate">
                {person.name}
              </h1>
              <p className="text-sm text-white/30">
                {person.bills.length} open {person.bills.length === 1 ? 'tab' : 'tabs'}
              </p>
            </div>
            <p className={`text-lg font-semibold shrink-0 ${square ? 'text-white/40' : iPay ? 'text-amber-400' : 'text-emerald-400'}`}>
              {square ? 'square' : `${iPay ? 'you pay ' : 'you collect '}${formatINR(Math.abs(person.net))}`}
            </p>
          </div>

          <div className="space-y-3">
            {person.bills.map(share => (
              <PersonBillRow
                key={share.billId}
                share={share}
                bill={bills.find(b => b.id === share.billId)}
                onPay={handlePay}
              />
            ))}
          </div>

          <Button className="w-full" onClick={() => setConfirmOpen(true)}>
            <Check size={14} />
            Settle all {person.bills.length} {person.bills.length === 1 ? 'tab' : 'tabs'}
          </Button>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSettleAll}
        title="Settle up"
        message={`Record full payment on every open tab with ${person?.name ?? 'this person'}?`}
        loading={settleLoading}
      />
    </motion.div>
  )
}
