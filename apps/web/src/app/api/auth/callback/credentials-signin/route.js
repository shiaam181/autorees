import { verify } from 'argon2';
import { encode } from '@auth/core/jwt';
import sql from '../../../utils/sql.js';

function getAuthError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (message.includes('tenant/user') || message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') || message.includes('password authentication failed')) {
    return { error: 'DatabaseUnavailable', status: 503 };
  }

  return { error: 'CredentialsSignin', status: 401 };
}

async function getUserByEmail(email) {
  const userRows = await sql`select * from auth_users where lower(email) = lower(${email}) limit 1`;
  if (!userRows.length) return null;
  const user = userRows[0];
  const accountRows = await sql`select * from auth_accounts where "userId" = ${user.id}`;
  return { ...user, accounts: accountRows };
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const password = String(form.get('password') ?? '');
    const callbackUrl = String(form.get('callbackUrl') ?? '/');

    if (!email || !password) {
      return Response.json({ error: 'CredentialsSignin' }, { status: 401 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return Response.json({ error: 'UserNotFound' }, { status: 401 });
    }

    const credentialsAccount = (user.accounts || []).find((account) => account.provider === 'credentials');
    if (!credentialsAccount || !credentialsAccount.password) {
      return Response.json({ error: 'CredentialsSignin' }, { status: 401 });
    }

    const isValid = await verify(credentialsAccount.password, password);
    if (!isValid) {
      return Response.json({ error: 'CredentialsSignin' }, { status: 401 });
    }

    // Build JWT token payload (same shape @auth/core uses)
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return Response.json({ error: 'Configuration' }, { status: 500 });
    }

    // Use plain cookie name for HTTP (localhost dev)
    const cookieName = 'authjs.session-token';

    const token = await encode({
      token: {
        sub: String(user.id),
        name: user.name ?? null,
        email: user.email,
        picture: user.image ?? null,
        id: String(user.id),
      },
      secret,
      salt: cookieName,
    });

    const MAX_AGE = 30 * 24 * 60 * 60; // 30 days
    const expires = new Date(Date.now() + MAX_AGE * 1000);

    const cookieOptions = [
      `${cookieName}=${token}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Expires=${expires.toUTCString()}`,
    ].join('; ');

    return new Response(JSON.stringify({ url: callbackUrl }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieOptions,
      },
    });
  } catch (error) {
    console.error('[credentials-signin]', error);
    const authError = getAuthError(error);
    return Response.json({ error: authError.error }, { status: authError.status });
  }
}
