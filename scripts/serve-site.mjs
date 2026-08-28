import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PHASE1_TEST_PORT || 43118);
const host = '127.0.0.1';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

async function isFile(filePath) {
  try {
    await access(filePath, constants.R_OK);
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function resolveRequest(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  if (await isFile(candidate)) return candidate;
  if (!path.extname(candidate) && (await isFile(`${candidate}.html`))) return `${candidate}.html`;
  return null;
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || host}`);

  if (requestUrl.pathname === '/api/security-config') {
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify({ turnstileEnabled: false, turnstileSiteKey: null }));
    return;
  }

  if (requestUrl.pathname === '/api/quote') {
    response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(
      JSON.stringify({ ok: false, message: 'Method not allowed in local test server.' }),
    );
    return;
  }

  const filePath = await resolveRequest(requestUrl.pathname);
  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type':
      contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

export async function startSiteServer() {
  if (server.listening) return server;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      console.log(`Blue Bear Electric test server running at http://${host}:${port}`);
      resolve();
    });
  });
  return server;
}

export async function stopSiteServer() {
  if (!server.listening) return;
  await new Promise((resolve) => {
    const forceClose = setTimeout(resolve, 1_000);
    server.close(() => {
      clearTimeout(forceClose);
      resolve();
    });
    server.closeAllConnections?.();
  });
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  await startSiteServer();
  const closeAndExit = async () => {
    await stopSiteServer();
    process.exit(0);
  };
  process.on('SIGINT', closeAndExit);
  process.on('SIGTERM', closeAndExit);
}
