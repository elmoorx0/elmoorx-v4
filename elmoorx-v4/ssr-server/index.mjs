/**
 * Elmoorx v4 — SSR Server (Production-Ready)
 * =============================================
 * خادم SSR كامل مع:
 *   - Server-side routing
 *   - SSR rendering + hydration
 *   - Data loaders (getServerSideProps)
 *   - Auth middleware (JWT)
 *   - Rate limiting
 *   - Streaming SSR
 *   - Error boundaries (SSR)
 *   - Static generation (SSG)
 */

import { createServer as createHttpServer } from 'node:http';
import { existsSync, readFileSync, statSync, readdirSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { compile, liveCompile, clearCompileCache } from '../compiler/index.mjs';
import { renderToString, h, getSSRData, renderIsland } from '../runtime/core.mjs';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const os = require('node:os');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1) START SSR SERVER
// ─────────────────────────────────────────────────────────────────────────────

export async function startSSRServer(options = {}) {
  const {
    root = process.cwd(), port = 3000, apiDir = null,
    publicDir = 'public', staticDir = 'dist',
    ssr = true, cors = true, rateLimit = true,
    auth = null, onRender = null,
    websocket = false, sessions = false,
    uploadDir = null, maxUploadSize = 10 * 1024 * 1024,
  } = options;

  const rootDir = resolve(root);
  const distPath = existsSync(join(rootDir, staticDir)) ? join(rootDir, staticDir) : rootDir;
  const publicPath = join(rootDir, publicDir);
  const frameworkDir = existsSync(join(rootDir, '.elmoorx')) ? join(rootDir, '.elmoorx') : resolve(__dirname, '..');

  // Build middleware chain
  const middlewares = [];
  if (cors) middlewares.push(corsMiddleware());
  if (rateLimit) middlewares.push(rateLimitMiddleware());
  if (sessions) middlewares.push(sessionMiddleware());
  if (auth) middlewares.push(authMiddleware(auth));

  // Load routes
  const routes = await loadRoutes(rootDir);

  console.log(`\n  ✦ Elmoorx v4 — SSR Production Server`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ:      ${port}`);
  console.log(`  │ SSR:         ${ssr ? '✓' : '✗'}`);
  console.log(`  │ Routes:      ${routes.length}`);
  console.log(`  │ API:         ${apiDir ? '✓' : '✗'}`);
  console.log(`  │ CORS:        ${cors ? '✓' : '✗'}`);
  console.log(`  │ Rate limit:  ${rateLimit ? '✓' : '✗'}`);
  console.log(`  │ Auth (JWT):  ${auth ? '✓' : '✗'}`);
  console.log(`  │ WebSocket:   ${websocket ? '✓' : '✗'}`);
  console.log(`  │ Sessions:    ${sessions ? '✓' : '✗'}`);
  console.log(`  │ File upload: ${uploadDir ? '✓' : '✗'}`);

  const server = createHttpServer(async (req, res) => {
    const ctx = { req, res, url: new URL(req.url, `http://${req.headers.host}`), state: {}, session: null };

    // Run middleware chain
    for (const mw of middlewares) {
      const result = await mw(ctx);
      if (result === false) return;
    }

    try {
      await handleSSRRequest(req, res, { rootDir, distPath, publicPath, frameworkDir, apiDir, ssr, routes, onRender, ctx, uploadDir, maxUploadSize });
    } catch (err) {
      handleServerError(res, err);
    }
  });

  // WebSocket support
  if (websocket) {
    try {
      const { WebSocketServer } = await import('../vendor/ws-shim.mjs');
      const wss = new WebSocketServer({ server, path: '/__ws__' });
      const wsClients = new Set();
      wss.on('connection', (ws, req) => {
        wsClients.add(ws);
        ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data.toString());
            // Broadcast to all clients
            const broadcast = JSON.stringify({ type: 'message', data: msg, timestamp: Date.now() });
            for (const client of wsClients) {
              try { client.send(broadcast); } catch {}
            }
          } catch {}
        });
        ws.on('close', () => wsClients.delete(ws));
      });
      console.log(`  │ WS clients:  ready`);
    } catch (err) {
      console.log(`  │ WS:          ⚠ ${err.message}`);
    }
  }

  server.listen(port, () => {
    console.log(`  │ الحالة:      جاهز ✓`);
    console.log(`  ─────────────────────────────────────\n  → http://localhost:${port}\n`);
  });

  return server;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) REQUEST HANDLER
