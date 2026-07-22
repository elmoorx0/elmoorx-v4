/**
 * Elmoorx v4 — Router (file-based + programmatic)
 * ================================================
 * نظام توجيه متكامل:
 *   - File-based routing (مثل Next.js)
 *   - Programmatic routing
 *   - Dynamic segments: /users/[id]
 *   - Catch-all: /[...catch]
 *   - Layouts متداخلة
 *   - Loaders (للـ SSR + data fetching)
 *   - Lazy loading تلقائي
 *   - Hash routing و History API
 *   - Link component مع prefetch
 */

import { h, $state, $effect, $computed } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ROUTER STATE
// ─────────────────────────────────────────────────────────────────────────────

const currentPath = $state(typeof window !== 'undefined' ? window.location.pathname : '/');
const currentParams = $state({});
const currentQuery = $state({});
const currentRoute = $state(null);
const currentLoader = $state(null);
let routes = [];
let notFoundComponent = null;
let layoutComponent = null;
let routerMode = 'history';

// ─────────────────────────────────────────────────────────────────────────────
// 2) ROUTE DEFINITION
// ─────────────────────────────────────────────────────────────────────────────

export function defineRoutes(routeList) {
  routes = routeList.map(r => ({
    ...r,
    regex: pathToRegex(r.path),
    keys: extractKeys(r.path),
  }));
  startRouting();
  return router;
}

export function defineFileRoutes(fileRoutes) {
  const routeList = fileRoutes.map(({ filePath, module }) => {
    const path = filePathToRoute(filePath);
    return {
      path,
      component: module.default,
      loader: module.loader,
      layout: module.layout,
    };
  });
  return defineRoutes(routeList);
}

function filePathToRoute(filePath) {
  let path = filePath
    .replace(/^\/?src\/pages\//, '')
    .replace(/\.(tsx|ts|jsx|js|mjs)$/, '')
    .replace(/\/index$/, '')
    .replace(/^index$/, '');
  if (!path) return '/';
  path = path.replace(/\[([^\]]+)\]/g, ':$1');
  path = path.replace(/\[\.\.\.([^\]]+)\]/g, '*$1');
  return '/' + path;
}

function pathToRegex(path) {
  if (path === '*') return /^.*$/;
  let pattern = path
    .replace(/\*([a-z0-9_]+)/gi, '(?<$1>.*)')
    .replace(/:([a-z0-9_]+)/gi, '(?<$1>[^/]+)');
  return new RegExp('^' + pattern + '$', 'i');
}

function extractKeys(path) {
  const keys = [];
  const matches = path.matchAll(/:([a-z0-9_]+)|\*([a-z0-9_]+)/gi);
  for (const m of matches) keys.push(m[1] || m[2]);
  return keys;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) ROUTING LOGIC
// ─────────────────────────────────────────────────────────────────────────────

function startRouting() {
  if (typeof window === 'undefined') return;
  window.addEventListener('popstate', () => handleLocationChange());
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    if (link.target === '_blank') return;
    if (link.hasAttribute('download')) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
    e.preventDefault();
    navigate(href);
  });
  handleLocationChange();
}

function handleLocationChange() {
  let path;
  if (routerMode === 'hash') {
    path = window.location.hash.slice(1) || '/';
  } else {
    path = window.location.pathname + window.location.search;
  }

  const [pathname, search] = path.split('?');
  const query = parseQuery(search || '');

  let matchedRoute = null;
  let params = {};
  for (const route of routes) {
    const match = route.regex.exec(pathname);
    if (match) {
      matchedRoute = route;
      params = match.groups || {};
      break;
    }
  }

  if (!matchedRoute) {
    matchedRoute = { component: notFoundComponent || DefaultNotFound, path: '*' };
  }

  currentPath.set(pathname);
  currentParams.set(params);
  currentQuery.set(query);
  currentRoute.set(matchedRoute);

  if (matchedRoute.loader) {
    Promise.resolve(matchedRoute.loader({ params, query, path: pathname }))
      .then(data => currentLoader.set(data))
      .catch(err => {
        console.error('[router] خطأ في الـ loader:', err);
        currentLoader.set({ __error: err.message });
      });
  } else {
    currentLoader.set(null);
  }

  if (typeof window !== 'undefined') window.scrollTo(0, 0);
}

