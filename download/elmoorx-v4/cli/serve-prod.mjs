/**
 * elmoorx serve — خادم إنتاج مع SSR + static files + API
 */
import { createServer as createHttpServer } from 'node:http';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

export async function startProdServer(options = {}) {
  const {
    root = process.cwd(),
    port = 3000,
    ssr = false,
    compression = true,
    spa = true,
    apiDir = null,
  } = options;

  const distDir = join(root, 'dist');
  const staticDir = existsSync(distDir) ? distDir : root;

  console.log(`\n  ✦ Elmoorx v4 — Production Server`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ:      ${port}`);
  console.log(`  │ المجلد:      ${staticDir}`);
  console.log(`  │ SSR:         ${ssr ? '✓' : '✗'}`);
  console.log(`  │ Compression: ${compression ? '✓' : '✗'}`);
  console.log(`  │ SPA fallback: ${spa ? '✓' : '✗'}`);
  console.log(`  │ API routes:  ${apiDir || '✗'}`);

  const server = createHttpServer(async (req, res) => {
    try {
      await handleRequest(req, res, { staticDir, ssr, compression, spa, apiDir, root });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Error: ${err.message}`);
    }
  });

  server.listen(port, () => {
    console.log(`  │ الحالة:      جاهز ✓`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`\n  → http://localhost:${port}\n`);
  });

  return server;
}

async function handleRequest(req, res, config) {
  const { staticDir, ssr, compression, spa, apiDir, root } = config;
  const url = new URL(req.url, `http://${req.headers.host}`);
  let path = decodeURIComponent(url.pathname);

  // API routes
  if (apiDir && path.startsWith('/api/')) {
    await handleApiRoute(req, res, path, apiDir);
    return;
  }

  // SPA routing — serve index.html for non-file routes
  let filePath = join(staticDir, path);

  // Directory → index.html
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  // File doesn't exist
  if (!existsSync(filePath)) {
    // Try with extensions
    for (const ext of ['.html', '.mjs', '.js']) {
      if (existsSync(filePath + ext)) {
        filePath = filePath + ext;
        break;
      }
    }
  }

  // Still doesn't exist → SPA fallback
  if (!existsSync(filePath) && spa) {
    const indexPath = join(staticDir, 'index.html');
    if (existsSync(indexPath)) {
      filePath = indexPath;
    }
  }

  // 404
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — Not Found');
    return;
  }

  const stat = statSync(filePath);
  const ext = extname(filePath).toLowerCase();

  // Security headers
  const headers = {
    'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
    'Cache-Control': getCacheControl(ext),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  // Compression headers (if pre-compressed files exist)
  if (compression) {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (acceptEncoding.includes('br') && existsSync(filePath + '.br')) {
      headers['Content-Encoding'] = 'br';
      headers['Content-Length'] = statSync(filePath + '.br').size;
      res.writeHead(200, headers);
      readFileSync(filePath + '.br').pipe?.(res) || res.end(readFileSync(filePath + '.br'));
      return;
    }
    if (acceptEncoding.includes('gzip') && existsSync(filePath + '.gz')) {
      headers['Content-Encoding'] = 'gzip';
      headers['Content-Length'] = statSync(filePath + '.gz').size;
      res.writeHead(200, headers);
      res.end(readFileSync(filePath + '.gz'));
      return;
    }
  }

  headers['Content-Length'] = stat.size;
  res.writeHead(200, headers);

  // Stream large files
  if (stat.size > 1024 * 100) { // > 100KB
    const { createReadStream } = await import('node:fs');
    createReadStream(filePath).pipe(res);
  } else {
    res.end(readFileSync(filePath));
  }
}

async function handleApiRoute(req, res, path, apiDir) {
  // /api/users → apiDir/users.mjs or apiDir/users/index.mjs
  const routePath = path.replace(/^\/api\//, '');
  const candidates = [
    join(apiDir, routePath + '.mjs'),
    join(apiDir, routePath + '.js'),
    join(apiDir, routePath, 'index.mjs'),
    join(apiDir, routePath, 'index.js'),
  ];

  let handlerFile = null;
  for (const c of candidates) {
    if (existsSync(c)) { handlerFile = c; break; }
  }

  if (!handlerFile) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API route not found' }));
    return;
  }

  try {
    const handler = await import(fileURLToPath(new URL('file://' + handlerFile)));
    const method = req.method.toLowerCase();
    const fn = handler[method] || handler.default;

    if (typeof fn !== 'function') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Method ${req.method} not allowed` }));
      return;
    }

    // Parse body
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
    }

    const result = await fn({
      method: req.method,
      url: new URL(req.url, 'http://localhost'),
      body,
      headers: req.headers,
      query: Object.fromEntries(new URL(req.url, 'http://localhost').searchParams),
    });

    res.writeHead(result.status || 200, {
      'Content-Type': 'application/json',
      ...(result.headers || {}),
    });
    res.end(JSON.stringify(result.body || result));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

function getCacheControl(ext) {
  // Hashed assets — cache forever
  if (ext === '.mjs' || ext === '.js' || ext === '.css' || ext === '.wasm') {
    return 'public, max-age=31536000, immutable';
  }
  // Images — cache for a day
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
    return 'public, max-age=86400';
  }
  // HTML — no cache (always fresh)
  if (ext === '.html') {
    return 'no-cache, no-store, must-revalidate';
  }
  return 'public, max-age=3600';
}

import { fileURLToPath as _fileURLToPath } from 'node:url';
