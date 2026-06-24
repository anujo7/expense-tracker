import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const WIDGET_SECRET = process.env.WIDGET_SECRET

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function toIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS)
}

function getDayRange(daysAgo: number) {
  const nowIST = toIST(new Date())
  const y = nowIST.getUTCFullYear()
  const m = nowIST.getUTCMonth()
  const d = nowIST.getUTCDate() - daysAgo
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0) - IST_OFFSET_MS)
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS)
  return { start, end }
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

export default async function handler(
  req: { method?: string; headers?: Record<string, string | string[] | undefined>; url?: string },
  res: {
    status: (code: number) => { json: (body: unknown) => void }
    setHeader: (name: string, value: string) => void
  }
) {
  const authHeader = (req.headers?.['authorization'] || req.headers?.['Authorization'] || '') as string
  const token = authHeader.replace('Bearer ', '')

  if (!WIDGET_SECRET || token !== WIDGET_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const url = new URL(req.url || '', 'https://localhost')
  const email = url.searchParams.get('email')
  if (!email) {
    return res.status(400).json({ error: 'email param required' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError || !users) {
    return res.status(500).json({ error: 'Failed to fetch users' })
  }

  const user = users.users.find(u => u.email === email)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const now = new Date()
  const nowIST = toIST(now)
  const today = getDayRange(0)
  const yesterday = getDayRange(1)
  const monthStart = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1) - IST_OFFSET_MS)
  const daysIntoCurMonth = nowIST.getUTCDate()
  const daysInMonth = new Date(nowIST.getUTCFullYear(), nowIST.getUTCMonth() + 1, 0).getUTCDate()
  const monthKey = `${nowIST.getUTCFullYear()}-${String(nowIST.getUTCMonth() + 1).padStart(2, '0')}`

  const [todayRes, yesterdayRes, monthRes, budgetRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('amount, category:categories(name)')
      .eq('user_id', user.id)
      .gte('expense_date', today.start.toISOString())
      .lte('expense_date', today.end.toISOString()),
    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('expense_date', yesterday.start.toISOString())
      .lte('expense_date', yesterday.end.toISOString()),
    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('expense_date', monthStart.toISOString())
      .lte('expense_date', now.toISOString()),
    supabase
      .from('budgets')
      .select('total_budget')
      .eq('user_id', user.id)
      .eq('month', monthKey)
      .maybeSingle(),
  ])

  const todayExpenses = (todayRes.data || []) as { amount: number; category: { name: string } | null }[]
  const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0)
  const yesterdayTotal = (yesterdayRes.data || []).reduce((s: number, e: { amount: number }) => s + e.amount, 0)
  const monthTotal = (monthRes.data || []).reduce((s: number, e: { amount: number }) => s + e.amount, 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthBudget = ((budgetRes.data as any)?.total_budget as number) ?? null

  const dailyAvg = daysIntoCurMonth > 0 ? monthTotal / daysIntoCurMonth : 0
  const budgetRemaining = monthBudget ? monthBudget - monthTotal : null
  const budgetPct = monthBudget ? Math.round((monthTotal / monthBudget) * 100) : null
  const daysLeft = daysInMonth - daysIntoCurMonth
  const dailyAllowance = budgetRemaining !== null && daysLeft > 0 ? budgetRemaining / daysLeft : null

  const catMap = new Map<string, number>()
  for (const e of todayExpenses) {
    const name = e.category?.name || 'Other'
    catMap.set(name, (catMap.get(name) || 0) + e.amount)
  }
  const topCategory = catMap.size > 0
    ? Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : null

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  return res.status(200).json({
    today: { total: todayTotal, formatted: formatINR(todayTotal), transactions: todayExpenses.length, topCategory },
    yesterday: { total: yesterdayTotal, formatted: formatINR(yesterdayTotal) },
    month: {
      total: monthTotal,
      formatted: formatINR(monthTotal),
      budget: monthBudget,
      budgetFormatted: monthBudget ? formatINR(monthBudget) : null,
      remaining: budgetRemaining,
      remainingFormatted: budgetRemaining !== null ? formatINR(budgetRemaining) : null,
      budgetPct,
      dailyAvg: Math.round(dailyAvg),
      dailyAvgFormatted: formatINR(Math.round(dailyAvg)),
      dailyAllowance: dailyAllowance !== null ? Math.round(dailyAllowance) : null,
      dailyAllowanceFormatted: dailyAllowance !== null ? formatINR(Math.round(dailyAllowance)) : null,
      daysLeft,
    },
    updatedAt: nowIST.toISOString(),
  })
}
