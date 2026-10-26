import nodemailer from 'nodemailer';

export async function sendResetEmail({ to, resetUrl }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'YT Shorts Auto <no-reply@example.com>';

  if (!host || !user || !pass) {
    console.warn('[reset-email] SMTP is not configured. Skipping email send.');
    return { sent: false, reason: 'missing-smtp-config' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  });

  return { sent: true, messageId: info.messageId };
}
