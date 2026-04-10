import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const videos = await sql`
    SELECT * FROM videos 
    WHERE user_id = ${session.user.id} AND status = 'pending_review' 
    ORDER BY created_at DESC
  `;
  return Response.json(videos);
}
