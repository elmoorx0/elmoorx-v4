/**
 * elmoorx serve — خادم تطوير مع API middleware chain
 * يدعم:
 *   - static files
 *   - API routes (file-based)
 *   - middleware chain (cors, auth, logging, rate-limit)
 *   - WebSocket
 *   - SSR
 *   - HMR
 */
import { createServer as createHttpServer } from 'node:http';
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from '../vendor/ws-shim.mjs';
import { compile, liveCompile, clearCompileCache } from '../compiler/index.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

export async function startServeServer(options = {}) {
  const {
    root = process.cwd(),
    port = 3000,
    hmr = true,
    apiDir = null,
    middleware = [],
    cors = true,
    logging = true,
  } = options;

  const rootDir = resolve(root);
  const frameworkDir = existsSync(join(rootDir, '.elmoorx'))
    ? join(rootDir, '.elmoorx')
    : resolve(dirname(fileURLToPath(import.meta.url)), '..');

  console.log(`\n  ✦ Elmoorx v4 — Serve (dev + API)`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ:      ${port}`);
  console.log(`  │ الجذر:       ${rootDir}`);
  console.log(`  │ الإطار:     ${frameworkDir}`);
  console.log(`  │ HMR:         ${hmr ? '✓' : '✗'}`);
  console.log(`  │ API:         ${apiDir || '✗'}`);
  console.log(`  │ CORS:        ${cors ? '✓' : '✗'}`);
  console.log(`  │ Logging:     ${logging ? '✓' : '✗'}`);
  console.log(`  │ Middleware:  ${middleware.length}`);

  // Build middleware chain
  const middlewares = [];
  if (cors) middlewares.push(corsMiddleware());
  if (logging) middlewares.push(loggingMiddleware());
  middlewares.push(...middleware);

  const server = createHttpServer(async (req, res) => {
    const ctx = { req, res, url: new URL(req.url, `http://${req.headers.host}`) };

    // Run middleware chain
    for (const mw of middlewares) {
      const result = await mw(ctx);
      if (result === false) return; // middleware stopped the chain
    }

    try {
      await handleServeRequest(req, res, { rootDir, frameworkDir, apiDir, hmr });
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error: ${err.message}`);
      }
    }
  });

  // WebSocket for HMR
  if (hmr) {
    const wss = new WebSocketServer({ server, path: '/__hmr__' });
    const clients = new Set();
    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.send(JSON.stringify({ type: 'connected' }));
      ws.on('close', () => clients.delete(ws));
    });

    // Watch files
    const { watch } = await import('node:fs');
    const watchDir = (dir) => {
      if (!existsSync(dir)) return;
      try {
        watch(dir, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          if (filename.includes('node_modules') || filename.includes('.elmoorx')) return;
          const ext = extname(filename).toLowerCase();
          if (['.ts', '.tsx', '.mjs', '.js', '.css', '.html'].includes(ext)) {
            clearCompileCache();
            const data = JSON.stringify({ type: 'update', id: filename, took: 0 });
            for (const ws of clients) { try { ws.send(data); } catch {} }
            if (logging) console.log(`  ✦ HMR: ${filename}`);
          }
        });
      } catch {}
    };
    watchDir(join(rootDir, 'src'));
    watchDir(frameworkDir);
  }

  server.listen(port, () => {
    console.log(`  │ الحالة:      جاهز ✓`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`\n  → http://localhost:${port}\n`);
  });

  return server;
}

