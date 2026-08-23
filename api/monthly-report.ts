import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from './utils/email.js'
import { generateAIInsights } from './utils/openrouter.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS)
}

function formatINR(amount: number): string {
  const abs = Math.abs(amount)
  const [intPart, decPart] = abs.toFixed(2).split('.')
  let formatted: string
  if (intPart.length <= 3) {
    formatted = intPart
  } else {
    const last3 = intPart.slice(-3)
    const remaining = intPart.slice(0, -3)
    formatted = `${remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`
  }
  const result = `₹${formatted}.${decPart}`
  return amount < 0 ? `-${result}` : result
}

function getLastMonthRange(): { start: Date; end: Date; label: string } {
  const nowIST = toIST(new Date())
  // First day of current month in IST, then back one day to get last month end
  const curMonthStart = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS)
  const lastMonthEnd = new Date(curMonthStart.getTime() - 1)
  const lastMonthStart = new Date(Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1) - IST_OFFSET_MS)
  const label = lastMonthEnd.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return { start: lastMonthStart, end: lastMonthEnd, label }
}

function getPreviousMonthRange(start: Date): { start: Date; end: Date } {
  const before = new Date(start.getTime() - 1)
  const prevStart = new Date(Date.UTC(before.getUTCFullYear(), before.getUTCMonth(), 1) - IST_OFFSET_MS)
  const prevEnd = new Date(Date.UTC(before.getUTCFullYear(), before.getUTCMonth() + 1, 1) - IST_OFFSET_MS - 1)
  return { start: prevStart, end: prevEnd }
}


interface Expense {
  amount: number
  expense_date: string
  category: { name: string; color: string; icon: string } | null
  payment_mode?: string
}

interface CategorySpend {
  name: string
  color: string
  amount: number
  percent: number
  transactions: number
  budget: number | null
  overBudget: number
  avgPerTxn: number
}

interface MonthlyAnalytics {
  total: number
  transactions: number
  daysActive: number
  avgPerDay: number
  avgPerTxn: number
  biggest: Expense | null
  topCategory: string | null
  categories: CategorySpend[]
  prevMonthTotal: number
  monthOverMonth: number | null
  topSpendingDay: { date: string; amount: number } | null
  onlinePercent: number
  cashPercent: number
  budget: number | null
  budgetUsed: number
  remaining: number
}

