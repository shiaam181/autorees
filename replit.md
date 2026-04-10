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
      components/
      utils/
    __create/   # Server setup, auth config, route builder
    plugins/    # Custom Vite plugins
    vite.config.ts
```

## Tech Stack
- **Framework:** React Router v7 (full-stack) with Hono server
- **Runtime/Package manager:** Bun
- **Database:** Neon Postgres (serverless)
- **Auth:** Auth.js with credentials providers (basePath: /api/auth)
- **UI:** Tailwind CSS v3 + Lucide React + Chakra UI
- **State:** Zustand + TanStack Query
- **AI:** Google Gemini for metadata generation
- **Build tool:** Vite

## Running the App
The workflow runs: `cd apps/web && LD_LIBRARY_PATH=<gcc-lib-path> bun run dev`
- Dev server: http://0.0.0.0:5000
- `allowedHosts: true` and `host: '0.0.0.0'` are set in vite.config.ts for Replit proxy compatibility
- CSS loaded via explicit `<link>` tag from `links()` export in root.tsx

## Environment Variables
- `AUTH_URL` — Full URL for auth (set to Replit dev domain in development)
- `AUTH_SECRET` — Auth.js secret key (set in development)
- `DATABASE_URL` — Neon Postgres connection string (required for auth/data features)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth (optional)
- `GEMINI_API_KEY` — Google Gemini API key (for AI metadata generation)

## Key Notes
- `libstdc++.so.6` must be available via `LD_LIBRARY_PATH` for the `argon2` native module
- The `gcc-unwrapped` system dependency provides the needed library
- Port changed from 4000 to 5000 to comply with Replit webview requirement
- Auth create.js uses fallback for AUTH_URL when not set (prevents SSR crashes)
- Auth basePath set to `/api/auth` in Hono server config
- Custom entry.client.tsx suppresses hydration errors (dev mode mismatch from Vite script injections)
- SSR is enabled; ClientOnly wrapper used for main content
