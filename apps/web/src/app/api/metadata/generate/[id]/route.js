import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

const MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

async function callGeminiWithRetry(prompt, apiKey, maxRetries = 3) {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
        const data = await res.json();
        return data;
      }

      if (res.status === 429) {
        const retryMatch = await res.text();
        const delayMatch = retryMatch.match(/retry in ([\d.]+)s/i);
        const waitSec = delayMatch ? Math.min(parseFloat(delayMatch[1]), 60) : (attempt + 1) * 15;
        console.log(`[Gemini] Rate limited on ${model}, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
        continue;
      }

      const errText = await res.text();
      throw new Error(`Gemini API failed (${res.status}) on ${model}: ${errText}`);
    }
    console.log(`[Gemini] All retries exhausted for ${model}, trying next model...`);
  }
  throw new Error("All Gemini models exhausted. Your API quota may be fully used. Please wait a few minutes and try again, or upgrade your Gemini API plan.");
}

export async function POST(req, { params }) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const [video] =
      await sql`SELECT * FROM videos WHERE id = ${id} AND user_id = ${session.user.id}`;
    if (!video)
      return Response.json({ error: "Video not found" }, { status: 404 });

    await sql`
      UPDATE videos
      SET status = 'analyzing', analyzed_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    let analysisContext = `Filename: ${video.filename}`;
    if (video.duration) analysisContext += `\nDuration: ${Math.round(video.duration)}s`;
    if (video.width && video.height)
      analysisContext += `\nAspect Ratio: ${video.width}x${video.height} (${video.height > video.width ? "Vertical" : "Horizontal"})`;
    if (video.transcript)
      analysisContext += `\n\nTranscript:\n${video.transcript.substring(0, 1000)}`;

    const prompt = `You are an expert YouTube Shorts content strategist. Analyze the following video and generate highly optimized metadata.

${analysisContext}

Generate metadata that will maximize reach and engagement on YouTube Shorts. The metadata should:
- Hook viewers immediately in the title
- Use proven viral patterns
- Include searchable keywords
- Match the content accurately
- Follow YouTube Shorts best practices
- Include #shorts hashtag in description

Respond ONLY in JSON format (no markdown code blocks):
{
  "topic": "brief topic category",
  "audience": "target audience description",
  "title_options": ["engaging title 1", "engaging title 2", "engaging title 3"],
  "recommended_title": "best title option",
  "description_options": ["description 1 with #shorts", "description 2 with #shorts"],
  "recommended_description": "best description with #shorts",
  "hashtag_sets": [["#tag1", "#tag2", "#tag3"]],
  "recommended_hashtags": ["#tag1", "#tag2", "#tag3"],
  "confidence_score": 0.85,
  "notes": "reasoning for recommendations"
}`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const aiData = await callGeminiWithRetry(prompt, geminiApiKey);

    let content = (aiData.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) content = jsonMatch[0];
    const result = JSON.parse(content);

    await sql`
      INSERT INTO metadata_versions (video_id, title, description, hashtags, is_recommended, confidence_score, ai_notes)
      VALUES (${id}, ${result.recommended_title}, ${result.recommended_description}, ${result.recommended_hashtags}, true, ${result.confidence_score || 0.5}, ${result.notes || "AI generated"})
    `;

    const newStatus = (result.confidence_score || 0) >= 0.7 ? "ready_for_review" : "pending_review";
    await sql`UPDATE videos SET status = ${newStatus} WHERE id = ${id}`;

    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (${session.user.id}, ${id}, 'metadata_generated', 'AI metadata generated successfully', ${JSON.stringify({ confidence: result.confidence_score, topic: result.topic })})
    `;

    return Response.json(result);
  } catch (err) {
    console.error("AI Meta Gen Error:", err.message);

    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (${session.user.id}, ${id}, 'metadata_failed', 'Failed to generate metadata', ${JSON.stringify({ error: err.message })})
    `;

    await sql`
      UPDATE videos SET status = 'detected', error_message = ${err.message}
      WHERE id = ${id}
    `;

    const isRateLimit = err.message.includes("429") || err.message.includes("quota") || err.message.includes("exhausted");
    return Response.json(
      {
        error: isRateLimit
          ? "Gemini API rate limit reached. Please wait a minute and try again."
          : "Failed to generate metadata",
        details: err.message,
        retryable: isRateLimit,
      },
      { status: isRateLimit ? 429 : 500 },
    );
  }
}