async function handleServeRequest(req, res, config) {
  const { rootDir, frameworkDir, apiDir } = config;
  const url = new URL(req.url, `http://${req.headers.host}`);
  let path = url.pathname;

  // API routes
  if (apiDir && path.startsWith('/api/')) {
    await handleApi(req, res, path, apiDir);
    return;
  }

  // HMR client
  if (path === '/__hmr_client__.mjs') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(HMR_CLIENT);
    return;
  }

  // Framework modules
  const moduleMatch = path.match(/^\/(?:\.elmoorx\/)?(runtime|router|ssr|i18n|http|testing|adapters|store|forms|animation|database|realtime|pwa|ui|graphql|charts|utils|markdown|minifier|treeshake|sourcemap|compress|e2e|imageopt|security|metrics|theme-gen|deps-graph|perf|splitting|code-editor|playground|snapshot|dataexport)\/?(.*)$/);
  if (moduleMatch) {
    const [, mod, rest] = moduleMatch;
    const subPath = rest ? `${mod}/${rest}` : `${mod}/index.mjs`;
    const file = join(frameworkDir, subPath);
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(file, 'utf8'));
      return;
    }
  }

  // runtime/core.mjs
  if (path === '/runtime/core.mjs' || path === '/.elmoorx/runtime/core.mjs') {
    const file = join(frameworkDir, 'runtime', 'core.mjs');
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(file, 'utf8'));
      return;
    }
  }

  // vendor
  if (path.startsWith('/vendor/') || path.startsWith('/.elmoorx/vendor/')) {
    const sub = path.replace(/^\/(?:\.elmoorx\/)?vendor\//, 'vendor/');
    const file = join(frameworkDir, sub);
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(file, 'utf8'));
      return;
    }
  }

  // index.html
  if (path === '/' || path === '/index.html') {
    const indexPath = join(rootDir, 'index.html');
    if (existsSync(indexPath)) {
      let html = readFileSync(indexPath, 'utf8');
      if (!html.includes('__hmr_client__')) {
        html = html.replace('</head>', '<script type="module" src="/__hmr_client__.mjs"></script></head>');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(DEFAULT_HTML);
    return;
  }

  // src files (compile TS/TSX)
  if (path.startsWith('/src/')) {
    const candidates = [
      join(rootDir, path),
      join(rootDir, path + '.tsx'),
      join(rootDir, path + '.ts'),
      join(rootDir, path + '.mjs'),
      join(rootDir, path + '.js'),
    ];
    for (const file of candidates) {
      if (existsSync(file)) {
        const ext = extname(file).toLowerCase();
        if (['.ts', '.tsx'].includes(ext)) {
          const compiled = liveCompile(file);
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(compiled);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(readFileSync(file, 'utf8'));
        }
        return;
      }
    }
  }

  // Static files
  const staticFile = join(rootDir, path.replace(/^\//, ''));
  if (existsSync(staticFile) && statSync(staticFile).isFile()) {
    const ext = extname(staticFile).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(readFileSync(staticFile));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 — Not Found');
}

async function handleApi(req, res, path, apiDir) {
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
    res.end(JSON.stringify({ error: 'Not found' }));
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

    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
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

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

function corsMiddleware() {
  return async (ctx) => {
    ctx.res.setHeader('Access-Control-Allow-Origin', '*');
    ctx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    ctx.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (ctx.req.method === 'OPTIONS') {
      ctx.res.writeHead(204);
      ctx.res.end();
      return false;
    }
    return true;
  };
}

function loggingMiddleware() {
  return async (ctx) => {
    const start = Date.now();
    ctx.res.on('finish', () => {
      const duration = Date.now() - start;
      const status = ctx.res.statusCode;
      const method = ctx.req.method;
      const path = ctx.url.pathname;
      const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
      console.log(`  ${color}${status}\x1b[0m ${method.padEnd(6)} ${path.padEnd(40)} ${duration}ms`);
    });
    return true;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Elmoorx v4</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center}</style>
</head><body>
<div style="text-align:center"><h1 style="color:#0ea5e9">✦ Elmoorx v4</h1><p style="color:#94a3b8">أنشئ src/index.tsx للبدء</p></div>
<script type="module" src="/__hmr_client__.mjs"></script>
</body></html>`;

const HMR_CLIENT = `
let ws,reconnectTimer;
const hot=new Map();
function connect(){const p=location.protocol==='https:'?'wss:':'ws:';ws=new WebSocket(p+'//'+location.host+'/__hmr__');ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='connected')return;if(m.type==='update'){const h=hot.get(m.id);if(h)h.forEach(f=>f(m));else location.reload();}else if(m.type==='reload')location.reload();};
ws.onclose=()=>{clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,1000);};}
globalThis.__elmoorx_hmr__={accept(id,f){if(!hot.has(id))hot.set(id,new Set());hot.get(id).add(f);}};
connect();
`;

import { resolve, dirname } from 'node:path';