async function getMonthlyAnalytics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<MonthlyAnalytics> {
  const { start, end } = getLastMonthRange()
  const prev = getPreviousMonthRange(start)
  const daysInMonth = new Date(end.getUTCFullYear(), end.getUTCMonth() + 1, 0).getUTCDate()
  const monthKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`

  const [expensesRes, prevRes, budgetRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, expense_date, payment_mode, category:categories(name, color, icon)')
      .eq('user_id', userId)
      .gte('expense_date', start.toISOString())
      .lte('expense_date', end.toISOString()),
    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', prev.start.toISOString())
      .lte('expense_date', prev.end.toISOString()),
    supabase
      .from('budgets')
      .select('total_budget')
      .eq('user_id', userId)
      .eq('month', monthKey)
      .maybeSingle(),
  ])

  const expenses = (expensesRes.data || []) as unknown as Expense[]
  const prevTotal = (prevRes.data || []).reduce((s: number, e: { amount: number }) => s + e.amount, 0)
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budget = ((budgetRes.data as any)?.total_budget as number) ?? null

  const dayMap = new Map<string, number>()
  const catMap = new Map<string, { amount: number; transactions: number; color: string }>()
  let online = 0
  let cash = 0

  for (const e of expenses) {
    const dayKey = toIST(new Date(e.expense_date)).toISOString().slice(0, 10)
    dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + e.amount)

    const name = e.category?.name || 'Uncategorized'
    const color = e.category?.color || '#6b7280'
    const existing = catMap.get(name) || { amount: 0, transactions: 0, color }
    existing.amount += e.amount
    existing.transactions += 1
    catMap.set(name, existing)

    if (e.payment_mode === 'cash') cash += e.amount
    else online += e.amount
  }

  let topSpendingDay: { date: string; amount: number } | null = null
  for (const [date, amount] of dayMap) {
    if (!topSpendingDay || amount > topSpendingDay.amount) {
      topSpendingDay = { date, amount }
    }
  }

  const categories: CategorySpend[] = Array.from(catMap.entries())
    .map(([name, data]) => {
      const percent = total > 0 ? (data.amount / total) * 100 : 0
      return {
        name,
        color: data.color,
        amount: data.amount,
        percent,
        transactions: data.transactions,
        budget: null, // filled later from category budgets
        overBudget: 0,
        avgPerTxn: data.transactions > 0 ? data.amount / data.transactions : 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)

  // Category budgets for last month
  const { data: catBudgets } = await supabase
    .from('category_budgets')
    .select('budget_amount, category_id, categories(name)')
    .eq('user_id', userId)
    .eq('month', monthKey)

  const catBudgetMap = new Map<string, number>()
  for (const cb of (catBudgets || []) as unknown as { budget_amount: number; categories: { name: string } | null }[]) {
    if (cb.categories?.name) catBudgetMap.set(cb.categories.name, cb.budget_amount)
  }

  for (const c of categories) {
    c.budget = catBudgetMap.get(c.name) ?? null
    if (c.budget && c.amount > c.budget) {
      c.overBudget = c.amount - c.budget
    }
  }

  return {
    total,
    transactions: expenses.length,
    daysActive: dayMap.size,
    avgPerDay: total / daysInMonth,
    avgPerTxn: expenses.length > 0 ? total / expenses.length : 0,
    biggest: expenses.length > 0
      ? expenses.reduce((max, e) => (e.amount > max.amount ? e : max), expenses[0])
      : null,
    topCategory: categories[0]?.name || null,
    categories,
    prevMonthTotal: prevTotal,
    monthOverMonth: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null,
    topSpendingDay,
    onlinePercent: total > 0 ? (online / total) * 100 : 0,
    cashPercent: total > 0 ? (cash / total) * 100 : 0,
    budget,
    budgetUsed: budget && budget > 0 ? (total / budget) * 100 : 0,
    remaining: budget ? budget - total : 0,
  }
}

function buildMonthlyHtml(a: MonthlyAnalytics, monthLabel: string, aiInsights: string | null): string {
  const darkBg = '#0a0a0a'
  const cardBg = '#111111'
  const borderColor = '#1e1e1e'
  const gray = '#6b7280'
  const accent = '#6366f1'
  const green = '#10b981'
  const red = '#ef4444'
  const amber = '#f59e0b'

  const card = (content: string) =>
    `<div style="background:${cardBg};border:1px solid ${borderColor};border-radius:16px;padding:20px;margin-bottom:16px;">${content}</div>`

  let momBadge = ''
  if (a.monthOverMonth !== null) {
    const dir = a.monthOverMonth >= 0 ? '↑' : '↓'
    const color = a.monthOverMonth >= 0 ? red : green
    const text = a.monthOverMonth >= 0 ? 'more than previous month' : 'less than previous month'
    momBadge = `<span style="font-size:13px;color:${color};margin-left:8px;">${dir} ${Math.abs(a.monthOverMonth).toFixed(0)}% ${text}</span>`
  }

  let budgetBar = ''
  if (a.budget && a.budget > 0) {
    const pct = Math.min(Math.round(a.budgetUsed), 100)
    const barColor = a.budgetUsed > 100 ? red : a.budgetUsed > 80 ? amber : green
    const statusColor = a.remaining >= 0 ? green : red
    budgetBar = card(`
      <div style="font-size:13px;color:${gray};margin-bottom:12px;font-weight:600;">MONTHLY BUDGET</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
        <span style="font-size:18px;font-weight:700;color:#fff;">${formatINR(a.total)}</span>
        <span style="font-size:13px;color:${gray};">of ${formatINR(a.budget)}</span>
      </div>
      <div style="background:${borderColor};border-radius:4px;height:8px;overflow:hidden;margin-bottom:8px;">
        <div style="background:${barColor};height:100%;width:${pct}%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:${gray};">${Math.round(a.budgetUsed)}% used</span>
        <span style="font-size:12px;color:${statusColor};font-weight:600;">${a.remaining >= 0 ? formatINR(a.remaining) + ' left' : formatINR(Math.abs(a.remaining)) + ' over budget'}</span>
      </div>
    `)
  }

  const categoryRows = a.categories.map(c => {
    const overBudgetHtml = c.overBudget > 0
      ? `<span style="color:${red};font-size:11px;margin-left:6px;">+${formatINR(c.overBudget)} over budget</span>`
      : ''
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${borderColor};">
        <div style="font-size:14px;color:#e5e7eb;font-weight:600;">${c.name}</div>
        <div style="font-size:11px;color:${gray};">${c.transactions} txn · avg ${formatINR(c.avgPerTxn)}</div>
      </td>
      <td style="text-align:right;padding:10px 0;border-bottom:1px solid ${borderColor};">
        <div style="font-size:15px;color:#ffffff;font-weight:700;">${formatINR(c.amount)}</div>
        <div style="font-size:11px;color:${gray};">${Math.round(c.percent)}%${overBudgetHtml}</div>
      </td>
    </tr>`
  }).join('')

  const categorySection = card(`
    <div style="font-size:13px;color:${gray};margin-bottom:12px;font-weight:600;">SPEND BY CATEGORY</div>
    <table style="width:100%;border-collapse:collapse;">${categoryRows}</table>
  `)

  const insights: string[] = []
  if (a.topSpendingDay) {
    const date = toIST(new Date(a.topSpendingDay.date)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    insights.push(`📅 Highest spend day: <strong>${date}</strong> — ${formatINR(a.topSpendingDay.amount)}`)
  }
  insights.push(`💳 Payment split: <strong>${Math.round(a.onlinePercent)}% online</strong> · ${Math.round(a.cashPercent)}% cash`)
  insights.push(`📊 Average per day: <strong>${formatINR(a.avgPerDay)}</strong> across the month`)
  insights.push(`🧾 Average per transaction: <strong>${formatINR(a.avgPerTxn)}</strong>`)
  if (a.biggest) {
    const cat = a.biggest.category?.name || 'Uncategorized'
    insights.push(`💰 Biggest single expense: <strong>${formatINR(a.biggest.amount)}</strong> on ${cat}`)
  }
  insights.push(`📆 Active spending days: <strong>${a.daysActive}</strong> out of the month`)

  const insightSection = card(`
    <div style="font-size:13px;color:${gray};margin-bottom:12px;font-weight:600;">INSIGHTS</div>
    ${insights.map(i => `<div style="font-size:13px;color:#d1d5db;padding:6px 0;border-bottom:1px solid ${borderColor};">${i}</div>`).join('')}
  `)

  let nudge = ''
  if (a.budget && a.total > a.budget) {
    nudge = `<div style="background:${red}15;border:1px solid ${red}30;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:#fca5a5;">
      🚨 You overshot your monthly budget by <strong>${formatINR(a.total - a.budget)}</strong>. Top culprit: <strong>${a.topCategory || '—'}</strong>.
    </div>`
  } else if (a.budget && a.budgetUsed > 80) {
    nudge = `<div style="background:${amber}15;border:1px solid ${amber}30;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:#fcd34d;">
      ⚠️ You used <strong>${Math.round(a.budgetUsed)}%</strong> of your budget. Watch your spending on <strong>${a.topCategory || '—'}</strong>.
    </div>`
  } else if (a.total === 0) {
    nudge = `<div style="background:${green}15;border:1px solid ${green}30;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:#6ee7b7;">
      🎉 A full month with zero expenses — rare and impressive!
    </div>`
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${darkBg};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:440px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:${accent}20;border-radius:14px;padding:12px;margin-bottom:12px;">
        <span style="font-size:28px;">📈</span>
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#ffffff;margin:0 0 4px;">Monthly Spending Report</h1>
      <p style="font-size:13px;color:${gray};margin:0;">${monthLabel}</p>
    </div>

    ${card(`
      <div style="text-align:center;">
        <div style="font-size:12px;color:${gray};margin-bottom:4px;">TOTAL SPENT</div>
        <div style="font-size:32px;font-weight:800;color:#ffffff;">${formatINR(a.total)}</div>
        ${momBadge}
      </div>
    `)}

    ${nudge}
    ${budgetBar}
    ${categorySection}
    ${insightSection}

    ${aiInsights ? card(`
      <div style="font-size:11px;color:${gray};margin-bottom:10px;font-weight:600;letter-spacing:0.05em;">AI INSIGHTS</div>
      <div style="font-size:13px;color:#d1d5db;line-height:1.6;white-space:pre-line;">${aiInsights}</div>
    `) : ''}

    ${appUrl ? `<div style="text-align:center;margin-top:24px;">
      <a href="${appUrl}" style="display:inline-block;background:${accent};color:#ffffff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:12px;text-decoration:none;">Open Expense Tracker</a>
    </div>` : ''}

    <p style="text-align:center;font-size:11px;color:#374151;margin-top:24px;">
      Sent on the 1st of every month · Expense Tracker
    </p>
  </div>
</body>
</html>`
}

export default async function handler(
  _req: { method?: string },
  res: { status: (code: number) => { json: (body: unknown) => void } }
) {
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { label } = getLastMonthRange()

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError || !users) {
    return res.status(500).json({ error: usersError?.message || 'Failed to fetch users' })
  }

  const testEmailOverride = process.env.TEST_EMAIL_OVERRIDE
  const filteredUsers = testEmailOverride
    ? users.users.filter(u => u.email === testEmailOverride)
    : users.users

  if (testEmailOverride && filteredUsers.length === 0) {
    return res.status(404).json({ error: `No user found with email: ${testEmailOverride}` })
  }

  const results = []
  for (const user of filteredUsers) {
    if (!user.email) {
      results.push({ email: null, status: 'skipped', reason: 'no email' })
      continue
    }

    try {
      const analytics = await getMonthlyAnalytics(supabase, user.id)
      const subject = `📈 Monthly spending report — ${label}`
      const aiInsights = await generateAIInsights(`Last month I spent ${formatINR(analytics.total)}. Categories: ${analytics.categories.map(c => `${c.name} ${formatINR(c.amount)}`).join(', ')}. Month over month: ${analytics.monthOverMonth !== null ? Math.round(analytics.monthOverMonth) + '%' : 'N/A'}. Budget: ${analytics.budget ? formatINR(analytics.budget) : 'none'}. Remaining: ${analytics.budget ? formatINR(analytics.remaining) : 'N/A'}. Payment split: ${Math.round(analytics.onlinePercent)}% online, ${Math.round(analytics.cashPercent)}% cash. Give 3 concise insights and one actionable tip.`)
      const html = buildMonthlyHtml(analytics, label, aiInsights)
      const sendTo = process.env.TEST_TO_EMAIL || user.email
      const emailResult = await sendEmail(sendTo, subject, html)
      results.push({ email: user.email, total: analytics.total, ...emailResult })
    } catch (err) {
      results.push({ email: user.email, status: 'error', reason: String(err) })
    }
  }

  return res.status(200).json({ month: label, sent: results.length, results })
}
