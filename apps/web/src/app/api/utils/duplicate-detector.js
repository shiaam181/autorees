import sql from "./sql";
import crypto from "crypto";

/**
 * Generate a content hash from file metadata
 * Uses drive_file_id + file_size + filename as unique identifier
 */
export function generateContentHash(driveFileId, fileSize, filename) {
  const content = `${driveFileId}:${fileSize}:${filename}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Check if a video already exists for this user
 * Returns the existing video if found, null otherwise
 */
export async function findDuplicateVideo(userId, driveFileId, contentHash) {
  // First check by drive_file_id (most reliable)
  const byFileId = await sql`
    SELECT id, filename, status FROM videos
    WHERE user_id = ${userId} AND drive_file_id = ${driveFileId}
    LIMIT 1
  `;

  if (byFileId.length > 0) {
    return {
      duplicate: true,
      video: byFileId[0],
      reason: "drive_file_id",
    };
  }

  // Then check by content hash
  if (contentHash) {
    const byHash = await sql`
      SELECT id, filename, status FROM videos
      WHERE user_id = ${userId} AND content_hash = ${contentHash}
      LIMIT 1
    `;

    if (byHash.length > 0) {
      return {
        duplicate: true,
        video: byHash[0],
        reason: "content_hash",
      };
    }
  }

  return { duplicate: false };
}

/**
 * Mark a video detection attempt as skipped due to duplicate
 */
export async function logDuplicateSkip(
  userId,
  driveFileId,
  filename,
  existingVideoId,
) {
  await sql`
    INSERT INTO upload_logs (user_id, video_id, action, message, details)
    VALUES (
      ${userId},
      ${existingVideoId},
      'duplicate_skipped',
      'Skipped duplicate detection',
      ${JSON.stringify({ drive_file_id: driveFileId, filename })}
    )
  `;
}