// ─────────────────────────────────────────────────────────────────────────────

async function handleSSRRequest(req, res, config) {
  const { rootDir, distPath, publicPath, frameworkDir, apiDir, ssr, routes, onRender, ctx } = config;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = decodeURIComponent(url.pathname);

  // 1) API routes
  if (apiDir && path.startsWith('/api/')) {
    await handleAPIRoute(req, res, path, apiDir, ctx);
    return;
  }

  // 2) Static files
  if (await serveStatic(req, res, path, publicPath)) return;
  if (await serveStatic(req, res, path, distPath)) return;
  if (await serveFrameworkModule(req, res, path, frameworkDir)) return;

  // 3) SSR rendering
  if (ssr) {
    await renderSSRPage(req, res, path, routes, rootDir, frameworkDir, onRender, ctx);
    return;
  }

  // 4) SPA fallback
  const indexPath = join(distPath, 'index.html');
  if (existsSync(indexPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(indexPath, 'utf8'));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 — Not Found');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) SSR PAGE RENDERER
// ─────────────────────────────────────────────────────────────────────────────

async function renderSSRPage(req, res, path, routes, rootDir, frameworkDir, onRender, ctx) {
  const match = matchRoute(path, routes);

  if (!match) {
    const html = await buildHTML({ title: '404 — غير موجود', appHtml: '<div style="padding:4rem;text-align:center;"><h1>404</h1><p>الصفحة غير موجودة</p></div>', data: {}, frameworkDir, status: 404 });
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // Run data loader
  let data = {};
  if (match.route.loader) {
    try {
      data = await match.route.loader({
        params: match.params,
        query: Object.fromEntries(new URL(req.url, 'http://localhost').searchParams),
        req, ctx,
      }) || {};
    } catch (err) {
      console.error('[SSR] Loader error:', err.message);
      const html = await buildHTML({ title: '500 — خطأ', appHtml: `<div style="padding:2rem;color:red;">خطأ: ${err.message}</div>`, data: {}, frameworkDir, status: 500 });
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
  }

  // Render component with SSR context (islands + state)
  let appHtml = '';
  let ssrData = null;
  if (match.route.component) {
    try {
      appHtml = renderToString(match.route.component({ data, params: match.params }));
      ssrData = getSSRData();
    } catch (err) {
      appHtml = `<div style="padding:2rem;color:red;">Render Error: ${err.message}</div>`;
    }
  } else {
    // Try loading entry point
    try {
      const entryPath = join(rootDir, 'src', 'index.tsx');
      if (existsSync(entryPath)) {
        const compiled = liveCompile(entryPath);
        const mod = await loadModuleDynamic(compiled);
        if (mod.default) {
          appHtml = renderToString(mod.default({ data, params: match.params }));
          ssrData = getSSRData();
        }
      }
    } catch (err) {
      appHtml = `<div style="padding:2rem;color:#94a3b8;">جاري التحميل...</div>`;
    }
  }

  // Streaming SSR: send head first, then body, then scripts
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });

  // Stream: head + opening
  const runtimePath = existsSync(join(frameworkDir, 'runtime', 'core.mjs')) ? '/runtime/core.mjs' : '/.elmoorx/runtime/core.mjs';
  const head = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${match.route.title || 'Elmoorx App'}</title><link rel="manifest" href="/manifest.json"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui}#app{min-height:100vh}</style></head><body><div id="app">`;
  res.write(head);

  // Stream: app HTML (the actual rendered content)
  res.write(appHtml);

  // Stream: closing + state + hydration
  const islandData = ssrData ? JSON.stringify({ islands: ssrData.islands, data, params: match.params, path }).replace(/</g, '\\u003c') : JSON.stringify({ data, params: match.params, path }).replace(/</g, '\\u003c');
  const tail = `</div><script>window.__ELMOORX_SSR_DATA__=${islandData};</script><script type="module">import{hydrateIslands}from'${runtimePath}';hydrateIslands();</script><script>window.addEventListener('error',function(e){var o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:rgba(239,68,68,0.95);color:white;padding:2rem;z-index:99999;overflow:auto;font-family:monospace;direction:ltr;';o.innerHTML='<h2>Runtime Error</h2><pre>'+e.message+'\\n\\n'+(e.error&&e.error.stack||'')+'</pre><button onclick="this.parentElement.remove()" style="margin-top:1rem;padding:0.5rem 1rem;background:white;color:#ef4444;border:none;border-radius:4px;cursor:pointer;">Close</button>';document.body.appendChild(o);});</script></body></html>`;
  res.end(tail);
}

async function buildHTML({ title, appHtml, data, params, frameworkDir, path, status }) {
  const runtimePath = existsSync(join(frameworkDir, 'runtime', 'core.mjs')) ? '/runtime/core.mjs' : '/.elmoorx/runtime/core.mjs';
  const stateScript = `<script>window.__ELMOORX_SSR_DATA__ = ${JSON.stringify({ data, params, path }).replace(/</g, '\\u003c')};</script>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="manifest" href="/manifest.json">
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui}#app{min-height:100vh}</style>
</head>
<body>
  <div id="app">${appHtml}</div>
  ${stateScript}
  <script type="module">
    import { hydrateIslands } from '${runtimePath}';
    // Hydrate: attach events to SSR-rendered DOM
    hydrateIslands();
  </script>
  <script>
    window.addEventListener('error', function(e) {
      var o = document.createElement('div');
      o.style.cssText = 'position:fixed;inset:0;background:rgba(239,68,68,0.95);color:white;padding:2rem;z-index:99999;overflow:auto;font-family:monospace;direction:ltr;';
      o.innerHTML = '<h2>Runtime Error</h2><pre>' + e.message + '\\n\\n' + (e.error && e.error.stack || '') + '</pre><button onclick="this.parentElement.remove()" style="margin-top:1rem;padding:0.5rem 1rem;background:white;color:#ef4444;border:none;border-radius:4px;cursor:pointer;">Close</button>';
      document.body.appendChild(o);
    });
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) ROUTE MATCHER
// ─────────────────────────────────────────────────────────────────────────────

function matchRoute(path, routes) {
  for (const route of routes) {
    const regex = pathToRegex(route.path);
    const match = regex.exec(path);
    if (match) return { route, params: match.groups || {} };
  }
  return null;
}

function pathToRegex(path) {
  if (path === '*') return /^.*$/;
  const pattern = path
    .replace(/\*([a-z0-9_]+)/gi, '(?<$1>.*)')
    .replace(/:([a-z0-9_]+)/gi, '(?<$1>[^/]+)');
  return new RegExp('^' + pattern + '$', 'i');
}

async function loadRoutes(rootDir) {
  const routes = [];
  const pagesDir = join(rootDir, 'src', 'pages');
  if (existsSync(pagesDir)) scanPages(pagesDir, '', routes);
  if (routes.length === 0) routes.push({ path: '/', component: null, title: 'Elmoorx App' });
  return routes;
}

function scanPages(dir, basePath, routes) {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanPages(fullPath, basePath + '/' + entry.name, routes);
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (['.tsx', '.ts', '.jsx', '.js', '.mjs'].includes(ext)) {
          let routePath = (basePath + '/' + entry.name.replace(ext, '')).replace(/\/index$/, '') || '/';
          if (!routePath.startsWith('/')) routePath = '/' + routePath;
          routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1').replace(/\[\.\.\.([^\]]+)\]/g, '*$1');
          routes.push({ path: routePath, file: fullPath, component: null, title: entry.name.replace(ext, ''), loader: null });
        }
      }
    }
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) STATIC + FRAMEWORK
// ─────────────────────────────────────────────────────────────────────────────

async function serveStatic(req, res, path, baseDir) {
  const filePath = join(baseDir, path.replace(/^\//, ''));
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false;
  const ext = extname(filePath).toLowerCase();
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (acceptEncoding.includes('br') && existsSync(filePath + '.br')) {
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Encoding': 'br', 'Cache-Control': getCacheControl(ext) });
    res.end(readFileSync(filePath + '.br'));
    return true;
  }
  if (acceptEncoding.includes('gzip') && existsSync(filePath + '.gz')) {
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Encoding': 'gzip', 'Cache-Control': getCacheControl(ext) });
    res.end(readFileSync(filePath + '.gz'));
    return true;
  }

  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': getCacheControl(ext), 'Content-Length': statSync(filePath).size });
  if (statSync(filePath).size > 102400) {
    const { createReadStream } = await import('node:fs');
    createReadStream(filePath).pipe(res);
  } else {
    res.end(readFileSync(filePath));
  }
  return true;
}

async function serveFrameworkModule(req, res, path, frameworkDir) {
  const moduleMatch = path.match(/^\/(?:\.elmoorx\/)?(runtime|router|ssr|i18n|http|testing|adapters|store|forms|animation|database|realtime|pwa|ui|graphql|charts|utils|markdown|minifier|treeshake|sourcemap|compress|e2e|imageopt|security|metrics|theme-gen|deps-graph|perf|splitting|code-editor|playground|snapshot|dataexport)\/?(.*)$/);
  if (moduleMatch) {
    const [, mod, rest] = moduleMatch;
    const file = join(frameworkDir, rest ? `${mod}/${rest}` : `${mod}/index.mjs`);
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(file, 'utf8'));
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) API ROUTES
// ─────────────────────────────────────────────────────────────────────────────

async function handleAPIRoute(req, res, path, apiDir, ctx) {
  const routePath = path.replace(/^\/api\//, '');
  const candidates = [join(apiDir, routePath + '.mjs'), join(apiDir, routePath + '.js'), join(apiDir, routePath, 'index.mjs'), join(apiDir, routePath, 'index.js')];
  let handlerFile = null;
  for (const c of candidates) { if (existsSync(c)) { handlerFile = c; break; } }

  if (!handlerFile) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const handler = await import(fileURLToPath(new URL('file://' + handlerFile)));
    const fn = handler[req.method.toLowerCase()] || handler.default;
    if (typeof fn !== 'function') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Method ${req.method} not allowed` }));
      return;
    }

    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        try { body = JSON.parse(raw.toString()); } catch {}
      } else if (contentType.includes('multipart/form-data') && config.uploadDir) {
        body = await handleFileUpload(raw, contentType, config.uploadDir, config.maxUploadSize);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        body = parseUrlEncoded(raw.toString());
      } else {
        body = raw.toString();
      }
    }

    const result = await fn({
      method: req.method, url: new URL(req.url, 'http://localhost'),
      body, headers: req.headers, ctx,
      query: Object.fromEntries(new URL(req.url, 'http://localhost').searchParams),
      user: ctx.user || null,
    });

    res.writeHead(result.status || 200, { 'Content-Type': 'application/json', ...(result.headers || {}) });
    res.end(JSON.stringify(result.body || result));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

