// Framework-free correctness check for src/utils/split.ts money math.
// Usage: npx tsx scripts/test-split-math.ts
import assert from 'node:assert/strict'
import { itemShares, billBalances, settle } from '../src/utils/split'
import type { SplitPerson, SplitItem } from '../src/types'

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
