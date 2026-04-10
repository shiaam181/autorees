import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/app/api/utils/google-client";

export async function GET(req, { params }) {
  const session = await auth();
  if (!session || !session.user?.id)
    return new Response("Unauthorized", { status: 401 });

  const { id } = params;

  const [video] = await sql`
    SELECT drive_file_id, filename, user_id FROM videos
    WHERE id = ${id} AND user_id = ${session.user.id}
  `;

  if (!video || !video.drive_file_id)
    return new Response("Video not found", { status: 404 });

  try {
    const accessToken = await getGoogleAccessToken(session.user.id, "google_drive");

    const range = req.headers.get("range");

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${video.drive_file_id}?alt=media`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (range) {
      headers["Range"] = range;
    }

    const driveRes = await fetch(driveUrl, { headers });

    if (!driveRes.ok) {
      console.error(`[Stream] Drive API error: ${driveRes.status}`);
      return new Response("Failed to stream video", { status: 502 });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", driveRes.headers.get("content-type") || "video/mp4");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "private, max-age=3600");

    if (driveRes.headers.get("content-length")) {
      responseHeaders.set("Content-Length", driveRes.headers.get("content-length"));
    }
    if (driveRes.headers.get("content-range")) {
      responseHeaders.set("Content-Range", driveRes.headers.get("content-range"));
    }

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[Stream] Error:", err.message);
    return new Response("Failed to stream video: " + err.message, { status: 500 });
  }
}