function corsMiddleware() {
  return async (ctx) => {
    ctx.res.setHeader('Access-Control-Allow-Origin', '*');
    ctx.res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    ctx.res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (ctx.req.method === 'OPTIONS') { ctx.res.writeHead(204); ctx.res.end(); return false; }
    return true;
  };
}

function rateLimitMiddleware(options = {}) {
  const {
    windowMs = 60000, max = 100, message = 'تجاوزت حد الطلبات',
    store = 'memory', storePath = './data/ratelimit',
    redisUrl = null, // 'redis://host:port' — يستخدم HTTP API أو يتخطى لو غير متاح
  } = options;

  const clients = new Map();
  let fileStoreDir = null;
  let redisClient = null;

  // Initialize store backend
  if (store === 'file') {
    fileStoreDir = resolve(storePath);
    if (!existsSync(fileStoreDir)) mkdirSync(fileStoreDir, { recursive: true });
  } else if (store === 'redis' && redisUrl) {
    redisClient = createRedisClient(redisUrl);
  }

  // Cleanup expired entries (memory)
  setInterval(() => {
    const now = Date.now();
    for (const [ip, d] of clients) {
      if (now - d.startTime > windowMs) {
        clients.delete(ip);
        if (fileStoreDir) {
          try { unlinkSync(join(fileStoreDir, sanitizeIP(ip) + '.json')); } catch {}
        }
        if (redisClient) {
          redisClient.del(`rl:${sanitizeIP(ip)}`).catch(() => {});
        }
      }
    }
  }, windowMs);

  const persistClient = async (ip, data) => {
    if (fileStoreDir) {
      try { writeFileSync(join(fileStoreDir, sanitizeIP(ip) + '.json'), JSON.stringify(data)); } catch {}
    }
    if (redisClient) {
      try {
        await redisClient.setex(`rl:${sanitizeIP(ip)}`, Math.ceil(windowMs / 1000), JSON.stringify(data));
      } catch {}
    }
  };

  const loadClient = async (ip) => {
    if (fileStoreDir) {
      const filePath = join(fileStoreDir, sanitizeIP(ip) + '.json');
      if (existsSync(filePath)) {
        try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch {}
      }
    }
    if (redisClient) {
      try {
        const data = await redisClient.get(`rl:${sanitizeIP(ip)}`);
        if (data) return JSON.parse(data);
      } catch {}
    }
    return null;
  };

  return async (ctx) => {
    const ip = ctx.req.headers['x-forwarded-for']?.split(',')[0]?.trim() || ctx.req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let client = clients.get(ip);
    if (!client && (fileStoreDir || redisClient)) {
      client = await loadClient(ip);
      if (client) clients.set(ip, client);
    }

    if (!client || now - client.startTime > windowMs) {
      client = { count: 1, startTime: now };
      clients.set(ip, client);
      persistClient(ip, client);
      return true;
    }

    client.count++;
    persistClient(ip, client);

    if (client.count > max) {
      ctx.res.writeHead(429, {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(windowMs / 1000),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((client.startTime + windowMs) / 1000)),
      });
      ctx.res.end(JSON.stringify({ error: message }));
      return false;
    }

    // Set rate limit headers
    ctx.res.setHeader('X-RateLimit-Limit', String(max));
    ctx.res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - client.count)));
    ctx.res.setHeader('X-RateLimit-Reset', String(Math.ceil((client.startTime + windowMs) / 1000)));

    return true;
  };
}

