/**
 * Elmoorx v4 — Utilities
 * ========================
 * أدوات مساعدة شاملة بدون تبعيات:
 *   - Date utilities (formatting, parsing, manipulation)
 *   - String utilities (slugify, camelCase, template, etc)
 *   - Number utilities (currency, percentage, ordinal)
 *   - Array utilities (chunk, unique, group, sort, etc)
 *   - Object utilities (deep clone, merge, path get/set)
 *   - File utilities (size format, download, etc)
 *   - URL utilities
 *   - Color utilities (hex/rgb/hsl conversion)
 *   - Random utilities (id, color, pick)
 *   - Async utilities (debounce, throttle, sleep, retry)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) DATE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const date = {
  /**
   * ينسّق التاريخ
   * format(date, 'YYYY-MM-DD HH:mm:ss')
   */
  format(d, format = 'YYYY-MM-DD') {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return '';

    const pad = (n) => String(n).padStart(2, '0');
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // ترتيب الاستبدال مهم: الطويلة أولاً
    return format
      .replace(/YYYY/g, date.getFullYear())
      .replace(/YY/g, String(date.getFullYear()).slice(-2))
      .replace(/MMMM/g, months[date.getMonth()])
      .replace(/MM/g, pad(date.getMonth() + 1))
      .replace(/dddd/g, days[date.getDay()])
      .replace(/DD/g, pad(date.getDate()))
      .replace(/D/g, date.getDate())
      .replace(/HH/g, pad(date.getHours()))
      .replace(/H/g, date.getHours())
      .replace(/mm/g, pad(date.getMinutes()))
      .replace(/ss/g, pad(date.getSeconds()))
      .replace(/A/g, date.getHours() >= 12 ? 'PM' : 'AM')
      .replace(/a/g, date.getHours() >= 12 ? 'pm' : 'am');
  },

  /**
   * يحسب الفرق بين تاريخين
   */
  diff(a, b, unit = 'days') {
    const d1 = a instanceof Date ? a : new Date(a);
    const d2 = b instanceof Date ? b : new Date(b);
    const ms = Math.abs(d2 - d1);
    const units = {
      seconds: 1000,
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
      weeks: 7 * 24 * 60 * 60 * 1000,
      months: 30 * 24 * 60 * 60 * 1000,
      years: 365 * 24 * 60 * 60 * 1000,
    };
    return Math.floor(ms / (units[unit] || 1));
  },

  /**
   * يضيف فترة للتاريخ
   */
  add(d, amount, unit = 'days') {
    const date = d instanceof Date ? new Date(d) : new Date(d);
    switch (unit) {
      case 'seconds': date.setSeconds(date.getSeconds() + amount); break;
      case 'minutes': date.setMinutes(date.getMinutes() + amount); break;
      case 'hours': date.setHours(date.getHours() + amount); break;
      case 'days': date.setDate(date.getDate() + amount); break;
      case 'weeks': date.setDate(date.getDate() + amount * 7); break;
      case 'months': date.setMonth(date.getMonth() + amount); break;
      case 'years': date.setFullYear(date.getFullYear() + amount); break;
    }
    return date;
  },

  /**
   * يتحقق إذا كان التاريخ اليوم
   */
  isToday(d) {
    const date = d instanceof Date ? d : new Date(d);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  },

  /**
   * الوقت النسبي (منذ X)
   */
  fromNow(d) {
    const date = d instanceof Date ? d : new Date(d);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    if (seconds < 604800) return `منذ ${Math.floor(seconds / 86400)} يوم`;
    if (seconds < 2592000) return `منذ ${Math.floor(seconds / 604800)} أسبوع`;
    if (seconds < 31536000) return `منذ ${Math.floor(seconds / 2592000)} شهر`;
    return `منذ ${Math.floor(seconds / 31536000)} سنة`;
  },

  /**
   * هل التاريخ في المستقبل
   */
  isFuture(d) {
    return new Date(d).getTime() > Date.now();
  },

  /**
   * هل التاريخ في الماضي
   */
  isPast(d) {
    return new Date(d).getTime() < Date.now();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2) STRING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const string = {
  slugify(str) {
    return String(str)
      .trim()
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  camelCase(str) {
    // قسّم على [-_\s] ثم ادمج مع تكبير الحرف الأول لكل كلمة ما عدا الأولى
    return str
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  },

  pascalCase(str) {
    const camel = string.camelCase(str);
    return camel.charAt(0).toUpperCase() + camel.slice(1);
  },

  kebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(w => w.toLowerCase())
      .join('-');
  },

  snakeCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map(w => w.toLowerCase())
      .join('_');
  },

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  truncate(str, length = 50, suffix = '...') {
    if (str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
  },

  template(str, data) {
    return str.replace(/\{(\w+(?:\.\w+)*)\}/g, (_, path) => {
      return path.split('.').reduce((obj, key) => obj?.[key] ?? '', data) ?? '';
    });
  },

  /**
   * يبرز النص المطابق
   */
  highlight(text, query, tag = 'mark') {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, `<${tag}>$1</${tag}>`);
  },

  /**
   * يحسب كلمات النص
   */
  wordCount(str) {
    return str.trim().split(/\s+/).filter(Boolean).length;
  },

  /**
   * يقدّر زمن القراءة (دقائق)
   */
  readingTime(str, wpm = 200) {
    return Math.ceil(string.wordCount(str) / wpm);
  },

  /**
   * عكسي عربي/إنجليزي
   */
  reverse(str) {
    return str.split('').reverse().join('');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3) NUMBER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const number = {
  format(n, options = {}) {
    return new Intl.NumberFormat(options.locale || 'en-US', options).format(n);
  },

  currency(n, currency = 'USD', options = {}) {
    return new Intl.NumberFormat(options.locale || 'en-US', {
      style: 'currency',
      currency,
      ...options,
    }).format(n);
  },

  percentage(n, total, decimals = 1) {
    if (!total) return '0%';
    return ((n / total) * 100).toFixed(decimals) + '%';
  },

  ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  },

  clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  },

  random(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * يحوّل البايتات لوحدة مقروءة
   */
  bytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  },

  /**
   * تقريب رقم
   */
  round(n, decimals = 0) {
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4) ARRAY UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const array = {
  chunk(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  },

  unique(arr, key) {
    if (key) {
      const seen = new Set();
      return arr.filter(item => {
        const value = typeof key === 'function' ? key(item) : item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
      });
    }
    return [...new Set(arr)];
  },

  group(arr, keyFn) {
    return arr.reduce((groups, item) => {
      const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
      (groups[key] = groups[key] || []).push(item);
      return groups;
    }, {});
  },

  sortBy(arr, key, direction = 'asc') {
    const sorted = [...arr].sort((a, b) => {
      const av = typeof key === 'function' ? key(a) : a[key];
      const bv = typeof key === 'function' ? key(b) : b[key];
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return direction === 'desc' ? sorted.reverse() : sorted;
  },

  flatten(arr, depth = Infinity) {
    return arr.flat(depth);
  },

  range(start, end, step = 1) {
    const result = [];
    if (end === undefined) {
      end = start;
      start = 0;
    }
    for (let i = start; i < end; i += step) result.push(i);
    return result;
  },

  shuffle(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  sample(arr, n = 1) {
    const shuffled = array.shuffle(arr);
    return n === 1 ? shuffled[0] : shuffled.slice(0, n);
  },

  /**
   * يبني شجرة من قائمة مسطحة
   */
  buildTree(arr, idKey = 'id', parentKey = 'parentId', childrenKey = 'children') {
    const map = new Map(arr.map(item => [item[idKey], { ...item, [childrenKey]: [] }]));
    const roots = [];
    for (const item of map.values()) {
      if (item[parentKey] && map.has(item[parentKey])) {
        map.get(item[parentKey])[childrenKey].push(item);
      } else {
        roots.push(item);
      }
    }
    return roots;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5) OBJECT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const object = {
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  },

  deepMerge(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    if (object.isObject(target) && object.isObject(source)) {
      for (const key in source) {
        if (object.isObject(source[key])) {
          if (!target[key]) target[key] = {};
          object.deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
    return object.deepMerge(target, ...sources);
  },

  isObject(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj);
  },

  /**
   * يحصل على قيمة من مسار 'a.b.c'
   */
  get(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result == null) return defaultValue;
      result = result[key];
    }
    return result === undefined ? defaultValue : result;
  },

  /**
   * يضع قيمة في مسار 'a.b.c'
   */
  set(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
  },

  /**
   * يتحقق من العمق
   */
  deepEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null) return false;
    if (typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => object.deepEqual(v, b[i]));
    }
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => object.deepEqual(a[k], b[k]));
  },

  /**
   * يحذف مفاتيح
   */
  omit(obj, keys) {
    const result = { ...obj };
    for (const k of keys) delete result[k];
    return result;
  },

  /**
   * يختار مفاتيح
   */
  pick(obj, keys) {
    const result = {};
    for (const k of keys) if (k in obj) result[k] = obj[k];
    return result;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6) COLOR UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const color = {
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : null;
  },

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  },

  /**
   * يفتح أو يغمّق اللون
   */
  shade(hex, percent) {
    const rgb = color.hexToRgb(hex);
    if (!rgb) return hex;
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const r = Math.round((t - rgb.r) * p + rgb.r);
    const g = Math.round((t - rgb.g) * p + rgb.g);
    const b = Math.round((t - rgb.b) * p + rgb.b);
    return color.rgbToHex(r, g, b);
  },

  random() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 7) ASYNC UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const async_ = {
  debounce(fn, delay = 300) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  throttle(fn, limit = 300) {
    let inThrottle = false;
    let lastArgs = null;
    return function (...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
          if (lastArgs) {
            fn.apply(this, lastArgs);
            lastArgs = null;
          }
        }, limit);
      } else {
        lastArgs = args;
      }
    };
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * يعيد المحاولة عند الفشل
   */
  async retry(fn, retries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn(i);
      } catch (err) {
        lastError = err;
        if (i < retries - 1) await async_.sleep(delay * (i + 1));
      }
    }
    throw lastError;
  },

  /**
   * timeout للـ promise
   */
  timeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
    ]);
  },

  /**
   * يقسم المصفوفة إلى chunks وينفّذها بالتوازي
   */
  async parallel(tasks, concurrency = 5) {
    const results = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
      const chunk = tasks.slice(i, i + concurrency);
      results.push(...await Promise.all(chunk.map(t => t())));
    }
    return results;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 8) FILE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const file = {
  /**
   * يحوّل حجم الملف لصيغة مقروءة
   */
  size(bytes) {
    return number.bytes(bytes);
  },

  /**
   * يحوّل ملف لـ base64
   */
  toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  /**
   * ينزل ملف
   */
  download(content, filename, type = 'text/plain') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * يحصل على امتداد الملف
   */
  ext(filename) {
    return filename.split('.').pop().toLowerCase();
  },

  /**
   * يتحقق من نوع الصورة
   */
  isImage(filename) {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(file.ext(filename));
  },

  /**
   * يتحقق من نوع الفيديو
   */
  isVideo(filename) {
    return ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv'].includes(file.ext(filename));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 9) URL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export const url = {
  /**
   * يحلل query string
   */
  parseQuery(queryString) {
    const params = {};
    const search = queryString.startsWith('?') ? queryString.slice(1) : queryString;
    for (const pair of search.split('&')) {
      const [key, value] = pair.split('=').map(decodeURIComponent);
      if (key) params[key] = value ?? '';
    }
    return params;
  },

  /**
   * يبني query string
   */
  buildQuery(params) {
    return Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
  },

  /**
   * يدمج URL مع params
   */
  buildUrl(base, params = {}) {
    const query = url.buildQuery(params);
    if (!query) return base;
    return base + (base.includes('?') ? '&' : '?') + query;
  },

  /**
   * يتحقق من صحة URL
   */
  isValid(u) {
    try { new URL(u); return true; } catch { return false; }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 10) RANDOM
// ─────────────────────────────────────────────────────────────────────────────

export const random = {
  id(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  },

  uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  color() { return color.random(); },
  int(min, max) { return number.random(min, max); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  boolean() { return Math.random() < 0.5; },
};

// ─────────────────────────────────────────────────────────────────────────────
// 11) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  date, string, number, array, object,
  color, async_, file, url, random,
};
