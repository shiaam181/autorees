import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function POST(request) {
  const session = await getSession(request);
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  await sql`DELETE FROM connected_accounts WHERE user_id = ${session.user.id} AND provider IN ('instagram', 'instagram_user_token')`;
  return Response.json({ success: true });
}
