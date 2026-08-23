// Framework-free correctness check for src/utils/split.ts money math.
// Usage: npx tsx scripts/test-split-math.ts
import assert from 'node:assert/strict'
import { itemShares, billBalances, settle, personPosition, findSelf, myTotalPosition } from '../src/utils/split'
import type { SplitPerson, SplitItem, SplitPayment } from '../src/types'

// 1. Equal ₹100 among 3
{
  const item: SplitItem = {
    id: 'i1',
    label: 'lunch',
    amount: 100,
    payer_id: 'a',
    mode: 'equal',
    participant_ids: ['a', 'b', 'c'],
    exact: {},
  }
  const shares = itemShares(item)
  const values = ['a', 'b', 'c'].map((id) => shares[id])
  assert.equal(values.reduce((a, b) => a + b, 0), 10000)
  assert.deepEqual(values, [3334, 3333, 3333])
}

// 2. Exact mode summing to total -> unchanged
{
  const item: SplitItem = {
    id: 'i2',
    label: 'dinner',
    amount: 120,
    payer_id: 'a',
    mode: 'exact',
    participant_ids: ['a', 'b'],
    exact: { a: 50, b: 70 },
  }
  const shares = itemShares(item)
  assert.equal(shares.a, 5000)
  assert.equal(shares.b, 7000)
}

// 3. Exact mode NOT summing to total -> shares still sum exactly
{
  const item: SplitItem = {
    id: 'i3',
    label: 'snacks',
    amount: 120,
    payer_id: 'a',
    mode: 'exact',
    participant_ids: ['a', 'b'],
    exact: { a: 50, b: 50 },
  }
  const shares = itemShares(item)
  assert.equal(shares.a + shares.b, 12000)
}

// 4. Empty participant_ids -> whole amount lands on payer
{
  const item: SplitItem = {
    id: 'i4',
    label: 'misc',
    amount: 45.5,
    payer_id: 'a',
    mode: 'equal',
    participant_ids: [],
    exact: {},
  }
  const shares = itemShares(item)
  assert.deepEqual(shares, { a: 4550 })
}

// 5. FUZZ with a seeded deterministic PRNG (mulberry32)
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

for (let iter = 0; iter < 200; iter++) {
  const peopleCount = randInt(1, 6)
  const people: SplitPerson[] = Array.from({ length: peopleCount }, (_, i) => ({
    id: `p${i}`,
    name: `Person ${i}`,
  }))

  const itemCount = randInt(1, 6)
  const items: SplitItem[] = Array.from({ length: itemCount }, (_, i) => {
    const amount = Math.round(rand() * 10000) / 100 // random 2dp amount up to ~100
    const payer = people[randInt(0, peopleCount - 1)]
    const mode = rand() < 0.5 ? 'equal' : 'exact'

    // random participant subset, including possibly empty
    const participant_ids = people.filter(() => rand() < 0.6).map((p) => p.id)

    const exact: Record<string, number> = {}
    if (mode === 'exact') {
      for (const id of participant_ids) {
        exact[id] = Math.round(rand() * amount * 100) / 100
      }
    }

    return {
      id: `item${iter}-${i}`,
      label: `item ${i}`,
      amount,
      payer_id: payer.id,
      mode,
      participant_ids,
      exact,
    } as SplitItem
  })

  // every item's shares sum to exactly Math.round(amount*100)
  for (const item of items) {
    const shares = itemShares(item)
    const sum = Object.values(shares).reduce((a, b) => a + b, 0)
    assert.equal(sum, Math.round(item.amount * 100), `iter ${iter} item ${item.id} shares mismatch`)
  }

  const balances = billBalances(people, items)
  const totalPaise = items.reduce((a, item) => a + Math.round(item.amount * 100), 0)
  const paidPaise = balances.reduce((a, b) => a + Math.round(b.paid * 100), 0)
  const owedPaise = balances.reduce((a, b) => a + Math.round(b.owed * 100), 0)
  assert.equal(paidPaise, totalPaise, `iter ${iter} paid != total`)
  assert.equal(owedPaise, totalPaise, `iter ${iter} owed != total`)

  const settlements = settle(balances)
  const settlementPaise = settlements.reduce((a, s) => a + Math.round(s.amount * 100), 0)
  const positiveNetsPaise = balances
    .filter((b) => b.net > 0)
    .reduce((a, b) => a + Math.round(b.net * 100), 0)
  assert.equal(settlementPaise, positiveNetsPaise, `iter ${iter} settlement sum mismatch`)

  // applying settlements to nets zeroes every person out
  const netsPaise: Record<string, number> = {}
  for (const b of balances) netsPaise[b.person_id] = Math.round(b.net * 100)
  for (const s of settlements) {
    const amt = Math.round(s.amount * 100)
    netsPaise[s.from_id] += amt
    netsPaise[s.to_id] -= amt
  }
  for (const b of balances) {
    assert.equal(netsPaise[b.person_id], 0, `iter ${iter} person ${b.person_id} not zeroed`)
  }
}

