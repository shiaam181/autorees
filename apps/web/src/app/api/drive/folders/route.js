import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";

export async function GET(request) {
  const session = await getSession(request);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const folders =
    await sql`SELECT * FROM drive_sources WHERE user_id = ${session.user.id} ORDER BY created_at DESC`;
  return Response.json(folders);
}

export async function POST(request) {
  const session = await getSession(request);
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
    const [source] = await sql`
      INSERT INTO drive_sources (user_id, folder_id, folder_url, folder_name)
      VALUES (${session.user.id}, ${folderId}, ${folderUrl}, 'Detecting Name...')
      RETURNING *
    `;

    await sql`
      INSERT INTO user_settings (user_id)
      VALUES (${session.user.id})
      ON CONFLICT (user_id) DO NOTHING
    `;

    return Response.json(source);
  } catch (err) {
    console.error('[drive/folders POST]', err);
    return Response.json({ error: "Failed to add source" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const session = await getSession(request);
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
