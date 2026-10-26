import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  const session = await getSession(request);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] = await sql`
    SELECT daily_upload_limit, upload_interval_hours FROM user_settings
    WHERE user_id = ${session.user.id} LIMIT 1
  `;
  const dailyLimit = settings?.daily_upload_limit ?? 5;

  const videos = await sql`
    SELECT v.*, 
      m.title as meta_title, 
      m.description as meta_description,
      m.confidence_score
    FROM videos v
    LEFT JOIN metadata_versions m ON m.video_id = v.id AND m.is_recommended = true
    WHERE v.user_id = ${session.user.id}
      AND v.status IN ('queued', 'analyzing', 'ready_for_review', 'scheduled', 'uploading', 'failed')
    ORDER BY v.status ASC, v.queued_at ASC NULLS LAST
    LIMIT 20
  `;

  const [publishedToday] = await sql`
    SELECT COUNT(*)::int as cnt FROM videos
    WHERE user_id = ${session.user.id}
      AND status = 'published'
      AND published_at >= CURRENT_DATE
  `;

  const [lastPublished] = await sql`
    SELECT published_at FROM videos
    WHERE user_id = ${session.user.id}
      AND status = 'published'
      AND published_at IS NOT NULL
    ORDER BY published_at DESC
    LIMIT 1
  `;

  let nextUploadIn = null;
  if (lastPublished?.published_at) {
    const intervalHours = parseFloat(settings?.upload_interval_hours ?? 2);
    const hoursSince = (Date.now() - new Date(lastPublished.published_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < intervalHours) {
      nextUploadIn = Math.round((intervalHours - hoursSince) * 60);
    }
  }

  return Response.json({
    videos,
    stats: {
      daily_limit: dailyLimit,
      published_today: publishedToday?.cnt || 0,
      next_upload_in_minutes: nextUploadIn,
      interval_hours: parseFloat(settings?.upload_interval_hours ?? 2),
    },
  });
}
