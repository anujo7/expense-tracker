import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Users, Pencil, Trash2, Send, ChevronRight, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { ListSkeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { SplitBillModal, BillSummary } from '../components/split/SplitBillModal'
import { fireSettleUndoToast, type SettledEntry } from '../components/split/SettleUndoToast'
import { useSplitBills } from '../hooks/useSplitBills'
import { useAuth } from '../hooks/useAuth'
import { billTotal, findSelf, myBillPosition, myTotalPosition, myPeopleTotals, type MyPosition, type PersonTotal } from '../utils/split'
import { formatINR, formatDate } from '../utils/format'
import type { SplitBill } from '../types'

// What the signed-in user owes or is owed on this bill, after payments.
function YourPosition({ bill, email }: { bill: SplitBill; email?: string | null }) {
  const me = myBillPosition(bill, email)
  if (!me || (me.owes === 0 && me.getsBack === 0)) return null

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.07] px-3 py-2">
      {me.owes > 0 && (
        <p className="text-xs text-white/70">
          Your share <span className="font-semibold text-white/90">{formatINR(me.share)}</span> · paid{' '}
          <span className="text-emerald-400">{formatINR(me.paid)}</span> ·{' '}
          {me.remaining < 0.005 ? (
            <span className="text-emerald-400 font-semibold">all settled</span>
          ) : (
            <span className="text-amber-400 font-semibold">{formatINR(me.remaining)} left to pay</span>
          )}
        </p>
      )}
      {me.getsBack > 0 && (
        <p className="text-xs text-white/70">
          You're owed <span className="font-semibold text-white/90">{formatINR(me.getsBack)}</span> · received{' '}
          <span className="text-emerald-400">{formatINR(me.received)}</span> ·{' '}
          {me.toReceive < 0.005 ? (
            <span className="text-emerald-400 font-semibold">all settled</span>
          ) : (
            <span className="text-amber-400 font-semibold">{formatINR(me.toReceive)} to come back</span>
          )}
        </p>
      )}
    </div>
  )
}

// Your money across a set of bills: the whole list, or one trip.
function PositionTotals({ pos, compact }: { pos: MyPosition; compact?: boolean }) {
  const nothing = pos.share === 0 && pos.getsBack === 0
  if (nothing) return <span className="text-xs text-white/30">you're not on these</span>

  return (
    <span className={compact ? 'text-xs' : 'text-sm'}>
      <span className="text-white/40">your split </span>
      <span className="font-semibold text-white/90">{formatINR(pos.share)}</span>
      {pos.remaining >= 0.005 && (
        <span className="text-amber-400"> · {formatINR(pos.remaining)} to pay</span>
      )}
      {pos.toReceive >= 0.005 && (
        <span className="text-emerald-400"> · {formatINR(pos.toReceive)} to collect</span>
      )}
      {pos.remaining < 0.005 && pos.toReceive < 0.005 && (
        <span className="text-emerald-400"> · all settled</span>
      )}
    </span>
  )
}

