import { getSession } from "@/app/api/utils/get-session.js";
import sql from "@/app/api/utils/sql";

export async function POST(request, { params }) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get failed video
    const videos = await sql`
      SELECT * FROM videos
      WHERE id = ${id} AND user_id = ${session.user.id} AND status = 'failed'
      LIMIT 1
    `;

    if (videos.length === 0) {
      return Response.json(
        { error: "Video not found or not in failed status" },
        { status: 404 },
      );
    }

    const video = videos[0];

    // Check retry limit
    if (video.retry_count >= 3) {
      return Response.json(
        {
          error:
            "Maximum retry attempts reached (3). Please check the error and try manually.",
        },
        { status: 400 },
      );
    }

    // Reset video to ready_for_review status
    await sql`
      UPDATE videos
      SET 
        status = 'ready_for_review',
        error_message = NULL,
        last_error = ${video.error_message}
      WHERE id = ${id}
    `;

    // Log retry attempt
    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (
        ${session.user.id},
        ${id},
        'retry_initiated',
        'Video retry requested by user',
        ${JSON.stringify({
          previous_error: video.error_message,
          retry_count: video.retry_count,
        })}
      )
    `;

    return Response.json({
      success: true,
      message: "Video reset for retry",
      retry_count: video.retry_count,
    });
  } catch (error) {
    console.error("Retry error:", error);
    return Response.json(
      { error: "Failed to retry video", details: error.message },
      { status: 500 },
    );
  }
}
