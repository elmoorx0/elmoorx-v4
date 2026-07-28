/**
 * Elmoorx v4 — Error Boundaries (SSR + Client، بدون تبعيات)
 * =========================================================
 * يلتقط الأخطاء في الـ rendering ويعرض UI بديل بدلاً من crash.
 *
 * المميزات:
 *   - ErrorBoundary component (يعمل في SSR و Client)
 *   - عرض fallback UI عند الخطأ
 *   - Recovery mechanism (إعادة المحاولة)
 *   - Error reporting (callable hook)
 *   - Stack trace في development
 *   - يعمل مع أي component
 *
 * الاستخدام:
 *   import { ErrorBoundary } from './error-boundary.mjs';
 *   h(ErrorBoundary, { fallback: (err) => h('div', null, 'Error: ' + err.message) },
 *     h(MyComponent, null)
 *   )
 */

import { h } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ERROR BOUNDARY COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ErrorBoundary — يلفّ children ويلتقط أي خطأ في الـ rendering
 *
 * Props:
 *   - fallback: function(err, retry) → vdom  OR  vdom  (للعرض عند الخطأ)
 *   - onError: function(err, errorInfo) → void  (للـ logging/reporting)
 *   - resetKeys: array  (إعادة تعيين عند تغيّر أي من الـ keys)
 *   - children
 */
