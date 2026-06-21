import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.FROM_EMAIL || 'expenses@example.com'
const appUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''

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

function getDayRange(daysAgo: number) {
  const now = new Date()
  const target = new Date(now)
  target.setUTCDate(target.getUTCDate() - daysAgo)
  const start = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0))
  const end = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999))
  return { start, end }
}

function getMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey) return { error: 'Resend API key not configured' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  })
  return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() }
}

interface Expense {
  amount: number
  expense_date: string
  category: { name: string } | null
}

interface UserAnalytics {
  yesterdayTotal: number
  yesterdayExpenses: Expense[]
  categoryBreakdown: { name: string; amount: number }[]
  noSpendStreak: number
  underBudgetStreak: number
  monthTotal: number
  monthBudget: number | null
  dailyAvgThisMonth: number
  yesterdayVsDayBefore: number | null
  topCategory: string | null
  biggestExpense: Expense | null
  daysIntoCurMonth: number
  projectedMonthEnd: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAnalytics(
  supabase: ReturnType<typeof createClient<any>>,
  userId: string
): Promise<UserAnalytics> {
  const yesterday = getDayRange(1)
  const dayBefore = getDayRange(2)
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const daysIntoCurMonth = now.getUTCDate()
  const monthKey = getMonthKey(now)

  const [yesterdayRes, dayBeforeRes, monthRes, budgetRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, expense_date, category:categories(name)')
      .eq('user_id', userId)
      .gte('expense_date', yesterday.start.toISOString())
      .lte('expense_date', yesterday.end.toISOString()),
    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', userId)
      .gte('expense_date', dayBefore.start.toISOString())
      .lte('expense_date', dayBefore.end.toISOString()),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('user_id', userId)
      .gte('expense_date', monthStart.toISOString())
      .lte('expense_date', now.toISOString()),
    supabase
      .from('budgets')
      .select('total_budget')
      .eq('user_id', userId)
      .eq('month', monthKey)
      .maybeSingle(),
  ])

  const yesterdayExpenses = (yesterdayRes.data || []) as Expense[]
  const yesterdayTotal = yesterdayExpenses.reduce((s, e) => s + e.amount, 0)

  const dayBeforeTotal = (dayBeforeRes.data || []).reduce(
    (s: number, e: { amount: number }) => s + e.amount, 0
  )

  const monthExpenses = (monthRes.data || []) as { amount: number; expense_date: string }[]
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const monthBudget = (budgetRes.data as { total_budget: number } | null)?.total_budget ?? null
  const dailyAvgThisMonth = daysIntoCurMonth > 0 ? monthTotal / daysIntoCurMonth : 0
  const projectedMonthEnd = dailyAvgThisMonth * new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate()

  // Category breakdown for yesterday
  const catMap = new Map<string, number>()
  for (const e of yesterdayExpenses) {
    const name = e.category?.name || 'Uncategorized'
    catMap.set(name, (catMap.get(name) || 0) + e.amount)
  }
  const categoryBreakdown = Array.from(catMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].name : null

  const biggestExpense = yesterdayExpenses.length > 0
    ? yesterdayExpenses.reduce((max, e) => (e.amount > max.amount ? e : max), yesterdayExpenses[0])
    : null

  // No-spend streak: count consecutive days before yesterday with zero spending
  let noSpendStreak = yesterdayTotal === 0 ? 1 : 0
  if (noSpendStreak > 0) {
    for (let d = 2; d <= 30; d++) {
      const range = getDayRange(d)
      const { data } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .gte('expense_date', range.start.toISOString())
        .lte('expense_date', range.end.toISOString())
        .limit(1)
      if (!data || data.length === 0) {
        noSpendStreak++
      } else {
        break
      }
    }
  }

