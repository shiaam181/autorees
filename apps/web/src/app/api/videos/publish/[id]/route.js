import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";
import { getGoogleAccessToken } from "@/app/api/utils/google-client";

export async function POST(req, { params }) {
  const session = await auth();
  if (!session || !session.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    // Get video with metadata
    const [video] = await sql`
      SELECT v.*, m.title, m.description, m.hashtags, ds.folder_id
      FROM videos v
      LEFT JOIN metadata_versions m ON m.video_id = v.id AND m.is_recommended = true
      LEFT JOIN drive_sources ds ON v.drive_source_id = ds.id
      WHERE v.id = ${id} AND v.user_id = ${session.user.id}
      ORDER BY m.created_at DESC
      LIMIT 1
    `;
    if (!video)
      return Response.json({ error: "Video not found" }, { status: 404 });

    // Check for metadata
    if (!video.title || !video.description) {
      return Response.json(
        { error: "Video metadata not generated yet. Generate metadata first." },
        { status: 400 },
      );
    }

    // Get current retry count before incrementing
    const currentRetryCount = video.retry_count || 0;

    // Get Google tokens for Drive and YouTube
    let driveToken, youtubeToken;
    try {
      driveToken = await getGoogleAccessToken(session.user.id, "google_drive");
      youtubeToken = await getGoogleAccessToken(session.user.id, "youtube");
    } catch (error) {
      console.error("OAuth token error:", error);
      await sql`
        INSERT INTO upload_logs (user_id, video_id, action, message, details)
        VALUES (${session.user.id}, ${id}, 'upload_failed', 'Google account not connected', ${JSON.stringify({ error: error.message })})
      `;
      return Response.json(
        {
          error:
            "Google Drive or YouTube not connected. Please reconnect your account.",
        },
        { status: 403 },
      );
    }

    // Update status to uploading
    await sql`
      UPDATE videos
      SET status = 'uploading', retry_count = retry_count + 1
      WHERE id = ${id}
    `;

    // Step 1: Download file from Google Drive
    const downloadResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${video.drive_file_id}?alt=media`,
      {
        headers: { Authorization: `Bearer ${driveToken}` },
      },
    );

    if (!downloadResponse.ok) {
      throw new Error(
        `Failed to download from Drive: ${downloadResponse.status}`,
      );
    }

    const videoBlob = await downloadResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();

    // Step 2: Upload to YouTube
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Build metadata object
    const metadata = {
      snippet: {
        title: video.title,
        description: video.description,
        tags: video.hashtags || [],
        categoryId: "22",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };

    // Build multipart body
    const metadataPart =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata);
    const videoPart =
      delimiter + "Content-Type: " + video.mime_type + "\r\n\r\n";
    const multipartRequestBody = new Blob([
      new TextEncoder().encode(metadataPart),
      new TextEncoder().encode(videoPart),
      new Uint8Array(videoBuffer),
      new TextEncoder().encode(closeDelimiter),
    ]);

    // Upload to YouTube
    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${youtubeToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("YouTube upload error:", errorText);
      throw new Error(`YouTube upload failed: ${uploadResponse.status}`);
    }

    const uploadResult = await uploadResponse.json();
    const youtubeVideoId = uploadResult.id;
    const youtubeVideoUrl = `https://youtube.com/shorts/${youtubeVideoId}`;

    // Update video record
    await sql`
      UPDATE videos 
      SET 
        status = 'published', 
        published_at = CURRENT_TIMESTAMP, 
        youtube_video_id = ${youtubeVideoId},
        youtube_video_url = ${youtubeVideoUrl},
        error_message = NULL,
        last_error = NULL
      WHERE id = ${id}
    `;

    // Log success
    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (
        ${session.user.id},
        ${id},
        'upload_success',
        'Video published to YouTube Shorts',
        ${JSON.stringify({ youtube_video_id: youtubeVideoId, url: youtubeVideoUrl })}
      )
    `;

    return Response.json({
      success: true,
      youtube_video_id: youtubeVideoId,
      youtube_video_url: youtubeVideoUrl,
    });
  } catch (err) {
    console.error("Upload error:", err);

    // Update video with error
    await sql`
      UPDATE videos
      SET status = 'failed', error_message = ${err.message}, last_error = ${err.message}
      WHERE id = ${id}
    `;

    // Log failure
    await sql`
      INSERT INTO upload_logs (user_id, video_id, action, message, details)
      VALUES (
        ${session.user.id},
        ${id},
        'upload_failed',
        'YouTube upload failed',
        ${JSON.stringify({ error: err.message })}
      )
    `;

    return Response.json(
      { error: "Upload failed", details: err.message },
      { status: 500 },
    );
  }
}