// What is left between you and each person, summed over every bill. Tap a
// person to see which bills make up the total, and settle the lot in one go.
function PeopleTotals({
  people,
  onSettleAll,
}: {
  people: PersonTotal[]
  onSettleAll: (person: PersonTotal) => void
}) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  if (people.length === 0) return null

  return (
    <div className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.09] rounded-xl p-4 space-y-1">
      <p className="text-xs font-medium text-white/40 mb-1">Person by person</p>
      {people.map(p => {
        const open = openKey === p.key
        const square = Math.abs(p.net) < 0.005
        return (
          <div key={p.key}>
            <div className="w-full flex items-baseline justify-between gap-2 text-sm py-1.5">
              <span className="text-white/50 truncate flex items-baseline gap-1 min-w-0">
                <button
                  onClick={() => setOpenKey(open ? null : p.key)}
                  aria-expanded={open}
                  className="flex items-baseline gap-1 shrink-0 text-left hover:opacity-80 transition-opacity"
                >
                  <ChevronRight
                    size={13}
                    className={`shrink-0 self-center text-white/25 transition-transform ${open ? 'rotate-90' : ''}`}
                  />
                  {square ? 'Square with' : p.net < 0 ? 'You pay' : 'You collect from'}
                </button>
                <Link
                  to={`/split/person/${encodeURIComponent(p.key)}`}
                  className="font-medium text-white/90 truncate underline decoration-white/20 underline-offset-2 hover:decoration-white/60"
                >
                  {p.name}
                </Link>
              </span>
              <span
                className={`font-semibold shrink-0 ${square ? 'text-white/40' : p.net < 0 ? 'text-amber-400' : 'text-emerald-400'}`}
              >
                {square ? `${p.bills.length} open` : formatINR(Math.abs(p.net))}
              </span>
            </div>

            {open && (
              <div className="ml-[18px] mb-2 pl-3 border-l border-white/[0.08] space-y-1.5">
                {p.bills.map(b => (
                  <div key={b.billId} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-white/40 truncate">
                      {b.title}
                      {b.trip && <span className="text-white/20"> · {b.trip}</span>}
                    </span>
                    <span className={`shrink-0 ${b.net < 0 ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                      {b.net < 0 ? '-' : '+'}
                      {formatINR(Math.abs(b.net))}
                    </span>
                  </div>
                ))}
                <Button size="sm" variant="secondary" className="mt-1" onClick={() => onSettleAll(p)}>
                  <Check size={13} />
                  Settle all {p.bills.length === 1 ? 'of it' : `${p.bills.length} bills`}
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SplitPage() {
  const { bills, loading, deleteBill, recordPayment, settleAll, notifyPeople, refetch } = useSplitBills()
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<SplitBill | null>(null)
  const [deletingBill, setDeletingBill] = useState<SplitBill | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)
  const [settlingPerson, setSettlingPerson] = useState<PersonTotal | null>(null)
  const [settleLoading, setSettleLoading] = useState(false)

  const isOwner = (bill: SplitBill) => bill.user_id === user?.id

  const total = useMemo(() => bills.reduce((sum, b) => sum + billTotal(b.items), 0), [bills])
  const myTotal = useMemo(() => myTotalPosition(bills, user?.email), [bills, user?.email])
  const peopleTotals = useMemo(() => myPeopleTotals(bills, user?.email), [bills, user?.email])

  // Bills grouped by trip, trips first (most recent bill wins the ordering),
  // loose bills last.
  const groups = useMemo(() => {
    const byTrip = new Map<string, SplitBill[]>()
    for (const bill of bills) {
      const key = bill.trip?.trim() || ''
      byTrip.set(key, [...(byTrip.get(key) ?? []), bill])
    }
    return [...byTrip.entries()]
      .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : 0))
      .map(([trip, tripBills]) => ({
        trip,
        bills: tripBills,
        pos: myTotalPosition(tripBills, user?.email),
        total: tripBills.reduce((sum, b) => sum + billTotal(b.items), 0),
      }))
  }, [bills, user?.email])

  const openCreate = () => {
    setEditingBill(null)
    setModalOpen(true)
  }

  const openEdit = (bill: SplitBill) => {
    setEditingBill(bill)
    setModalOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingBill) return
    setDeleteLoading(true)
    const { error } = await deleteBill(deletingBill.id)
    setDeleteLoading(false)
    if (error) {
      toast.error('Failed to delete bill')
    } else {
      toast.success('Bill deleted')
    }
    setDeletingBill(null)
  }

  // Amounts are re-derived inside settleAll from the live bills, so a realtime
  // refetch between opening this dialog and confirming cannot overpay.
  const handleSettleAll = async () => {
    if (!settlingPerson) return
    setSettleLoading(true)
    const { name, results } = await settleAll(settlingPerson.key, user?.email)
    setSettleLoading(false)
    setSettlingPerson(null)

    if (results.length === 0) return toast('Nothing left to settle')
    const failed = results.filter(r => r.error)
    if (failed.length) toast.error(`Could not settle: ${failed.map(r => r.title).join(', ')}`)

    const done = results.filter(r => !r.error && r.bill && r.payment) as SettledEntry[]
    fireSettleUndoToast(name ?? settlingPerson.name, done, recordPayment)
  }

  const handleNotify = async (bill: SplitBill) => {
    if (!bill.people.some(p => p.email)) {
      return toast.error('Add an email to at least one person first (edit the bill)')
    }
    setNotifyingId(bill.id)
    const { sent, error } = await notifyPeople(bill)
    setNotifyingId(null)
    if (error) toast.error(error)
    else toast.success(`Split sent to ${sent} ${sent === 1 ? 'person' : 'people'}`)
  }

  return (
    <motion.div
      className="p-4 sm:p-8 max-w-2xl mx-auto space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white/90 to-white/50">
            Split
          </h1>
          <p className="text-sm text-white/30">
            {bills.length} bills · {formatINR(total)}
          </p>
          {bills.length > 0 && (
            <p className="mt-0.5">
              <PositionTotals pos={myTotal} />
            </p>
          )}
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} />
          New bill
        </Button>
      </div>

      {loading ? (
        <ListSkeleton count={4} />
      ) : bills.length === 0 ? (
        <EmptyState
          title="No bills yet"
          subtitle="Split a bill with friends to get started"
          icon={<Users size={28} className="text-white/30" />}
        />
      ) : (
        <div className="space-y-6">
          <PeopleTotals people={peopleTotals} onSettleAll={setSettlingPerson} />

          {groups.map(group => (
            <div key={group.trip || '__loose'} className="space-y-3">
              {(group.trip || groups.length > 1) && (
                <div className="flex items-baseline justify-between gap-2 px-0.5">
                  <p className="text-sm font-semibold text-white/80 truncate">
                    {group.trip || 'Not in a trip'}
                    <span className="ml-2 text-xs font-normal text-white/25">
                      {group.bills.length} {group.bills.length === 1 ? 'bill' : 'bills'} · {formatINR(group.total)}
                    </span>
                  </p>
                  <PositionTotals pos={group.pos} compact />
                </div>
              )}

              {group.bills.map(bill => (
                <div
                  key={bill.id}
                  className="backdrop-blur-xl bg-white/[0.05] border border-white/[0.09] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">
                        {bill.title}
                        {!isOwner(bill) && (
                          <span className="ml-2 text-[10px] font-medium text-violet-300/70 align-middle">shared with you</span>
                        )}
                      </p>
                      <p className="text-xs text-white/30">
                        {formatDate(bill.bill_date)} · {bill.items.length} items · {bill.people.length} people
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm font-semibold text-white/90 mr-1">
                        {formatINR(billTotal(bill.items))}
                      </span>
                      <button
                        onClick={() => handleNotify(bill)}
                        disabled={notifyingId === bill.id}
                        title="Email the split to everyone"
                        className="p-1.5 rounded-lg text-white/30 hover:text-violet-300 hover:bg-violet-500/10 transition-all duration-200 disabled:opacity-40"
                      >
                        <Send size={14} />
                      </button>
                      <button
                        onClick={() => openEdit(bill)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/[0.05] transition-all duration-200"
                      >
                        <Pencil size={14} />
                      </button>
                      {isOwner(bill) && (
                        <button
                          onClick={() => setDeletingBill(bill)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <YourPosition bill={bill} email={user?.email} />

                  <BillSummary
                    people={bill.people}
                    items={bill.items}
                    payments={bill.payments}
                    onPay={(from_id, to_id, amount) => recordPayment(bill, { from_id, to_id, amount })}
                    selfId={findSelf(bill.people, user?.email)?.id}
                  />
                </div>
          ))}
            </div>
          ))}
        </div>
      )}

      <SplitBillModal isOpen={modalOpen} onClose={() => setModalOpen(false)} bill={editingBill} onSaved={refetch} />

      <ConfirmDialog
        isOpen={!!settlingPerson}
        onClose={() => setSettlingPerson(null)}
        onConfirm={handleSettleAll}
        title="Settle up"
        message={
          settlingPerson
            ? `Record full payment on ${settlingPerson.bills.length} ${settlingPerson.bills.length === 1 ? 'bill' : 'bills'} with ${settlingPerson.name}?`
            : ''
        }
        loading={settleLoading}
      />

      <ConfirmDialog
        isOpen={!!deletingBill}
        onClose={() => setDeletingBill(null)}
        onConfirm={handleDelete}
        title="Delete bill"
        message={`Are you sure you want to delete "${deletingBill?.title}"?`}
        loading={deleteLoading}
      />
    </motion.div>
  )
}
