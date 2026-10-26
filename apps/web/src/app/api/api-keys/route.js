import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  const session = await getSession(request);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await sql`
    SELECT id, provider, label, is_active, last_used_at, error_count, created_at, base_url,
      CONCAT(LEFT(api_key, 8), '...', RIGHT(api_key, 4)) as masked_key
    FROM api_keys
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `;

  return Response.json(keys);
}

export async function POST(request) {
  const session = await getSession(request);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { api_key, label, provider, base_url } = await request.json();

  if (!api_key || api_key.trim().length < 10) {
    return Response.json({ error: "Invalid API key" }, { status: 400 });
  }

  // Skip external verification — just save the key as provided

  const [key] = await sql`
    INSERT INTO api_keys (user_id, provider, api_key, label, base_url)
    VALUES (${session.user.id}, ${provider || "gemini"}, ${api_key.trim()}, ${label || null}, ${base_url || null})
    RETURNING id, provider, label, is_active, created_at, base_url,
      CONCAT(LEFT(api_key, 8), '...', RIGHT(api_key, 4)) as masked_key
  `;

  return Response.json(key);
}

export async function PATCH(request) {
  const session = await getSession(request);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id, is_active } = await request.json();

  const [key] = await sql`
    UPDATE api_keys
    SET is_active = ${is_active}, error_count = 0
    WHERE id = ${id} AND user_id = ${session.user.id}
    RETURNING id, is_active
  `;

  return Response.json(key || { error: "Not found" });
}

export async function DELETE(request) {
  const session = await getSession(request);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();

  await sql`DELETE FROM api_keys WHERE id = ${id} AND user_id = ${session.user.id}`;

  return Response.json({ success: true });
}