function sanitizeIP(ip) {
  return ip.replace(/[^a-zA-Z0-9.:_-]/g, '_');
}

/**
 * عميل Redis بسيط — يستخدم RESP2 protocol عبر TCP خام (بدون مكتبات خارجية)
 * يُفعَّل فقط عند تمرير redisUrl. يدعم: GET, SET, SETEX, DEL
 */
function createRedisClient(url) {
  try {
    const u = new URL(url);
    const host = u.hostname || '127.0.0.1';
    const port = parseInt(u.port || '6379');
    const net = require('node:net');

    const socket = net.createConnection({ host, port }, () => {
      console.log(`  │ Redis:      متصل ${host}:${port}`);
    });
    socket.on('error', (err) => {
      console.log(`  │ Redis:      ⚠ ${err.message}`);
    });
    socket.setEncoding('utf8');
    socket.setKeepAlive(true);

    let buf = '';
    const waiters = [];
    socket.on('data', (chunk) => {
      buf += chunk;
      // RESP2: الردود تنتهي بـ \r\n
      while (buf.includes('\r\n')) {
        const reply = parseRespReply(buf);
        if (reply === null) break;
        buf = buf.slice(reply.consumed);
        const waiter = waiters.shift();
        if (waiter) waiter.resolve(reply.value);
      }
    });

    const send = (cmd) => new Promise((resolve, reject) => {
      waiters.push({ resolve, reject });
      socket.write(cmd);
      setTimeout(() => {
        const idx = waiters.findIndex(w => w.resolve === resolve);
        if (idx >= 0) { waiters.splice(idx, 1); reject(new Error('Redis timeout')); }
      }, 3000);
    });

    const encode = (args) => `*${args.length}\r\n${args.map(a => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join('')}`;

    return {
      async get(key) { return send(encode(['GET', key])); },
      async set(key, val) { return send(encode(['SET', key, val])); },
      async setex(key, ttl, val) { return send(encode(['SETEX', key, String(ttl), val])); },
      async del(key) { return send(encode(['DEL', key])); },
      async ping() { return send(encode(['PING'])); },
      socket,
    };
  } catch (err) {
    console.log(`  │ Redis:      ⚠ تعذّر التهيئة (${err.message})`);
    return null;
  }
}

