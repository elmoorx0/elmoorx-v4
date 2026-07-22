/**
 * Elmoorx v4 — Edge + Native Adapters
 * =====================================
 * كود واحد يعمل على 5 منصات:
 *   - Browser (PWA / SPA)
 *   - Cloudflare Workers
 *   - Vercel Edge Functions
 *   - Deno Deploy
 *   - Node.js
 *   - iOS / Android (عبر WebView)
 *
 * المبدأ: نفس كود Elmoorx يُجمَّع لكل منصة بدون تغيير.
 * كل adapter يوفر نفس الـ API لكن بتنفيذ مختلف.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) PLATFORM DETECTION — يكتشف المنصة الحالية
// ─────────────────────────────────────────────────────────────────────────────

export const platform = detectPlatform();

function detectPlatform() {
  // Cloudflare Workers
  if (typeof caches !== 'undefined' && typeof WebSocketPair !== 'undefined') {
    return 'cloudflare';
  }
  // Vercel Edge
  if (typeof EdgeRuntime !== 'undefined') {
    return 'vercel';
  }
  // Deno
  if (typeof Deno !== 'undefined') {
    return 'deno';
  }
  // Browser
  if (typeof window !== 'undefined') {
    return 'browser';
  }
  // Node.js
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }
  // Native (React Native / WebView)
  if (typeof global !== 'undefined' && typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return 'native';
  }
  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) UNIVERSAL API — نفس الـ API على كل المنصات
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fetch — يجلب موارد عبر HTTP (مدمج في كل المنصات)
 */
export const fetcher = globalThis.fetch?.bind(globalThis) || null;

/**
 * KVStore — مخزن مفتاح-قيمة (يختلف حسب المنصة)
 */
export const kv = createKVStore();

function createKVStore() {
  switch (platform) {
    case 'cloudflare':
      // Cloudflare KV or Durable Objects
      return {
        async get(key) { return await globalThis.ELMOORX_KV?.get(key); },
        async set(key, value) { await globalThis.ELMOORX_KV?.put(key, value); },
        async delete(key) { await globalThis.ELMOORX_KV?.delete(key); },
      };
    case 'vercel':
      // Vercel Edge Config
      return {
        async get(key) { /* TODO: Vercel Edge Config */ return null; },
        async set(key, value) { /* TODO */ },
        async delete(key) { /* TODO */ },
      };
    case 'deno':
      // Deno KV
      return {
        async get(key) { return (await Deno.openKv().get([key]))?.value; },
        async set(key, value) { await Deno.openKv().set([key], value); },
        async delete(key) { await Deno.openKv().delete([key]); },
      };
    case 'browser':
      // localStorage / IndexedDB
      return {
        get(key) { return localStorage.getItem(key); },
        set(key, value) { localStorage.setItem(key, value); },
        delete(key) { localStorage.removeItem(key); },
      };
    case 'node':
    default:
      // in-memory (للـ dev) أو file-based
      const store = new Map();
      return {
        get(key) { return store.get(key) ?? null; },
        set(key, value) { store.set(key, value); },
        delete(key) { store.delete(key); },
      };
  }
}

/**
 * WebSocket — اتصال ثنائي الاتجاه
 */
export function createWebSocket(url) {
  return new WebSocket(url);
}

/**
 * response — ينشئ HTTP response (للـ edge platforms)
 */
export function response(body, init = {}) {
  if (typeof Response !== 'undefined') {
    return new Response(body, init);
  }
  // Node fallback
  return { body, status: init.status || 200, headers: init.headers || {} };
}

/**
 * request — يحلل HTTP request
 */
export function parseRequest(req) {
  if (platform === 'cloudflare' || platform === 'vercel' || platform === 'deno') {
    // Request object
    return {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      body: req.body,
    };
  }
  // Node http.IncomingMessage
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) FILESYSTEM ABSTRACTION
// ─────────────────────────────────────────────────────────────────────────────

