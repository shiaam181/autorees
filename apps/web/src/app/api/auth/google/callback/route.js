import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Google OAuth error:", error);
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/accounts?error=oauth_denied`,
      );
    }

    if (!code) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/accounts?error=missing_code`,
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/accounts?error=token_exchange_failed`,
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Get user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    if (!userInfoResponse.ok) {
      console.error("Failed to fetch Google user info");
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/accounts?error=userinfo_failed`,
      );
    }

    const userInfo = await userInfoResponse.json();
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    const scopes = scope ? scope.split(" ") : [];

    // Determine provider type based on scopes
    const hasDrive = scopes.some(
      (s) =>
        s.includes("drive") ||
        s.includes("https://www.googleapis.com/auth/drive"),
    );
    const hasYouTube = scopes.some(
      (s) =>
        s.includes("youtube") ||
        s.includes("https://www.googleapis.com/auth/youtube"),
    );

    // Store tokens in connected_accounts (upsert)
    // We'll store both as separate rows for clarity
    const providers = [];
    if (hasDrive) providers.push("google_drive");
    if (hasYouTube) providers.push("youtube");

    for (const provider of providers) {
      await sql`
        INSERT INTO connected_accounts 
          (user_id, provider, access_token, refresh_token, expires_at, provider_user_id, provider_email, scopes)
        VALUES 
          (${session.user.id}, ${provider}, ${access_token}, ${refresh_token}, ${expiresAt.toISOString()}, ${userInfo.id}, ${userInfo.email}, ${scopes})
        ON CONFLICT (user_id, provider)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          expires_at = EXCLUDED.expires_at,
          provider_user_id = EXCLUDED.provider_user_id,
          provider_email = EXCLUDED.provider_email,
          scopes = EXCLUDED.scopes,
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    // Log success
    await sql`
      INSERT INTO upload_logs (user_id, action, message, details)
      VALUES (${session.user.id}, 'oauth_connected', 'Google account connected successfully', ${JSON.stringify({ providers, email: userInfo.email })})
    `;

    return new Response(
      `<html><body><script>
        if (window.opener) { window.close(); }
        else { window.location.href = "/accounts?success=true"; }
      </script><p>Connected successfully! You can close this window.</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/accounts?error=internal_error`,
    );
  }
}
