/**
 * Elmoorx v4 — Cache Layer (LRU + TTL، بدون تبعيات)
 * =================================================
 * طبقة تخزين مؤقت للـ SSR responses, API results, computed values.
 *
 * المميزات:
 *   - LRU eviction (يحذف الأقل استخداماً عند امتلاء الـ cache)
 *   - TTL تلقائي (ينتهي بعد فترة محددة)
 *   - خيط آمن (async-safe عبر Map iteration)
 *   - إحصائيات (hits, misses, size)
 *   - دعم tags للـ invalidation الجماعية
 *
 * الاستخدام:
 *   import { createCache } from './cache.mjs';
 *   const cache = createCache({ max: 1000, ttl: 60000 });
 *   cache.set('user:123', user);
 *   const user = cache.get('user:123');
 *   cache.invalidateTag('users');
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) CACHE CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class Cache {
  constructor(options = {}) {
    this.max = options.max || 1000;            // أقصى عدد عناصر
    this.ttl = options.ttl || 60000;           // TTL افتراضي (ms)
    this.cleanupInterval = options.cleanupInterval || 60000; // تنظيف دوري
    this.maxSize = options.maxSize || 0;       // أقصى حجم بالبايت (0 = بلا حد)

    this.store = new Map();          // key → entry
    this.tags = new Map();           // tag → Set<key>
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expired: 0,
    };
    this.totalBytes = 0;

    // ابدأ cleanup دوري
    if (this.cleanupInterval > 0) {
      this._cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
      this._cleanupTimer.unref?.();
    }
  }

  /**
   * يضع قيمة في الـ cache
   * @param {string} key
   * @param {any} value
   * @param {object} options  { ttl, tags }
   */
  set(key, value, options = {}) {
    const ttl = options.ttl || this.ttl;
    const tags = options.tags || [];
    const expires = ttl > 0 ? Date.now() + ttl : 0;
    const size = this._estimateSize(value);

    // احذف القديم إن وُجد
    if (this.store.has(key)) {
      this._removeEntry(key);
    }

    // LRU eviction: احذف الأقل استخداماً حتى نسع
    while (this.store.size >= this.max) {
      this._evictLRU();
    }

    // الحد الأقصى بالبايت
    if (this.maxSize > 0) {
      while (this.totalBytes + size > this.maxSize && this.store.size > 0) {
        this._evictLRU();
      }
    }

    const entry = {
      value,
      expires,
      size,
      tags: new Set(tags),
      lastAccessed: Date.now(),
      accessCount: 0,
    };

    this.store.set(key, entry);
    this.totalBytes += size;
    this.stats.sets++;

    // سجّل tags
    for (const tag of tags) {
      if (!this.tags.has(tag)) this.tags.set(tag, new Set());
      this.tags.get(tag).add(key);
    }

    return value;
  }

  /**
   * يُرجع قيمة من الـ cache
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // تحقق من الانتهاء
    if (entry.expires > 0 && entry.expires < Date.now()) {
      this._removeEntry(key);
      this.stats.expired++;
      this.stats.misses++;
      return undefined;
    }

    // حدّث access info
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    // حرّك لنهاية الـ Map (LRU)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  /**
   * يُرجع قيمة أو يحسبها إن لم تكن موجودة
   */
  async getOrSet(key, factory, options = {}) {
    const existing = this.get(key);
    if (existing !== undefined) return existing;

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * يتحقق من وجود key (دون تحديث access time)
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expires > 0 && entry.expires < Date.now()) {
      this._removeEntry(key);
      this.stats.expired++;
      return false;
    }
    return true;
  }

  /**
   * يحذف key
   */
  delete(key) {
    if (this.store.has(key)) {
      this._removeEntry(key);
      this.stats.deletes++;
      return true;
    }
    return false;
  }

  /**
   * يُبطّل كل الـ entries بعلامة معيّنة
   */
  invalidateTag(tag) {
    const keys = this.tags.get(tag);
    if (!keys) return 0;
    const count = keys.size;
    for (const key of [...keys]) {
      this._removeEntry(key);
    }
    this.tags.delete(tag);
    return count;
  }

  /**
   * يُبطّل عدة tags
   */
  invalidateTags(tags) {
    let total = 0;
    for (const tag of tags) {
      total += this.invalidateTag(tag);
    }
    return total;
  }

  /**
   * يُفرّغ الـ cache بالكامل
   */
  clear() {
    this.store.clear();
    this.tags.clear();
    this.totalBytes = 0;
  }

  /**
   * ينظّف الـ entries المنتهية
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store) {
      if (entry.expires > 0 && entry.expires < now) {
        this._removeEntry(key);
        cleaned++;
        this.stats.expired++;
      }
    }
    return cleaned;
  }

  /**
   * يُرجع إحصائيات الـ cache
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.store.size,
      totalBytes: this.totalBytes,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      tagCount: this.tags.size,
    };
  }

  /**
   * يُنهي الـ cache (يوقف الـ cleanup timer)
   */
  destroy() {
    if (this._cleanupTimer) clearInterval(this._cleanupTimer);
    this.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────────────────

  _removeEntry(key) {
    const entry = this.store.get(key);
    if (!entry) return;
    this.store.delete(key);
    this.totalBytes -= entry.size;
    // أزل من tags
    for (const tag of entry.tags) {
      const tagged = this.tags.get(tag);
      if (tagged) {
        tagged.delete(key);
        if (tagged.size === 0) this.tags.delete(tag);
      }
    }
  }

  _evictLRU() {
    // أول عنصر في الـ Map هو الأقل استخداماً (Map يحافظ على ترتيب الإدراج)
    const oldestKey = this.store.keys().next().value;
    if (oldestKey) {
      this._removeEntry(oldestKey);
      this.stats.evictions++;
    }
  }

  _estimateSize(value) {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return Buffer.byteLength(str, 'utf8');
    } catch {
      return 1024; // تقدير افتراضي
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) CACHE MIDDLEWARE (HTTP response caching)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ميدلوير لتخزين استجابات HTTP في cache
 * يخزّن فقط GET requests الناجحة (200 OK)
 *
 * @param {object} options  { ttl, max, key, skip, tags }
 */
export function cacheMiddleware(cache, options = {}) {
  const {
    ttl = 60000,
    key = (ctx) => ctx.req.method + ':' + ctx.url.pathname + ctx.url.search,
    skip = (ctx) => ctx.req.method !== 'GET',
    tags = [],
  } = options;

  return async (ctx) => {
    if (skip(ctx)) return true;

    const cacheKey = key(ctx);
    const cached = cache.get(cacheKey);

    if (cached) {
      // استجابة من الـ cache
      const { status, headers, body } = cached;
      ctx.res.writeHead(status, {
        ...headers,
        'X-Cache': 'HIT',
        'X-Cache-Key': cacheKey.slice(0, 50),
      });
      ctx.res.end(body);
      return false; // أوقف سلسلة الميدلوير
    }

    // التفاف على res.write/end لجمع الاستجابة
    const chunks = [];
    const originalWrite = ctx.res.write.bind(ctx.res);
    const originalEnd = ctx.res.end.bind(ctx.res);
    const originalWriteHead = ctx.res.writeHead.bind(ctx.res);

    ctx.res.writeHead = (status, headers) => {
      ctx.res._cacheStatus = status;
      ctx.res._cacheHeaders = headers || {};
      return originalWriteHead(status, headers);
    };

    ctx.res.write = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };

    ctx.res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const body = Buffer.concat(chunks);

      // خزّن في cache فقط لو كان 200
      if (ctx.res._cacheStatus === 200) {
        cache.set(cacheKey, {
          status: ctx.res._cacheStatus,
          headers: ctx.res._cacheHeaders,
          body,
        }, { ttl, tags: [...tags, 'http'] });
      }

      // أرسل الاستجابة الفعلية
      ctx.res.setHeader('X-Cache', 'MISS');
      originalWrite(body);
      return originalEnd();
    };

    return true;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُنشئ cache جديدة
 */
export function createCache(options = {}) {
  return new Cache(options);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) GLOBAL DEFAULT CACHE
// ─────────────────────────────────────────────────────────────────────────────

let defaultCache = null;

export function getDefaultCache() {
  if (!defaultCache) {
    defaultCache = createCache({ max: 5000, ttl: 5 * 60 * 1000 });
  }
  return defaultCache;
}

export default {
  Cache,
  createCache,
  cacheMiddleware,
  getDefaultCache,
};