export const fs = createFileSystem();

function createFileSystem() {
  if (platform === 'browser' || platform === 'native') {
    // Browser: لا يوجد fs مباشر — استخدم fetch
    return {
      async readFile(path) {
        const res = await fetch(path);
        return await res.text();
      },
      async exists(path) {
        try { const res = await fetch(path, { method: 'HEAD' }); return res.ok; }
        catch { return false; }
      },
    };
  }

  if (platform === 'deno') {
    return {
      async readFile(path) { return await Deno.readTextFile(path); },
      async exists(path) { try { await Deno.stat(path); return true; } catch { return false; } },
    };
  }

  // Node.js / Cloudflare / Vercel
  try {
    const nodeFs = await import('node:fs');
    return {
      readFile(path) { return nodeFs.readFileSync(path, 'utf8'); },
      exists(path) { return nodeFs.existsSync(path); },
    };
  } catch {
    return {
      async readFile() { throw new Error('fs غير متاح'); },
      async exists() { return false; },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) ENVIRONMENT VARIABLES
// ─────────────────────────────────────────────────────────────────────────────

export const env = createEnv();

function createEnv() {
  if (platform === 'cloudflare') {
    return new Proxy({}, { get: (_, k) => globalThis[k] });
  }
  if (platform === 'vercel') {
    return new Proxy({}, { get: (_, k) => process.env[k] });
  }
  if (platform === 'deno') {
    return new Proxy({}, { get: (_, k) => Deno.env.get(k) });
  }
  // Node / browser
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) DEPLOY HELPERS — لكل منصة
// ─────────────────────────────────────────────────────────────────────────────

export const deployTargets = {
  browser: {
    name: 'Browser (PWA/SPA)',
    bundle: 'static',
    instructions: 'ارفع مجلد dist/ على أي استضافة ثابتة (Netlify, GitHub Pages, Vercel Static)',
  },
  cloudflare: {
    name: 'Cloudflare Workers',
    bundle: 'worker',
    instructions: 'wrangler deploy',
    ram: '128MB',
    locations: 285,
  },
  vercel: {
    name: 'Vercel Edge Functions',
    bundle: 'edge',
    instructions: 'vercel --prod',
    ram: '50MB',
  },
  deno: {
    name: 'Deno Deploy',
    bundle: 'deno',
    instructions: 'deno deploy',
    ram: '50MB',
    regions: 35,
  },
  native: {
    name: 'iOS / Android (WebView)',
    bundle: 'static',
    instructions: 'استخدم WebView لتحميل dist/ — أو غلّفه بـ Capacitor/Cordova',
  },
  node: {
    name: 'Node.js',
    bundle: 'node',
    instructions: 'node server.mjs',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6) UNIVERSAL SERVER — يعمل على كل المنصات
// ─────────────────────────────────────────────────────────────────────────────

/**
 * createUniversalServer — ينشئ خادم HTTP يعمل على المنصة الحالية
 * نفس الكود يخدم Cloudflare/Vercel/Deno/Node
 */
export function createUniversalServer(handler) {
  switch (platform) {
    case 'cloudflare':
      return {
        fetch: async (request, env, ctx) => {
          const req = parseRequest(request);
          const res = await handler(req);
          if (res instanceof Response) return res;
          return response(res.body, { status: res.status, headers: res.headers });
        },
      };

    case 'vercel':
      return async (request) => {
        const req = parseRequest(request);
        const res = await handler(req);
        if (res instanceof Response) return res;
        return response(res.body, { status: res.status, headers: res.headers });
      };

    case 'deno':
      return Deno.serve(async (request) => {
        const req = parseRequest(request);
        const res = await handler(req);
        if (res instanceof Response) return res;
        return response(res.body, { status: res.status, headers: res.headers });
      });

    case 'node':
    default: {
      // Node.js — استخدم http module
      const http = createHttpNode(handler);
      return { listen: (port) => http.listen(port) };
    }
  }
}

function createHttpNode(handler) {
  // تأجيل الاستيراد
  try {
    const { createServer } = require('node:http');
    return createServer(async (req, res) => {
      const parsed = parseRequest(req);
      const result = await handler(parsed);
      res.writeHead(result.status || 200, result.headers || {});
      res.end(result.body);
    });
  } catch {
    throw new Error('HTTP server غير متاح على هذه المنصة');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) BUILD TARGETS — لكل منصة
// ─────────────────────────────────────────────────────────────────────────────

export function getBuildConfig(target) {
  const configs = {
    browser: {
      entry: 'index.html',
      output: 'dist/',
      format: 'esm',
      minify: true,
      sourcemap: false,
    },
    cloudflare: {
      entry: 'worker.js',
      output: 'dist/',
      format: 'esm',
      minify: true,
      target: 'workers',
    },
    vercel: {
      entry: 'index.js',
      output: 'dist/',
      format: 'esm',
      minify: true,
      target: 'edge',
    },
    deno: {
      entry: 'server.ts',
      output: 'dist/',
      format: 'esm',
      minify: true,
    },
    node: {
      entry: 'server.mjs',
      output: 'dist/',
      format: 'esm',
      minify: false,
    },
    native: {
      entry: 'index.html',
      output: 'dist/',
      format: 'static',
      minify: true,
    },
  };
  return configs[target] || configs.browser;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) NATIVE BRIDGE — لـ iOS/Android
// ─────────────────────────────────────────────────────────────────────────────

export const nativeBridge = {
  /**
   * يفتح كاميرا الجهاز (iOS/Android)
   */
  async openCamera() {
    if (platform === 'browser') {
      // استخدم getUserMedia
      return await navigator.mediaDevices.getUserMedia({ video: true });
    }
    if (platform === 'native') {
      // استخدم React Native bridge
      return await NativeModules?.Camera?.open();
    }
    throw new Error('الكاميرا غير مدعومة على ' + platform);
  },

  /**
   * يفتح GPS
   */
  async getLocation() {
    if (platform === 'browser' || platform === 'native') {
      return await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
    }
    throw new Error('GPS غير مدعوم على ' + platform);
  },

  /**
   * اهتزاز الجهاز
   */
  vibrate(duration = 200) {
    if (platform === 'browser' && navigator.vibrate) {
      navigator.vibrate(duration);
    } else if (platform === 'native') {
      NativeModules?.Vibration?.vibrate(duration);
    }
  },

  /**
   * يفتح رابط خارجي
   */
  openURL(url) {
    if (platform === 'browser') {
      window.open(url, '_blank');
    } else if (platform === 'native') {
      NativeModules?.Linking?.openURL(url);
    }
  },

  /**
   * نسخ للحافظة
   */
  async copy(text) {
    if (platform === 'browser') {
      await navigator.clipboard.writeText(text);
    } else if (platform === 'native') {
      NativeModules?.Clipboard?.setString(text);
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 9) PLATFORM INFO
// ─────────────────────────────────────────────────────────────────────────────

export function getPlatformInfo() {
  return {
    platform,
    target: deployTargets[platform],
    supportsWebSocket: typeof WebSocket !== 'undefined' || platform === 'node',
    supportsFS: platform === 'node' || platform === 'deno',
    supportsKV: platform !== 'unknown',
    isEdge: platform === 'cloudflare' || platform === 'vercel',
    isBrowser: platform === 'browser',
    isNative: platform === 'native',
    isServer: platform === 'node' || platform === 'deno',
  };
}

export default {
  platform,
  kv,
  fs,
  env,
  fetcher,
  createWebSocket,
  response,
  parseRequest,
  createUniversalServer,
  deployTargets,
  getBuildConfig,
  nativeBridge,
  getPlatformInfo,
};
