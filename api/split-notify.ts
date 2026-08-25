import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './utils/email.js'

// Shapes are declared locally on purpose: anything imported from ../src is not
// part of this function's bundle, so it cannot be referenced at runtime. The
// money math stays client-side and arrives as `computed`.
interface SplitPerson {
  id: string
  name: string
  email?: string
}
interface SplitBill {
  id: string
  user_id: string
  title: string
  bill_date: string
  trip: string | null
  people: SplitPerson[]
}
interface Computed {
  total: number
  balances: { person_id: string; paid: number; owed: number; net: number }[]
  settlements: { from_id: string; to_id: string; amount: number; paid: number; remaining: number }[]
  items: { label: string; amount: number; payer_id: string; shares: Record<string, number> }[]
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl =
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')

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

export function buildHtml(
  bill: SplitBill,
  person: SplitPerson,
  sender: string,
  invite: boolean,
  hasAccount: boolean,
  c: Computed
): string {
  const nameOf = (id: string) => bill.people.find(p => p.id === id)?.name || '—'
  const mine = c.balances.find(b => b.person_id === person.id)
  const share = mine?.owed ?? 0
  const fronted = mine?.paid ?? 0

  // Everything below is *after* recorded payments: the headline has to agree
  // with the transfer rows, so both come from the same settlement figures.
  const sum = (rows: Computed['settlements'], key: 'amount' | 'paid' | 'remaining') =>
    rows.reduce((a, r) => a + r[key], 0)
  const outgoing = c.settlements.filter(s => s.from_id === person.id)
  const incoming = c.settlements.filter(s => s.to_id === person.id)
  const stillOwe = sum(outgoing, 'remaining')
  const alreadyPaid = sum(outgoing, 'paid')
  const stillOwed = sum(incoming, 'remaining')
  const alreadyGot = sum(incoming, 'paid')

  const line = (label: string, value: string, color = '#e5e5e5') =>
    `<tr><td style="padding:6px 0;color:#9a9a9a;font-size:14px">${label}</td>
     <td style="padding:6px 0;text-align:right;color:${color};font-size:14px;font-weight:600">${value}</td></tr>`

  const items = c.items
    .map(item => {
      const share = item.shares[person.id] || 0
      return line(
        `${esc(item.label || 'Item')} <span style="color:#666">(${formatINR(item.amount)}, paid by ${esc(nameOf(item.payer_id))})</span>`,
        share > 0 ? `your share ${formatINR(share)}` : '—',
        share > 0 ? '#e5e5e5' : '#666'
      )
    })
    .join('')

  const owed = c.settlements
    .filter(s => s.from_id === person.id || s.to_id === person.id)
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
    <p style="margin:0 0 4px;color:#8b5cf6;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${invite ? 'You were added to a split' : 'Split bill'}</p>
    <h1 style="margin:0 0 4px;color:#fff;font-size:22px">${esc(bill.title)}${
      bill.trip ? ` <span style="color:#8b5cf6;font-size:15px;font-weight:500">· ${esc(bill.trip)}</span>` : ''
    }</h1>
    <p style="margin:0 0 20px;color:#666;font-size:13px">
      ${bill.bill_date} · total ${formatINR(c.total)} · shared by ${esc(sender)}
    </p>

    <p style="margin:0 0 8px;color:#9a9a9a;font-size:13px">Hi ${esc(person.name)}, here's your part:</p>
    <div style="background:#18181b;border-radius:12px;padding:14px;margin-bottom:16px">
      <p style="margin:0;color:${stillOwe >= 0.005 ? '#f87171' : stillOwed >= 0.005 ? '#34d399' : '#34d399'};font-size:20px;font-weight:700">
        ${
          stillOwe >= 0.005
            ? `You owe ${formatINR(stillOwe)}`
            : stillOwed >= 0.005
              ? `You get back ${formatINR(stillOwed)}`
              : 'All settled'
        }
      </p>
      <p style="margin:4px 0 0;color:#666;font-size:12px">
        your share ${formatINR(share)}${alreadyPaid >= 0.005 ? ` · ${formatINR(alreadyPaid)} already settled` : ''}${
          fronted >= 0.005 ? ` · you paid ${formatINR(fronted)} of the bill` : ''
        }${alreadyGot >= 0.005 ? ` · ${formatINR(alreadyGot)} received back` : ''}
      </p>
    </div>

    ${owed ? `<table style="width:100%;border-collapse:collapse;margin-bottom:16px">${owed}</table>` : ''}

    <p style="margin:0 0 4px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Items</p>
    <table style="width:100%;border-collapse:collapse">${items}</table>

    ${
      appUrl
        ? `<div style="margin-top:22px;padding-top:18px;border-top:1px solid #222">
             <p style="margin:0 0 12px;color:#9a9a9a;font-size:13px">
               ${
                 hasAccount
                   ? 'Open the app to see this split and mark what you have paid.'
                   : `Create an account with <strong style="color:#e5e5e5">${esc(person.email || '')}</strong> and this split shows up automatically — you can see what is left and tick off payments as you settle.`
               }
             </p>
             <a href="${appUrl}" style="display:inline-block;background:#8b5cf6;color:#fff;font-size:14px;font-weight:600;padding:11px 26px;border-radius:10px;text-decoration:none">
               ${hasAccount ? 'Open Expense Tracker' : 'Join Expense Tracker'}
             </a>
           </div>`
        : ''
    }

    <p style="margin:20px 0 0;color:#444;font-size:11px">Sent from Expense Tracker</p>
  </div>
</body></html>`
}

export default async function handler(
  req: {
    method?: string
    headers?: Record<string, string | string[] | undefined>
    body?: { billId?: string; personId?: string; invite?: boolean; computed?: Computed } | string
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
  const onlyPersonId: string | undefined = body.personId
  const invite = Boolean(body.invite)
  const computed: Computed | undefined = body.computed
  if (!billId) return res.status(400).json({ error: 'billId required' })
  if (!computed?.balances || !computed.settlements || !computed.items) {
    // A cached PWA bundle from before the split was computed client-side. The
    // client surfaces this string verbatim, so make it something actionable.
    return res.status(409).json({
      error: 'Your app is out of date — close and reopen it (or reload the page), then try again.',
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  if (authError || !auth?.user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: bill, error } = await supabase
    .from('split_bills')
    .select('*')
    .eq('id', billId)
    .single<SplitBill>()

  if (error || !bill) return res.status(404).json({ error: 'Bill not found' })

  // Service role bypasses RLS, so re-check access here: owner, or someone listed
  // on the bill by email.
  const callerEmail = (auth.user.email || '').toLowerCase()
  const onBill = bill.people.some(p => (p.email || '').toLowerCase() === callerEmail && callerEmail)
  if (bill.user_id !== auth.user.id && !onBill) return res.status(403).json({ error: 'Not your bill' })

  const sender = auth.user.email || 'a friend'
  const recipients = bill.people.filter(
    p => p.email && p.email.includes('@') && (!onlyPersonId || p.id === onlyPersonId)
  )
  if (recipients.length === 0) {
    return res.status(400).json({ error: onlyPersonId ? 'That person has no email' : 'No one on this bill has an email' })
  }

  // ponytail: first page of users is plenty at this scale; page through if the
  // account list ever outgrows it.
  const { data: userList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const accounts = new Set((userList?.users ?? []).map(u => (u.email || '').toLowerCase()))

  const results = []
  for (const person of recipients) {
    const owes = computed.settlements
      .filter(s => s.from_id === person.id)
      .reduce((a, s) => a + s.remaining, 0)
    const owed = computed.settlements
      .filter(s => s.to_id === person.id)
      .reduce((a, s) => a + s.remaining, 0)
    const subject =
      owes >= 0.005
        ? `${bill.title} — you owe ${formatINR(owes)}`
        : owed >= 0.005
          ? `${bill.title} — you get back ${formatINR(owed)}`
          : `${bill.title} — you're all settled`
    const hasAccount = accounts.has((person.email as string).toLowerCase())
    const result = await sendEmail(
      person.email as string,
      invite ? `${sender} added you to "${bill.title}"` : subject,
      buildHtml(bill, person, sender, invite, hasAccount, computed)
    )
    results.push({ email: person.email, hasAccount, ...result })
  }

  const delivered = results.filter(r => r.ok).length
  const failed = results.filter(r => r.ok === false)
  if (delivered === 0 && failed.length > 0) {
    return res.status(502).json({
      sent: 0,
      attempted: results.length,
      error: `Email provider refused the send: ${String(failed[0].error).slice(0, 300)}`,
      results,
    })
  }
  return res.status(200).json({ sent: delivered, attempted: results.length, results })
}
