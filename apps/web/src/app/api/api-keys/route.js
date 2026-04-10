import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await sql`
    SELECT id, provider, label, is_active, last_used_at, error_count, created_at,
      CONCAT(LEFT(api_key, 8), '...', RIGHT(api_key, 4)) as masked_key
    FROM api_keys
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `;

  return Response.json(keys);
}

export async function POST(request) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { api_key, label, provider } = await request.json();

  if (!api_key || api_key.trim().length < 10) {
    return Response.json({ error: "Invalid API key" }, { status: 400 });
  }

  const selectedProvider = provider || "gemini";
  let keyValid = false;
  let lastErr = "";

  if (selectedProvider === "openai") {
    const testRes = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${api_key.trim()}` },
    });
    if (testRes.ok) {
      keyValid = true;
    } else {
      const err = await testRes.text();
      if (testRes.status === 401) {
        return Response.json({ error: "Invalid OpenAI API key. Please check and try again." }, { status: 400 });
      }
      if (testRes.status === 429) {
        keyValid = true;
      } else {
        lastErr = err;
      }
    }
  } else {
    const testModels = ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"];
    for (const model of testModels) {
      const testRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Say hello in one word" }] }],
          }),
        }
      );
      if (testRes.ok) { keyValid = true; break; }
      const err = await testRes.text();
      if (testRes.status === 400 && err.includes("API_KEY_INVALID")) {
        return Response.json({ error: "Invalid Gemini API key. Please check and try again." }, { status: 400 });
      }
      if (testRes.status === 429) { keyValid = true; break; }
      lastErr = err;
    }
  }

  if (!keyValid) {
    return Response.json({ error: `Key verification failed: ${lastErr.substring(0, 200)}` }, { status: 400 });
  }

  const [key] = await sql`
    INSERT INTO api_keys (user_id, provider, api_key, label)
    VALUES (${session.user.id}, ${provider || "gemini"}, ${api_key.trim()}, ${label || null})
    RETURNING id, provider, label, is_active, created_at,
      CONCAT(LEFT(api_key, 8), '...', RIGHT(api_key, 4)) as masked_key
  `;

  return Response.json(key);
}

export async function PATCH(request) {
  const session = await auth();
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
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();

  await sql`DELETE FROM api_keys WHERE id = ${id} AND user_id = ${session.user.id}`;

  return Response.json({ success: true });
}
