import sql from "./sql.js";
import { getGoogleAccessToken } from "./google-client.js";
import { generateContentHash, findDuplicateVideo, logDuplicateSkip } from "./duplicate-detector.js";

let workerInterval = null;
let isRunning = false;

export function startAutomationWorker(intervalMs = 5 * 60 * 1000) {
  if (workerInterval) return;
  console.log(`[AutoWorker] Starting automation worker (interval: ${intervalMs / 1000}s)`);
  workerInterval = setInterval(() => runPipeline(), intervalMs);
  setTimeout(() => runPipeline(), 10000);
}

export function stopAutomationWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log("[AutoWorker] Stopped");
  }
}

async function runPipeline() {
  if (isRunning) return;
  isRunning = true;
  try {
    await scanAllFolders();
    await generateMetadataForPending();
    await publishReadyVideos();
  } catch (err) {
    console.error("[AutoWorker] Pipeline error:", err.message);
  } finally {
    isRunning = false;
  }
}

async function scanAllFolders() {
  const sources = await sql`
    SELECT ds.*, au.id as owner_id
    FROM drive_sources ds
    JOIN auth_users au ON ds.user_id = au.id
    WHERE ds.is_active != false
  `;

  for (const source of sources) {
    try {
      let accessToken;
      try {
        accessToken = await getGoogleAccessToken(source.user_id, "google_drive");
      } catch {
        continue;
      }

      const [settings] = await sql`
        SELECT review_required, daily_upload_limit FROM user_settings WHERE user_id = ${source.user_id} LIMIT 1
      `;
      const reviewRequired = settings?.review_required ?? true;
      const dailyLimit = settings?.daily_upload_limit ?? 5;

      const [todayCount] = await sql`
        SELECT COUNT(*)::int as cnt FROM videos
        WHERE user_id = ${source.user_id}
          AND detected_at >= CURRENT_DATE
      `;
      const remainingSlots = Math.max(0, dailyLimit - (todayCount?.cnt || 0));
      if (remainingSlots <= 0) {
        continue;
      }

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${source.folder_id}'+in+parents+and+mimeType+contains+'video/'&fields=files(id,name,size,mimeType,videoMediaMetadata,createdTime)&pageSize=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!driveResponse.ok) continue;

      const driveData = await driveResponse.json();
      const files = driveData.files || [];
      let detectedCount = 0;

      for (const file of files) {
        if (detectedCount >= remainingSlots) break;

        const videoMeta = file.videoMediaMetadata || {};
        const width = videoMeta.width || 0;
        const height = videoMeta.height || 0;
        const duration = videoMeta.durationMillis ? parseInt(videoMeta.durationMillis) / 1000 : 0;

        const contentHash = generateContentHash(file.id, parseInt(file.size || 0), file.name);
        const dupCheck = await findDuplicateVideo(source.user_id, file.id, contentHash);
        if (dupCheck.duplicate) continue;

        const isVertical = height > width;
        const isShortDuration = duration > 0 && duration <= 60;
        const isIdealShort = isVertical && isShortDuration;
        const initialStatus = reviewRequired || !isIdealShort ? "pending_review" : "detected";

        const [video] = await sql`
          INSERT INTO videos (user_id, drive_source_id, drive_file_id, filename, file_size, duration, width, height, mime_type, status, content_hash, detected_at)
          VALUES (${source.user_id}, ${source.id}, ${file.id}, ${file.name}, ${file.size || null}, ${duration || null}, ${width}, ${height}, ${file.mimeType}, ${initialStatus}, ${contentHash}, CURRENT_TIMESTAMP)
          ON CONFLICT (drive_file_id) DO NOTHING
          RETURNING id, filename, status
        `;

        if (video) {
          detectedCount++;
          await sql`
            INSERT INTO upload_logs (user_id, video_id, action, message, details)
            VALUES (${source.user_id}, ${video.id}, 'video_detected', 'Auto-detected from Drive', ${JSON.stringify({ drive_file_id: file.id, is_ideal_short: isIdealShort })})
          `;
        }
      }

      if (source.folder_name === "Detecting Name..." || !source.folder_name) {
        try {
          const folderRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${source.folder_id}?fields=name`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (folderRes.ok) {
            const folderData = await folderRes.json();
            await sql`UPDATE drive_sources SET folder_name = ${folderData.name} WHERE id = ${source.id}`;
          }
        } catch {}
      }

      await sql`UPDATE drive_sources SET last_scanned_at = CURRENT_TIMESTAMP WHERE id = ${source.id}`;
      if (detectedCount > 0) console.log(`[AutoWorker] Scanned folder ${source.folder_name || source.folder_id}: ${detectedCount} new videos (daily: ${(todayCount?.cnt || 0) + detectedCount}/${dailyLimit})`);
    } catch (err) {
      console.error(`[AutoWorker] Scan error for source ${source.id}:`, err.message);
    }
  }
}

async function generateMetadataForPending() {
  const videos = await sql`
    SELECT v.*, ds.folder_name
    FROM videos v
    LEFT JOIN drive_sources ds ON v.drive_source_id = ds.id
    WHERE v.status = 'detected'
    ORDER BY v.detected_at ASC
    LIMIT 5
  `;

  if (videos.length === 0) return;

  for (const video of videos) {
    try {
      await sql`UPDATE videos SET status = 'analyzing', analyzed_at = CURRENT_TIMESTAMP WHERE id = ${video.id}`;

      let analysisContext = `Filename: ${video.filename}`;
      if (video.duration) analysisContext += `\nDuration: ${Math.round(video.duration)}s`;
      if (video.width && video.height) analysisContext += `\nAspect Ratio: ${video.width}x${video.height} (${video.height > video.width ? "Vertical" : "Horizontal"})`;
      if (video.transcript) analysisContext += `\n\nTranscript:\n${video.transcript.substring(0, 1000)}`;

      const prompt = `You are an expert YouTube Shorts content strategist. Analyze the following video and generate highly optimized metadata.

${analysisContext}

Generate metadata that will maximize reach and engagement on YouTube Shorts. The metadata should:
- Hook viewers immediately in the title
- Use proven viral patterns
- Include searchable keywords
- Match the content accurately
- Follow YouTube Shorts best practices
- Include #shorts hashtag in description

Respond ONLY in JSON format (no markdown code blocks):
{
  "topic": "brief topic category",
  "audience": "target audience description",
  "title_options": ["engaging title 1", "engaging title 2", "engaging title 3"],
  "recommended_title": "best title option",
  "description_options": ["description 1 with #shorts", "description 2 with #shorts"],
  "recommended_description": "best description with #shorts",
  "hashtag_sets": [["#tag1", "#tag2", "#tag3"]],
  "recommended_hashtags": ["#tag1", "#tag2", "#tag3"],
  "confidence_score": 0.85,
  "notes": "reasoning for recommendations"
}`;

      const { callGeminiWithRotation } = await import("./get-gemini-key.js");
      const aiData = await callGeminiWithRotation(video.user_id, prompt);

      let content = (aiData.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];
      const result = JSON.parse(content);

      await sql`
        INSERT INTO metadata_versions (video_id, title, description, hashtags, is_recommended, confidence_score, ai_notes)
        VALUES (${video.id}, ${result.recommended_title}, ${result.recommended_description}, ${result.recommended_hashtags}, true, ${result.confidence_score || 0.5}, ${result.notes || "AI generated"})
      `;

      const newStatus = (result.confidence_score || 0) >= 0.7 ? "ready_for_review" : "pending_review";
      await sql`UPDATE videos SET status = ${newStatus} WHERE id = ${video.id}`;

      await sql`
        INSERT INTO upload_logs (user_id, video_id, action, message, details)
        VALUES (${video.user_id}, ${video.id}, 'metadata_generated', 'AI metadata auto-generated', ${JSON.stringify({ confidence: result.confidence_score, topic: result.topic })})
      `;

      console.log(`[AutoWorker] Generated metadata for "${video.filename}" (confidence: ${result.confidence_score})`);
    } catch (err) {
      console.error(`[AutoWorker] Metadata error for video ${video.id}:`, err.message);
      await sql`UPDATE videos SET status = 'failed', error_message = ${err.message} WHERE id = ${video.id}`;
    }
  }
}

async function publishReadyVideos() {
  const videos = await sql`
    SELECT v.*, m.title as meta_title, m.description as meta_description, m.hashtags as meta_hashtags
    FROM videos v
    LEFT JOIN metadata_versions m ON m.video_id = v.id AND m.is_recommended = true
    WHERE v.status = 'ready_for_review'
    AND v.retry_count < 3
    ORDER BY v.detected_at ASC
    LIMIT 3
  `;

  for (const video of videos) {
    const [settings] = await sql`
      SELECT auto_publish, daily_upload_limit, upload_interval_hours FROM user_settings WHERE user_id = ${video.user_id} LIMIT 1
    `;
    if (!settings?.auto_publish) continue;

    const dailyLimit = settings?.daily_upload_limit ?? 5;
    const intervalHours = parseFloat(settings?.upload_interval_hours ?? 2);

    const [publishedToday] = await sql`
      SELECT COUNT(*)::int as cnt FROM videos
      WHERE user_id = ${video.user_id}
        AND status = 'published'
        AND published_at >= CURRENT_DATE
    `;
    if ((publishedToday?.cnt || 0) >= dailyLimit) {
      console.log(`[AutoWorker] Daily publish limit (${dailyLimit}) reached for user ${video.user_id}`);
      continue;
    }

    const [lastPublished] = await sql`
      SELECT published_at FROM videos
      WHERE user_id = ${video.user_id}
        AND status = 'published'
        AND published_at IS NOT NULL
      ORDER BY published_at DESC
      LIMIT 1
    `;
    if (lastPublished?.published_at) {
      const hoursSinceLast = (Date.now() - new Date(lastPublished.published_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < intervalHours) {
        const waitMins = Math.round((intervalHours - hoursSinceLast) * 60);
        console.log(`[AutoWorker] Upload interval not reached. Next upload in ~${waitMins} min`);
        continue;
      }
    }

    if (!video.meta_title || !video.meta_description) continue;

    try {
      let driveToken, youtubeToken;
      try {
        driveToken = await getGoogleAccessToken(video.user_id, "google_drive");
        youtubeToken = await getGoogleAccessToken(video.user_id, "youtube");
      } catch {
        continue;
      }

      await sql`UPDATE videos SET status = 'uploading', retry_count = retry_count + 1 WHERE id = ${video.id}`;

      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${video.drive_file_id}?alt=media`,
        { headers: { Authorization: `Bearer ${driveToken}` } }
      );

      if (!downloadResponse.ok) throw new Error(`Drive download failed: ${downloadResponse.status}`);

      const videoBlob = await downloadResponse.blob();
      const videoBuffer = await videoBlob.arrayBuffer();

      const boundary = "-------314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        snippet: {
          title: video.meta_title,
          description: video.meta_description,
          tags: video.meta_hashtags || [],
          categoryId: "22",
        },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      };

      const metadataPart = delimiter + "Content-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata);
      const videoPart = delimiter + "Content-Type: " + video.mime_type + "\r\n\r\n";
      const multipartRequestBody = new Blob([
        new TextEncoder().encode(metadataPart),
        new TextEncoder().encode(videoPart),
        new Uint8Array(videoBuffer),
        new TextEncoder().encode(closeDelimiter),
      ]);

      const uploadResponse = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${youtubeToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`YouTube upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();
      const youtubeVideoId = uploadResult.id;
      const youtubeVideoUrl = `https://youtube.com/shorts/${youtubeVideoId}`;

      await sql`
        UPDATE videos SET status = 'published', published_at = CURRENT_TIMESTAMP, youtube_video_id = ${youtubeVideoId}, youtube_video_url = ${youtubeVideoUrl}, error_message = NULL
        WHERE id = ${video.id}
      `;

      await sql`
        INSERT INTO upload_logs (user_id, video_id, action, message, details)
        VALUES (${video.user_id}, ${video.id}, 'upload_success', 'Auto-published to YouTube Shorts', ${JSON.stringify({ youtube_video_id: youtubeVideoId, url: youtubeVideoUrl })})
      `;

      console.log(`[AutoWorker] Published "${video.filename}" → ${youtubeVideoUrl}`);
    } catch (err) {
      console.error(`[AutoWorker] Publish error for video ${video.id}:`, err.message);
      await sql`UPDATE videos SET status = 'failed', error_message = ${err.message} WHERE id = ${video.id}`;
      await sql`
        INSERT INTO upload_logs (user_id, video_id, action, message, details)
        VALUES (${video.user_id}, ${video.id}, 'upload_failed', 'Auto-publish failed', ${JSON.stringify({ error: err.message })})
      `;
    }
  }
}
