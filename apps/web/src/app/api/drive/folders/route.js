import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const folders =
    await sql`SELECT * FROM drive_sources WHERE user_id = ${session.user.id} ORDER BY created_at DESC`;
  return Response.json(folders);
}

export async function POST(request) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { folderUrl } = await request.json();

  // Extract folder ID from URL
  const match = folderUrl.match(/folders\/([a-zA-Z0-9-_]+)/);
  if (!match)
    return Response.json(
      { error: "Invalid Drive folder URL" },
      { status: 400 },
    );
  const folderId = match[1];

  try {
    // In a real app, you'd verify access here using Drive API
    // For now, we'll just add it to the DB
    const [source] = await sql`
      INSERT INTO drive_sources (user_id, folder_id, folder_url, folder_name)
      VALUES (${session.user.id}, ${folderId}, ${folderUrl}, 'Detecting Name...')
      RETURNING *
    `;

    // Initialize user settings if not exists
    await sql`
      INSERT INTO user_settings (user_id)
      VALUES (${session.user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    return Response.json(source);
  } catch (err) {
    return Response.json({ error: "Failed to add source" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id)
    return Response.json({ error: "Missing folder id" }, { status: 400 });

  try {
    await sql`DELETE FROM drive_sources WHERE id = ${id} AND user_id = ${session.user.id}`;
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Failed to delete source" }, { status: 500 });
  }
}