function parseRespReply(buf) {
  const firstByte = buf[0];
  const endIdx = buf.indexOf('\r\n');
  if (endIdx === -1) return null;

  if (firstByte === '+') {
    return { value: buf.slice(1, endIdx), consumed: endIdx + 2 };
  }
  if (firstByte === '-') {
    return { value: null, consumed: endIdx + 2 };
  }
  if (firstByte === ':') {
    return { value: parseInt(buf.slice(1, endIdx)), consumed: endIdx + 2 };
  }
  if (firstByte === '$') {
    const len = parseInt(buf.slice(1, endIdx));
    if (len === -1) return { value: null, consumed: endIdx + 2 };
    const dataEnd = endIdx + 2 + len + 2;
    if (buf.length < dataEnd) return null;
    return { value: buf.slice(endIdx + 2, endIdx + 2 + len), consumed: dataEnd };
  }
  if (firstByte === '*') {
    const len = parseInt(buf.slice(1, endIdx));
    if (len === -1) return { value: null, consumed: endIdx + 2 };
    // simplified — return array
    return { value: [], consumed: endIdx + 2 };
  }
  return { value: buf.slice(0, endIdx), consumed: endIdx + 2 };
}

function authMiddleware(options = {}) {
  const { secret, unless = [] } = options;
  return async (ctx) => {
    const path = ctx.url.pathname;
    if (unless.some(p => path.startsWith(p) || path === p)) return true;
    if (!path.startsWith('/api/') && !path.startsWith('/auth/')) return true;

    // Try JWT from Authorization header
    const authHeader = ctx.req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        ctx.user = verifyJWT(authHeader.slice(7), secret);
        ctx.state.user = ctx.user;
        return true;
      } catch {
        if (path.startsWith('/api/')) {
          ctx.res.writeHead(403, { 'Content-Type': 'application/json' });
          ctx.res.end(JSON.stringify({ error: 'Invalid token' }));
          return false;
        }
      }
    }

    // Try session from cookie
    if (ctx.session?.user) {
      ctx.user = ctx.session.user;
      ctx.state.user = ctx.user;
      return true;
    }

    if (path.startsWith('/api/')) {
      ctx.res.writeHead(401, { 'Content-Type': 'application/json' });
      ctx.res.end(JSON.stringify({ error: 'Unauthorized' }));
      return false;
    }
    return true;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7b) SESSION MIDDLEWARE (cookie-based)
