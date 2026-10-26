import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  try {
    const session = await getSession(request);
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const accounts = await sql`
      SELECT provider FROM connected_accounts 
      WHERE user_id = ${userId}
    `;

    return Response.json({
      drive: accounts.some((a) => a.provider === "google_drive"),
      youtube: accounts.some((a) => a.provider === "youtube"),
    });
  } catch (err) {
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
