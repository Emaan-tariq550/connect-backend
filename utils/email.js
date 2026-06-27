import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
})

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #0a0a0f; color: #f1f5f9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #16161f; border: 1px solid #1e1e2e; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #3b82f6); padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 900; color: white; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 11px; color: rgba(255,255,255,0.7); letter-spacing: 3px; text-transform: uppercase; }
    .body { padding: 32px; }
    .body p { color: #94a3b8; line-height: 1.6; font-size: 14px; }
    .otp { display: block; text-align: center; font-size: 42px; font-weight: 900; letter-spacing: 8px; color: #8b5cf6; margin: 24px 0; }
    .btn { display: block; width: fit-content; margin: 24px auto; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #3b82f6); color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; }
    .footer { padding: 20px 32px; border-top: 1px solid #1e1e2e; text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CONNECT</h1>
      <p>by Emaan</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer"><p>© 2025 CONNECT by Emaan. If you didn't request this, please ignore.</p></div>
  </div>
</body>
</html>`

export const sendVerificationEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"CONNECT by Emaan" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your CONNECT account',
    html: baseTemplate(`
      <p>Welcome to CONNECT! Please verify your email address to get started.</p>
      <span class="otp">${otp}</span>
      <p style="text-align:center;color:#475569;font-size:12px">This code expires in 15 minutes.</p>
    `),
  })
}

export const sendPasswordResetEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"CONNECT by Emaan" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your CONNECT password',
    html: baseTemplate(`
      <p>You requested a password reset. Use the code below:</p>
      <span class="otp">${otp}</span>
      <p style="text-align:center;color:#475569;font-size:12px">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
    `),
  })
}