// 6. Regression: ₹0.05 split equally among 3 -> 5 paise total, no lost paise
{
  const item: SplitItem = {
    id: 'i6',
    label: 'tiny',
    amount: 0.05,
    payer_id: 'a',
    mode: 'equal',
    participant_ids: ['a', 'b', 'c'],
    exact: {},
  }
  const shares = itemShares(item)
  const sum = Object.values(shares).reduce((a, b) => a + b, 0)
  assert.equal(sum, 5)
}

// 7. Largest-remainder tie-break: uneven weights so fractional parts differ.
// ₹10.00 among a/b/c with exact weights 1/2/3 -> paise weights 100/200/300,
// W=600, raw shares 166.67/333.33/500.0, bases 166/333/500 (sum 999), rem=1.
// Largest fractional part is a's (0.667), so the odd paise goes to a.
{
  const item: SplitItem = {
    id: 'i7',
    label: 'remainder',
    amount: 10.0,
    payer_id: 'a',
    mode: 'exact',
    participant_ids: ['a', 'b', 'c'],
    exact: { a: 1, b: 2, c: 3 },
  }
  const shares = itemShares(item)
  assert.deepEqual(shares, { a: 167, b: 333, c: 500 })
}

console.log('split math OK')

// 8. Partial payments: A owes B ₹1000, has handed over ₹400 -> ₹600 left.
{
  const people = [
    { id: 'a', name: 'Anuj' },
    { id: 'b', name: 'Charchit' },
  ]
  const items: SplitItem[] = [
    { id: 'i8', label: 'dinner', amount: 2000, payer_id: 'b', mode: 'equal', participant_ids: ['a', 'b'], exact: {} },
  ]
  const balances = billBalances(people, items)
  const none = settle(balances)
  assert.deepEqual(none, [{ from_id: 'a', to_id: 'b', amount: 1000, paid: 0, remaining: 1000 }])

  const partial = settle(balances, [{ id: 'p1', from_id: 'a', to_id: 'b', amount: 400, paid_on: '2026-08-24' }])
  assert.deepEqual(partial, [{ from_id: 'a', to_id: 'b', amount: 1000, paid: 400, remaining: 600 }])

  // Overpayment never goes negative.
  const over = settle(balances, [{ id: 'p2', from_id: 'a', to_id: 'b', amount: 1500, paid_on: '2026-08-24' }])
  assert.deepEqual(over, [{ from_id: 'a', to_id: 'b', amount: 1000, paid: 1000, remaining: 0 }])

  // A payment in the wrong direction does not cancel the debt.
  const wrongWay = settle(balances, [{ id: 'p3', from_id: 'b', to_id: 'a', amount: 400, paid_on: '2026-08-24' }])
  assert.equal(wrongWay[0].remaining, 1000)
}

console.log('split payments OK')

// 9. Personal position: my ₹10,000 share, ₹8,000 handed over, ₹2,000 left.
{
  const people: SplitPerson[] = [
    { id: 'me', name: 'Anuj', email: 'Anuj@Example.com' },
    { id: 'c', name: 'Charchit', email: 'c@example.com' },
  ]
  const items: SplitItem[] = [
    { id: 'i9', label: 'trip', amount: 20000, payer_id: 'c', mode: 'equal', participant_ids: ['me', 'c'], exact: {} },
  ]
  const settlements = settle(billBalances(people, items), [
    { id: 'p1', from_id: 'me', to_id: 'c', amount: 8000, paid_on: '2026-08-24' },
  ])
  const mine = personPosition(settlements, 'me')
  assert.equal(mine.owes, 10000)
  assert.equal(mine.paid, 8000)
  assert.equal(mine.remaining, 2000)

  const theirs = personPosition(settlements, 'c')
  assert.equal(theirs.getsBack, 10000)
  assert.equal(theirs.toReceive, 2000)
  assert.equal(theirs.remaining, 0)

  // Self-match is case- and whitespace-insensitive, and absent email matches nobody.
  assert.equal(findSelf(people, ' anuj@example.com ')?.id, 'me')
  assert.equal(findSelf(people, 'nobody@example.com'), undefined)
  assert.equal(findSelf(people, undefined), undefined)
}

