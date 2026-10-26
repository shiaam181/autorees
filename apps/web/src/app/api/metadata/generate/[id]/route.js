import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";
import { callGeminiWithRotation } from "@/app/api/utils/get-gemini-key";

export async function POST(req, { params }) {
  const session = await getSession(req);
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

    const aiData = await callGeminiWithRotation(session.user.id, prompt);

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
