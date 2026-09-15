import toast from 'react-hot-toast'
import { Undo2 } from 'lucide-react'
import { formatINR } from '../../utils/format'
import type { SplitBill, SplitPayment } from '../../types'

export interface SettledEntry {
  title: string
  bill: SplitBill
  payment: SplitPayment
}

type RecordPayment = (
  bill: SplitBill,
  payment: Omit<SplitPayment, 'id' | 'paid_on'>
) => Promise<{ error: unknown }>

// Undo appends the same payment negated — payments are append-only, so nothing
// is deleted and a payment the other side made meanwhile is left untouched.
async function undo(entries: SettledEntry[], recordPayment: RecordPayment) {
  toast.dismiss('settle-undo')
  const results = await Promise.all(
    entries.map(e =>
      recordPayment(e.bill, {
        from_id: e.payment.from_id,
        to_id: e.payment.to_id,
        amount: -e.payment.amount,
      })
    )
  )
  const failed = entries.filter((_, i) => results[i].error).map(e => e.title)
  if (failed.length) toast.error(`Could not undo: ${failed.join(', ')}`)
  else toast.success('Undone')
}

// One toast id, so settling again replaces the undo rather than stacking a
// stale one that would reverse the wrong batch.
export function fireSettleUndoToast(
  name: string,
  entries: SettledEntry[],
  recordPayment: RecordPayment
) {
  if (entries.length === 0) return
  const total = entries.reduce((sum, e) => sum + Math.abs(e.payment.amount), 0)

  toast.custom(
    () => (
      <div className="flex items-center gap-3 backdrop-blur-xl bg-white/[0.07] border border-white/[0.09] rounded-xl px-4 py-3">
        <span className="text-sm text-white/80">
          {entries.length === 1 ? (
            <>Paid <span className="font-semibold text-white">{formatINR(total)}</span> · {entries[0].title}</>
          ) : (
            <>Settled up with <span className="font-semibold text-white">{name}</span> · {entries.length} bills</>
          )}
        </span>
        <button
          onClick={() => undo(entries, recordPayment)}
          className="shrink-0 flex items-center gap-1 text-sm font-medium text-violet-300 hover:text-violet-200"
        >
          <Undo2 size={14} />
          Undo
        </button>
      </div>
    ),
    { id: 'settle-undo', duration: 6000 }
  )
}
