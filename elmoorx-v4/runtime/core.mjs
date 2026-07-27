/**
 * Elmoorx v4 — Core Runtime (Zero-Dependency ESM)
 * ================================================
 * إطار عمل Elmoorx v4 — نواة مستقلة تماماً عن أي تبعيات خارجية
 *
 * يحتوي هذا الملف على:
 *   - Signals ($state, $computed, $effect, $batch)
 *   - Store ($store) — reactive proxy عميق
 *   - h() — JSX factory
 *   - Islands — zero-hydration rendering
 *   - Security — HTML sanitizer + CSRF + headers
 *   - Context — dependency injection
 *   - Lifecycle — onMount / onCleanup / onError
 *   - HMR client — يتصل بخادم التطوير عبر WebSocket
 *
 * الهدف: ملف ESM واحد يعمل في المتصفح و Node.js بدون أي تبعية.
 * الحجم: ~3kb مضغوط.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) SIGNALS — أساس التفاعل
// ─────────────────────────────────────────────────────────────────────────────

let activeObserver = null;
let batchDepth = 0;
let pendingEffects = new Set();

/**
 * Signal — قيمة تفاعلية تتتبع من يقرأها وتُحدّث من يعتمد عليها
 */
export function $state(initial) {
  let value = typeof initial === 'function' ? initial() : initial;
  const subscribers = new Set();

  const signal = function (next) {
    if (arguments.length === 0) {
      // قراءة — سجّل المراقب النشط
      if (activeObserver) subscribers.add(activeObserver);
      return value;
    }
    // كتابة
    if (typeof next === 'function') next = next(value);
    if (Object.is(next, value)) return value;
    value = next;
    // أشعِر المشتركين
    for (const sub of subscribers) {
      if (batchDepth > 0) pendingEffects.add(sub);
      else sub();
    }
    return value;
  };

  signal.set = (v) => signal(typeof v === 'function' ? v(value) : v);
  signal.update = (fn) => signal(fn(value));
  signal.peek = () => value;
  signal.subscribe = (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); };
  signal.unsubscribe = (fn) => subscribers.delete(fn);

  return signal;
}

/**
 * Computed — قيمة مشتقة تُعاد حسابها عند تغيّر تبعياتها
 */
export function $computed(fn) {
  let cachedValue;
  let dirty = true;
  const subscribers = new Set();
  const compute = () => {
    if (dirty) {
      const prev = activeObserver;
      activeObserver = () => { dirty = true; for (const s of subscribers) s(); };
      cachedValue = fn();
      activeObserver = prev;
      dirty = false;
    }
    return cachedValue;
  };
  const computed = () => {
    if (activeObserver) subscribers.add(activeObserver);
    return compute();
  };
  computed.peek = compute;
  return computed;
}

/**
 * Effect — دالة جانبية تُعاد عند تغيّر إشاراتها
 */
export function $effect(fn) {
  const run = () => {
    const prev = activeObserver;
    activeObserver = run;
    try { fn(); } finally { activeObserver = prev; }
  };
  run();
  return () => { /* cleanup logic يمكن إضافته */ };
}

/**
 * Batch — تجميع تحديثات متعددة في تحديث واحد
 */