  // Under-budget streak: consecutive days where daily spend < daily budget allowance
  let underBudgetStreak = 0
  if (monthBudget && monthBudget > 0) {
    const dailyBudget = monthBudget / new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate()
    for (let d = 1; d <= 30; d++) {
      const range = getDayRange(d)
      const { data } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', userId)
        .gte('expense_date', range.start.toISOString())
        .lte('expense_date', range.end.toISOString())
      const dayTotal = (data || []).reduce((s: number, e: { amount: number }) => s + e.amount, 0)
      if (dayTotal <= dailyBudget) {
        underBudgetStreak++
      } else {
        break
      }
    }
  }

  const yesterdayVsDayBefore = dayBeforeTotal > 0
    ? ((yesterdayTotal - dayBeforeTotal) / dayBeforeTotal) * 100
    : null

  return {
    yesterdayTotal,
    yesterdayExpenses,
    categoryBreakdown,
    noSpendStreak,
    underBudgetStreak,
    monthTotal,
    monthBudget,
    dailyAvgThisMonth,
    yesterdayVsDayBefore,
    topCategory,
    biggestExpense,
    daysIntoCurMonth,
    projectedMonthEnd,
  }
}

function pickEmoji(analytics: UserAnalytics): string {
  if (analytics.noSpendStreak >= 3) return '🔥'
  if (analytics.yesterdayTotal === 0) return '🎉'
  if (analytics.underBudgetStreak >= 3) return '💪'
  if (analytics.monthBudget && analytics.monthTotal > analytics.monthBudget) return '🚨'
  if (analytics.monthBudget && analytics.monthTotal > analytics.monthBudget * 0.8) return '⚠️'
  return '📊'
}

function buildSubject(analytics: UserAnalytics, dateLabel: string): string {
  if (analytics.noSpendStreak >= 3)
    return `🔥 ${analytics.noSpendStreak}-day no-spend streak! — ${dateLabel}`
  if (analytics.yesterdayTotal === 0)
    return `🎉 Zero-spend day! — ${dateLabel}`
  if (analytics.underBudgetStreak >= 5)
    return `💪 ${analytics.underBudgetStreak}-day under-budget streak! — ${dateLabel}`
  if (analytics.monthBudget && analytics.monthTotal > analytics.monthBudget)
    return `🚨 You've exceeded your monthly budget — ${dateLabel}`
  return `📊 You spent ${formatINR(analytics.yesterdayTotal)} yesterday — ${dateLabel}`
}

