import { decode } from '@auth/core/jwt';

/**
 * Reads the session from the JWT cookie directly.
 * Works for both HTTP (localhost) and HTTPS (production).
 */
export async function getSession(request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const cookieHeader = request.headers.get('cookie') ?? '';

  // Try both cookie names — plain (HTTP) and __Secure- prefixed (HTTPS)
  const cookieNames = ['authjs.session-token', '__Secure-authjs.session-token'];

  for (const cookieName of cookieNames) {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${cookieName}=`));

    if (!match) continue;

    const token = match.slice(cookieName.length + 1);
    if (!token) continue;

    try {
      const payload = await decode({ token, secret, salt: cookieName });
      if (payload?.sub) {
        return {
          user: {
            id: payload.sub,
            name: payload.name ?? null,
            email: payload.email ?? null,
            image: payload.picture ?? null,
          },
        };
      }
    } catch {
      // Try next cookie name
    }
  }

  return null;
}
