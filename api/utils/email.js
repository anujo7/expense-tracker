// Single sender used by every report/notification route.
// Plain .js on purpose: Vercel compiles each api/*.ts as its own function, so a
// shared *.ts helper is never emitted and the import blows up at runtime. A real
// .js file is copied as-is and resolves. Import it with the .js extension.
export async function sendEmail(to, subject, html) {
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  const brevoKey = process.env.BREVO_API_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.FROM_EMAIL || 'expenses@example.com'

  // 1. Brevo — works on Vercel, free, no domain needed
  if (brevoKey) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': brevoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Expense Tracker', email: process.env.BREVO_SENDER_EMAIL || gmailUser || 'noreply@example.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
    return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() }
  }

  // 2. Gmail via nodemailer — works locally only (Vercel blocks SMTP)
  if (gmailUser && gmailPass) {
    // Imported lazily: Vercel blocks SMTP, so this branch is local-only and must
    // never be a load-time dependency of the deployed function.
    const { createTransport } = await import('nodemailer')
    const transporter = createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass },
    })
    try {
      await transporter.sendMail({ from: gmailUser, to, subject, html })
      return { ok: true, status: 200 }
    } catch (err) {
      return { ok: false, status: 500, error: String(err) }
    }
  }

  // 3. Resend — needs verified domain
  if (!resendApiKey) return { ok: false, status: 500, error: 'No email provider configured' }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  })
  return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() }
}
