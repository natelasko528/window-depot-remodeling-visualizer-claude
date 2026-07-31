import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateHandler } from './generate.mjs';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

async function serveFile(res, path) {
  const body = await readFile(path);
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(body);
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/api/generate') {
    await generateHandler(req, res);
    return;
  }
  const requested = normalize(join(DIST, decodeURIComponent(url.pathname)));
  try {
    if (!requested.startsWith(DIST)) throw new Error('outside dist');
    const info = await stat(requested);
    await serveFile(res, info.isDirectory() ? join(requested, 'index.html') : requested);
  } catch {
    await serveFile(res, join(DIST, 'index.html'));
  }
}).listen(PORT, () => {
  console.log(`Window Depot Visualizer — http://localhost:${PORT}`);
});
