/**
 * Elmoorx v4 — Dev Server + HMR صفر-زمني
 * =========================================
 * خادم تطوير مدمج مع:
 *   - تجميع TypeScript + JSX عند الطلب
 *   - HMR عبر WebSocket مباشر (<1ms)
 *   - مراقبة الملفات فورية (fs.watch)
 *   - عرض الأخطاء كـ overlay
 *   - لا يحتاج Vite/Webpack/esbuild
 */

import { createServer as createHttpServer } from 'node:http';
import { readFileSync, existsSync, watch, statSync, readdirSync } from 'node:fs';
import { extname, join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer } from '../vendor/ws-shim.mjs';
import { compile, liveCompile, clearCompileCache } from '../compiler/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// RUNTIME_DIR = المجلد الذي يحتوي runtime/ + compiler/ + vendor/
// إما نحن في elmoorx-v4/ (framework root) أو في project/.elmoorx/
const RUNTIME_DIR = resolve(__dirname, '..');

export async function createServer({ rootDir, port = 3000 }) {
  rootDir = resolve(rootDir);
  console.log(`\n  ✦ Elmoorx v4 — Dev Server\n  ─────────────────────────────────────`);
  console.log(`  │ الجذر:       ${rootDir}`);
  console.log(`  │ المنفذ:      ${port}`);
  console.log(`  │ الإطار:     ${RUNTIME_DIR}`);

  const httpServer = createHttpServer(async (req, res) => {
    try {
      await handleRequest(req, res, rootDir);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`خطأ داخلي: ${err.message}\n${err.stack}`);
    }
  });

  // WebSocket for HMR
  const wss = new WebSocketServer({ server: httpServer, path: '/__hmr__' });
  const clients = new Set();
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', version: '4.0.0' }));
    ws.on('close', () => clients.delete(ws));
  });

  function broadcast(msg) {
    const data = JSON.stringify(msg);
    for (const ws of clients) {
      try { ws.send(data); } catch {}
    }
  }

  // مراقبة الملفات
  const watchDirs = [rootDir, join(RUNTIME_DIR, 'runtime'), join(RUNTIME_DIR, 'vendor')];
  const watchedFiles = new Set();
  for (const dir of watchDirs) {
    if (existsSync(dir)) watchDir(dir);
  }

  function watchDir(dir) {
    try {
      const files = readdirSync(dir, { withFileTypes: true });
      for (const f of files) {
        const fullPath = join(dir, f.name);
        if (f.isDirectory()) {
          if (!f.name.startsWith('.') && f.name !== 'node_modules') watchDir(fullPath);
        } else if (/\.(ts|tsx|mjs|js|css|html)$/i.test(f.name)) {
          if (!watchedFiles.has(fullPath)) {
            watchedFiles.add(fullPath);
            try {
              watch(fullPath, { persistent: false }, (eventType) => {
                if (eventType === 'change') {
                  handleFileChange(fullPath);
                }
              });
            } catch {}
          }
        }
      }
    } catch {}
  }

  async function handleFileChange(filePath) {
    const start = performance.now();
    clearCompileCache();
    const relPath = relativePath(filePath, rootDir);
    const url = '/' + relPath.replace(/\\/g, '/').replace(/^\//, '');

    let newCode = null;
    let hadError = false;
    let errorMsg = null;

    try {
      // اقرأ واجمع الكود الجديد
      const source = readFileSync(filePath, 'utf8');
      const ext = extname(filePath).toLowerCase();
      if (ext === '.ts' || ext === '.tsx' || ext === '.mtsx') {
        newCode = compile(source, filePath);
      } else {
        newCode = source;
      }
    } catch (err) {
      hadError = true;
      errorMsg = err.message;
    }

    const took = Math.round(performance.now() - start);

    if (hadError) {
      broadcast({
        type: 'error',
        id: relPath,
        message: errorMsg,
        stack: '',
        took,
        timestamp: Date.now(),
      });
      console.log(`  ✗ خطأ تجميع: ${relPath} — ${errorMsg}`);
      return;
    }

    // أرسل الكود الجديد للعميل
    broadcast({
      type: 'update',
      id: relPath,
      url,
      code: newCode,
      took,
      timestamp: Date.now(),
    });
    console.log(`  ✦ HMR تحديث: ${relPath} (${took}ms, ${newCode.length}b)`);
  }

  httpServer.listen(port, () => {
    console.log(`  │ الحالة:      جاهز ✓\n  ─────────────────────────────────────`);
    console.log(`\n  → http://localhost:${port}\n  → HMR نشط على ws://localhost:${port}/__hmr__\n`);
  });

  return httpServer;
}

