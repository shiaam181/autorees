import sql from "./sql.js";

/**
 * Upload a video to Instagram Reels using the Graph API.
 * Instagram requires a publicly accessible video URL.
 * We use Google Drive's direct download link (requires drive token).
 */
export async function uploadToInstagram(userId, video, metadata) {
  // Get Instagram access token
  const [account] = await sql`
    SELECT access_token, channel_id FROM connected_accounts
    WHERE user_id = ${userId} AND provider = 'instagram'
    LIMIT 1
  `;

  if (!account) throw new Error("Instagram not connected");

  const accessToken = account.access_token;
  const igUserId = account.channel_id;

  // Get Google Drive token to create a public URL
  const [driveAccount] = await sql`
    SELECT access_token FROM connected_accounts
    WHERE user_id = ${userId} AND provider = 'google_drive'
    LIMIT 1
  `;

  if (!driveAccount) throw new Error("Google Drive not connected");

  // Instagram needs a public video URL — use Drive's webContentLink
  // First get the file's webContentLink
  const fileRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${video.drive_file_id}?fields=webContentLink,size&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${driveAccount.access_token}` } }
  );

  if (!fileRes.ok) throw new Error(`Drive file info failed: ${fileRes.status}`);
  const fileInfo = await fileRes.json();

  // Use Drive direct download URL with token in header
  // Instagram needs a truly public URL — use the download URL
  const videoUrl = `https://www.googleapis.com/drive/v3/files/${video.drive_file_id}?alt=media&access_token=${driveAccount.access_token}`;

  const title = metadata.title || video.filename.replace('.mp4', '');
  const description = metadata.description || '';
  const hashtags = (metadata.hashtags || []).join(' ');
  const caption = `${title}\n\n${description}\n\n${hashtags}`.trim();

  console.log(`[Instagram] Creating reel container for "${video.filename}"...`);

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        share_to_feed: true,
        access_token: accessToken,
      }),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Instagram container creation failed: ${containerRes.status} - ${err}`);
  }

  const { id: containerId } = await containerRes.json();
  console.log(`[Instagram] Container created: ${containerId}, waiting for processing...`);

  // Step 2: Wait for container to be ready (poll status)
  let attempts = 0;
  let status = "IN_PROGRESS";

  while (status === "IN_PROGRESS" && attempts < 30) {
    await new Promise(r => setTimeout(r, 10000)); // wait 10s
    attempts++;

    const statusRes = await fetch(
      `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const statusData = await statusRes.json();
    status = statusData.status_code || "IN_PROGRESS";
    console.log(`[Instagram] Container status: ${status} (attempt ${attempts})`);
  }

  if (status !== "FINISHED") {
    throw new Error(`Instagram container not ready after ${attempts} attempts. Status: ${status}`);
  }

  // Step 3: Publish the container
  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Instagram publish failed: ${publishRes.status} - ${err}`);
  }

  const { id: mediaId } = await publishRes.json();
  const reelUrl = `https://www.instagram.com/reel/${mediaId}`;

  console.log(`[Instagram] Published reel: ${reelUrl}`);
  return { mediaId, reelUrl };
}
