import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get counts for dashboard
    const statsQuery = sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'published' AND published_at >= CURRENT_DATE) as uploaded_today,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending_review') as drafts,
        COUNT(*) FILTER (WHERE status = 'detected') as detected,
        COUNT(*) FILTER (WHERE status IN ('queued', 'analyzing')) as queued,
        COUNT(*) as total_processed
      FROM videos 
      WHERE user_id = ${userId}
    `;

    const result = await statsQuery;
    const stats = result[0] || {
      uploaded_today: 0,
      scheduled: 0,
      failed: 0,
      drafts: 0,
      detected: 0,
      queued: 0,
      total_processed: 0,
    };

    return Response.json({
      processed: parseInt(stats.total_processed),
      uploadedToday: parseInt(stats.uploaded_today),
      scheduled: parseInt(stats.scheduled),
      failed: parseInt(stats.failed),
      drafts: parseInt(stats.drafts),
      detected: parseInt(stats.detected),
      queued: parseInt(stats.queued),
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
