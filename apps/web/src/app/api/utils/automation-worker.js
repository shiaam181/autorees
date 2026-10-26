import sql from "./sql.js";
import { getGoogleAccessToken } from "./google-client.js";
import { generateContentHash, findDuplicateVideo, logDuplicateSkip } from "./duplicate-detector.js";
import { uploadToInstagram } from "./instagram-upload.js";

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

export async function runPipeline() {
  if (isRunning) return;
  isRunning = true;
  try {
    await scanAllFolders();
    await queueDailyVideos();
    await generateMetadataForPending();
    await autoPublishReady();
  } catch (err) {
    console.error("[AutoWorker] Pipeline error:", err.message);
  } finally {
    isRunning = false;
  }
}

async function autoPublishReady() {
  const users = await sql`SELECT DISTINCT user_id FROM videos WHERE status IN ('ready_for_review') LIMIT 50`;
  for (const { user_id } of users) {
    const [settings] = await sql`
      SELECT auto_publish, review_required, daily_upload_limit, upload_interval_hours 
      FROM user_settings WHERE user_id = ${user_id} LIMIT 1
    `;
    if (!settings?.auto_publish) continue;
    if (settings?.review_required) continue;
    await publishReadyVideos(user_id, settings);
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
        SELECT daily_upload_limit FROM user_settings WHERE user_id = ${source.user_id} LIMIT 1
      `;
      const dailyLimit = settings?.daily_upload_limit ?? 5;

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${source.folder_id}'+in+parents+and+mimeType+contains+'video/'&fields=files(id,name,size,mimeType,videoMediaMetadata,createdTime)&pageSize=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!driveResponse.ok) continue;

      const driveData = await driveResponse.json();
      const files = driveData.files || [];
      let detectedCount = 0;

      for (const file of files) {
        const videoMeta = file.videoMediaMetadata || {};
        const width = videoMeta.width || 0;
        const height = videoMeta.height || 0;
        const duration = videoMeta.durationMillis ? parseInt(videoMeta.durationMillis) / 1000 : 0;

        const contentHash = generateContentHash(file.id, parseInt(file.size || 0), file.name);
        const dupCheck = await findDuplicateVideo(source.user_id, file.id, contentHash);
        if (dupCheck.duplicate) continue;

        const initialStatus = "detected";

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
            VALUES (${source.user_id}, ${video.id}, 'video_detected', 'Auto-detected from Drive', ${JSON.stringify({ drive_file_id: file.id })})
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
      if (detectedCount > 0) console.log(`[AutoWorker] Scanned folder ${source.folder_name || source.folder_id}: ${detectedCount} new videos detected`);
    } catch (err) {
      console.error(`[AutoWorker] Scan error for source ${source.id}:`, err.message);
    }
  }
}

async function queueDailyVideos() {
  const users = await sql`SELECT DISTINCT user_id FROM videos WHERE status = 'detected'`;
  for (const { user_id } of users) {
    try {
      const [settings] = await sql`
        SELECT daily_upload_limit, is_premium, premium_expires_at FROM user_settings WHERE user_id = ${user_id} LIMIT 1
      `;
      const dailyLimit = settings?.daily_upload_limit ?? 5;
      const isPremium = settings?.is_premium;
      const premiumExpires = settings?.premium_expires_at;
      
      const isPremiumActive = isPremium && (!premiumExpires || new Date(premiumExpires) > new Date());

      if (isPremiumActive) {
        const videosToQueue = await sql`
          SELECT id FROM videos
          WHERE user_id = ${user_id} AND status = 'detected'
          ORDER BY detected_at ASC
        `;

        if (videosToQueue.length > 0) {
          const ids = videosToQueue.map(v => v.id);
          await sql`
            UPDATE videos 
            SET status = 'queued', queued_at = CURRENT_TIMESTAMP
            WHERE id IN ${sql(ids)}
          `;
          console.log(`[AutoWorker] (PREMIUM) Queued ${videosToQueue.length} videos for user ${user_id}`);
        }
      } else {
        const [usedToday] = await sql`
          SELECT COUNT(*)::int as cnt FROM videos
          WHERE user_id = ${user_id} 
          AND (
            (status IN ('published', 'uploading', 'failed') AND published_at >= CURRENT_DATE)
            OR 
            (status IN ('queued', 'analyzing', 'ready_for_review', 'scheduled') AND queued_at >= CURRENT_DATE)
          )
        `;
        const remainingLimit = Math.max(0, dailyLimit - (usedToday?.cnt || 0));

        if (remainingLimit > 0) {
          const videosToQueue = await sql`
            SELECT id FROM videos
            WHERE user_id = ${user_id} AND status = 'detected'
            ORDER BY detected_at ASC
            LIMIT ${remainingLimit}
          `;

          if (videosToQueue.length > 0) {
            const ids = videosToQueue.map(v => v.id);
            await sql`
              UPDATE videos 
              SET status = 'queued', queued_at = CURRENT_TIMESTAMP
              WHERE id IN ${sql(ids)}
            `;
            console.log(`[AutoWorker] Queued ${videosToQueue.length} videos for user ${user_id}`);
          }
        }
      }
    } catch (err) {
      console.error(`[AutoWorker] Queueing error for user ${user_id}:`, err.message);
    }
  }
}

async function generateMetadataForPending() {
  const videos = await sql`
    SELECT v.*, ds.folder_name
    FROM videos v
    LEFT JOIN drive_sources ds ON v.drive_source_id = ds.id
    WHERE v.status = 'queued'
    ORDER BY v.queued_at ASC
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
      const { provider, result: contentRaw } = await callGeminiWithRotation(video.user_id, prompt);

      let content = contentRaw.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];
      const result = JSON.parse(content);

      await sql`
        INSERT INTO metadata_versions (video_id, title, description, hashtags, is_recommended, confidence_score, ai_notes)
        VALUES (${video.id}, ${result.recommended_title}, ${result.recommended_description}, ${result.recommended_hashtags}, true, ${result.confidence_score || 0.5}, ${result.notes || "AI generated"})
      `;

      const [settings] = await sql`SELECT review_required FROM user_settings WHERE user_id = ${video.user_id} LIMIT 1`;
      const reviewRequired = settings?.review_required ?? true;
      // If review not required, always go to ready_for_review regardless of confidence
      const newStatus = reviewRequired ? 'pending_review' : 'ready_for_review';
      
      await sql`UPDATE videos SET status = ${newStatus}, api_provider_used = ${provider} WHERE id = ${video.id}`;

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

async function publishReadyVideos(filterUserId, preSettings) {
  const videos = filterUserId
    ? await sql`
        SELECT v.*, m.title as meta_title, m.description as meta_description, m.hashtags as meta_hashtags
        FROM videos v
        LEFT JOIN metadata_versions m ON m.video_id = v.id AND m.is_recommended = true
        WHERE v.status = 'ready_for_review'
        AND v.user_id = ${filterUserId}
        AND v.retry_count < 3
        ORDER BY v.detected_at ASC
        LIMIT 3
      `
    : await sql`
        SELECT v.*, m.title as meta_title, m.description as meta_description, m.hashtags as meta_hashtags
        FROM videos v
        LEFT JOIN metadata_versions m ON m.video_id = v.id AND m.is_recommended = true
        WHERE v.status = 'ready_for_review'
        AND v.retry_count < 3
        ORDER BY v.detected_at ASC
        LIMIT 3
      `;

  for (const video of videos) {
    const settings = preSettings || (await sql`
      SELECT auto_publish, daily_upload_limit, upload_interval_hours FROM user_settings WHERE user_id = ${video.user_id} LIMIT 1
    `.then(r => r[0]));
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

      // Step 1: Start a resumable upload session on YouTube
      const metadata = {
        snippet: {
          title: video.meta_title,
          description: video.meta_description,
          tags: video.meta_hashtags || [],
          categoryId: "22",
        },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      };

      const initResponse = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${youtubeToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": video.mime_type || "video/mp4",
          },
          body: JSON.stringify(metadata),
        }
      );

      if (!initResponse.ok) {
        const err = await initResponse.text();
        throw new Error(`YouTube resumable init failed: ${initResponse.status} - ${err}`);
      }

      const uploadUrl = initResponse.headers.get("location");
      if (!uploadUrl) throw new Error("No upload URL from YouTube");

      // Step 2: Download from Drive as a stream and pipe to YouTube
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${video.drive_file_id}?alt=media`,
        { headers: { Authorization: `Bearer ${driveToken}` } }
      );

      if (!downloadResponse.ok) throw new Error(`Drive download failed: ${downloadResponse.status}`);

      const contentLength = downloadResponse.headers.get("content-length");

      // Step 3: Stream directly to YouTube resumable upload
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": video.mime_type || "video/mp4",
          ...(contentLength ? { "Content-Length": contentLength } : {}),
        },
        body: downloadResponse.body,
        duplex: "half",
      });

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

      // Also post to Instagram Reels if connected
      try {
        const [igAccount] = await sql`SELECT id FROM connected_accounts WHERE user_id = ${video.user_id} AND provider = 'instagram' LIMIT 1`;
        if (igAccount) {
          const { reelUrl } = await uploadToInstagram(video.user_id, video, {
            title: video.meta_title,
            description: video.meta_description,
            hashtags: video.meta_hashtags,
          });
          await sql`
            INSERT INTO upload_logs (user_id, video_id, action, message, details)
            VALUES (${video.user_id}, ${video.id}, 'instagram_success', 'Auto-published to Instagram Reels', ${JSON.stringify({ url: reelUrl })})
          `;
          console.log(`[AutoWorker] Also published to Instagram → ${reelUrl}`);
        }
      } catch (igErr) {
        console.error(`[AutoWorker] Instagram publish failed for video ${video.id}:`, igErr.message);
        // Don't fail the whole video — YouTube already succeeded
      }
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
