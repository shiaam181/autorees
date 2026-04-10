# YT Shorts Auto Uploader

## Overview
A production-ready automated system for publishing YouTube Shorts. Automates scanning Google Drive folders for vertical videos, generating AI-optimized metadata via Google Gemini, managing a review queue, and publishing directly to YouTube Shorts.

## Project Structure
```
apps/
  web/          # Full-stack React Router v7 + Hono web application
    src/
      app/      # File-based routes (pages, API endpoints)
      components/
      utils/
    plugins/    # Custom Vite plugins
    vite.config.ts
```

## Tech Stack
- **Framework:** React Router v7 (full-stack) with Hono server
- **Runtime/Package manager:** Bun
- **Database:** Neon Postgres (serverless)
- **Auth:** Auth.js with Google OAuth 2.0
- **UI:** Chakra UI + Tailwind CSS + Lucide React
- **State:** Zustand + TanStack Query
- **AI:** Google Gemini for metadata generation
- **Build tool:** Vite

## Running the App
The workflow runs: `cd apps/web && LD_LIBRARY_PATH=<gcc-lib-path> bun run dev`
- Dev server: http://0.0.0.0:5000
- `allowedHosts: true` and `host: '0.0.0.0'` are set in vite.config.ts for Replit proxy compatibility

## Environment Variables Required
- `DATABASE_URL` — Neon Postgres connection string
- `AUTH_SECRET` — Auth.js secret key
- `GOOGLE_CLIENT_ID` — Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` — Google OAuth client secret
- `GEMINI_API_KEY` — Google Gemini API key (for AI metadata generation)

## Key Notes
- `libstdc++.so.6` must be available via `LD_LIBRARY_PATH` for the `argon2` native module
- The `gcc-unwrapped` system dependency provides the needed library
- Port changed from 4000 to 5000 to comply with Replit webview requirement
