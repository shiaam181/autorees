import sql from "@/app/api/utils/sql";
import { getSession } from "@/app/api/utils/get-session.js";
import { getGoogleAccessToken } from "@/app/api/utils/google-client";
import {
  generateContentHash,
  findDuplicateVideo,
  logDuplicateSkip,
} from "@/app/api/utils/duplicate-detector";

export async function POST(req, { params }) {
  const session = await getSession(req);
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const [source] =
      await sql`SELECT * FROM drive_sources WHERE id = ${id} AND user_id = ${session.user.id}`;
    if (!source)
      return Response.json({ error: "Source not found" }, { status: 404 });

    const [settings] = await sql`
      SELECT review_required, daily_upload_limit FROM user_settings
      WHERE user_id = ${session.user.id}
      LIMIT 1
    `;
    const dailyLimit = settings?.daily_upload_limit ?? 5;

    let accessToken;
    try {
      accessToken = await getGoogleAccessToken(session.user.id, "google_drive");
    } catch (error) {
      return Response.json({ error: "Google Drive not connected or token expired. Please reconnect." }, { status: 403 });
    }

    const driveResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${source.folder_id}'+in+parents+and+mimeType+contains+'video/'&fields=files(id,name,size,mimeType,videoMediaMetadata,createdTime)&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!driveResponse.ok) {
      const errorText = await driveResponse.text();
      return Response.json({ error: "Failed to scan Google Drive folder" }, { status: 500 });
    }

    const driveData = await driveResponse.json();
    const files = driveData.files || [];

    let detectedCount = 0;
    let duplicateCount = 0;
    const results = [];

    if (files.length === 0) {
      return Response.json({ message: `No video files found in this Drive folder.`, count: 0, duplicates: 0, total: 0, daily_limit: dailyLimit, videos: [] });
    }

    for (const file of files) {
      const videoMeta = file.videoMediaMetadata || {};
      const width = videoMeta.width || 0;
      const height = videoMeta.height || 0;
      const duration = videoMeta.durationMillis ? parseInt(videoMeta.durationMillis) / 1000 : 0;
      const contentHash = generateContentHash(file.id, parseInt(file.size || 0), file.name);
      const dupCheck = await findDuplicateVideo(session.user.id, file.id, contentHash);

      if (dupCheck.duplicate) {
        duplicateCount++;
        await logDuplicateSkip(session.user.id, file.id, file.name, dupCheck.video.id);
        continue;
      }

      const [video] = await sql`
        INSERT INTO videos (user_id, drive_source_id, drive_file_id, filename, file_size, duration, width, height, mime_type, status, content_hash, detected_at)
        VALUES (${session.user.id}, ${source.id}, ${file.id}, ${file.name}, ${file.size || null}, ${duration || null}, ${width}, ${height}, ${file.mimeType}, 'detected', ${contentHash}, CURRENT_TIMESTAMP)
        ON CONFLICT (drive_file_id) DO NOTHING
        RETURNING id, filename, status
      `;

      if (video) {
        results.push(video);
        detectedCount++;
        await sql`
          INSERT INTO upload_logs (user_id, video_id, action, message, details)
          VALUES (${session.user.id}, ${video.id}, 'video_detected', 'Video detected from Google Drive', ${JSON.stringify({ drive_file_id: file.id })})
        `;
      }
    }

    await sql`UPDATE drive_sources SET last_scanned_at = CURRENT_TIMESTAMP WHERE id = ${id}`;

    return Response.json({ message: `Detected ${detectedCount} new videos (${duplicateCount} duplicates skipped).`, count: detectedCount, duplicates: duplicateCount, total: files.length, daily_limit: dailyLimit, videos: results });
  } catch (err) {
    console.error("Scan error:", err);
    return Response.json({ error: "Scan failed", details: err.message }, { status: 500 });
  }
}
