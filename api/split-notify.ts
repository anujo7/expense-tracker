import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './utils/email'
import { billTotal, billBalances, settle, itemShares } from '../src/utils/split'
import type { SplitBill, SplitPerson } from '../src/types'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function formatINR(amount: number): string {
  const abs = Math.abs(amount)
  const [intPart, decPart] = abs.toFixed(2).split('.')
  let formatted: string
  if (intPart.length <= 3) {
    formatted = intPart
  } else {
    const last3 = intPart.slice(-3)
    formatted = `${intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`
  }
  const result = `₹${formatted}.${decPart}`
  return amount < 0 ? `-${result}` : result
}

function esc(s: string): string {
  return s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] as string)
}

function buildHtml(bill: SplitBill, person: SplitPerson, sender: string): string {
  const nameOf = (id: string) => bill.people.find(p => p.id === id)?.name || '—'
  const balances = billBalances(bill.people, bill.items)
  const settlements = settle(balances, bill.payments ?? [])
  const mine = balances.find(b => b.person_id === person.id)
  const net = mine && Math.abs(mine.net) >= 0.005 ? mine.net : 0

  const owes = settlements.filter(s => s.from_id === person.id)
  const gets = settlements.filter(s => s.to_id === person.id)

  const line = (label: string, value: string, color = '#e5e5e5') =>
    `<tr><td style="padding:6px 0;color:#9a9a9a;font-size:14px">${label}</td>
     <td style="padding:6px 0;text-align:right;color:${color};font-size:14px;font-weight:600">${value}</td></tr>`

  const items = bill.items
    .map(item => {
      const share = (itemShares(item)[person.id] || 0) / 100
      return line(
        `${esc(item.label || 'Item')} <span style="color:#666">(${formatINR(item.amount)}, paid by ${esc(nameOf(item.payer_id))})</span>`,
        share > 0 ? `your share ${formatINR(share)}` : '—',
        share > 0 ? '#e5e5e5' : '#666'
      )
    })
    .join('')

  const owed = [...owes, ...gets]
    .map(s => {
      const youPay = s.from_id === person.id
      const label = youPay ? `You → ${esc(nameOf(s.to_id))}` : `${esc(nameOf(s.from_id))} → you`
      const status =
        s.remaining < 0.005
          ? `<span style="color:#34d399">settled (${formatINR(s.amount)} paid)</span>`
          : `${formatINR(s.remaining)} left${s.paid > 0 ? ` <span style="color:#666">of ${formatINR(s.amount)}, ${formatINR(s.paid)} paid</span>` : ''}`
      return line(label, status, youPay ? '#f87171' : '#34d399')
    })
    .join('')

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#111113;border:1px solid #222;border-radius:16px;padding:24px">
    <p style="margin:0 0 4px;color:#8b5cf6;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Split bill</p>
    <h1 style="margin:0 0 4px;color:#fff;font-size:22px">${esc(bill.title)}</h1>
    <p style="margin:0 0 20px;color:#666;font-size:13px">
      ${bill.bill_date} · total ${formatINR(billTotal(bill.items))} · shared by ${esc(sender)}
    </p>

    <p style="margin:0 0 8px;color:#9a9a9a;font-size:13px">Hi ${esc(person.name)}, here's your part:</p>
    <div style="background:#18181b;border-radius:12px;padding:14px;margin-bottom:16px">
      <p style="margin:0;color:${net < 0 ? '#f87171' : net > 0 ? '#34d399' : '#9a9a9a'};font-size:20px;font-weight:700">
        ${net === 0 ? 'All settled' : net < 0 ? `You owe ${formatINR(-net)}` : `You get back ${formatINR(net)}`}
      </p>
      <p style="margin:4px 0 0;color:#666;font-size:12px">
        your share ${formatINR(mine?.owed ?? 0)} · you paid ${formatINR(mine?.paid ?? 0)}
      </p>
    </div>

    ${owed ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px">${owed}</table>` : ''}

    <p style="margin:0 0 4px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Items</p>
    <table style="width:100%;border-collapse:collapse">${items}</table>

    <p style="margin:20px 0 0;color:#444;font-size:11px">Sent from Expense Tracker</p>
  </div>
</body></html>`
}

export default async function handler(
  req: {
    method?: string
    headers?: Record<string, string | string[] | undefined>
    body?: { billId?: string } | string
  },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const token = String(req.headers?.['authorization'] || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const billId = body.billId
  if (!billId) return res.status(400).json({ error: 'billId required' })

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  if (authError || !auth?.user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: bill, error } = await supabase
    .from('split_bills')
    .select('*')
    .eq('id', billId)
    .eq('user_id', auth.user.id)
    .single<SplitBill>()

  if (error || !bill) return res.status(404).json({ error: 'Bill not found' })

  const sender = auth.user.email || 'a friend'
  const recipients = bill.people.filter(p => p.email && p.email.includes('@'))
  if (recipients.length === 0) return res.status(400).json({ error: 'No one on this bill has an email' })

  const balances = billBalances(bill.people, bill.items)
  const results = []
  for (const person of recipients) {
    const net = balances.find(b => b.person_id === person.id)?.net ?? 0
    const subject =
      Math.abs(net) < 0.005
        ? `${bill.title} — you're all settled`
        : net < 0
          ? `${bill.title} — you owe ${formatINR(-net)}`
          : `${bill.title} — you get back ${formatINR(net)}`
    const result = await sendEmail(person.email as string, subject, buildHtml(bill, person, sender))
    results.push({ email: person.email, ...result })
  }

  return res.status(200).json({ sent: results.filter(r => r.ok).length, results })
}
