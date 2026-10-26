import { randomUUID } from 'node:crypto';
import sql from '../../utils/sql.js';
import { sendResetEmail } from '../../utils/send-reset-email.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email) {
      return Response.json({ error: 'Email is required.' }, { status: 400 });
    }

    const userRows = await sql`select * from auth_users where lower(email) = lower(${email}) limit 1`;
    const user = userRows[0];

    if (!user) {
      return Response.json({ ok: true, message: 'If the email is registered, a reset link has been sent.' });
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const resetUrl = `${process.env.AUTH_URL || 'http://localhost:5000'}/account/reset-password?token=${encodeURIComponent(token)}`;

    await sql`
      insert into auth_verification_token (identifier, expires, token)
      values (${email}, ${expires}, ${token})
      on conflict (identifier, token) do nothing
    `;

    const emailResult = await sendResetEmail({
      to: email,
      resetUrl,
    });

    return Response.json({
      ok: true,
      message: emailResult.sent
        ? 'Reset link sent to your email.'
        : 'If the email is registered, a reset link has been sent.',
      resetUrl: emailResult.sent ? resetUrl : undefined,
      emailSent: emailResult.sent,
    });
  } catch (error) {
    console.error('[forgot-password]', error);
    return Response.json({ error: 'Failed to send reset link.' }, { status: 400 });
  }
}
