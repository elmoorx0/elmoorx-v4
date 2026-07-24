/**
 * Elmoorx v4 — PWA (Progressive Web App) Support
 * =================================================
 * دعم PWA متكامل:
 *   - Service Worker generation
 *   - Manifest.json
 *   - Offline caching
 *   - Background sync
 *   - Push notifications
 *   - Install prompt
 *   - Update detection
 */

import { writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) MANIFEST GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function generateManifest(options = {}) {
  const {
    name = 'Elmoorx App',
    shortName = name.slice(0, 12),
    description = 'تطبيق مبني بـ Elmoorx v4',
    lang = 'ar',
    dir = 'rtl',
    startUrl = '/',
    display = 'standalone',
    backgroundColor = '#0f172a',
    themeColor = '#0ea5e9',
    icons = [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts = [],
    categories = ['productivity'],
  } = options;

  return {
    name,
    short_name: shortName,
    description,
    lang,
    dir,
    start_url: startUrl,
    display,
    background_color: backgroundColor,
    theme_color: themeColor,
    icons,
    shortcuts,
    categories,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SERVICE WORKER GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function generateServiceWorker(options = {}) {
  const {
    cacheName = 'elmoorx-v4-cache-v1',
    precache = ['/', '/index.html', '/runtime/core.mjs'],
    runtimeCaching = [
      {
        pattern: '/runtime/',
        strategy: 'cache-first',
        maxEntries: 50,
      },
      {
        pattern: '/src/',
        strategy: 'network-first',
        maxEntries: 100,
      },
      {
        pattern: /^https:\/\/.+\.(png|jpg|jpeg|gif|svg|webp)$/,
        strategy: 'cache-first',
        maxEntries: 60,
        maxAgeSeconds: 86400 * 30,
      },
    ],
  } = options;

  return `
// Elmoorx v4 Service Worker (مُولّد تلقائياً)
const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE = ${JSON.stringify(precache)};

// تثبيت — cache الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// تفعيل — نظف الـ caches القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// استراتيجيات الـ caching
const strategies = ${JSON.stringify(runtimeCaching)};

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // تخطّي non-GET
  if (event.request.method !== 'GET') return;

  // ابحث عن استراتيجية مطابقة
  const strategy = strategies.find((s) => {
    if (typeof s.pattern === 'string') return url.pathname.startsWith(s.pattern);
    if (s.pattern instanceof RegExp) return s.pattern.test(url.pathname);
    return false;
  });

  if (!strategy) {
    // default: network-first
    event.respondWith(networkFirst(event.request));
    return;
  }

  switch (strategy.strategy) {
    case 'cache-first':
      event.respondWith(cacheFirst(event.request, strategy));
      break;
    case 'network-first':
      event.respondWith(networkFirst(event.request, strategy));
      break;
    case 'stale-while-revalidate':
      event.respondWith(staleWhileRevalidate(event.request, strategy));
      break;
    default:
      event.respondWith(networkFirst(event.request));
  }
});

async function cacheFirst(request, strategy) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, strategy) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request, strategy) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

// رسائل من الصفحة
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '${cacheName}' });
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'إشعار', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      data: data.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'elmoorx-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // TODO: sync queued requests
  const cache = await caches.open('elmoorx-queue');
  // process queue...
}
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) CLIENT-SIDE PWA API
// ─────────────────────────────────────────────────────────────────────────────

export class PWA {
  constructor() {
    this.deferredPrompt = null;
    this.installed = false;
    this.updateAvailable = false;
    this.registration = null;
  }

  async init() {
    if (typeof window === 'undefined') return;

    // سجّل service worker
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('%c✦ Service Worker مُسجّل', 'color:#10b981;');

        // تحقق من التحديثات
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          this.updateAvailable = true;
          window.location.reload();
        });
      } catch (err) {
        console.warn('فشل تسجيل Service Worker:', err);
      }
    }

    // install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('%c✦ PWA: يمكن التثبيت', 'color:#10b981;');
    });

    window.addEventListener('appinstalled', () => {
      this.installed = true;
      this.deferredPrompt = null;
      console.log('%c✦ PWA: تم التثبيت', 'color:#10b981;');
    });
  }

  /**
   * يطلب تثبيت PWA
   */
  async promptInstall() {
    if (!this.deferredPrompt) return false;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    return outcome === 'accepted';
  }

  /**
   * يطلب إذن الإشعارات
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * يرسل إشعار محلي
   */
  async showNotification(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (this.registration) {
      await this.registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  }

  /**
   * يشترك في push notifications
   */
  async subscribePush(vapidPublicKey) {
    if (!this.registration) return null;
    const subscription = await this.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return subscription;
  }

  /**
   * يتحقق من التحديثات
   */
  async checkForUpdates() {
    if (!this.registration) return;
    await this.registration.update();
  }

  /**
   * يقوم بتطبيق التحديث
   */
  applyUpdate() {
    if (this.registration?.waiting) {
      this.registration.waiting.postMessage('SKIP_WAITING');
    }
  }

  /**
   * حالة الاتصال
   */
  isOnline() {
    return navigator.onLine;
  }

  /**
   * يستمع لتغيّر الاتصال
   */
  onConnectionChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) BUILD HELPER — يكتب ملفات PWA لمجلد dist
// ─────────────────────────────────────────────────────────────────────────────

export function buildPWAFiles(outDir, options = {}) {
  // manifest.json
  const manifest = generateManifest(options);
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // sw.js
  const sw = generateServiceWorker(options);
  writeFileSync(join(outDir, 'sw.js'), sw);

  // أيقونة placeholder (SVG)
  if (!existsSync(join(outDir, 'icon-192.png'))) {
    writeFileSync(join(outDir, 'icon.svg'), generateIconSVG(manifest.theme_color));
  }

  console.log(`  ✓ PWA: manifest.json + sw.js`);
  return manifest;
}

function generateIconSVG(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${color}" rx="80"/>
  <text x="256" y="320" font-size="280" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">✦</text>
</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

let pwaInstance = null;

export function usePWA() {
  if (!pwaInstance) {
    pwaInstance = new PWA();
    pwaInstance.init();
  }
  return pwaInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  PWA,
  generateManifest,
  generateServiceWorker,
  buildPWAFiles,
  usePWA,
};