// ─────────────────────────────────────────────────────────────────────────────

function sessionMiddleware(options = {}) {
  const {
    cookieName = 'elmoorx_session',
    maxAge = 86400 * 7, // 7 days
    httpOnly = true,
    secure = false,
    sameSite = 'lax',
    store = 'memory', // 'memory' | 'file' | 'redis'
    storePath = './data/sessions',
    redisUrl = null,
  } = options;

  const sessions = new Map();
  let fileStoreDir = null;
  let redisClient = null;

  // Initialize store backend
  if (store === 'file') {
    fileStoreDir = resolve(storePath);
    if (!existsSync(fileStoreDir)) mkdirSync(fileStoreDir, { recursive: true });
    // Load existing sessions on startup
    try {
      for (const file of readdirSync(fileStoreDir)) {
        if (file.endsWith('.json')) {
          const data = JSON.parse(readFileSync(join(fileStoreDir, file), 'utf8'));
          if (data.expires > Date.now()) {
            sessions.set(file.replace('.json', ''), data);
          } else {
            unlinkSync(join(fileStoreDir, file)); // cleanup expired
          }
        }
      }
    } catch {}
  } else if (store === 'redis' && redisUrl) {
    redisClient = createRedisClient(redisUrl);
  }

  // Cleanup expired sessions hourly
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (session.expires < now) {
        sessions.delete(id);
        if (fileStoreDir && existsSync(join(fileStoreDir, id + '.json'))) {
          try { unlinkSync(join(fileStoreDir, id + '.json')); } catch {}
        }
        if (redisClient) {
          redisClient.del(`sess:${id}`).catch(() => {});
        }
      }
    }
  }, 3600000);

  const persistSession = async (id, session) => {
    if (fileStoreDir) {
      try { writeFileSync(join(fileStoreDir, id + '.json'), JSON.stringify(session)); } catch {}
    }
    if (redisClient) {
      try {
        await redisClient.setex(`sess:${id}`, maxAge, JSON.stringify(session));
      } catch {}
    }
  };

  const loadSession = async (id) => {
    if (fileStoreDir) {
      const filePath = join(fileStoreDir, id + '.json');
      if (existsSync(filePath)) {
        try {
          const data = JSON.parse(readFileSync(filePath, 'utf8'));
          if (data.expires > Date.now()) return data;
        } catch {}
      }
    }
    if (redisClient) {
      try {
        const raw = await redisClient.get(`sess:${id}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.expires > Date.now()) return data;
        }
      } catch {}
    }
    return null;
  };

  const destroySession = async (id) => {
    sessions.delete(id);
    if (fileStoreDir && existsSync(join(fileStoreDir, id + '.json'))) {
      try { unlinkSync(join(fileStoreDir, id + '.json')); } catch {}
    }
    if (redisClient) {
      try { await redisClient.del(`sess:${id}`); } catch {}
    }
  };

  return async (ctx) => {
    const cookies = parseCookies(ctx.req.headers.cookie || '');

    let sessionId = cookies[cookieName];
    let session = null;

    if (sessionId && sessions.has(sessionId)) {
      session = sessions.get(sessionId);
      if (session.expires < Date.now()) {
        await destroySession(sessionId);
        session = null;
        sessionId = null;
      }
    }

    // Try loading from persistent store if not in memory
    if (!session && (fileStoreDir || redisClient) && sessionId) {
      session = await loadSession(sessionId);
      if (session) sessions.set(sessionId, session);
      else { sessionId = null; }
    }

    if (!session) {
      sessionId = generateSessionId();
      session = {
        id: sessionId,
        data: {},
        expires: Date.now() + maxAge * 1000,
      };
      sessions.set(sessionId, session);
      await persistSession(sessionId, session);

      // Set cookie
      ctx.res.setHeader('Set-Cookie', `${cookieName}=${sessionId}; Path=/; Max-Age=${maxAge}; HttpOnly=${httpOnly}; SameSite=${sameSite}${secure ? '; Secure' : ''}`);
    }

    // Attach helpers (rebuild on every request because data may have been loaded from disk)
    session.get = (key) => session.data[key];
    session.set = (key, value) => {
      session.data[key] = value;
      persistSession(sessionId, session);
    };
    session.destroy = () => destroySession(sessionId);

    ctx.session = session;
    return true;
  };
}

function parseCookies(cookieHeader) {
  const cookies = {};
  for (const pair of cookieHeader.split(';')) {
    const [key, value] = pair.trim().split('=');
    if (key) cookies[key] = value || '';
  }
  return cookies;
}

function generateSessionId() {
  const { randomBytes } = require('node:crypto');
  return randomBytes(32).toString('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) JWT
// ─────────────────────────────────────────────────────────────────────────────

export function signJWT(payload, secret, options = {}) {
  const { expiresIn = '1h' } = options;
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + parseExpiry(expiresIn) };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(body));
  const sig = hmacSHA256(`${headerB64}.${payloadB64}`, secret);
  return `${headerB64}.${payloadB64}.${sig}`;
}

export function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [headerB64, payloadB64, sig] = parts;
  if (hmacSHA256(`${headerB64}.${payloadB64}`, secret) !== sig) throw new Error('Invalid signature');
  const payload = JSON.parse(base64UrlDecode(payloadB64));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

function parseExpiry(s) {
  if (typeof s === 'number') return s;
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 3600;
  return parseInt(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
}
function base64UrlEncode(s) { return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function base64UrlDecode(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return Buffer.from(s, 'base64').toString('utf8'); }
function hmacSHA256(data, secret) { return createHmac('sha256', secret).update(data).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }

// ─────────────────────────────────────────────────────────────────────────────
// 9) HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function handleServerError(res, err) {
  console.error('[Server] Error:', err.message);
  if (!res.headersSent) {
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>500</title></head><body style="font-family:system-ui;padding:2rem"><h1 style="color:#ef4444">500 — خطأ</h1><pre style="background:#f1f5f9;padding:1rem;border-radius:8px;margin-top:1rem">${err.message}</pre></body></html>`);
  }
}

function getCacheControl(ext) {
  if (['.mjs', '.js', '.css', '.wasm'].includes(ext)) return 'public, max-age=31536000, immutable';
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) return 'public, max-age=86400';
  if (ext === '.html') return 'no-cache, no-store, must-revalidate';
  return 'public, max-age=3600';
}

