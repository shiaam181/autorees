import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

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

    // Update status to analyzing
    await sql`
      UPDATE videos
      SET status = 'analyzing', analyzed_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    // Build enhanced prompt combining multiple analysis strategies
    let analysisContext = `Filename: ${video.filename}`;

    // Add video metadata if available
    if (video.duration) {
      analysisContext += `\nDuration: ${Math.round(video.duration)}s`;
    }
    if (video.width && video.height) {
      analysisContext += `\nAspect Ratio: ${video.width}x${video.height} (${video.height > video.width ? "Vertical" : "Horizontal"})`;
    }

    // Add transcript if available
    if (video.transcript) {
      analysisContext += `\n\nTranscript:\n${video.transcript.substring(0, 1000)}`;
    }

    // Call AI Integration with enhanced prompt
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
  "hashtag_sets": [["#tag1", "#tag2", "#tag3"], ["#tag4", "#tag5", "#tag6"], ["#tag7", "#tag8", "#tag9"]],
  "recommended_hashtags": ["#tag1", "#tag2", "#tag3"],
  "confidence_score": 0.85,
  "notes": "reasoning for recommendations"
}`;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Gemini API failed (${aiResponse.status}): ${errText}`);
    }
    const aiData = await aiResponse.json();

    let content = (aiData.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    const result = JSON.parse(content);

    // Save to metadata_versions
    await sql`
      INSERT INTO metadata_versions (video_id, title, description, hashtags, is_recommended, confidence_score, ai_notes)
      VALUES (${id}, ${result.recommended_title}, ${result.recommended_description}, ${result.recommended_hashtags}, true, ${result.confidence_score || 0.5}, ${result.notes || "AI generated"})
    `;

    // Update video status - high confidence goes to ready_for_review
    const newStatus =
      (result.confidence_score || 0) >= 0.7
        ? "ready_for_review"
        : "pending_review";
    await sql`
      UPDATE videos
      SET status = ${newStatus}
      WHERE id = ${id}
    `;

    // Log success
    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (
        ${session.user.id},
        ${id},
        'metadata_generated',
        'AI metadata generated successfully',
        ${JSON.stringify({
          confidence: result.confidence_score,
          topic: result.topic,
          audience: result.audience,
        })}
      )
    `;

    return Response.json(result);
  } catch (err) {
    console.error("AI Meta Gen Error:", err);

    // Log error
    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (
        ${session.user.id},
        ${id},
        'metadata_failed',
        'Failed to generate metadata',
        ${JSON.stringify({ error: err.message })}
      )
    `;

    // Update video status to failed with error details
    await sql`
      UPDATE videos
      SET status = 'failed', error_message = ${err.message}, last_error = ${err.message}
      WHERE id = ${id}
    `;

    return Response.json(
      { error: "Failed to generate metadata", details: err.message },
      { status: 500 },
    );
  }
}
