import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await request.json();
  if (!provider)
    return Response.json({ error: "Missing provider" }, { status: 400 });

  try {
    await sql`DELETE FROM connected_accounts WHERE user_id = ${session.user.id} AND provider = ${provider}`;
    return Response.json({ success: true });
  } catch (err) {
    console.error("Disconnect error:", err);
    return Response.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
