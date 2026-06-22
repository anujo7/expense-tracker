import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const { data } = await supabase
  .from('expenses')
  .select('amount, expense_date')
  .order('expense_date', { ascending: false })
  .limit(10)

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const now = new Date()
const nowIST = new Date(now.getTime() + IST_OFFSET_MS)
const yesterdayIST = new Date(nowIST)
yesterdayIST.setUTCDate(nowIST.getUTCDate() - 1)

console.log(`Now (UTC):       ${now.toISOString()}`)
console.log(`Now (IST):       ${nowIST.toISOString().replace('T',' ').slice(0,19)}`)
console.log(`Yesterday (IST): ${yesterdayIST.toISOString().slice(0,10)}\n`)
console.log('Last 10 expenses (expense_date stored as):')
for (const e of data || []) {
  const dateIST = new Date(new Date(e.expense_date).getTime() + IST_OFFSET_MS)
  console.log(`  ₹${e.amount} — UTC: ${e.expense_date} → IST: ${dateIST.toISOString().slice(0,16)}`)
}