console.log('personal position OK')

// 10. The "Kasa in @ goa" case: ₹10,500 share, ₹9,800 handed over. Every figure
// the email and the app show must be ₹700 left — never the untouched ₹10,500.
{
  const people: SplitPerson[] = [
    { id: 'me', name: 'Anuj', email: 'anujparashar07@gmail.com' },
    { id: 'c', name: 'Charchit' },
  ]
  const items: SplitItem[] = [
    { id: 'i10', label: 'goa', amount: 42000, payer_id: 'c', mode: 'exact', participant_ids: ['me', 'c'], exact: { me: 10500, c: 31500 } },
  ]
  const balances = billBalances(people, items)
  const settlements = settle(balances, [
    { id: 'p1', from_id: 'me', to_id: 'c', amount: 9800, paid_on: '2026-08-19' },
  ])
  const me = personPosition(settlements, 'me')

  assert.equal(me.owes, 10500)   // the share itself is unchanged
  assert.equal(me.paid, 9800)
  assert.equal(me.remaining, 700) // what "You owe" must say
  assert.equal(balances.find(b => b.person_id === 'me')?.net, -10500) // raw balance still ignores payments...
  assert.notEqual(me.remaining, -(balances.find(b => b.person_id === 'me')?.net ?? 0)) // ...so never headline it
}

console.log('paid-down balance OK')

// 11. The "everything says settled" trap: an item nobody is split between is
// charged entirely to its payer, so every balance nets to zero. The editor now
// prevents saving one, but the math is pinned here so the behaviour is explicit.
{
  const people: SplitPerson[] = [
    { id: 'me', name: 'Anuj' },
    { id: 'c', name: 'Charchit' },
  ]
  const orphan: SplitItem = {
    id: 'i11', label: 'dinner', amount: 4000, payer_id: 'me', mode: 'equal', participant_ids: [], exact: {},
  }
  const balances = billBalances(people, [orphan])
  assert.deepEqual(balances.map(b => b.net), [0, 0])
  assert.deepEqual(settle(balances), []) // nothing to settle -> the UI reads "settled"

  // With participants set, the same item splits properly.
  const shared = { ...orphan, participant_ids: ['me', 'c'] }
  const fixed = settle(billBalances(people, [shared]))
  assert.deepEqual(fixed, [{ from_id: 'c', to_id: 'me', amount: 2000, paid: 0, remaining: 2000 }])
}

console.log('unsplit item trap OK')

// 12. Personal totals across bills, and per trip.
{
  const people: SplitPerson[] = [
    { id: 'me', name: 'Anuj', email: 'me@x.com' },
    { id: 'c', name: 'Charchit', email: 'c@x.com' },
  ]
  const bill = (id: string, trip: string | null, amount: number, payer: string, payments: SplitPayment[] = []) =>
    ({
      id, user_id: 'u', title: id, bill_date: '2026-08-01', trip, people, payments, created_at: '',
      items: [{ id: `${id}-i`, label: id, amount, payer_id: payer, mode: 'equal' as const, participant_ids: ['me', 'c'], exact: {} }],
    })

  // Goa: I owe 1000, already paid 400. Manali: Charchit owes me 500.
  const goa = bill('goa1', 'Goa', 2000, 'c', [{ id: 'p', from_id: 'me', to_id: 'c', amount: 400, paid_on: '2026-08-02' }])
  const manali = bill('man1', 'Manali', 1000, 'me')
  const loose = bill('loose', null, 600, 'c')

  const all = myTotalPosition([goa, manali, loose], 'ME@x.com')
  assert.equal(all.share, 1000 + 500 + 300)  // my slice of every bill
  assert.equal(all.remaining, 600 + 300)     // goa 1000-400, loose 300
  assert.equal(all.toReceive, 500)           // manali
  assert.equal(all.paid, 400)

  // Per trip, the same helper over a filtered list.
  const goaOnly = myTotalPosition([goa], 'me@x.com')
  assert.equal(goaOnly.share, 1000)
  assert.equal(goaOnly.remaining, 600)
  assert.equal(goaOnly.toReceive, 0)

  // Someone not on the bills has no position at all.
  assert.deepEqual(myTotalPosition([goa, manali], 'stranger@x.com').share, 0)
}

console.log('trip + personal totals OK')
