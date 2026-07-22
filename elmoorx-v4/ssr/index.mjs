/**
 * Elmoorx v4 — SSR (Server-Side Rendering)
 * ==========================================
 * نظام SSR متكامل مع:
 *   - renderToString — تحويل كامل لـ HTML
 *   - renderToStream — streaming للسرعة
 *   - getData — جلب البيانات قبل العرض
 *   - Head management — عناوين، meta، روابط
 *   - HTML template — قالب كامل
 *   - Initial state injection — حقن state الـ store
 */

import { renderToString, $store, h } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) HEAD MANAGEMENT — إدارة <head>
// ─────────────────────────────────────────────────────────────────────────────

const headItems = [];

export function Head(props) {
  // في SSR: نُضيف للقائمة
  // في المتصفح: نُحدّث document.head
  if (typeof document !== 'undefined') {
    // browser — حدّث الـ DOM
    if (props.title) document.title = props.title;
    if (props.meta) {
      for (const [name, content] of Object.entries(props.meta)) {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute('name', name);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      }
    }
    if (props.link) {
      for (const link of props.link) {
        const el = document.createElement('link');
        for (const [k, v] of Object.entries(link)) el.setAttribute(k, v);
        document.head.appendChild(el);
      }
    }
    return null;
  }
  // SSR — اجمع في القائمة
  if (props.title) headItems.push({ type: 'title', content: props.title });
  if (props.meta) {
    for (const [name, content] of Object.entries(props.meta)) {
      headItems.push({ type: 'meta', attrs: { name, content } });
    }
  }
  if (props.link) {
    for (const link of props.link) headItems.push({ type: 'link', attrs: link });
  }
  if (props.script) {
    for (const script of props.script) {
      headItems.push({ type: 'script', attrs: script });
    }
  }
  return null;
}

function renderHead() {
  return headItems.map(item => {
    if (item.type === 'title') return `<title>${escapeHtml(item.content)}</title>`;
    const attrs = Object.entries(item.attrs || {})
      .map(([k, v]) => `${k}="${escapeHtml(String(v))}"`)
      .join(' ');
    if (item.type === 'script') return `<script ${attrs}></script>`;
    return `<${item.type} ${attrs} />`;
  }).join('\n  ');
}

function clearHead() {
  headItems.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) RENDER TO STRING — تحويل كامل
// ─────────────────────────────────────────────────────────────────────────────

export async function renderApp(component, options = {}) {
  const {
    initialData = {},
    head = {},
    template = defaultTemplate,
  } = options;

  clearHead();

  // اجلب البيانات الأولية (loaders)
  let data = initialData;
  if (options.loadData) {
    try { data = await options.loadData(initialData); }
    catch (err) { console.error('[SSR] loadData error:', err); }
  }

  // ارسم المكون
  const html = renderToString(typeof component === 'function' ? component({ data }) : component);
  const headHtml = renderHead();

  // حقن البيانات الأولية
  const stateScript = `<script>window.__ELMOORX_INITIAL_STATE__ = ${JSON.stringify(data).replace(/</g, '\\u003c')};</script>`;

  // املأ القالب
  return template({
    head: headHtml,
    body: html,
    state: stateScript,
    title: head.title || 'Elmoorx App',
    ...head,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) RENDER TO STREAM — streaming
// ─────────────────────────────────────────────────────────────────────────────

export async function renderAppToStream(component, writable, options = {}) {
  const { initialData = {}, head = {}, template = defaultTemplate } = options;

  clearHead();

  let data = initialData;
  if (options.loadData) {
    try { data = await options.loadData(initialData); }
    catch (err) { console.error('[SSR] loadData error:', err); }
  }

  // اكتب الرأس أولاً
  const headHtml = renderHead();
  const stateScript = `<script>window.__ELMOORX_INITIAL_STATE__ = ${JSON.stringify(data).replace(/</g, '\\u003c')};</script>`;

  // اكتب بداية القالب
  const parts = template({
    head: headHtml,
    body: '__BODY_PLACEHOLDER__',
    state: stateScript,
    title: head.title || 'Elmoorx App',
    ...head,
  }).split('__BODY_PLACEHOLDER__');

  writable.write(parts[0]);

  // ارسم المكون قطعة قطعة (chunked)
  // للأبسط: ارسم الكل دفعة واحدة لكن بعد كتابة الرأس
  const html = renderToString(typeof component === 'function' ? component({ data }) : component);
  writable.write(html);

  // اكتب الـ tail
  if (parts[1]) writable.write(parts[1]);

  if (writable.end) writable.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) DEFAULT TEMPLATE — قالب HTML الافتراضي
// ─────────────────────────────────────────────────────────────────────────────

export function defaultTemplate({ head, body, state, title, lang = 'ar', dir = 'rtl' }) {
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${head || ''}
</head>
<body>
  <div id="app">${body}</div>
  ${state || ''}
  <script type="module" src="/runtime/core.mjs"></script>
  <script type="module">
    import { hydrateIslands } from '/runtime/core.mjs';
    hydrateIslands();
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) INITIAL STATE — للـ hydration
// ─────────────────────────────────────────────────────────────────────────────

export function getInitialState() {
  if (typeof window !== 'undefined' && window.__ELMOORX_INITIAL_STATE__) {
    return window.__ELMOORX_INITIAL_STATE__;
  }
  return {};
}

export function hydrateInitialState(store) {
  const state = getInitialState();
  if (state && typeof state === 'object') {
    // حقن في store
    Object.assign(store, state);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  Head,
  renderApp,
  renderAppToStream,
  defaultTemplate,
  getInitialState,
  hydrateInitialState,
};
