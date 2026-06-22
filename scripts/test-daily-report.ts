/**
 * Quick test script for the daily report email.
 * Usage: npx tsx scripts/test-daily-report.ts [your@email.com]
 *
 * Loads .env automatically and sends a real email to the address you pass
 * (or falls back to the first user in your Supabase project).
 */
import { config } from 'dotenv'
import { resolve } from 'path'

const targetEmail = process.argv[2] || undefined
if (targetEmail) process.env.TEST_EMAIL_OVERRIDE = targetEmail

config({ path: resolve(process.cwd(), '.env') })

import handler from '../api/daily-report'

if (targetEmail) {
  console.log(`📧 Sending test email to: ${targetEmail}`)
}

const mockReq = { method: 'GET' }
const mockRes = {
  status(code: number) {
    return {
      json(body: unknown) {
        console.log(`\nStatus: ${code}`)
        console.log(JSON.stringify(body, null, 2))
      },
    }
  },
}

console.log('🚀 Running daily report handler...\n')
handler(mockReq, mockRes).catch((err: unknown) => {
  console.error('❌ Handler threw:', err)
  process.exit(1)
})
