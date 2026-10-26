import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  const session = await getSession(request);
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = cookieHeader.split(';').map(c => c.trim().split('=')[0]);
  
  return Response.json({
    session: session ? { id: session.user?.id, email: session.user?.email } : null,
    cookies_present: cookies,
    has_session_cookie: cookies.some(c => c.includes('authjs')),
  });
}