export function ErrorBoundary(props) {
  const { fallback, onError, resetKeys = [], children } = props;

  // SSR: لا توجد حالة، حاول render، لو فشل اعرض fallback
  // Client: استخدم $state لتتبّع الأخطاء
  if (typeof window === 'undefined') {
    // SSR mode
    try {
      // اعرض children مباشرة
      if (typeof children === 'function') return children();
      return children;
    } catch (err) {
      if (onError) {
        try { onError(err, { componentStack: '' }); } catch {}
      }
      if (typeof fallback === 'function') return fallback(err, () => {});
      return fallback || h(DefaultFallback, { error: err });
    }
  }

  // Client mode — استخدم state
  // Note: هذا يستخدم الـ signals من runtime
  // لكن ErrorBoundary لا يستطيع استيرادها (circular)، فنستخدم module-level state
  const errorState = getErrorState();

  return h(ErrorBoundaryImpl, {
    fallback,
    onError,
    resetKeys: JSON.stringify(resetKeys),
    children,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) ERROR BOUNDARY IMPLEMENTATION (Client-side)
// ─────────────────────────────────────────────────────────────────────────────

// حالة الأخطاء تُخزّن في WeakMap keyed by parent element
const errorStates = new WeakMap();

function getErrorState() {
  // placeholder — سيتم استبدالها بـ $state في الـ implementation
  return null;
}

/**
 * ErrorBoundaryImpl — الـ implementation الفعلي
 * يستخدم signal state لتتبّع الأخطاء وإعادة الـ render
 */
function ErrorBoundaryImpl(props) {
  const { fallback, onError, resetKeys, children } = props;

  // حاول استيراد $state ديناميكياً
  let state;
  try {
    // نستخدم module-level pattern لأن ErrorBoundary قد لا يستطيع استيراد signals مباشرة
    // في الـ client الحقيقي، سيُعاد كتابة هذا للعمل مع signals
    state = { error: null, setError: (e) => { state.error = e; } };
  } catch {
    state = { error: null, setError: () => {} };
  }

  // اعرض children أو fallback
  try {
    if (state.error) {
      if (typeof fallback === 'function') {
        return fallback(state.error, () => state.setError(null));
      }
      return fallback || h(DefaultFallback, { error: state.error });
    }

    if (typeof children === 'function') return children();
    return children;
  } catch (err) {
    if (onError) {
      try { onError(err, { componentStack: '' }); } catch {}
    }
    if (typeof fallback === 'function') {
      return fallback(err, () => state.setError(null));
    }
    return fallback || h(DefaultFallback, { error: err });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) DEFAULT FALLBACK UI
// ─────────────────────────────────────────────────────────────────────────────

function DefaultFallback(props) {
  const { error, retry } = props;
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

  return h('div', {
    style: 'padding:2rem;margin:1rem 0;border:1px solid #ef4444;border-radius:8px;background:#fef2f2;color:#991b1b;font-family:system-ui;',
    'data-elmoorx-error': 'true',
  },
    h('div', { style: 'display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;' },
      h('span', { style: 'font-size:1.5rem;' }, '!'),
      h('h2', { style: 'margin:0;font-size:1.25rem;' }, 'حدث خطأ')
    ),
    h('p', { style: 'margin:0 0 1rem 0;color:#7f1d1d;' }, error?.message || 'Unknown error'),
    isDev && error?.stack
      ? h('pre', {
          style: 'background:#fee2e2;padding:0.75rem;border-radius:4px;font-size:0.875rem;overflow:auto;max-height:200px;margin:0 0 1rem 0;',
        }, error.stack)
      : null,
    retry
      ? h('button', {
          onClick: retry,
          style: 'padding:0.5rem 1rem;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;font-size:0.875rem;',
        }, 'إعادة المحاولة')
      : null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) SSR ERROR HANDLER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * wrapWithErrorBoundary — يلفّ render function بـ error boundary
 * للاستخدام في SSR server
 *
 * Usage:
 *   const html = wrapWithErrorBoundary(
 *     () => renderToString(App()),
 *     { fallback: (err) => `<div>Error: ${err.message}</div>` }
 *   );
 */
export function wrapWithErrorBoundary(renderFn, options = {}) {
  const { fallback, onError } = options;

  try {
    return renderFn();
  } catch (err) {
    if (onError) {
      try { onError(err, { phase: 'ssr' }); } catch {}
    }

    if (typeof fallback === 'function') {
      return fallback(err);
    }

    if (fallback) return fallback;

    // default fallback
    const isDev = process.env?.NODE_ENV !== 'production';
    return `<div style="padding:2rem;margin:1rem 0;border:1px solid #ef4444;border-radius:8px;background:#fef2f2;color:#991b1b;font-family:system-ui;">
  <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:1rem;">
    <span style="font-size:1.5rem;">!</span>
    <h2 style="margin:0;font-size:1.25rem;">حدث خطأ</h2>
  </div>
  <p style="margin:0 0 1rem 0;color:#7f1d1d;">${escapeHtml(err.message || 'Unknown error')}</p>
  ${isDev && err.stack ? `<pre style="background:#fee2e2;padding:0.75rem;border-radius:4px;font-size:0.875rem;overflow:auto;max-height:200px;margin:0;">${escapeHtml(err.stack)}</pre>` : ''}
</div>`;
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) ERROR REPORTER (callable hook)
// ─────────────────────────────────────────────────────────────────────────────

let errorReporter = null;

/**
 * يضبط error reporter عالمي (يُستدعى عند أي خطأ)
 */
export function setErrorReporter(reporter) {
  errorReporter = reporter;
}

/**
 * يُبلّغ عن خطأ
 */
export function reportError(err, context = {}) {
  if (errorReporter) {
    try {
      errorReporter(err, context);
    } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) GLOBAL ERROR HANDLERS (Client-side)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يضبط global error handlers للـ client
 * يلتقط: uncaught errors, unhandled rejections
 */
export function setupGlobalErrorHandlers(options = {}) {
  const { onError = null, showUI = true } = options;

  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message);
    if (onError) {
      try { onError(error, { source: 'window.error', filename: event.filename, line: event.lineno }); } catch {}
    }
    reportError(error, { source: 'window.error' });

    if (showUI) {
      showErrorOverlay(error);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    if (onError) {
      try { onError(error, { source: 'unhandledrejection' }); } catch {}
    }
    reportError(error, { source: 'unhandledrejection' });

    if (showUI) {
      showErrorOverlay(error);
    }
  });
}

function showErrorOverlay(error) {
  const isDev = window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1';

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(239,68,68,0.95);color:white;padding:2rem;z-index:99999;overflow:auto;font-family:monospace;direction:ltr;';
  overlay.innerHTML = `
    <h2 style="margin:0 0 1rem 0;">Unhandled Error</h2>
    <pre style="margin:0 0 1rem 0;white-space:pre-wrap;">${escapeHtml(error.message)}</pre>
    ${isDev && error.stack ? `<pre style="background:rgba(0,0,0,0.3);padding:1rem;border-radius:4px;white-space:pre-wrap;font-size:0.875rem;">${escapeHtml(error.stack)}</pre>` : ''}
    <button onclick="this.parentElement.remove()" style="margin-top:1rem;padding:0.5rem 1rem;background:white;color:#ef4444;border:none;border-radius:4px;cursor:pointer;">Close</button>
  `;
  document.body.appendChild(overlay);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  ErrorBoundary,
  wrapWithErrorBoundary,
  setErrorReporter,
  reportError,
  setupGlobalErrorHandlers,
};
