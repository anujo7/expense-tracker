// Single sender used by every report/notification route.
// Plain .js on purpose: Vercel compiles each api/*.ts as its own function, so a
// shared *.ts helper is never emitted and the import blows up at runtime. A real
// .js file is copied as-is and resolves. Import it with the .js extension.

async function viaBrevo(to, subject, html) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: {
        name: 'Expense Tracker',
        email: process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_USER || 'noreply@example.com',
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() }
}

async function viaResend(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FROM_EMAIL || 'expenses@example.com', to, subject, html }),
  })
  return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() }
}

async function viaGmail(to, subject, html) {
  try {
    // Lazy: keeps nodemailer off the load path of the deployed function.
    const { createTransport } = await import('nodemailer')
    const transporter = createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, html })
    return { ok: true, status: 200 }
  } catch (err) {
    return { ok: false, status: 500, error: String(err) }
  }
}

/**
 * Tries every configured provider in order and stops at the first success, so
 * one provider refusing a send (Brevo IP allowlist, Resend domain check) does
 * not silently drop the email. Returns the last error if they all fail.
 */
export async function sendEmail(to, subject, html) {
  const providers = [
    process.env.BREVO_API_KEY && ['brevo', viaBrevo],
    process.env.RESEND_API_KEY && ['resend', viaResend],
    process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && ['gmail', viaGmail],
  ].filter(Boolean)

  if (providers.length === 0) {
    return { ok: false, status: 500, error: 'No email provider configured' }
  }

  let last = { ok: false, status: 500, error: 'No email provider configured' }
  const tried = []
  for (const [name, send] of providers) {
    last = await send(to, subject, html)
    tried.push(name)
    if (last.ok) return { ...last, provider: name }
    console.error(`[email] ${name} refused ${to}: ${last.status} ${last.error}`)
  }
  return { ...last, provider: tried.join(' → '), tried }
}