function buildHtml(analytics: UserAnalytics, dateLabel: string): string {
  const a = analytics
  const accent = '#6366f1'
  const green = '#10b981'
  const red = '#ef4444'
  const amber = '#f59e0b'
  const gray = '#6b7280'
  const darkBg = '#0a0a0a'
  const cardBg = '#111111'
  const borderColor = '#1e1e1e'

  const card = (content: string) =>
    `<div style="background:${cardBg};border:1px solid ${borderColor};border-radius:16px;padding:20px;margin-bottom:16px;">${content}</div>`

  // Hero section
  const emoji = pickEmoji(a)

  // Day-over-day comparison
  let dodSection = ''
  if (a.yesterdayVsDayBefore !== null) {
    const dir = a.yesterdayVsDayBefore >= 0 ? '↑' : '↓'
    const dodColor = a.yesterdayVsDayBefore >= 0 ? red : green
    dodSection = `<span style="font-size:13px;color:${dodColor};margin-left:8px;">${dir} ${Math.abs(a.yesterdayVsDayBefore).toFixed(0)}% vs day before</span>`
  }

  // Category breakdown
  let categorySection = ''
  if (a.categoryBreakdown.length > 0) {
    const maxAmt = a.categoryBreakdown[0].amount
    const rows = a.categoryBreakdown.map(c => {
      const pct = a.yesterdayTotal > 0 ? Math.round((c.amount / a.yesterdayTotal) * 100) : 0
      const barWidth = maxAmt > 0 ? Math.round((c.amount / maxAmt) * 100) : 0
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;color:#d1d5db;">${c.name}</span>
          <span style="font-size:13px;color:#ffffff;font-weight:600;">${formatINR(c.amount)} <span style="color:${gray};font-weight:400;">(${pct}%)</span></span>
        </div>
        <div style="background:${borderColor};border-radius:4px;height:6px;overflow:hidden;">
          <div style="background:${accent};height:100%;width:${barWidth}%;border-radius:4px;"></div>
        </div>
      </div>`
    }).join('')
    categorySection = card(`<div style="font-size:13px;color:${gray};margin-bottom:12px;font-weight:600;">CATEGORY BREAKDOWN</div>${rows}`)
  }

  // Budget status
  let budgetSection = ''
  if (a.monthBudget && a.monthBudget > 0) {
    const pct = Math.round((a.monthTotal / a.monthBudget) * 100)
    const remaining = a.monthBudget - a.monthTotal
    const barColor = pct > 100 ? red : pct > 80 ? amber : green
    const statusText = remaining >= 0
      ? `${formatINR(remaining)} remaining`
      : `${formatINR(Math.abs(remaining))} over budget!`
    const statusColor = remaining >= 0 ? green : red

    budgetSection = card(`
      <div style="font-size:13px;color:${gray};margin-bottom:12px;font-weight:600;">MONTHLY BUDGET</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
        <span style="font-size:18px;font-weight:700;color:#fff;">${formatINR(a.monthTotal)}</span>
        <span style="font-size:13px;color:${gray};">of ${formatINR(a.monthBudget)}</span>
      </div>
      <div style="background:${borderColor};border-radius:4px;height:8px;overflow:hidden;margin-bottom:8px;">
        <div style="background:${barColor};height:100%;width:${Math.min(pct, 100)}%;border-radius:4px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:${gray};">${pct}% used</span>
        <span style="font-size:12px;color:${statusColor};font-weight:600;">${statusText}</span>
      </div>
    `)
  }

  // Streaks & gamification
  const badges: string[] = []
  if (a.noSpendStreak >= 2)
    badges.push(`🔥 <strong>${a.noSpendStreak}-day no-spend streak</strong>`)
  if (a.underBudgetStreak >= 2)
    badges.push(`💪 <strong>${a.underBudgetStreak}-day under-budget streak</strong>`)
  if (a.underBudgetStreak === 0 && a.monthBudget)
    badges.push(`😬 You broke your under-budget streak yesterday`)

  let streakSection = ''
  if (badges.length > 0) {
    const badgeHtml = badges
      .map(b => `<div style="background:${darkBg};border:1px solid ${borderColor};border-radius:12px;padding:10px 14px;font-size:14px;color:#d1d5db;margin-bottom:8px;">${b}</div>`)
      .join('')
    streakSection = card(`<div style="font-size:13px;color:${gray};margin-bottom:12px;font-weight:600;">STREAKS & ACHIEVEMENTS</div>${badgeHtml}`)
  }

  // Insights
  const insights: string[] = []

  if (a.biggestExpense && a.yesterdayExpenses.length > 1) {
    const catName = a.biggestExpense.category?.name || 'Uncategorized'
    insights.push(`💰 Biggest spend: <strong>${formatINR(a.biggestExpense.amount)}</strong> on ${catName}`)
  }

  if (a.topCategory && a.categoryBreakdown.length > 1) {
    const topPct = a.yesterdayTotal > 0
      ? Math.round((a.categoryBreakdown[0].amount / a.yesterdayTotal) * 100)
      : 0
    insights.push(`📌 ${topPct}% of yesterday's spend went to <strong>${a.topCategory}</strong>`)
  }

  insights.push(`📅 Daily average this month: <strong>${formatINR(a.dailyAvgThisMonth)}</strong>`)

  if (a.monthBudget && a.monthBudget > 0) {
    const dailyBudget = a.monthBudget / new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0).getUTCDate()
    if (a.yesterdayTotal > dailyBudget * 1.5 && a.yesterdayTotal > 0) {
      insights.push(`⚡ Yesterday you spent <strong>${(a.yesterdayTotal / dailyBudget).toFixed(1)}x</strong> your daily budget allowance`)
    }
  }

  if (a.projectedMonthEnd > 0 && a.daysIntoCurMonth >= 5) {
    const projColor = a.monthBudget && a.projectedMonthEnd > a.monthBudget ? red : '#d1d5db'
    insights.push(`📈 At this pace, you'll spend ~<strong style="color:${projColor}">${formatINR(a.projectedMonthEnd)}</strong> this month`)
  }

  let insightSection = ''
  if (insights.length > 0) {
    const insightHtml = insights
      .map(i => `<div style="font-size:13px;color:#d1d5db;padding:6px 0;border-bottom:1px solid ${borderColor};">${i}</div>`)
      .join('')
    insightSection = card(`<div style="font-size:13px;color:${gray};margin-bottom:12px;font-weight:600;">INSIGHTS</div>${insightHtml}`)
  }

  // Motivational nudge
  let nudge = ''
  if (a.monthBudget && a.monthTotal > a.monthBudget) {
    nudge = `<div style="background:${red}15;border:1px solid ${red}30;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:#fca5a5;">
      🚨 You've exceeded your monthly budget by <strong>${formatINR(a.monthTotal - a.monthBudget)}</strong>. Consider cutting back on <strong>${a.topCategory || 'non-essentials'}</strong> for the rest of the month.
    </div>`
  } else if (a.monthBudget && a.monthTotal > a.monthBudget * 0.8) {
    const remaining = a.monthBudget - a.monthTotal
    const daysLeft = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0).getUTCDate() - a.daysIntoCurMonth
    const perDayLeft = daysLeft > 0 ? remaining / daysLeft : 0
    nudge = `<div style="background:${amber}15;border:1px solid ${amber}30;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:#fcd34d;">
      ⚠️ You've used ${Math.round((a.monthTotal / a.monthBudget) * 100)}% of your budget with ${daysLeft} days left. Stick to <strong>${formatINR(perDayLeft)}/day</strong> to stay on track.
    </div>`
  } else if (a.yesterdayTotal === 0) {
    nudge = `<div style="background:${green}15;border:1px solid ${green}30;border-radius:12px;padding:14px;margin-bottom:16px;font-size:13px;color:#6ee7b7;">
      🎯 No-spend days are the easiest way to save. Keep it going!
    </div>`
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${darkBg};font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:440px;margin:0 auto;padding:24px 16px;">

    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:${accent}20;border-radius:14px;padding:12px;margin-bottom:12px;">
        <span style="font-size:28px;">${emoji}</span>
      </div>
      <h1 style="font-size:20px;font-weight:700;color:#ffffff;margin:0 0 4px;">Daily Spending Report</h1>
      <p style="font-size:13px;color:${gray};margin:0;">${dateLabel}</p>
    </div>

    ${card(`
      <div style="text-align:center;">
        <div style="font-size:12px;color:${gray};margin-bottom:4px;">YESTERDAY'S TOTAL</div>
        <div style="font-size:32px;font-weight:800;color:#ffffff;">${formatINR(a.yesterdayTotal)}</div>
        ${dodSection}
      </div>
    `)}

    ${nudge}
    ${streakSection}
    ${categorySection}
    ${budgetSection}
    ${insightSection}

    ${appUrl ? `<div style="text-align:center;margin-top:24px;">
      <a href="${appUrl}" style="display:inline-block;background:${accent};color:#ffffff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:12px;text-decoration:none;">Open Expense Tracker</a>
    </div>` : ''}

    <p style="text-align:center;font-size:11px;color:#374151;margin-top:24px;">
      Sent daily at midnight · Expense Tracker
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

  const yesterday = getDayRange(1)
  const dateLabel = yesterday.start.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

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

    try {
      const analytics = await getAnalytics(supabase, user.id)
      const subject = buildSubject(analytics, dateLabel)
      const html = buildHtml(analytics, dateLabel)
      const emailResult = await sendEmail(user.email, subject, html)
      results.push({ email: user.email, spent: analytics.yesterdayTotal, ...emailResult })
    } catch (err) {
      results.push({ email: user.email, status: 'error', reason: String(err) })
    }
  }

  return res.status(200).json({ date: dateLabel, sent: results.length, results })
}
