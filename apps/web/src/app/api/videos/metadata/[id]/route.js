import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(req, { params }) {
  const session = await auth();
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
