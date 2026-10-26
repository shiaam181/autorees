import sql from "@/app/api/utils/sql";

export async function GET(request) {
  const settings = await sql`SELECT * FROM user_settings LIMIT 5`;
  const accounts = await sql`SELECT user_id, provider, expires_at FROM connected_accounts`;
  const videoStats = await sql`
    SELECT status, COUNT(*) as count 
    FROM videos 
    GROUP BY status 
    ORDER BY count DESC
  `;
  const keys = await sql`SELECT id, provider, is_active, error_count, base_url FROM api_keys`;

  return Response.json({ settings, accounts, videoStats, keys });
}
