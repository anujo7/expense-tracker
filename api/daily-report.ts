import { createClient } from '@supabase/supabase-js'
import { formatINR } from '../src/utils/format'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.FROM_EMAIL || 'expenses@example.com'

function getYesterdayRange() {
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const start = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(yesterday.getUTCFullYear(), yesterday.getUTCMonth(), yesterday.getUTCDate(), 23, 59, 59, 999))
  return { start, end }
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey) return { error: 'Resend API key not configured' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  })
  return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() }
}

export default async function handler(req: { method?: string }, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { start, end } = getYesterdayRange()
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const dateLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError || !users) {
    return res.status(500).json({ error: usersError?.message || 'Failed to fetch users' })
  }

  const results = []
  for (const user of users.users) {
    if (!user.email) {
      results.push({ email: null, status: 'skipped', reason: 'no email' })
      continue
    }
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category:categories(name)')
      .eq('user_id', user.id)
      .gte('expense_date', startIso)
      .lte('expense_date', endIso)

    const total = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0)
    if (total === 0) {
      results.push({ email: user.email, status: 'skipped', reason: 'no spending' })
      continue
    }

    const categoryMap = new Map<string, number>()
    for (const e of expenses || []) {
      const name = (e.category as { name?: string })?.name || 'Uncategorized'
      categoryMap.set(name, (categoryMap.get(name) || 0) + e.amount)
    }
    const categories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, amount]) => `<li>${name}: ${formatINR(amount)}</li>`)
      .join('')

    const html = `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; color: #111;">
        <h2>Daily Spending Report</h2>
        <p>Hi,</p>
        <p>You spent <strong>${formatINR(total)}</strong> on ${dateLabel}.</p>
        <h3>Breakdown</h3>
        <ul>${categories}</ul>
        <p><a href="${process.env.VERCEL_URL || ''}">Open app</a></p>
      </div>
    `

    const emailResult = await sendEmail(user.email, `Spending report for ${dateLabel}`, html)
    results.push({ email: user.email, ...emailResult })
  }

  return res.status(200).json({ date: dateLabel, sent: results.length, results })
}