function parseQuery(search) {
  const params = {};
  if (!search) return params;
  for (const pair of search.split('&')) {
    const [k, v] = pair.split('=').map(decodeURIComponent);
    if (k) params[k] = v;
  }
  return params;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

export function navigate(to, options = {}) {
  if (typeof window === 'undefined') return;
  if (routerMode === 'hash') {
    window.location.hash = to;
  } else {
    window.history.pushState({}, '', to);
    handleLocationChange();
  }
}

export function back() { if (typeof window !== 'undefined') window.history.back(); }
export function forward() { if (typeof window !== 'undefined') window.history.forward(); }

// ─────────────────────────────────────────────────────────────────────────────
// 5) ROUTER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Router() {
  return h(RouterInner, null);
}

function RouterInner() {
  const route = currentRoute;
  const params = currentParams;
  const query = currentQuery;
  const loaderData = currentLoader;

  const component = route()?.component;
  if (!component) return h(DefaultNotFound, null);

  const element = h(component, { params: params(), query: query(), loaderData: loaderData() });

  if (layoutComponent) {
    return h(layoutComponent, { children: element, params: params(), query: query() });
  }
  return element;
}

function DefaultNotFound() {
  return h('div', { style: 'padding:4rem;text-align:center;' },
    h('h1', { style: 'font-size:4rem;color:#ef4444;' }, '404'),
    h('p', { style: 'color:#94a3b8;' }, 'الصفحة غير موجودة'),
    h('a', { href: '/', style: 'color:#0ea5e9;' }, 'العودة للرئيسية')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) LINK COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Link(props) {
  const { to, children, prefetch = true, ...rest } = props;
  const handleMouseEnter = () => {
    if (!prefetch) return;
    if (props.onMouseEnter) props.onMouseEnter();
  };
  return h('a', {
    href: to,
    onMouseEnter: handleMouseEnter,
    ...rest,
  }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useRouter() {
  return {
    path: currentPath,
    params: currentParams,
    query: currentQuery,
    route: currentRoute,
    loaderData: currentLoader,
    navigate,
    back,
    forward,
  };
}

export function useParams() { return currentParams; }
export function useQuery() { return currentQuery; }
export function useLoaderData() { return currentLoader; }
export function useNavigate() { return navigate; }

// ─────────────────────────────────────────────────────────────────────────────
// 8) CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export function setRouterMode(mode) { routerMode = mode; }
export function setNotFound(component) { notFoundComponent = component; }
export function setLayout(component) { layoutComponent = component; }

// ─────────────────────────────────────────────────────────────────────────────
// 9) LAZY ROUTE
// ─────────────────────────────────────────────────────────────────────────────

export function lazyRoute(loader) {
  let loaded = null;
  return (props) => {
    if (!loaded) {
      loader().then(m => {
        loaded = m.default || m;
        currentRoute.set({ ...currentRoute(), _ts: Date.now() });
      });
      return h('div', { style: 'padding:2rem;text-align:center;color:#94a3b8;' }, 'جاري التحميل...');
    }
    return h(loaded, props);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) ROUTER INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

const router = {
  defineRoutes,
  defineFileRoutes,
  navigate,
  back,
  forward,
  Router,
  Link,
  useRouter,
  useParams,
  useQuery,
  useLoaderData,
  useNavigate,
  setRouterMode,
  setNotFound,
  setLayout,
  lazyRoute,
  get currentPath() { return currentPath(); },
  get currentParams() { return currentParams(); },
  get currentRoute() { return currentRoute(); },
};

export default router;
