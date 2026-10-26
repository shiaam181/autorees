import { hash } from 'argon2';
import sql from '../../../utils/sql.js';

function getAuthError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (
    message.includes('tenant/user') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNREFUSED') ||
    message.includes('password authentication failed')
  ) {
    return { error: 'DatabaseUnavailable', status: 503 };
  }

  return { error: 'CredentialsSignin', status: 400 };
}

async function getUserByEmail(email) {
  const rows = await sql`select * from auth_users where lower(email) = lower(${email}) limit 1`;
  return rows[0] || null;
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const callbackUrl = String(form.get('callbackUrl') ?? '/');

    if (!email || !password) {
      return Response.json({ error: 'CredentialsSignin' }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return Response.json({ error: 'UserExists' }, { status: 409 });
    }

    const userRows = await sql`
      insert into auth_users (name, email, "emailVerified", image)
      values (${name || null}, ${email}, null, null)
      returning id, name, email, "emailVerified", image
    `;

    const user = userRows[0];
    const passwordHash = await hash(password);

    await sql`
      insert into auth_accounts (
        "userId",
        provider,
        type,
        "providerAccountId",
        password
      )
      values (
        ${user.id},
        'credentials',
        'credentials',
        ${String(user.id)},
        ${passwordHash}
      )
    `;

    return Response.json({ url: callbackUrl });
  } catch (error) {
    console.error('[credentials-signup]', error);
    const authError = getAuthError(error);
    return Response.json({ error: authError.error }, { status: authError.status });
  }
}
