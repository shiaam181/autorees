/**
 * PTERODACTYL BOOTSTRAP SCRIPT
 * This script bridges a generic Node.js Pterodactyl egg with our full-stack React Router app.
 * It automatically installs nested dependencies, builds the Vite production app, and starts it.
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

console.log("🚀 Starting Autorees Bootstrap Loader...");

try {
  const webDir = path.join(__dirname, 'apps', 'web');

  // 1. Ensure Dependencies are installed in apps/web
  console.log("📦 Installing web dependencies...");
  execSync('npm install', { cwd: webDir, stdio: 'inherit' });
  
  // 2. Build the production application
  console.log("🔨 Building the React Router production server...");
  execSync('npm run build', { cwd: webDir, stdio: 'inherit' });
  
  // 3. Start the built node server!
  console.log("🟢 Starting the Web/Bot Server...");
  const server = spawn('node', ['build/server/index.js'], { 
    cwd: webDir,
    stdio: 'inherit',
    env: { ...process.env } // Pass all Pterodactyl environment variables down
  });
  
  server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
    process.exit(code);
  });

  server.on('error', (err) => {
    console.error(`Failed to start server: ${err.message}`);
  });
  
} catch (error) {
  console.error("❌ Pterodactyl Bootstrap failed:", error.message);
  process.exit(1);
}