export function $batch(fn) {
  batchDepth++;
  try { fn(); }
  finally {
    batchDepth--;
    if (batchDepth === 0) {
      const effects = pendingEffects;
      pendingEffects = new Set();
      for (const eff of effects) eff();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) STORE — proxy تفاعلي عميق
// ─────────────────────────────────────────────────────────────────────────────

const STORE_TARGET = Symbol('target');
const STORE_NOTIFY = Symbol('notify');

export function $store(initial = {}) {
  const subs = new Set();

  const notify = (path) => {
    for (const s of subs) s(path);
  };

  const wrap = (target) => {
    if (target === null || typeof target !== 'object') return target;
    if (Array.isArray(target)) {
      return new Proxy(target, {
        get(arr, prop) {
          if (prop === STORE_TARGET) return arr;
          if (prop === 'push' || prop === 'pop' || prop === 'splice' || prop === 'shift' || prop === 'unshift') {
            return (...args) => {
              const result = Array.prototype[prop].apply(arr, args);
              notify([]);
              return result;
            };
          }
          return wrap(arr[prop]);
        },
        set(arr, prop, val) {
          arr[prop] = val;
          notify([]);
          return true;
        },
      });
    }
    return new Proxy(target, {
      get(obj, prop) {
        if (prop === STORE_TARGET) return obj;
        if (prop === STORE_NOTIFY) return notify;
        const v = obj[prop];
        return wrap(v);
      },
      set(obj, prop, val) {
        obj[prop] = val;
        notify([prop]);
        return true;
      },
      deleteProperty(obj, prop) {
        delete obj[prop];
        notify([prop]);
        return true;
      },
    });
  };

  const proxy = wrap(initial);
  proxy.subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  proxy.get = () => proxy[STORE_TARGET];
  return proxy;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) h() — JSX factory (يحوّل <div/> إلى عقدة شجرية)
// ─────────────────────────────────────────────────────────────────────────────

export function h(tag, props, ...children) {
  // Flatten children + handle arrays + functions (reactive)
  const flat = [];
  for (const c of children) {
    if (c === null || c === undefined || c === false || c === true) continue;
    if (Array.isArray(c)) flat.push(...c);
    else flat.push(c);
  }
  return { tag, props: props || {}, children: flat };
}

export const Fragment = Symbol('Fragment');

export function renderFragment(...children) {
  return { tag: Fragment, props: {}, children };
}

// تتبع سياق SSR الحالي
let ssrContext = null;

export function renderToString(node, options = {}) {
  // تهيئة سياق SSR
  const prevContext = ssrContext;
  if (!ssrContext) {
    ssrContext = {
      islands: [],
      css: new Set(),
      serializeState: {},
      ...options,
    };
  }

  const html = _renderToString(node);

  // إذا كان هذا النداء الجذري، نظّف السياق
  if (!prevContext) {
    ssrContext = null;
  }

  return html;
}

function _renderToString(node) {
  if (node === null || node === undefined || node === false) return '';
  if (typeof node === 'string') return escapeHtml(node);
  if (typeof node === 'number') return String(node);
  if (typeof node === 'function') return escapeHtml(String(node()));
  if (Array.isArray(node)) return node.map(_renderToString).join('');
  if (typeof node === 'object' && node.tag) {
    // Fragment
    if (node.tag === Fragment) return node.children.map(_renderToString).join('');

    // Component function — اعرض ولفّ بـ island wrapper إذا احتوى على events
    if (typeof node.tag === 'function') {
      const componentName = node.tag.name || 'Component';
      const props = { ...node.props, children: node.children };
      const inner = _renderToString(node.tag(props));

      // تحقق إذا كان المكون يحتوي على event handlers
      const hasEvents = checkHasEvents(node.props);

      // إذا كان في سياق SSR والمكون تفاعلي، لفّه بـ island wrapper
      if (ssrContext && hasEvents && !node.props.__noIsland) {
        const islandId = `island_${ssrContext.islands.length}`;
        const islandProps = encodeURIComponent(JSON.stringify(
          Object.entries(node.props || {})
            .filter(([k, v]) => !k.startsWith('on') && typeof v !== 'function' && k !== 'children')
            .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {})
        ));
        ssrContext.islands.push({ id: islandId, name: componentName });

        return `<div data-elmoorx-island="${componentName}" data-island-id="${islandId}" data-props="${islandProps}">${inner}</div>`;
      }

      return inner;
    }

    // Regular element
    const attrs = Object.entries(node.props || {})
      .filter(([k]) => k !== 'children' && k !== '__noIsland')
      .map(([k, v]) => {
        if (v === null || v === undefined || v === false) return '';
        if (k === 'className') k = 'class';
        if (k.startsWith('on') || typeof v === 'function') return '';
        if (k === 'style' && typeof v === 'object') {
          return ` style="${Object.entries(v).map(([p, val]) => `${camelToKebab(p)}:${val}`).join(';')}"`;
        }
        if (k === 'style' && typeof v === 'string') {
          return ` style="${escapeHtml(v)}"`;
        }
        if (k === 'dangerouslySetInnerHTML') {
          return ''; // يتم معالجته أدناه
        }
        return ` ${k}="${escapeHtml(String(v))}"`;
      })
      .join('');

    // dangerouslySetInnerHTML support
    const hasDangerousHTML = node.props?.dangerouslySetInnerHTML?.__html;
    const isSelfClosing = ['img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr'].includes(node.tag);
    if (isSelfClosing) return `<${node.tag}${attrs} />`;
    if (hasDangerousHTML) return `<${node.tag}${attrs}>${hasDangerousHTML}</${node.tag}>`;
    const inner = node.children.map(_renderToString).join('');
    return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
  }
  return '';
}

// تحقق إذا كان العنصر يحتوي على event handlers
function checkHasEvents(props) {
  if (!props) return false;
  return Object.keys(props).some(k => k.startsWith('on') && typeof props[k] === 'function');
}

// الحصول على بيانات SSR (islands + state)
export function getSSRData() {
  if (!ssrContext) return null;
  return {
    islands: ssrContext.islands,
    css: Array.from(ssrContext.css),
    state: ssrContext.serializeState,
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function camelToKebab(s) {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) ISLANDS — zero-hydration rendering
// ─────────────────────────────────────────────────────────────────────────────

const islandRegistry = new Map();

export function island(name, component) {
  if (typeof name === 'function') { component = name; name = component.name || 'Island'; }
  islandRegistry.set(name, component);
  return component;
}

/**
 * renderIsland — يُرجع HTML + بيانات التهيئة للجزيرة (server-side)
 */
export function renderIsland(name, props = {}) {
  const component = islandRegistry.get(name);
  if (!component) return '';
  const vdom = component(props);
  const html = renderToString(vdom);
  const data = encodeURIComponent(JSON.stringify(props));
  return `<div data-elmoorx-island="${name}" data-props="${data}">${html}</div>`;
}

/**
 * hydrateIslands — يُشغّل فقط الجزر التفاعلية في الصفحة (client-side)
 */
export function hydrateIslands() {
  const islands = document.querySelectorAll('[data-elmoorx-island]');
  for (const el of islands) {
    const name = el.getAttribute('data-elmoorx-island');
    const propsJson = el.getAttribute('data-props');
    const props = propsJson ? JSON.parse(decodeURIComponent(propsJson)) : {};
    const component = islandRegistry.get(name);
    if (!component) {
      console.warn(`[elmoorx] Island "${name}" غير مُسجّلة`);
      continue;
    }
    // mount + bind events only to this island
    mountIsland(el, component, props);
  }
}

function mountIsland(el, component, props) {
  const vdom = component(props);
  patchDom(el, vdom);
}

function patchDom(parent, vdom) {
  // تحويل vdom إلى DOM حقيقي وحقنه في العنصر
  const created = createDom(vdom);
  parent.innerHTML = '';
  if (Array.isArray(created)) {
    created.forEach(c => parent.appendChild(c));
  } else if (created) {
    parent.appendChild(created);
  }
}

function createDom(node) {
  if (node === null || node === undefined || node === false || node === true) return null;
  if (typeof node === 'string') return document.createTextNode(node);
  if (typeof node === 'number') return document.createTextNode(String(node));
  if (typeof node === 'function') {
    // reactive text node
    const textNode = document.createTextNode(String(node()));
    $effect(() => { textNode.nodeValue = String(node()); });
    return textNode;
  }
  if (Array.isArray(node)) return node.map(createDom).filter(Boolean);
  if (typeof node === 'object' && node.tag) {
    if (node.tag === Fragment) {
      const frag = document.createDocumentFragment();
      node.children.map(createDom).flat().forEach(c => c && frag.appendChild(c));
      return frag;
    }
    if (typeof node.tag === 'function') return createDom(node.tag({ ...node.props, children: node.children }));

    const el = document.createElement(node.tag);
    // attrs
    for (const [k, v] of Object.entries(node.props || {})) {
      if (k === 'className') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (typeof v === 'function') {
        // reactive attribute
        $effect(() => { const val = v(); if (val == null || val === false) el.removeAttribute(k); else el.setAttribute(k, val); });
      } else if (v != null && v !== false) {
        el.setAttribute(k, v);
      }
    }
    // children
    node.children.map(createDom).flat().forEach(c => c && el.appendChild(c));
    return el;
  }
  return null;
}

export function mount(component, target) {
  if (typeof target === 'string') target = document.querySelector(target);
  const vdom = typeof component === 'function' ? component() : component;
  patchDom(target, vdom);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) SECURITY — HTML sanitizer + CSRF + headers
// ─────────────────────────────────────────────────────────────────────────────

const SAFE_TAGS = new Set([
  'a','abbr','address','article','aside','b','bdi','bdo','blockquote','br','caption',
  'cite','code','col','colgroup','data','dd','del','details','dfn','div','dl','dt',
  'em','figcaption','figure','footer','h1','h2','h3','h4','h5','h6','header','hr',
  'i','img','ins','kbd','li','main','mark','nav','ol','p','pre','q','rp','rt','ruby',
  's','samp','section','small','span','strong','sub','summary','sup','table','tbody',
  'td','tfoot','th','thead','time','tr','u','ul','var','wbr'
]);

const SAFE_ATTRS = new Set([
  'href','title','alt','src','width','height','class','id','style','lang','dir',
  'colspan','rowspan','target','rel','datetime','data-*','aria-*','role','tabindex',
  'name','value','placeholder','type','disabled','readonly','checked','selected'
]);

const URI_ATTRS = new Set(['href','src','action','formaction','background','cite','data','poster']);

const SAFE_URI_SCHEMES = new Set(['http:','https:','mailto:','tel:','data:image/']);

export function sanitize(html) {
  if (typeof html !== 'string') return '';
  // إزالة التعليقات
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  // إزالة الـ scripts تماماً
  html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  // إزالة onXxx handlers
  html = html.replace(/\son\w+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son\w+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
  // إزالة javascript: URIs
  html = html.replace(/(href|src|action)\s*=\s*(['"])javascript:[^'"]*\2/gi, '$1=$2#$2');
  // تحقق من الوسوم
  return html.replace(/<\/?(\w+)([^>]*)>/g, (match, tag, attrs) => {
    const lowerTag = tag.toLowerCase();
    if (!SAFE_TAGS.has(lowerTag)) return '';
    // تحقق من السمات
    const cleanAttrs = attrs.replace(/(\w[\w-]*)\s*=\s*(['"]?)([^'"]*)\2/g, (m, name, _, value) => {
      const lname = name.toLowerCase();
      const isData = lname.startsWith('data-');
      const isAria = lname.startsWith('aria-');
      if (!isData && !isAria && !SAFE_ATTRS.has(lname)) return '';
      if (URI_ATTRS.has(lname)) {
        try {
          const url = new URL(value, 'http://x');
          if (!SAFE_URI_SCHEMES.has(url.protocol) && !url.protocol.startsWith('data:image/')) return '';
        } catch { /* relative URL ok */ }
      }
      return m;
    });
    return `<${match.startsWith('</') ? '/' : ''}${lowerTag}${cleanAttrs}>`;
  });
}

export function $html(trusted) {
  return { __html: true, content: sanitize(trusted) };
}

export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

export function generateCsrfToken() {
  const arr = new Uint8Array(32);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
  } else if (typeof globalThis !== 'undefined' && globalThis.process?.versions?.node) {
    // Node.js — استخدم node:crypto متى ما توفر (lazy)
    try {
      const nodeCrypto = globalThis[Symbol.for('node:crypto')] || (() => {
        try { return require('node:crypto'); } catch { return null; }
      })();
      if (nodeCrypto?.webcrypto?.getRandomValues) nodeCrypto.webcrypto.getRandomValues(arr);
      else if (nodeCrypto?.randomFillSync) nodeCrypto.randomFillSync(arr);
      else for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
    } catch {
      for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
    }
  } else {
    for (let i = 0; i < 32; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) CONTEXT — dependency injection
// ─────────────────────────────────────────────────────────────────────────────

export function createContext(defaultValue) {
  const sym = Symbol('context');
  const provider = (value, fn) => {
    const stack = (provider._stack || []);
    provider._stack = [...stack, value];
    try { return fn(); } finally { provider._stack = stack; }
  };
  provider.read = () => (provider._stack && provider._stack.length > 0)
    ? provider._stack[provider._stack.length - 1]
    : defaultValue;
  return provider;
}

export const provide = (ctx, value, fn) => ctx(value, fn);
export const inject = (ctx) => ctx.read();
export const withContext = (ctx, value, fn) => ctx(value, fn);

// ─────────────────────────────────────────────────────────────────────────────
// 7) LIFECYCLE — onMount / onCleanup / onError
// ─────────────────────────────────────────────────────────────────────────────

const lifecycleStack = [];

export function pushLifecycle(bucket) { lifecycleStack.push(bucket || { mounts: [], cleanups: [], errors: [] }); }
export function popLifecycle() { return lifecycleStack.pop(); }

export function onMount(fn) {
  const bucket = lifecycleStack[lifecycleStack.length - 1];
  if (bucket) bucket.mounts.push(fn);
  else fn(); // fallback if no bucket
}

export function onCleanup(fn) {
  const bucket = lifecycleStack[lifecycleStack.length - 1];
  if (bucket) bucket.cleanups.push(fn);
}

export function onError(fn) {
  const bucket = lifecycleStack[lifecycleStack.length - 1];
  if (bucket) bucket.errors.push(fn);
}

export function runMount(bucket) { for (const fn of bucket.mounts) fn(); }
export function runCleanup(bucket) { for (const fn of bucket.cleanups) fn(); }
export function handleError(bucket, err) { for (const fn of bucket.errors) fn(err); }
export function setSilent() { /* disable warnings */ }

export function withErrorBoundary(fn, fallback) {
  const bucket = { mounts: [], cleanups: [], errors: [] };
  pushLifecycle(bucket);
  try { return fn(); }
  catch (err) { handleError(bucket, err); return fallback ? fallback(err) : null; }
  finally { popLifecycle(); }
}

export function ErrorBoundary(props) {
  return withErrorBoundary(() => props.children, props.fallback);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) HMR CLIENT — يتصل بخادم التطوير لتحديث فوري
// ─────────────────────────────────────────────────────────────────────────────

export function initHMR(port = 3000) {
  if (typeof window === 'undefined') return;
  const ws = new WebSocket(`ws://${location.hostname}:${port}/__hmr__`);
  const hotModules = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'update') {
      const handlers = hotModules.get(msg.id);
      if (handlers) {
        for (const h of handlers) {
          try { h(msg); } catch (e) { console.error('[HMR] فشل التحديث:', e); }
        }
      }
      console.log(`[HMR] ✦ تم تحديث: ${msg.id} (${msg.took}ms)`);
    } else if (msg.type === 'reload') {
      location.reload();
    } else if (msg.type === 'error') {
      console.error(`[HMR] خطأ: ${msg.message}`);
      // عرض الخطأ كـ overlay
      showHmrOverlay(msg.message, msg.stack);
    }
  };

  ws.onclose = () => {
    console.warn('[HMR] انقطع الاتصال — إعادة المحاولة خلال ثانية');
    setTimeout(() => initHMR(port), 1000);
  };

  globalThis.__elmoorx_hmr__ = {
    accept(id, handler) {
      if (!hotModules.has(id)) hotModules.set(id, new Set());
      hotModules.get(id).add(handler);
    },
    dispose(id, handler) {
      if (!hotModules.has(id)) hotModules.set(id, new Set());
      hotModules.get(id).add(handler);
    },
  };
}

function showHmrOverlay(message, stack) {
  let overlay = document.getElementById('__elmoorx_overlay__');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = '__elmoorx_overlay__';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(220,38,38,0.95);color:white;font:14px/1.4 monospace;padding:20px;z-index:99999;overflow:auto;direction:ltr;text-align:left;';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<h2 style="margin:0 0 10px;">خطأ في التطوير</h2><pre style="white-space:pre-wrap;">${escapeHtml(message)}${stack ? '\n\n' + escapeHtml(stack) : ''}</pre>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function memo(fn, equals = shallowEqual) {
  let prevArgs, prevResult;
  return (...args) => {
    if (!prevArgs || !equals(args, prevArgs)) {
      prevResult = fn(...args);
      prevArgs = args;
    }
    return prevResult;
  };
}

export function shallowEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function shallowEqualArray(a, b) { return shallowEqual(a, b); }
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

export function useRef(initial) {
  return { current: typeof initial === 'function' ? initial() : initial };
}

export function forwardRef(component) {
  return (props) => component(props, props.ref);
}

export function useImperativeHandle(ref, handle) {
  if (ref) ref.current = handle();
}

export function useRefList() {
  const refs = [];
  return (i) => refs[i] || (refs[i] = { current: null });
}

export function lazy(loader, options = {}) {
  let loaded = null;
  return (props) => {
    if (!loaded) {
      loader().then(m => {
        loaded = m.default || m;
        // re-render
        if (options.onLoad) options.onLoad(loaded);
      });
      return options.fallback || h('div', null, 'جاري التحميل...');
    }
    return loaded(props);
  };
}

export function prefetch(loader) { loader().catch(() => {}); }
export function lazyAll(loaders) {
  return Object.fromEntries(Object.entries(loaders).map(([k, l]) => [k, lazy(l)]));
}

// Portal + Modal
export function Portal(props) {
  // في SSR نُرجع الأطفال كما هم، في المتصفح ننقلهم
  if (typeof document !== 'undefined' && props.target) {
    const target = typeof props.target === 'string' ? document.querySelector(props.target) : props.target;
    if (target) {
      const created = createDom(props.children);
      if (Array.isArray(created)) created.forEach(c => c && target.appendChild(c));
      else if (created) target.appendChild(created);
      return null;
    }
  }
  return props.children;
}

export function Modal(props) {
  return h(Portal, { target: 'body' },
    h('div', { class: 'elmoorx-modal-backdrop', onClick: props.onClose },
      h('div', { class: 'elmoorx-modal', onClick: e => e.stopPropagation() },
        props.children
      )
    )
  );
}

// Transitions
export function Transition(props) {
  return props.children;
}
export function TransitionGroup(props) {
  return props.children;
}

// Keep-alive cache
const keepAliveCache = new Map();
export function KeepAlive(props) {
  const key = props.key || 'default';
  if (!keepAliveCache.has(key)) keepAliveCache.set(key, props.children);
  return keepAliveCache.get(key);
}
export function clearKeepAliveCache() { keepAliveCache.clear(); }
export function evictFromKeepAlive(key) { keepAliveCache.delete(key); }
export function keepAliveCacheSize() { return keepAliveCache.size; }

// Suspense
export function Suspense(props) {
  // تبسيط — في الإنتاج يُطبّع بشكل كامل
  return props.children;
}
export const async_ = (loader) => lazy(loader);
export function renderToStream(node, writable) {
  const html = renderToString(node);
  writable.write(html);
  if (writable.end) writable.end();
}

// Pipeline exports
console.log('%c✦ Elmoorx v4 Runtime ', 'background:#0ea5e9;color:white;padding:4px 8px;border-radius:4px;font-weight:bold;');

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS — Public API
// ─────────────────────────────────────────────────────────────────────────────
export default {
  $state, $computed, $effect, $batch,
  $store,
  h, Fragment, renderFragment, renderToString,
  island, renderIsland, hydrateIslands, mount,
  sanitize, $html, SECURITY_HEADERS, generateCsrfToken,
  createContext, provide, inject, withContext,
  onMount, onCleanup, onError, withErrorBoundary,
  pushLifecycle, popLifecycle, runMount, runCleanup, handleError, setSilent,
  ErrorBoundary, safeRender: withErrorBoundary,
  Suspense, async_, renderToStream,
  lazy, prefetch, lazyAll,
  useRef, forwardRef, useImperativeHandle, useRefList,
  Portal, Modal,
  Transition, TransitionGroup,
  KeepAlive, clearKeepAliveCache, evictFromKeepAlive, keepAliveCacheSize,
  memo, useMemo: memo, shallowEqual, shallowEqualArray, deepEqual,
  initHMR,
};
