import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] =
    await sql`SELECT * FROM user_settings WHERE user_id = ${session.user.id}`;

  if (!settings) {
    await sql`INSERT INTO user_settings (user_id) VALUES (${session.user.id}) ON CONFLICT (user_id) DO NOTHING`;
    const [newSettings] = await sql`SELECT * FROM user_settings WHERE user_id = ${session.user.id}`;
    return Response.json(newSettings || {
      review_required: true,
      auto_queue: false,
      auto_scan: true,
      auto_metadata: true,
      auto_publish: false,
      scan_interval_minutes: 5,
      default_privacy: "public",
      default_category: "22",
      default_language: "en",
      branding_line: "Created with YT Shorts Auto",
      made_for_kids: false,
    });
  }

  if (settings.upload_interval_hours != null) {
    settings.upload_interval_hours = parseFloat(settings.upload_interval_hours);
  }
  if (settings.daily_upload_limit != null) {
    settings.daily_upload_limit = parseInt(settings.daily_upload_limit);
  }
  return Response.json(settings);
}

export async function PATCH(request) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  await sql`INSERT INTO user_settings (user_id) VALUES (${session.user.id}) ON CONFLICT (user_id) DO NOTHING`;

  const [updated] = await sql`
    UPDATE user_settings 
    SET 
      review_required = COALESCE(${body.review_required ?? null}, review_required),
      auto_queue = COALESCE(${body.auto_queue ?? null}, auto_queue),
      auto_scan = COALESCE(${body.auto_scan ?? null}, auto_scan),
      auto_metadata = COALESCE(${body.auto_metadata ?? null}, auto_metadata),
      auto_publish = COALESCE(${body.auto_publish ?? null}, auto_publish),
      scan_interval_minutes = COALESCE(${body.scan_interval_minutes ?? null}, scan_interval_minutes),
      daily_upload_limit = COALESCE(${body.daily_upload_limit ?? null}, daily_upload_limit),
      upload_interval_hours = COALESCE(${body.upload_interval_hours ?? null}, upload_interval_hours),
      default_privacy = COALESCE(${body.default_privacy ?? null}, default_privacy),
      default_category = COALESCE(${body.default_category ?? null}, default_category),
      default_language = COALESCE(${body.default_language ?? null}, default_language),
      branding_line = COALESCE(${body.branding_line ?? null}, branding_line),
      made_for_kids = COALESCE(${body.made_for_kids ?? null}, made_for_kids),
      notification_email = COALESCE(${body.notification_email ?? null}, notification_email),
      default_timezone = COALESCE(${body.default_timezone ?? null}, default_timezone),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${session.user.id}
    RETURNING *
  `;

  if (updated.upload_interval_hours != null) {
    updated.upload_interval_hours = parseFloat(updated.upload_interval_hours);
  }
  if (updated.daily_upload_limit != null) {
    updated.daily_upload_limit = parseInt(updated.daily_upload_limit);
  }
  return Response.json(updated);
}
