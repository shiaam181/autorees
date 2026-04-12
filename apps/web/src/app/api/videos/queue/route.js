import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await sql`
    SELECT daily_upload_limit FROM user_settings
    WHERE user_id = ${session.user.id} LIMIT 1
  `;
  const dailyLimit = settings?.daily_upload_limit ?? 5;

  const videos = await sql`
    SELECT v.*, m.title as meta_title, m.description as meta_description
    FROM videos v
    LEFT JOIN metadata_versions m ON m.video_id = v.id AND m.is_recommended = true
    WHERE v.user_id = ${session.user.id} 
      AND v.status IN ('queued', 'analyzing', 'pending_review', 'ready_for_review')
    ORDER BY v.queued_at ASC NULLS LAST, v.detected_at ASC
  `;
  return Response.json(videos);
}
