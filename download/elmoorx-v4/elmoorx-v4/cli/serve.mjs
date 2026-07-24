/**
 * elmoorx static <dir> — يخدم ملفات ثابتة
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'application/javascript',
  '.tsx': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.wasm': 'application/wasm',
};

export async function serveStatic(dir, port = 3000) {
  dir = resolve(dir);
  if (!existsSync(dir)) {
    throw new Error(`المجلد غير موجود: ${dir}`);
  }

  const server = createServer((req, res) => {
    let path = new URL(req.url, 'http://x').pathname;
    if (path === '/') path = '/index.html';

    const file = join(dir, path);

    // منع path traversal
    if (!file.startsWith(dir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (existsSync(file) && statSync(file).isFile()) {
      const ext = extname(file).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(readFileSync(file));
    } else {
      // SPA fallback
      const indexFile = join(dir, 'index.html');
      if (existsSync(indexFile)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(indexFile));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 — Not Found');
      }
    }
  });

  server.listen(port, () => {
    console.log(`\n  ✦ Elmoorx Static Server`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  │ المجلد: ${dir}`);
    console.log(`  │ المنفذ: ${port}`);
    console.log(`  │ الحالة: جاهز ✓`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`\n  → http://localhost:${port}\n`);
  });

  return server;
}
