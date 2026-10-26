import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(req) {
  const session = await getSession(req);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // If status filter provided, use it; otherwise show published, scheduled, and failed
    let videos;
    if (status && status !== "all") {
      videos = await sql`
        SELECT * FROM videos 
        WHERE user_id = ${session.user.id} AND status = ${status}
        ORDER BY 
          CASE 
            WHEN status = 'failed' THEN created_at
            WHEN status = 'scheduled' THEN scheduled_at
            ELSE published_at
          END DESC
      `;
    } else {
      videos = await sql`
        SELECT * FROM videos 
        WHERE user_id = ${session.user.id} 
        AND status IN ('published', 'scheduled', 'failed', 'uploading')
        ORDER BY 
          CASE 
            WHEN status = 'failed' THEN created_at
            WHEN status = 'scheduled' THEN scheduled_at
            WHEN status = 'uploading' THEN created_at
            ELSE published_at
          END DESC
      `;
    }

    return Response.json(videos);
  } catch (err) {
    console.error("History fetch error:", err);
    return Response.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
