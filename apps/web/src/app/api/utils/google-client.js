import sql from "./sql";

/**
 * Get a valid Google access token for a user and provider
 * Automatically refreshes if expired
 */
export async function getGoogleAccessToken(userId, provider) {
  const rows = await sql`
    SELECT * FROM connected_accounts
    WHERE user_id = ${userId} AND provider = ${provider}
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error(`No ${provider} connection found for user ${userId}`);
  }

  const account = rows[0];
  const now = new Date();
  const expiresAt = new Date(account.expires_at);

  // If token is still valid (with 5 min buffer), return it
  if (expiresAt > new Date(now.getTime() + 5 * 60 * 1000)) {
    return account.access_token;
  }

  // Token expired, refresh it
  if (!account.refresh_token) {
    throw new Error(`No refresh token available for ${provider}`);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token refresh failed:", error);
    throw new Error("Failed to refresh Google access token");
  }

  const tokens = await tokenResponse.json();
  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Update the stored token
  await sql`
    UPDATE connected_accounts
    SET 
      access_token = ${tokens.access_token},
      expires_at = ${newExpiresAt.toISOString()},
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${userId} AND provider = ${provider}
  `;

  return tokens.access_token;
}

/**
 * Check if user has connected a specific provider
 */
export async function hasProviderConnected(userId, provider) {
  const rows = await sql`
    SELECT id FROM connected_accounts
    WHERE user_id = ${userId} AND provider = ${provider}
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Disconnect a provider for a user
 */
export async function disconnectProvider(userId, provider) {
  await sql`
    DELETE FROM connected_accounts
    WHERE user_id = ${userId} AND provider = ${provider}
  `;
}
