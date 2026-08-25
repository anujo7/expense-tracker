import type { SplitItem, SplitPerson, SplitBalance, Settlement, SplitPayment, SplitBill } from '../types'

// All math here is done in integer paise to avoid floating point drift, then
// converted back to rupees at the edges.

export function allocate(total: number, weights: number[]): number[] {
  if (weights.length === 0) return []

  const sum = weights.reduce((a, b) => a + b, 0)
  const w = sum > 0 ? weights : weights.map(() => 1)
  const W = sum > 0 ? sum : weights.length

  const bases = w.map((wi) => Math.floor((total * wi) / W))
  const remainders = w.map((wi, i) => ({ i, frac: (total * wi) / W - bases[i] }))
  let rem = total - bases.reduce((a, b) => a + b, 0)

  remainders.sort((a, b) => b.frac - a.frac || a.i - b.i)
  const shares = [...bases]
  for (let k = 0; k < remainders.length && rem > 0; k++, rem--) {
    shares[remainders[k].i]++
  }
  return shares
}

export function itemShares(item: SplitItem): Record<string, number> {
  const total = Math.round(item.amount * 100)
  const participants = [...new Set(item.participant_ids)]

  if (participants.length === 0) {
    return item.payer_id ? { [item.payer_id]: total } : {}
  }

  const weights =
    item.mode === 'exact'
      ? participants.map((id) => Math.max(0, Math.round((item.exact[id] ?? 0) * 100)))
      : participants.map(() => 1)

  const shares = allocate(total, weights)
  const result: Record<string, number> = {}
  participants.forEach((id, i) => {
    result[id] = shares[i]
  })
  return result
}

export function billTotal(items: SplitItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

export function billBalances(people: SplitPerson[], items: SplitItem[]): SplitBalance[] {
  const paid: Record<string, number> = {}
  const owed: Record<string, number> = {}
  for (const p of people) {
    paid[p.id] = 0
    owed[p.id] = 0
  }

  for (const item of items) {
    const totalPaise = Math.round(item.amount * 100)
    if (item.payer_id in paid) paid[item.payer_id] += totalPaise

    const shares = itemShares(item)
    for (const [personId, share] of Object.entries(shares)) {
      if (personId in owed) owed[personId] += share
    }
  }

  return people.map((p) => ({
    person_id: p.id,
    paid: paid[p.id] / 100,
    owed: owed[p.id] / 100,
    net: (paid[p.id] - owed[p.id]) / 100,
  }))
}

export function settle(balances: SplitBalance[], payments: SplitPayment[] = []): Settlement[] {
  const debtors = balances
    .filter((b) => b.net < 0)
    .map((b) => ({ id: b.person_id, amount: -Math.round(b.net * 100) }))
    .sort((a, b) => b.amount - a.amount)
  const creditors = balances
    .filter((b) => b.net > 0)
    .map((b) => ({ id: b.person_id, amount: Math.round(b.net * 100) }))
    .sort((a, b) => b.amount - a.amount)

  // Money already handed over, in paise, keyed by "from>to".
  const settledPaise: Record<string, number> = {}
  for (const p of payments) {
    const key = `${p.from_id}>${p.to_id}`
    settledPaise[key] = (settledPaise[key] || 0) + Math.round(p.amount * 100)
  }

  const settlements: Settlement[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(debtor.amount, creditor.amount)

    if (amount >= 1) {
      const key = `${debtor.id}>${creditor.id}`
      // Clamped at 0: a correction can push the running total negative.
      const paid = Math.max(0, Math.min(settledPaise[key] || 0, amount))
      settledPaise[key] = (settledPaise[key] || 0) - paid
      settlements.push({
        from_id: debtor.id,
        to_id: creditor.id,
        amount: amount / 100,
        paid: paid / 100,
        remaining: (amount - paid) / 100,
      })
    }

    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0) i++
    if (creditor.amount === 0) j++
  }

  return settlements
}

// One person's standing in a bill, after payments: what they still owe out of
// their share, and what is still coming back to them.
export function personPosition(settlements: Settlement[], personId: string) {
  const sum = (xs: Settlement[], key: 'amount' | 'paid' | 'remaining') =>
    xs.reduce((a, s) => a + s[key], 0)
  const owes = settlements.filter((s) => s.from_id === personId)
  const owed = settlements.filter((s) => s.to_id === personId)

  return {
    owes: sum(owes, 'amount'),
    paid: sum(owes, 'paid'),
    remaining: sum(owes, 'remaining'),
    getsBack: sum(owed, 'amount'),
    received: sum(owed, 'paid'),
    toReceive: sum(owed, 'remaining'),
  }
}

// Which person in this bill is the signed-in user, matched on email.
export function findSelf(people: SplitPerson[], email?: string | null): SplitPerson | undefined {
  if (!email) return undefined
  const target = email.trim().toLowerCase()
  return people.find((p) => p.email?.trim().toLowerCase() === target)
}

export interface MyPosition {
  share: number      // what this bill costs you
  fronted: number    // what you paid out for the bill itself
  owes: number       // your side of the settlements, before payments
  paid: number       // settled so far
  remaining: number  // still to pay
  getsBack: number
  received: number
  toReceive: number  // still coming back to you
}

const ZERO: MyPosition = {
  share: 0, fronted: 0, owes: 0, paid: 0, remaining: 0, getsBack: 0, received: 0, toReceive: 0,
}

// Your standing on one bill, or null when you are not on it.
export function myBillPosition(bill: SplitBill, email?: string | null): MyPosition | null {
  const self = findSelf(bill.people, email)
  if (!self) return null

  const balances = billBalances(bill.people, bill.items)
  const mine = balances.find((b) => b.person_id === self.id)
  return {
    ...personPosition(settle(balances, bill.payments ?? []), self.id),
    share: mine?.owed ?? 0,
    fronted: mine?.paid ?? 0,
  }
}

// Same, summed across bills — the whole list, or one trip's worth.
export function myTotalPosition(bills: SplitBill[], email?: string | null): MyPosition {
  return bills.reduce<MyPosition>((acc, bill) => {
    const pos = myBillPosition(bill, email)
    if (!pos) return acc
    return {
      share: acc.share + pos.share,
      fronted: acc.fronted + pos.fronted,
      owes: acc.owes + pos.owes,
      paid: acc.paid + pos.paid,
      remaining: acc.remaining + pos.remaining,
      getsBack: acc.getsBack + pos.getsBack,
      received: acc.received + pos.received,
      toReceive: acc.toReceive + pos.toReceive,
    }
  }, ZERO)
}
