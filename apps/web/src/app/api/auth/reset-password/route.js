import { hash } from 'argon2';
import sql from '../../utils/sql.js';

export async function POST(req) {
  try {
    const body = await req.json();
    const token = String(body?.token || '').trim();
    const password = String(body?.password || '');

    if (!token || !password) {
      return Response.json({ error: 'Token and password are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const rows = await sql`select * from auth_verification_token where token = ${token} limit 1`;
    const record = rows[0];

    if (!record) {
      return Response.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    const expiresAt = new Date(record.expires).getTime();
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      return Response.json({ error: 'Invalid or expired reset token.' }, { status: 400 });
    }

    const userRow = await sql`select * from auth_users where lower(email) = lower(${record.identifier}) limit 1`;
    const user = userRow[0];

    if (!user) {
      return Response.json({ error: 'User not found.' }, { status: 400 });
    }

    const passHash = await hash(password);
    await sql`update auth_accounts set password = ${passHash} where "userId" = ${user.id} and provider = 'credentials'`;
    await sql`delete from auth_verification_token where token = ${token}`;

    return Response.json({ ok: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('[reset-password]', error);
    return Response.json({ error: 'Unable to reset password.' }, { status: 400 });
  }
}