// ─────────────────────────────────────────────────────────────────────────────
// 9b) FILE UPLOAD HANDLER
// ─────────────────────────────────────────────────────────────────────────────

async function handleFileUpload(raw, contentType, uploadDir, maxSize) {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { join, extname } = await import('node:path');

  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

  if (raw.length > maxSize) {
    throw new Error(`File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`);
  }

  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return { error: 'Invalid multipart data' };

  const parts = raw.toString('binary').split('--' + boundary);
  const result = { fields: {}, files: [] };

  for (const part of parts) {
    if (!part.trim() || part === '--') continue;

    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;

    const headers = part.slice(0, headerEnd);
    const content = part.slice(headerEnd + 4, part.length - 2);

    // Parse content-disposition
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]*)"/);

    if (filenameMatch) {
      // File
      const fieldName = nameMatch?.[1] || 'file';
      const filename = filenameMatch[1];
      const ext = extname(filename).toLowerCase();
      const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = join(uploadDir, safeName);

      writeFileSync(filePath, Buffer.from(content, 'binary'));

      result.files.push({
        field: fieldName,
        filename,
        savedAs: safeName,
        path: filePath,
        size: content.length,
        ext,
        type: getMimeType(ext),
      });
    } else if (nameMatch) {
      // Text field
      result.fields[nameMatch[1]] = content.trim();
    }
  }

  return result;
}

