import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [settings] =
    await sql`SELECT * FROM user_settings WHERE user_id = ${session.user.id}`;
  return Response.json(
    settings || {
      default_privacy: "private",
      default_category: "22",
      default_language: "en",
      review_required: true,
    },
  );
}

export async function PATCH(request) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { default_privacy, default_category, review_required } = body;

  const [updated] = await sql`
    UPDATE user_settings 
    SET 
      default_privacy = COALESCE(${default_privacy}, default_privacy),
      default_category = COALESCE(${default_category}, default_category),
      review_required = COALESCE(${review_required}, review_required),
      updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ${session.user.id}
    RETURNING *
  `;

  return Response.json(updated);
}
