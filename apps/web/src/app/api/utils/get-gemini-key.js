import sql from "./sql.js";

export async function getGeminiApiKey(userId) {
  const keys = await sql`
    SELECT id, api_key FROM api_keys
    WHERE user_id = ${userId} AND provider = 'gemini' AND is_active = true
    ORDER BY error_count ASC, last_used_at ASC NULLS FIRST
  `;

  if (keys.length > 0) {
    return { keyId: keys[0].id, apiKey: keys[0].api_key, source: "user" };
  }

  if (process.env.GEMINI_API_KEY) {
    return { keyId: null, apiKey: process.env.GEMINI_API_KEY, source: "env" };
  }

  return null;
}

export async function markKeyUsed(keyId) {
  if (!keyId) return;
  await sql`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, error_count = 0 WHERE id = ${keyId}`;
}

export async function markKeyError(keyId) {
  if (!keyId) return;
  await sql`UPDATE api_keys SET error_count = error_count + 1 WHERE id = ${keyId}`;
}

export async function callGeminiWithRotation(userId, prompt) {
  const keys = await sql`
    SELECT id, api_key FROM api_keys
    WHERE user_id = ${userId} AND provider = 'gemini' AND is_active = true
    ORDER BY error_count ASC, last_used_at ASC NULLS FIRST
  `;

  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) keys.push({ id: null, api_key: envKey });

  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured. Add one on the API Keys page.");
  }

  const models = [
    "gemini-2.0-flash",
    "gemini-2.5-flash-preview-05-20",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.5-pro-preview-05-06",
  ];

  for (const key of keys) {
    let keyRateLimited = false;
    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key.api_key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7 },
            }),
          }
        );

        if (res.ok) {
          if (key.id) await markKeyUsed(key.id);
          console.log(`[Gemini] Success with key ${key.id || 'env'} on model ${model}`);
          return await res.json();
        }

        const errText = await res.text();

        if (res.status === 429) {
          console.log(`[Gemini] Key ${key.id || 'env'} rate limited on ${model}, trying next model...`);
          keyRateLimited = true;
          continue;
        }

        if (res.status === 400 && errText.includes("API_KEY_INVALID")) {
          console.log(`[Gemini] Key ${key.id || 'env'} is invalid, disabling`);
          if (key.id) {
            await sql`UPDATE api_keys SET is_active = false WHERE id = ${key.id}`;
          }
          break;
        }

        if (res.status === 404) {
          continue;
        }

        console.error(`[Gemini] Error (${res.status}) on ${model}:`, errText.substring(0, 200));
        continue;
      } catch (err) {
        console.error(`[Gemini] Network error with key ${key.id || 'env'} on ${model}:`, err.message);
        continue;
      }
    }
    if (keyRateLimited && key.id) {
      await markKeyError(key.id);
    }
  }

  throw new Error("All API keys exhausted or rate limited. Add more keys on the API Keys page or wait for limits to reset.");
}
