import { getSession } from "@/app/api/utils/get-session.js";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "http://localhost:5000";

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return Response.redirect(`${appUrl}/accounts?error=instagram_denied`);
    }
    if (!code) {
      return Response.redirect(`${appUrl}/accounts?error=missing_code`);
    }

    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.redirect(`${appUrl}/accounts?error=not_logged_in`);
    }

    const redirectUri = `${appUrl}/api/instagram/callback`;

    // Exchange code for short-lived token
    const tokenRes = await fetch("https://graph.facebook.com/v21.0/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID,
        client_secret: process.env.INSTAGRAM_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Instagram token exchange failed:", err);
      return Response.redirect(`${appUrl}/accounts?error=instagram_token_failed`);
    }

    const { access_token: shortToken } = await tokenRes.json();

    // Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${process.env.INSTAGRAM_APP_ID}&` +
      `client_secret=${process.env.INSTAGRAM_APP_SECRET}&` +
      `fb_exchange_token=${shortToken}`
    );

    const longTokenData = await longTokenRes.json();
    const longToken = longTokenData.access_token || shortToken;
    const expiresIn = longTokenData.expires_in || 5184000; // 60 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get Facebook pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${longToken}`
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return Response.redirect(`${appUrl}/accounts?error=no_facebook_page`);
    }

    // Get Instagram Business Account linked to the first page
    let instagramAccountId = null;
    let pageAccessToken = null;
    let pageId = null;

    for (const page of pages) {
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      const igData = await igRes.json();
      if (igData.instagram_business_account?.id) {
        instagramAccountId = igData.instagram_business_account.id;
        pageAccessToken = page.access_token;
        pageId = page.id;
        break;
      }
    }

    if (!instagramAccountId) {
      return Response.redirect(`${appUrl}/accounts?error=no_instagram_business`);
    }

    // Get Instagram account info
    const igInfoRes = await fetch(
      `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=id,username,name,profile_picture_url&access_token=${pageAccessToken}`
    );
    const igInfo = await igInfoRes.json();

    // Save to connected_accounts
    await sql`
      INSERT INTO connected_accounts
        (user_id, provider, access_token, expires_at, provider_user_id, provider_email, channel_id, channel_name, channel_image)
      VALUES
        (${session.user.id}, 'instagram', ${pageAccessToken}, ${expiresAt.toISOString()},
         ${instagramAccountId}, ${igInfo.username || null}, ${instagramAccountId},
         ${igInfo.username || igInfo.name || null}, ${igInfo.profile_picture_url || null})
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        expires_at = EXCLUDED.expires_at,
        provider_user_id = EXCLUDED.provider_user_id,
        provider_email = EXCLUDED.provider_email,
        channel_id = EXCLUDED.channel_id,
        channel_name = EXCLUDED.channel_name,
        channel_image = EXCLUDED.channel_image,
        updated_at = CURRENT_TIMESTAMP
    `;

    // Also store the long-lived user token for refresh later
    await sql`
      INSERT INTO connected_accounts
        (user_id, provider, access_token, refresh_token, expires_at, provider_user_id, channel_id)
      VALUES
        (${session.user.id}, 'instagram_user_token', ${longToken}, ${pageId}, ${expiresAt.toISOString()}, ${instagramAccountId}, ${pageId})
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = CURRENT_TIMESTAMP
    `;

    return new Response(
      `<html><body><script>
        if (window.opener) { window.opener.location.reload(); window.close(); }
        else { window.location.href = "/accounts?success=instagram"; }
      </script><p>Instagram connected! You can close this window.</p></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("Instagram callback error:", err);
    return Response.redirect(`${appUrl}/accounts?error=instagram_internal`);
  }
}
