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
    SELECT * FROM videos 
    WHERE user_id = ${session.user.id} 
      AND status IN ('pending_review', 'ready_for_review', 'detected')
    ORDER BY detected_at ASC
    LIMIT ${dailyLimit}
  `;
  return Response.json(videos);
}
