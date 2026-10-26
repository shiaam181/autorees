import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [account] = await sql`
      SELECT channel_name, channel_image, expires_at
      FROM connected_accounts
      WHERE user_id = ${session.user.id} AND provider = 'instagram'
    `;

    return Response.json({
      connected: !!account,
      username: account?.channel_name || null,
      image: account?.channel_image || null,
      expires_at: account?.expires_at || null,
    });
  } catch (err) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
