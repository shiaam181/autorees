export async function GET() {
  const redirectUri = `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ? "✓ SET" : "✗ MISSING";

  return Response.json({
    redirectUri,
    clientId,
    clientSecret,
    baseUrl: process.env.NEXT_PUBLIC_CREATE_APP_URL,
    note: "Compare the redirectUri above with what you have in Google Console",
  });
}
