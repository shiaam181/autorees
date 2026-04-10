# YT Shorts Auto Uploader

## Overview
A production-ready automated system for publishing YouTube Shorts. Automates scanning Google Drive folders for vertical videos, generating AI-optimized metadata via Google Gemini, managing a review queue, and publishing directly to YouTube Shorts.

## Project Structure
```
apps/
  web/          # Full-stack React Router v7 + Hono web application
    src/
      app/      # File-based routes (pages, API endpoints)
        entry.client.tsx  # Custom client entry with hydration error handling
        api/
          auth/google/     # Google OAuth flow (Drive + YouTube)
          drive/           # Drive folder management + scanning
          metadata/        # AI metadata generation via Gemini
          videos/          # Video publish, schedule, retry
          utils/
            automation-worker.js  # Background pipeline (scan→metadata→publish)
            google-client.js      # OAuth token management with auto-refresh
            duplicate-detector.js # Content hash dedup
            sql.js               # Database connection (postgres package)
      components/
      utils/
    __create/   # Server setup, auth config, route builder
    plugins/    # Custom Vite plugins
    vite.config.ts
```

## Tech Stack
- **Framework:** React Router v7 (full-stack) with Hono server
- **Runtime/Package manager:** Bun
- **Database:** Replit PostgreSQL (pg + postgres packages)
- **Auth:** Auth.js with credentials providers (basePath: /api/auth, JWT strategy)
- **UI:** Tailwind CSS v3 + Lucide React + Chakra UI
- **State:** Zustand + TanStack Query
- **AI:** Google Gemini 2.0 Flash (direct REST API) for metadata generation
- **Build tool:** Vite

## Running the App
The workflow runs: `cd apps/web && LD_LIBRARY_PATH=<gcc-lib-path> bun run dev`
- Dev server: http://0.0.0.0:5000
- `allowedHosts: true` and `host: '0.0.0.0'` are set in vite.config.ts for Replit proxy compatibility
- CSS loaded via explicit `<link>` tag from `links()` export in root.tsx

## Automation Pipeline
Background worker starts automatically on server boot (5-minute intervals):
1. **Auto-scan** all active Drive folders for new videos
2. **Auto-detect** folder names (resolves "Detecting Name...")
3. **Auto-generate** AI metadata via Gemini for detected videos
4. **Auto-publish** to YouTube (when user enables `auto_publish` in settings)

## Database Tables
- `auth_users` / `auth_accounts` / `auth_sessions` — Auth.js tables (NeonAdapter)
- `connected_accounts` — Google OAuth tokens (Drive + YouTube)
- `drive_sources` — Monitored Google Drive folders
- `videos` — Detected videos with status tracking
- `metadata_versions` — AI-generated metadata options
- `upload_schedule` — Scheduled uploads
- `upload_logs` — Full audit trail
- `user_settings` — User preferences (review_required, auto_publish, etc.)

**Important:** All app tables FK → `auth_users(id)`, NOT `users(id)`

## Google OAuth Flow
- Connect button opens a popup window (avoids iframe blocking)
- Route: `/api/auth/google` → Google consent → `/api/auth/google/callback`
- Callback auto-closes popup and refreshes the Connected Accounts page
- Stores tokens in `connected_accounts` table with auto-refresh support

## Environment Variables
- `AUTH_URL` — Full URL for auth (set to Replit dev domain)
- `AUTH_SECRET` — Auth.js secret key
- `DATABASE_URL` — PostgreSQL connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `GEMINI_API_KEY` — Google Gemini API key (for AI metadata generation)
- `NEXT_PUBLIC_CREATE_APP_URL` — App base URL (Replit dev domain)

## Deployment
- **Target:** Autoscale
- **Build:** `react-router build` + copies `src/app/api/` to `build/server/src/app/api/` (needed for dynamic API route registration at runtime)
- **Run:** `bun build/server/index.js` (uses bun adapter via `react-router-hono-server/bun`)
- **Port:** 5000 (single port required for Autoscale)
- **LD_LIBRARY_PATH:** Must include gcc lib path for `argon2` native module
- **SSR build target:** `ssr.target: 'node'` and `build.target: 'esnext'` in vite.config.ts to support top-level await

## Key Notes
- `libstdc++.so.6` must be available via `LD_LIBRARY_PATH` for the `argon2` native module
- Port changed from 4000 to 5000 to comply with Replit webview requirement
- Auth uses JWT strategy (no database sessions); adapter only for user creation/lookup
- Google OAuth client must be type "Web application" with correct redirect URI
- Replit dev domain changes on each deployment — update redirect URI accordingly
- Custom entry.client.tsx uses createRoot (not hydrateRoot) to avoid SSR mismatches
- Server adapter: `react-router-hono-server/bun` (switched from `/node` for bun runtime compatibility)
- `@auth/create` path alias resolved via tsconfig.json paths for production runtime imports

## Security & Dependency Overrides
Both web and mobile `package.json` files include extensive `overrides` sections to pin transitive dependencies to patched versions (addressing CVEs for packages like picomatch, node-forge, minimatch, undici, tar, etc.). Key direct dependency updates:
- `pdfjs-dist` upgraded from v3 to v4 (worker import path changed in `src/client-integrations/pdfjs.js`)
- `lodash-es` / `lodash` upgraded to 4.18.x
- `vite` upgraded to 6.4.2+
