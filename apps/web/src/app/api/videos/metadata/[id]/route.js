import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(req, { params }) {
  const session = await getSession(req);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;
  const [metadata] = await sql`
    SELECT * FROM metadata_versions 
    WHERE video_id = ${id} 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  return Response.json(metadata || null);
}