async function handleRequest(req, res, rootDir) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let path = url.pathname;

  // HMR client
  if (path === '/__hmr_client__.mjs') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(HMR_CLIENT_CODE);
    return;
  }

  // runtime core — يدعم /runtime/ و /.elmoorx/runtime/
  if (path === '/runtime/core.mjs' || path.startsWith('/runtime/') ||
      path === '/.elmoorx/runtime/core.mjs' || path.startsWith('/.elmoorx/runtime/')) {
    const subPath = path.replace(/^\/(\.elmoorx\/)?runtime\//, 'runtime/');
    const file = join(RUNTIME_DIR, subPath);
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(file, 'utf8'));
      return;
    }
  }

  // modules: router, ssr, i18n, http, testing, adapters, store, forms, animation, database, realtime, pwa
  // يدعم /router/ و /.elmoorx/router/ (وكذلك /vendor/router/ للتوافق القديم)
  const moduleMatch = path.match(/^\/(?:\.elmoorx\/)?(router|ssr|i18n|http|testing|adapters|store|forms|animation|database|realtime|pwa)\/?(.*)$/);
  if (moduleMatch) {
    const [, moduleName, rest] = moduleMatch;
    const subPath = rest ? `${moduleName}/${rest}` : `${moduleName}/index.mjs`;
    const file = join(RUNTIME_DIR, subPath);
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(file, 'utf8'));
      return;
    }
    // try index.mjs
    const indexFile = join(RUNTIME_DIR, moduleName, 'index.mjs');
    if (existsSync(indexFile)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(indexFile, 'utf8'));
      return;
    }
  }

  // vendor packages (للحزم الإضافية فقط)
  if (path.startsWith('/vendor/') || path.startsWith('/.elmoorx/vendor/')) {
    const subPath = path.replace(/^\/(\.elmoorx\/)?vendor\//, 'vendor/');
    const file = join(RUNTIME_DIR, subPath);
    if (existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(readFileSync(file, 'utf8'));
      return;
    }
    const tsFile = file.replace(/\.mjs$/, '.ts');
    if (existsSync(tsFile)) {
      const src = readFileSync(tsFile, 'utf8');
      const compiled = compile(src, tsFile);
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(compiled);
      return;
    }
  }

  // تحويل /src/foo.elmoorx.tsx → تجميع
  if (path.startsWith('/src/') || path === '/' || path === '/index.html') {
    if (path === '/' || path === '/index.html') {
      const indexPath = join(rootDir, 'index.html');
      if (existsSync(indexPath)) {
        let html = readFileSync(indexPath, 'utf8');
        // حقن HMR client تلقائياً
        if (!html.includes('__hmr_client__')) {
          html = html.replace('</head>', '<script type="module" src="/__hmr_client__.mjs"></script></head>');
        }
        // حقن runtime تلقائياً
        if (!html.includes('@elmoorx/runtime')) {
          html = html.replace('</head>', '<script type="module">import { initHMR, hydrateIslands } from "/runtime/core.mjs"; initHMR(); hydrateIslands();</script></head>');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      // generate default index
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateDefaultIndex());
      return;
    }

    // try as file
    const candidates = [
      join(rootDir, path.replace(/^\//, '')),
      join(rootDir, path.replace(/^\//, '') + '.tsx'),
      join(rootDir, path.replace(/^\//, '') + '.ts'),
      join(rootDir, path.replace(/^\//, '') + '.mjs'),
      join(rootDir, path.replace(/^\//, '') + '.js'),
      join(rootDir, path.replace(/^\//, '') + '/index.tsx'),
      join(rootDir, path.replace(/^\//, '') + '/index.ts'),
      join(rootDir, path.replace(/^\//, '') + '/index.mjs'),
    ];

    for (const file of candidates) {
      if (existsSync(file)) {
        const ext = extname(file).toLowerCase();
        if (ext === '.tsx' || ext === '.ts' || ext === '.mtsx') {
          // compile
          const compiled = liveCompile(file);
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(compiled);
        } else if (ext === '.mjs' || ext === '.js') {
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(readFileSync(file, 'utf8'));
        } else if (ext === '.css') {
          res.writeHead(200, { 'Content-Type': 'text/css' });
          res.end(readFileSync(file, 'utf8'));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
          res.end(readFileSync(file));
        }
        return;
      }
    }
  }

  // static files
  const staticFile = join(rootDir, path.replace(/^\//, ''));
  if (existsSync(staticFile) && statSync(staticFile).isFile()) {
    const ext = extname(staticFile).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(readFileSync(staticFile));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`404 — لم يُعثر على: ${path}`);
}

function relativePath(fullPath, rootDir) {
  return fullPath.replace(rootDir, '').replace(/^[/\\]+/, '');
}

function generateDefaultIndex() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elmoorx v4 — مشروع جديد</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .hero {
      text-align: center;
      max-width: 600px;
    }
    .hero h1 {
      font-size: 3rem;
      background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      margin-bottom: 1rem;
    }
    .hero p { color: #94a3b8; margin-bottom: 2rem; }
    .hero code {
      background: rgba(14, 165, 233, 0.15);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      color: #0ea5e9;
      font-family: 'Courier New', monospace;
      display: inline-block;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 2rem;
    }
    .feature {
      background: rgba(30, 41, 59, 0.5);
      padding: 1rem;
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }
    .feature strong { color: #0ea5e9; display: block; margin-bottom: 0.25rem; }
    .feature span { color: #94a3b8; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>✦ Elmoorx v4</h1>
    <p>إطار عمل مستقل عن npm/npx — يعمل مباشرة من GitHub</p>
    <code>أنشئ ملف src/index.tsx للبدء</code>
    <div class="features">
      <div class="feature"><strong>HMR صفر-زمني</strong><span>WebSocket مباشر</span></div>
      <div class="feature"><strong>Edge+Native</strong><span>كود واحد، 5 منصات</span></div>
      <div class="feature"><strong>Visual Builder</strong><span>محرر مرئي</span></div>
      <div class="feature"><strong>بدون npm</strong><span>كل التبعيات مدمجة</span></div>
    </div>
  </div>
  <script type="module" src="/__hmr_client__.mjs"></script>
  <script type="module">
    import { initHMR, $state, h, mount } from '/runtime/core.mjs';
    initHMR(3000);
    // مثال تفاعلي
    const count = $state(0);
    mount(() => h('div', { style: { textAlign: 'center', marginTop: '2rem' } },
      h('button', { onClick: () => count.set(c => c + 1), style: 'padding:1rem 2rem;font-size:1.2rem;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;' },
        'العدد: ', () => count()
      )
    ), 'body');
  </script>
</body>
</html>`;
}

// HMR client code (يُحقن في كل صفحة)
const HMR_CLIENT_CODE = `
let ws;
let reconnectTimer;
const hotModules = new Map();
const disposeHandlers = new Map();
const moduleCache = new Map(); // url → compiled code

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(\`\${protocol}//\${location.host}/__hmr__\`);
  ws.onopen = () => { console.log('%c✦ HMR متصل', 'color:#0ea5e9;font-weight:bold;'); };
  ws.onmessage = async (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'connected') return;
    if (msg.type === 'update') {
      // خزّن الكود الجديد
      moduleCache.set(msg.url, msg.code);

      // ابحث عن handlers مسجّلة
      const handlers = hotModules.get(msg.id);
      if (handlers) {
        handlers.forEach(h => {
          try { h(msg); } catch (e) { console.error('[HMR] فشل التحديث:', e); }
        });
      } else {
        // لا handlers — حاول التحديث الناعم (soft refresh)
        // أعد تحميل الوحدة عبر import URL جديد
        await softReload(msg.url, msg.code);
      }
      console.log('%c✦ HMR تحديث: ' + msg.id + ' (' + msg.took + 'ms)', 'color:#10b981;');
    } else if (msg.type === 'reload') {
      location.reload();
    } else if (msg.type === 'error') {
      showOverlay(msg.message, msg.stack || '');
      console.error('%c✦ خطأ تجميع: ' + msg.message, 'color:#ef4444;font-weight:bold;');
    }
  };
  ws.onclose = () => {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 1000);
  };
}

async function softReload(url, code) {
  try {
    // أنشئ blob URL للكود الجديد واستورده
    const blob = new Blob([code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    await import(blobUrl);
    URL.revokeObjectURL(blobUrl);
    console.log('%c✦ HMR: أُعيد تحميل ' + url, 'color:#10b981;');
  } catch (err) {
    console.error('[HMR] فشل إعادة التحميل:', err);
    // fallback: أعد تحميل الصفحة
    setTimeout(() => location.reload(), 500);
  }
}

function showOverlay(message, stack) {
  let overlay = document.getElementById('__elmoorx_overlay__');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__elmoorx_overlay__';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(220,38,38,0.95);color:white;font:14px/1.5 monospace;padding:20px;z-index:99999;overflow:auto;direction:ltr;text-align:left;';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = '<h2 style="margin:0 0 10px;">خطأ في التطوير</h2><pre style="white-space:pre-wrap;">' + escapeHtml(message) + (stack ? '\\n\\n' + escapeHtml(stack) : '') + '</pre><button onclick="this.parentElement.remove()" style="margin-top:1rem;padding:0.5rem 1rem;background:white;color:#ef4444;border:none;border-radius:4px;cursor:pointer;">إغلاق</button>';
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

globalThis.__elmoorx_hmr__ = {
  accept(id, handler) {
    if (!hotModules.has(id)) hotModules.set(id, new Set());
    hotModules.get(id).add(handler);
  },
  dispose(id, handler) {
    if (!disposeHandlers.has(id)) disposeHandlers.set(id, new Set());
    disposeHandlers.get(id).add(handler);
  },
  softReload,
  moduleCache,
};

connect();
`;
