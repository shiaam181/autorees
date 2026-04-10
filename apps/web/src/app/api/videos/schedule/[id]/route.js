import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { scheduled_for, timezone } = body;

    if (!scheduled_for) {
      return Response.json(
        { error: "scheduled_for is required (ISO 8601 timestamp)" },
        { status: 400 },
      );
    }

    // Get video
    const videos = await sql`
      SELECT * FROM videos
      WHERE id = ${id} AND user_id = ${session.user.id}
      LIMIT 1
    `;

    if (videos.length === 0) {
      return Response.json({ error: "Video not found" }, { status: 404 });
    }

    const video = videos[0];

    // Only allow scheduling for videos in certain states
    const allowedStatuses = ["ready_for_review", "pending_review", "scheduled"];
    if (!allowedStatuses.includes(video.status)) {
      return Response.json(
        {
          error: `Cannot schedule video in status: ${video.status}. Must be one of: ${allowedStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      return Response.json(
        { error: "Invalid date format for scheduled_for" },
        { status: 400 },
      );
    }

    if (scheduledDate < new Date()) {
      return Response.json(
        { error: "Cannot schedule in the past" },
        { status: 400 },
      );
    }

    // Update video status
    await sql`
      UPDATE videos
      SET status = 'scheduled', scheduled_at = ${scheduledDate.toISOString()}
      WHERE id = ${id}
    `;

    // Create or update schedule entry
    await sql`
      INSERT INTO upload_schedule (video_id, user_id, scheduled_for, timezone, auto_scheduled)
      VALUES (${id}, ${session.user.id}, ${scheduledDate.toISOString()}, ${timezone || "UTC"}, false)
      ON CONFLICT (video_id)
      DO UPDATE SET
        scheduled_for = EXCLUDED.scheduled_for,
        timezone = EXCLUDED.timezone,
        auto_scheduled = false
    `;

    // Log scheduling
    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (
        ${session.user.id},
        ${id},
        'video_scheduled',
        'Video scheduled for upload',
        ${JSON.stringify({
          scheduled_for: scheduledDate.toISOString(),
          timezone: timezone || "UTC",
        })}
      )
    `;

    return Response.json({
      success: true,
      scheduled_for: scheduledDate.toISOString(),
      message: "Video scheduled successfully",
    });
  } catch (error) {
    console.error("Schedule error:", error);
    return Response.json(
      { error: "Failed to schedule video", details: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Remove schedule and update video status
    await sql`
      DELETE FROM upload_schedule
      WHERE video_id = ${id} AND user_id = ${session.user.id}
    `;

    await sql`
      UPDATE videos
      SET status = 'ready_for_review', scheduled_at = NULL
      WHERE id = ${id} AND user_id = ${session.user.id}
    `;

    // Log cancellation
    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message)
      VALUES (${session.user.id}, ${id}, 'schedule_cancelled', 'Scheduled upload cancelled by user')
    `;

    return Response.json({
      success: true,
      message: "Schedule cancelled",
    });
  } catch (error) {
    console.error("Cancel schedule error:", error);
    return Response.json(
      { error: "Failed to cancel schedule", details: error.message },
      { status: 500 },
    );
  }
}
