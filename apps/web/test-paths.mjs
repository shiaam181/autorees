import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(new URL('.', import.meta.url)), 'src/app/api');

async function findRouteFiles(dir) {
  const files = await readdir(dir);
  let routes = [];

  for (const file of files) {
      const filePath = join(dir, file);
      const statResult = await stat(filePath);

      if (statResult.isDirectory()) {
        routes = routes.concat(await findRouteFiles(filePath));
      } else if (file === 'route.js') {
        if (filePath === join(__dirname, 'route.js')) {
          routes.unshift(filePath); 
        } else {
          routes.push(filePath);
        }
      }
  }

  return routes;
}

const files = await findRouteFiles(__dirname);
console.log('__dirname:', __dirname);
for (const routeFile of files) {
  console.log('routeFile:', routeFile);
  const relativePath = routeFile.replace(__dirname, '');
  console.log('relativePath:', relativePath);
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  console.log('parts:', parts);
  const routeParts = parts.slice(0, -1);
  console.log('routeParts:', routeParts);
  const honoPath = '/' + routeParts.map(r => r).join('/');
  console.log('honoPath:', honoPath);
}
