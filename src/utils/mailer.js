import nodemailer from 'nodemailer';

let cachedTransporter = null;

function getMailerTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendOtpEmail({ to, code, expiresInMinutes = 10 }) {
  const transporter = getMailerTransporter();
  if (!transporter) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const from = process.env.OTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: 'Your SunaCare verification code',
    text: `Your SunaCare OTP is ${code}. It expires in ${expiresInMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.4; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">SunaCare Verification</h2>
        <p style="margin: 0 0 12px;">Use this one-time code to verify your email:</p>
        <p style="font-size: 28px; letter-spacing: 4px; font-weight: 700; margin: 0 0 12px;">${code}</p>
        <p style="margin: 0;">This code expires in ${expiresInMinutes} minutes.</p>
      </div>
    `,
  });

  return { sent: true };
}
