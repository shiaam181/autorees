import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(req) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { video_id, title, description, hashtags } = await req.json();

  if (!video_id || !title) {
    return Response.json({ error: "Video ID and title are required" }, { status: 400 });
  }

  const [video] = await sql`SELECT id FROM videos WHERE id = ${video_id} AND user_id = ${session.user.id}`;
  if (!video) return Response.json({ error: "Video not found" }, { status: 404 });

  await sql`UPDATE metadata_versions SET is_recommended = false WHERE video_id = ${video_id}`;

  const hashtagArray = Array.isArray(hashtags)
    ? hashtags
    : typeof hashtags === "string"
      ? hashtags.split(",").map(t => t.trim()).filter(Boolean)
      : [];

  const [meta] = await sql`
    INSERT INTO metadata_versions (video_id, title, description, hashtags, is_recommended, confidence_score, ai_notes)
    VALUES (${video_id}, ${title}, ${description || ""}, ${hashtagArray}, true, 1.0, 'Manually written by user')
    RETURNING *
  `;

  await sql`UPDATE videos SET status = 'ready_for_review' WHERE id = ${video_id} AND status IN ('detected', 'pending_review')`;

  return Response.json(meta);
}
