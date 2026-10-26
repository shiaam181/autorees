# Deployment Guide (Railway)

## Step 1 — Push your app to GitHub

1. Go to github.com → New repository → name it `autorees`
2. Run these commands in your project folder:

```
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOURUSERNAME/autorees.git
git push -u origin main
```

## Step 2 — Deploy the main app on Railway

1. Go to railway.app → Login with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `autorees` repo → select the `apps/web` folder
4. Railway will auto-detect and build

### Add these environment variables in Railway dashboard:

| Variable | Value |
|----------|-------|
| DATABASE_URL | Your Supabase URL |
| AUTH_SECRET | super-secret-auth-key-change-this-in-production-please-1234567890 |
| AUTH_URL | https://your-app.railway.app |
| NEXTAUTH_URL | https://your-app.railway.app |
| GOOGLE_CLIENT_ID | Your Google Client ID |
| GOOGLE_CLIENT_SECRET | Your Google Client Secret |
| NEXT_PUBLIC_CREATE_APP_URL | https://your-app.railway.app |
| PORT | 5000 |

## Step 3 — Deploy FreeLLMAPI on Railway

1. In the same Railway project → **New Service** → **GitHub repo**
2. Point to the FreeLLMAPI repo (push it to GitHub separately)
3. Or use the Docker deploy option with the existing Dockerfile

### FreeLLMAPI env variables:
Copy from your `C:\Users\Administrator\Desktop\freellmapi-main\.env.example`

### After FreeLLMAPI deploys:
- It gets a URL like `https://freellmapi-xxxxx.railway.app`
- Go to your app's **API Keys** page
- Edit your custom key's Base URL to: `https://freellmapi-xxxxx.railway.app/v1`

## Step 4 — Update Google OAuth redirect URI

In Google Cloud Console → Credentials → Your OAuth client:
- Add: `https://your-app.railway.app/api/google/callback`

## Step 5 — Done!

Your app runs 24/7. The automation worker runs every 5 minutes scanning folders and uploading videos automatically.