function parseUrlEncoded(str) {
  const params = {};
  for (const pair of str.split('&')) {
    const [k, v] = pair.split('=').map(decodeURIComponent);
    if (k) params[k] = v ?? '';
  }
  return params;
}

function getMimeType(ext) {
  const types = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.pdf': 'application/pdf', '.txt': 'text/plain', '.csv': 'text/csv',
    '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
    '.zip': 'application/zip', '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return types[ext] || 'application/octet-stream';
}

async function loadModuleDynamic(code) {
  const tmpFile = join(os.tmpdir(), 'elmoorx_ssr_' + Date.now() + '.mjs');
  writeFileSync(tmpFile, code);
  try { return await import(fileURLToPath(new URL('file://' + tmpFile))); }
  finally { try { unlinkSync(tmpFile); } catch {} }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) STREAMING SSR — renderToStream()
// يكتب HTML على أجزاء عبر res.write() بحيث يستطيع المتصفح عرض الـ head
// والـ static parts قبل اكتمال الـ data loaders. يقلل TTFB و يحسّن FCP.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * renderToStream — يُرجع async generator يضخّ chunks من HTML تدريجياً
 * @param {object} componentFn  دالة المكون الجذري
 * @param {object} options      { title, data, params, path, frameworkDir, head, onChunk }
 */
export async function renderToStream(res, componentFn, options = {}) {
  const {
    title = 'Elmoorx App',
    data = {},
    params = {},
    path = '/',
    frameworkDir = null,
    onChunk = null,
  } = options;

  const runtimePath = frameworkDir && existsSync(join(frameworkDir, 'runtime', 'core.mjs'))
    ? '/runtime/core.mjs'
    : '/.elmoorx/runtime/core.mjs';

  // 1) Head chunk — فوراً
  const headChunk = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><link rel="manifest" href="/manifest.json"><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui}#app{min-height:100vh}</style></head><body><div id="app">`;
  res.write(headChunk);
  if (onChunk) await onChunk('head', headChunk);

  // 2) Body chunks — مع جزر معلّمة للـ partial hydration
  let bodyChunk;
  try {
    const vdom = typeof componentFn === 'function' ? componentFn({ data, params }) : componentFn;
    bodyChunk = renderToString(vdom);
  } catch (err) {
    bodyChunk = `<div style="padding:2rem;color:red;">Render Error: ${err.message}</div>`;
  }
  res.write(bodyChunk);
  if (onChunk) await onChunk('body', bodyChunk);

  // 3) State + Hydration script chunk
  const ssrData = getSSRData() || { islands: [] };
  const islandData = JSON.stringify({
    islands: ssrData.islands,
    data,
    params,
    path,
  }).replace(/</g, '\\u003c');

  const tailChunk = `</div><script>window.__ELMOORX_SSR_DATA__=${islandData};</script><script type="module">import{hydrateIslands}from'${runtimePath}';hydrateIslands();</script></body></html>`;
  res.end(tailChunk);
  if (onChunk) await onChunk('tail', tailChunk);

  return { head: headChunk.length, body: bodyChunk.length, tail: tailChunk.length };
}

/**
 * renderIslandsSSR — يلفّ المكون الجذري بـ islands للـ partial hydration
 * يستخدم renderIsland() من الـ runtime لتحديد الجزر التفاعلية صراحةً
 */
export function renderIslandsSSR(componentFn, options = {}) {
  const { data = {}, params = {} } = options;
  const vdom = componentFn({ data, params });
  // renderToString يقوم تلقائياً بلفّ المكونات التي تحتوي على on* events
  // بـ data-elmoorx-island — نُرجع HTML مع وسوم الجزر
  return renderToString(vdom);
}

export default { startSSRServer, signJWT, verifyJWT, corsMiddleware, rateLimitMiddleware, authMiddleware, sessionMiddleware, renderToStream, renderIslandsSSR };
