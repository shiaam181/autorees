import { getSession } from "@/app/api/utils/get-session.js";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "http://localhost:5000";

    if (error) {
      return Response.redirect(`${appUrl}/accounts?error=oauth_denied`);
    }

    if (!code) {
      return Response.redirect(`${appUrl}/accounts?error=missing_code`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${appUrl}/api/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return Response.redirect(`${appUrl}/accounts?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Get user info
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoRes.ok) {
      return Response.redirect(`${appUrl}/accounts?error=userinfo_failed`);
    }

    const userInfo = await userInfoRes.json();
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    const scopes = scope ? scope.split(" ") : [];

    // The callback has no session cookie (it's a redirect from Google)
    // We get the user_id from the state or from a temp cookie
    // Instead, we'll try to get session from the request cookies
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.redirect(`${appUrl}/accounts?error=not_logged_in`);
    }

    const hasDrive = scopes.some((s) => s.includes("drive"));
    const hasYouTube = scopes.some((s) => s.includes("youtube"));
    const providers = [];
    if (hasDrive) providers.push("google_drive");
    if (hasYouTube) providers.push("youtube");

    for (const provider of providers) {
      await sql`
        INSERT INTO connected_accounts
          (user_id, provider, access_token, refresh_token, expires_at, provider_user_id, provider_email, scopes)
        VALUES
          (${session.user.id}, ${provider}, ${access_token}, ${refresh_token || null}, ${expiresAt.toISOString()}, ${userInfo.id}, ${userInfo.email}, ${scopes})
        ON CONFLICT (user_id, provider)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = COALESCE(EXCLUDED.refresh_token, connected_accounts.refresh_token),
          expires_at = EXCLUDED.expires_at,
          provider_user_id = EXCLUDED.provider_user_id,
          provider_email = EXCLUDED.provider_email,
          scopes = EXCLUDED.scopes,
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    await sql`
      INSERT INTO upload_logs (user_id, action, message, details)
      VALUES (${session.user.id}, 'oauth_connected', 'Google account connected', ${JSON.stringify({ providers, email: userInfo.email })})
    `;

    return new Response(
      `<html><body><script>
        if (window.opener) { window.opener.location.reload(); window.close(); }
        else { window.location.href = "/accounts?success=true"; }
      </script><p>Connected! You can close this window.</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "http://localhost:5000";
    return Response.redirect(`${appUrl}/accounts?error=internal_error`);
  }
}
