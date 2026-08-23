import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from './utils/email'
import { generateAIInsights } from './utils/openrouter'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000 // UTC+5:30

function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS)
}

function getDayRange(daysAgo: number) {
  const nowIST = toIST(new Date())
  const y = nowIST.getUTCFullYear()
  const m = nowIST.getUTCMonth()
  const d = nowIST.getUTCDate() - daysAgo
  // Start/end in IST, converted back to UTC for Supabase query
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS)
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS)
  return { start, end }
}

function getMonthKey(date: Date): string {
  const ist = toIST(date)
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}`
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

async function getAnalytics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<UserAnalytics> {
  const yesterday = getDayRange(1)
  const dayBefore = getDayRange(2)
  const now = new Date()
  const nowIST = toIST(now)
  const monthStart = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS)
  const daysIntoCurMonth = nowIST.getUTCDate()
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

  const yesterdayExpenses = (yesterdayRes.data || []) as unknown as Expense[]
  const yesterdayTotal = yesterdayExpenses.reduce((s, e) => s + e.amount, 0)

  const dayBeforeTotal = (dayBeforeRes.data || []).reduce(
    (s: number, e: { amount: number }) => s + e.amount, 0
  )

  const monthExpenses = (monthRes.data || []) as { amount: number; expense_date: string }[]
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthBudget = ((budgetRes.data as any)?.total_budget as number) ?? null
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

  // Streaks: fetch last 30 days of expenses in one query instead of 60 sequential ones
  let noSpendStreak = 0
  let underBudgetStreak = 0
  const thirtyDaysAgo = getDayRange(30)
  const { data: last30 } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('user_id', userId)
    .gte('expense_date', thirtyDaysAgo.start.toISOString())
    .lte('expense_date', yesterday.end.toISOString())

  const dailyTotals = new Map<string, number>()
  for (const e of (last30 || []) as { amount: number; expense_date: string }[]) {
    const dayKey = toIST(new Date(e.expense_date)).toISOString().slice(0, 10)
    dailyTotals.set(dayKey, (dailyTotals.get(dayKey) || 0) + e.amount)
  }

  if (yesterdayTotal === 0) {
    noSpendStreak = 1
    for (let d = 2; d <= 30; d++) {
      const range = getDayRange(d)
      const dayKey = toIST(range.start).toISOString().slice(0, 10)
      if ((dailyTotals.get(dayKey) || 0) === 0) {
        noSpendStreak++
      } else {
        break
      }
    }
  }

  if (monthBudget && monthBudget > 0) {
    const dailyBudget = monthBudget / new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate()
    for (let d = 1; d <= 30; d++) {
      const range = getDayRange(d)
      const dayKey = toIST(range.start).toISOString().slice(0, 10)
      if ((dailyTotals.get(dayKey) || 0) <= dailyBudget) {
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

const QUOTES = {
  good: [
    { text: "Wealth is not about having a lot of money; it's about having a lot of options.", author: "Chris Rock" },
    { text: "Do not save what is left after spending; instead spend what is left after saving.", author: "Warren Buffett" },
    { text: "A budget is telling your money where to go instead of wondering where it went.", author: "Dave Ramsey" },
    { text: "Financial freedom is available to those who learn about it and work for it.", author: "Robert Kiyosaki" },
    { text: "It's not your salary that makes you rich, it's your spending habits.", author: "Charles A. Jaffe" },
  ],
  warning: [
    { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
    { text: "The habit of saving is itself an education; it fosters every virtue, teaches self-denial, cultivates the sense of order.", author: "T.T. Munger" },
    { text: "You must gain control over your money or the lack of it will forever control you.", author: "Dave Ramsey" },
    { text: "Too many people spend money they haven't earned to buy things they don't want to impress people they don't like.", author: "Will Rogers" },
    { text: "Money is a terrible master but an excellent servant.", author: "P.T. Barnum" },
  ],
  overspent: [
    { text: "I'm not telling you it's going to be easy. I'm telling you it's going to be worth it.", author: "Art Williams" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
    { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
  ],
  nospend: [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Small disciplines repeated with consistency every day lead to great achievements gained slowly over time.", author: "John C. Maxwell" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
    { text: "The chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett" },
  ],
}

function pickQuote(analytics: UserAnalytics): { text: string; author: string } {
  let pool: { text: string; author: string }[]
  if (analytics.yesterdayTotal === 0 || analytics.noSpendStreak >= 2) {
    pool = QUOTES.nospend
  } else if (analytics.monthBudget && analytics.monthTotal > analytics.monthBudget) {
    pool = QUOTES.overspent
  } else if (analytics.monthBudget && analytics.monthTotal > analytics.monthBudget * 0.7) {
    pool = QUOTES.warning
  } else {
    pool = QUOTES.good
  }
  return pool[Math.floor(Math.random() * pool.length)]
}

async function fetchMeme(analytics: UserAnalytics): Promise<{ url: string; title: string } | null> {
  const subreddit = analytics.monthBudget && analytics.monthTotal > analytics.monthBudget
    ? 'PovertyFinance'
    : analytics.yesterdayTotal === 0
      ? 'financememes'
      : 'financememes'
  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const data = await res.json() as { url: string; title: string; nsfw: boolean; spoiler: boolean }
    if (data.nsfw || data.spoiler) return null
    if (!data.url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) return null
    return { url: data.url, title: data.title }
  } catch {
    return null
  }
}

function buildHtml(analytics: UserAnalytics, dateLabel: string, quote: { text: string; author: string }, meme: { url: string; title: string } | null, aiInsights: string | null): string {
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

    ${aiInsights ? card(`
      <div style="font-size:11px;color:${gray};margin-bottom:10px;font-weight:600;letter-spacing:0.05em;">AI INSIGHTS</div>
      <div style="font-size:13px;color:#d1d5db;line-height:1.6;white-space:pre-line;">${aiInsights}</div>
    `) : ''}

    ${card(`
      <div style="font-size:11px;color:${gray};margin-bottom:10px;font-weight:600;letter-spacing:0.05em;">TODAY'S MOTIVATION</div>
      <div style="font-size:15px;color:#e5e7eb;line-height:1.6;font-style:italic;margin-bottom:10px;">&ldquo;${quote.text}&rdquo;</div>
      <div style="font-size:12px;color:${gray};">— ${quote.author}</div>
    `)}

    ${meme ? `<div style="background:${cardBg};border:1px solid ${borderColor};border-radius:16px;padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;color:${gray};margin-bottom:10px;font-weight:600;letter-spacing:0.05em;">MEME OF THE DAY</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">${meme.title}</div>
      <img src="${meme.url}" alt="meme" style="width:100%;border-radius:10px;max-height:300px;object-fit:cover;" />
    </div>` : ''}

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
  const yesterdayIST = toIST(yesterday.start)
  const dateLabel = yesterdayIST.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC', // already shifted to IST manually
  })

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
      const analytics = await getAnalytics(supabase, user.id)
      const subject = buildSubject(analytics, dateLabel)
      const quote = pickQuote(analytics)
      const [meme, aiInsights] = await Promise.all([
        fetchMeme(analytics),
        generateAIInsights(`Yesterday I spent ${formatINR(analytics.yesterdayTotal)}. Categories: ${analytics.categoryBreakdown.map(c => `${c.name} ${formatINR(c.amount)}`).join(', ')}. Monthly total so far: ${formatINR(analytics.monthTotal)}. Monthly budget: ${analytics.monthBudget ? formatINR(analytics.monthBudget) : 'none'}. Give 2-3 concise insights.`),
      ])
      const html = buildHtml(analytics, dateLabel, quote, meme, aiInsights)
      const sendTo = process.env.TEST_TO_EMAIL || user.email
      const emailResult = await sendEmail(sendTo, subject, html)
      results.push({ email: user.email, spent: analytics.yesterdayTotal, ...emailResult })
    } catch (err) {
      results.push({ email: user.email, status: 'error', reason: String(err) })
    }
  }

  return res.status(200).json({ date: dateLabel, sent: results.length, results })
}
