/**
 * Quick test script for the weekly report email.
 * Usage: npx tsx scripts/test-weekly-report.ts [your@email.com]
 *
 * Loads .env automatically and sends a real email to the address you pass
 * (or falls back to the first user in your Supabase project).
 */
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env FIRST before any module that reads process.env at import time
config({ path: resolve(process.cwd(), '.env') })

const targetEmail = process.argv[2] || undefined   // Supabase user to fetch analytics for
const sendToEmail = process.argv[3] || targetEmail  // actual recipient (override for Resend sandbox)

if (targetEmail) process.env.TEST_EMAIL_OVERRIDE = targetEmail
if (sendToEmail) {
  process.env.TEST_TO_EMAIL = sendToEmail
  console.log(`📧 Fetching analytics for: ${targetEmail || 'all users'}`)
  console.log(`📬 Sending email to:       ${sendToEmail}`)
}

// Dynamic import ensures handler sees the env vars already set above
const { default: handler } = await import('../api/weekly-report')

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

console.log('🚀 Running weekly report handler...\n')
await handler(mockReq, mockRes)
