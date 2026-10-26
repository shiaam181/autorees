@echo off
cd /d "%~dp0"
echo Starting YT Shorts Auto...
bun --env-file=.env build/server/index.js
pause
