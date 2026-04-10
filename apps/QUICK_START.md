# 🚀 Quick Start Guide - YT Shorts Auto Uploader

## 🎯 For Developers

### Setup (5 minutes)
1. **Get your user ID** from database:
   ```sql
   SELECT id, email FROM auth_users LIMIT 5;
   ```

2. **Enable Google APIs** in [GCP Console](https://console.cloud.google.com/):
   - Google Drive API
   - YouTube Data API v3

3. **Set OAuth redirect URI**:
   ```
   {YOUR_APP_URL}/api/auth/google/callback
   ```

4. **Environment variables** (already set):
   ```bash
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   DATABASE_URL=xxx
   ```

5. **Test the OAuth flow**:
   - Navigate to `/accounts`
   - Click "Connect Google"
   - Grant permissions
   - Should redirect back with success

---

## 👤 For End Users

### First Time Setup (2 minutes)
1. **Sign up** at `/account/signup`
2. **Connect Google** at `/accounts`
   - Grants Drive read access
   - Grants YouTube upload access
3. **Add a folder** at `/drive`
   - Paste Drive folder URL
   - Click "Scan Now"
4. **Review videos** at `/queue`
   - Generate AI metadata
   - Edit title/description
   - Publish or schedule

### Daily Workflow (30 seconds per video)
1. Go to `/queue`
2. Select video → "Generate AI"
3. Review metadata → Edit if needed
4. Click "Publish Now" or "Schedule"
5. Check `/history` for results

---

## 🔧 Testing Scenarios

### Test OAuth Connection
```
1. Go to /accounts
2. Click "Connect Google"
3. ✅ Should redirect to Google
4. ✅ Should show Drive + YouTube permissions
5. ✅ Grant access
6. ✅ Redirect to /accounts with green checkmarks
```

### Test Drive Scanning
```
1. Go to /drive
2. Paste: https://drive.google.com/drive/folders/YOUR_FOLDER_ID
3. Click "Add Folder"
4. Click "Scan Now"
5. ✅ Should detect videos
6. ✅ Should skip duplicates if rescanned
7. Check /queue for new videos
```

### Test AI Metadata
```
1. Go to /queue
2. Select any video
3. Click "Generate AI"
4. ✅ Should return title, description, hashtags
5. ✅ Should show confidence score
6. ✅ Edit fields should be populated
```

### Test Publishing
```
1. In queue editor with generated metadata
2. Click "Publish Now"
3. ✅ Status should change to "uploading"
4. ✅ Then "published" after ~10-30 seconds
5. ✅ Should appear in /history
6. ✅ YouTube link should work
```

### Test Scheduling
```
1. In queue editor
2. Click "Schedule for Later"
3. Pick tomorrow's date + time
4. Click "Confirm"
5. ✅ Status = "scheduled"
6. ✅ Appears in /history with clock icon
```

### Test Retry
```
1. Go to /history
2. Filter by "Failed" (or create a fake failed video)
3. Click retry button
4. ✅ Video should move to queue
5. ✅ Status = "ready_for_review"
6. ✅ Can publish again
```

---

## 🐛 Common Issues & Fixes

### "Unauthorized" or "Token expired"
**Cause**: OAuth token expired
**Fix**: Automatic token refresh on next API call. If persists, reconnect at `/accounts`.

### "YouTube quota exceeded"
**Cause**: Hit daily API limit (10,000 units)
**Fix**: Wait 24 hours or request quota increase in GCP Console.

### "Failed to download from Drive"
**Cause**: File permissions or network issue
**Fix**: Check file is shared with service, retry upload.

### "Duplicate detected"
**Cause**: Video already exists (by file ID or content hash)
**Fix**: Working as intended. Skip or delete old entry to re-upload.

### "Max retries reached"
**Cause**: 3 failed upload attempts
**Fix**: Check error logs in history, fix underlying issue, then reset manually.

### AI generation returns gibberish
**Cause**: Filename has no context or AI API issue
**Fix**: Manually edit metadata or use better filename.

---

## 📊 Status Reference

| Status | Meaning | Actions Available |
|--------|---------|-------------------|
| `detected` | New video found in Drive | Generate AI |
| `analyzing` | AI generation in progress | Wait |
| `pending_review` | Low confidence, needs review | Generate AI, Edit, Publish |
| `ready_for_review` | High confidence, ready to go | Edit, Publish, Schedule |
| `scheduled` | Queued for future upload | Cancel schedule |
| `uploading` | Active YouTube upload | Wait |
| `published` | Live on YouTube | View link |
| `failed` | Upload error occurred | Retry (up to 3x) |

---

## 🎨 UI Quick Reference

| Page | Purpose | Key Actions |
|------|---------|-------------|
| `/` | Dashboard | View stats, quick links |
| `/accounts` | OAuth status | Connect Google |
| `/drive` | Folder management | Add folder, Scan |
| `/queue` | Review videos | Generate AI, Edit, Publish |
| `/history` | Track uploads | Filter, Retry, View logs |
| `/settings` | User preferences | Set defaults, timezone |

---

## 📝 API Cheat Sheet

### Check OAuth Status
```javascript
GET /api/auth/google/status
→ { drive: true, youtube: true }
```

### Scan Drive Folder
```javascript
POST /api/drive/scan/[folderId]
→ { detected: 3, duplicates: 1, total: 4 }
```

### Generate Metadata
```javascript
POST /api/metadata/generate/[videoId]
→ { recommended_title, recommended_description, confidence_score, ... }
```

### Publish Video
```javascript
POST /api/videos/publish/[videoId]
→ { youtube_video_id, youtube_video_url }
```

### Schedule Video
```javascript
POST /api/videos/schedule/[videoId]
Body: { scheduled_for: "2026-04-10T14:00:00Z", timezone: "America/New_York" }
→ { success: true, scheduled_for: "..." }
```

### Retry Failed
```javascript
POST /api/videos/retry/[videoId]
→ { success: true, retry_count: 2 }
```

---

## 🔐 Security Notes

✅ **OAuth 2.0**: No passwords stored, only encrypted tokens
✅ **Scopes**: Read-only Drive, upload-only YouTube
✅ **Token Refresh**: Automatic, transparent to user
✅ **Revocation**: Users can disconnect at [Google Account](https://myaccount.google.com/permissions)

---

## 📈 Monitoring Queries

### Upload Success Rate
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM videos
WHERE user_id = YOUR_USER_ID
GROUP BY status;
```

### Average Confidence Score
```sql
SELECT ROUND(AVG(confidence_score), 2) as avg_confidence
FROM metadata_versions
WHERE is_recommended = true;
```

### Retry Stats
```sql
SELECT 
  retry_count,
  COUNT(*) as video_count
FROM videos
WHERE status = 'failed'
GROUP BY retry_count
ORDER BY retry_count;
```

### Duplicate Prevention Rate
```sql
SELECT 
  COUNT(*) as duplicates_prevented
FROM upload_logs
WHERE action = 'duplicate_skipped';
```

---

## 🎯 Performance Benchmarks

- **OAuth flow**: ~3-5 seconds
- **Drive scan** (10 videos): ~2-3 seconds
- **AI generation**: ~5-10 seconds
- **YouTube upload** (15MB video): ~15-30 seconds
- **Page load**: < 1 second (cached)

---

## 🚀 Production Checklist

- [ ] OAuth credentials configured in GCP
- [ ] Drive API enabled
- [ ] YouTube API enabled
- [ ] Redirect URI set correctly
- [ ] Environment variables set
- [ ] Database migration applied
- [ ] Test OAuth flow
- [ ] Test video scan
- [ ] Test AI generation
- [ ] Test real YouTube upload
- [ ] Monitor error logs

---

## 📞 Getting Help

**Documentation**:
- System Overview: `/apps/SYSTEM_OVERVIEW.md`
- Production Readiness: `/apps/PRODUCTION_READINESS.md`
- This Guide: `/apps/QUICK_START.md`

**Common Questions**:
- "How do I get my user ID?" → Query `auth_users` table
- "Where do I enable Google APIs?" → [GCP Console](https://console.cloud.google.com/)
- "How do I increase quotas?" → GCP Console → APIs → Quotas
- "Can I test without YouTube?" → No, need real OAuth for full flow
- "How do I seed test data?" → See production readiness doc

---

**🎉 You're ready to launch!**
