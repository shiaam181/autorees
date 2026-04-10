import sql from "./sql.js";

export async function markKeyUsed(keyId) {
  if (!keyId) return;
  await sql`UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, error_count = 0 WHERE id = ${keyId}`;
}

export async function markKeyError(keyId) {
  if (!keyId) return;
  await sql`UPDATE api_keys SET error_count = error_count + 1 WHERE id = ${keyId}`;
}

async function tryGeminiKey(key, prompt) {
  const models = [
    "gemini-2.0-flash",
    "gemini-2.5-flash-preview-05-20",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.5-pro-preview-05-06",
  ];

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
        console.log(`[AI] Gemini success with key ${key.id || 'env'} on ${model}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      const errText = await res.text();

      if (res.status === 429) {
        console.log(`[AI] Gemini key ${key.id || 'env'} rate limited on ${model}`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      if (res.status === 400 && errText.includes("API_KEY_INVALID")) {
        if (key.id) await sql`UPDATE api_keys SET is_active = false WHERE id = ${key.id}`;
        return null;
      }
      if (res.status === 404) continue;
      console.error(`[AI] Gemini error (${res.status}) on ${model}:`, errText.substring(0, 200));
    } catch (err) {
      console.error(`[AI] Gemini network error:`, err.message);
    }
  }

  if (key.id) await markKeyError(key.id);
  return null;
}

async function tryOpenAIKey(key, prompt) {
  const models = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];

  for (const model of models) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key.api_key}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        if (key.id) await markKeyUsed(key.id);
        console.log(`[AI] OpenAI success with key ${key.id} on ${model}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }

      const errText = await res.text();

      if (res.status === 429) {
        console.log(`[AI] OpenAI key ${key.id} rate limited on ${model}`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      if (res.status === 401) {
        if (key.id) await sql`UPDATE api_keys SET is_active = false WHERE id = ${key.id}`;
        return null;
      }
      if (res.status === 404) continue;
      console.error(`[AI] OpenAI error (${res.status}) on ${model}:`, errText.substring(0, 200));
    } catch (err) {
      console.error(`[AI] OpenAI network error:`, err.message);
    }
  }

  if (key.id) await markKeyError(key.id);
  return null;
}

export async function callGeminiWithRotation(userId, prompt) {
  const allKeys = await sql`
    SELECT id, api_key, provider FROM api_keys
    WHERE user_id = ${userId} AND is_active = true
    ORDER BY error_count ASC, last_used_at ASC NULLS FIRST
  `;

  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) allKeys.push({ id: null, api_key: envKey, provider: "gemini" });

  if (allKeys.length === 0) {
    throw new Error("No API keys configured. Add a Gemini or OpenAI key on the API Keys page.");
  }

  for (const key of allKeys) {
    let result = null;

    if (key.provider === "openai") {
      result = await tryOpenAIKey(key, prompt);
    } else {
      result = await tryGeminiKey(key, prompt);
    }

    if (result) {
      const text = result.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? jsonMatch[0] : text;
      return { candidates: [{ content: { parts: [{ text: parsed }] } }] };
    }
  }

  throw new Error("All API keys exhausted or rate limited. Add more keys on the API Keys page or wait for limits to reset.");
}
