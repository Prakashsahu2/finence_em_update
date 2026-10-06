import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

// ──────────────────────────────────────────────────────────────────────────────
// Determine whether real SMTP credentials are configured
// ──────────────────────────────────────────────────────────────────────────────
function hasRealSmtp() {
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  return (
    user.length > 0 &&
    pass.length > 0 &&
    user !== 'your_email@gmail.com' &&
    pass !== 'your_app_password'
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Build the production transporter (real SMTP)
// ──────────────────────────────────────────────────────────────────────────────
function buildRealTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Build an Ethereal (fake) transporter for dev — auto-creates a free account
// ──────────────────────────────────────────────────────────────────────────────
async function buildEtherealTransporter() {
  const testAccount = await nodemailer.createTestAccount()
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
  return transporter
}

// ──────────────────────────────────────────────────────────────────────────────
// Append OTP to otp_dev.log for easy developer look-up
// ──────────────────────────────────────────────────────────────────────────────
function logOtpDev(email, otp) {
  try {
    const logPath = path.join(process.cwd(), 'otp_dev.log')
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] To: ${email} | Code: ${otp} | Expires: +5m\n`
    fs.appendFileSync(logPath, logEntry, 'utf8')
    // Always print to console as well so it's impossible to miss
    console.log('\n╔══════════════════════════════════════════════╗')
    console.log(`║  📧  OTP for ${email}`)
    console.log(`║  🔑  Code : ${otp}`)
    console.log('║  ⏱️   Valid for 5 minutes')
    console.log('╚══════════════════════════════════════════════╝\n')
  } catch (err) {
    console.error('Failed to write OTP to dev log:', err)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// OTP email HTML template
// ──────────────────────────────────────────────────────────────────────────────
function buildHtml(otp, userName) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f5f5f5;color:#333;">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
<tr><td style="padding:40px 32px;">
<table role="presentation" width="100%">
<tr><td style="text-align:center;padding-bottom:32px;">
<h1 style="margin:0;font-size:28px;font-weight:700;color:#5A4EAB;">FinWise</h1>
</td></tr>
<tr><td>
<h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1e293b;">Verify your email address</h2>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Hello${userName ? ' ' + userName : ''},</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">Enter the verification code below to complete your registration. This code will expire in <strong>5 minutes</strong>.</p>
</td></tr>
<tr><td style="text-align:center;padding:20px 0;">
<div style="display:inline-block;background-color:#f1f5f9;border-radius:12px;padding:24px 40px;">
<span style="font-size:42px;font-weight:700;letter-spacing:8px;color:#5A4EAB;font-family:'Courier New',monospace;">${otp}</span>
</div>
</td></tr>
<tr><td>
<p style="margin:0 0 32px;font-size:13px;line-height:1.5;color:#94a3b8;text-align:center;">If you didn&apos;t sign up for FinWise, you can safely ignore this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function buildText(otp, userName) {
  return `Hello${userName ? ` ${userName}` : ''},

Your FinWise verification code is: ${otp}

This code expires in 5 minutes. If you did not sign up for FinWise, you can safely ignore this email.`
}

// ──────────────────────────────────────────────────────────────────────────────
// Main export — sends OTP email (real SMTP if configured, Ethereal otherwise)
// ──────────────────────────────────────────────────────────────────────────────
export async function sendOtpEmail(email, otp, userName) {
  // 1. Always log to dev file + console so dev can copy the OTP instantly
  logOtpDev(email, otp)

  const html = buildHtml(otp, userName)
  const text = buildText(otp, userName)
  const subject = 'FinWise – Your Verification Code'

  // 2. Choose transporter
  if (hasRealSmtp()) {
    // ── Real SMTP (Gmail / any SMTP provider) ──────────────────────────
    try {
      const fromRaw = process.env.SMTP_FROM || process.env.SMTP_USER
      const fromMatch = fromRaw?.match(/"([^"]*)"\s*<([^>]*)>/)
      const from = {
        name: fromMatch?.[1] || 'FinWise',
        address: process.env.SMTP_USER,
      }

      const transporter = buildRealTransporter()
      await transporter.sendMail({
        from,
        replyTo: process.env.SMTP_USER,
        to: email,
        subject,
        text,
        html,
      })
      console.log(`[Email] ✅ OTP email delivered via SMTP to ${email}`)
    } catch (err) {
      console.error(`[Email] ❌ SMTP delivery failed:`, err.message)
      console.error('  → The OTP is still logged above. Ask user to check otp_dev.log')
    }
  } else {
    // ── Dev mode: Ethereal fake SMTP — generates a preview URL ─────────
    try {
      const transporter = await buildEtherealTransporter()
      const info = await transporter.sendMail({
        from: { name: 'FinWise', address: 'noreply@finwise.dev' },
        to: email,
        subject,
        text,
        html,
      })
      const previewUrl = nodemailer.getTestMessageUrl(info)
      console.log(`[Email] 📬 Ethereal preview (click to see email): ${previewUrl}`)
      // Also append the preview URL to otp_dev.log
      try {
        const logPath = path.join(process.cwd(), 'otp_dev.log')
        fs.appendFileSync(logPath, `         ↳ Preview: ${previewUrl}\n`, 'utf8')
      } catch (_) {}
    } catch (err) {
      console.error('[Email] Ethereal delivery failed:', err.message)
      console.log('[Email] OTP is in otp_dev.log — use it directly for testing.')
    }
  }
}

export default sendOtpEmail
