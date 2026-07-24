/**
 * Elmoorx v4 — HTTP Client & Auth Helpers
 * =========================================
 * عميل HTTP موحد:
 *   - fetch wrapper مع retry + timeout
 *   - JSON parsing تلقائي
 *   - error handling موحد
 *   - request/response interceptors
 *   - CSRF token تلقائي
 *   - auth (login, logout, session)
 *   - localStorage / cookie helpers
 */

import { $state, $effect } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) HTTP CLIENT
// ─────────────────────────────────────────────────────────────────────────────

const baseURL = $state('');
const defaultHeaders = $state({
  'Content-Type': 'application/json',
});

const requestInterceptors = [];
const responseInterceptors = [];

export function setBaseURL(url) { baseURL.set(url); }
export function setDefaultHeader(key, value) {
  const h = defaultHeaders();
  h[key] = value;
  defaultHeaders.set(h);
}
export function removeDefaultHeader(key) {
  const h = defaultHeaders();
  delete h[key];
  defaultHeaders.set(h);
}

export function addRequestInterceptor(fn) { requestInterceptors.push(fn); }
export function addResponseInterceptor(fn) { responseInterceptors.push(fn); }

/**
 * http — عميل HTTP أساسي
 */
export const http = {
  async get(url, options = {}) {
    return request('GET', url, null, options);
  },
  async post(url, data, options = {}) {
    return request('POST', url, data, options);
  },
  async put(url, data, options = {}) {
    return request('PUT', url, data, options);
  },
  async patch(url, data, options = {}) {
    return request('PATCH', url, data, options);
  },
  async delete(url, options = {}) {
    return request('DELETE', url, null, options);
  },
};

async function request(method, url, data, options = {}) {
  const {
    timeout = 30000,
    retries = 0,
    retryDelay = 1000,
    headers = {},
    signal,
  } = options;

  let fullUrl = url;
  if (!url.startsWith('http') && baseURL()) {
    fullUrl = baseURL() + url;
  }

  let allHeaders = { ...defaultHeaders(), ...headers };

  // اضف CSRF token تلقائياً
  if (typeof document !== 'undefined') {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      allHeaders['X-CSRF-Token'] = csrfMeta.getAttribute('content');
    }
  }

  // شغّل request interceptors
  let finalData = data;
  for (const interceptor of requestInterceptors) {
    const result = interceptor({ url: fullUrl, method, data: finalData, headers: allHeaders });
    if (result) {
      finalData = result.data ?? finalData;
      allHeaders = { ...allHeaders, ...result.headers };
    }
  }

  // timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (signal) signal.addEventListener('abort', () => controller.abort());

  // retry logic
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetchOptions = {
        method,
        headers: allHeaders,
        signal: controller.signal,
      };
      if (finalData && method !== 'GET') {
        fetchOptions.body = typeof finalData === 'string' ? finalData : JSON.stringify(finalData);
      }

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      // شغّل response interceptors
      let processedResponse = response;
      for (const interceptor of responseInterceptors) {
        const result = interceptor(processedResponse);
        if (result) processedResponse = result;
      }

      // parse JSON
      const contentType = response.headers.get('content-type') || '';
      let body;
      if (contentType.includes('application/json')) {
        body = await response.json();
      } else if (contentType.includes('text/')) {
        body = await response.text();
      } else {
        body = await response.blob();
      }

      if (!response.ok) {
        throw new HttpError(response.status, body, response.statusText);
      }

      return { data: body, status: response.status, headers: response.headers, response };
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        throw new HttpError(408, null, 'Request timed out');
      }
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export class HttpError extends Error {
  constructor(status, body, message) {
    super(message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
    this.name = 'HttpError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) AUTH — مصادقة
// ─────────────────────────────────────────────────────────────────────────────

const currentUser = $state(null);
const authToken = $state(null);
const authLoading = $state(false);

export function useAuth() {
  return {
    user: currentUser,
    token: authToken,
    loading: authLoading,
    isAuthenticated: () => !!currentUser(),
    login,
    logout,
    register,
    refresh,
  };
}

export async function login(credentials) {
  authLoading.set(true);
  try {
    const { data } = await http.post('/api/auth/login', credentials);
    if (data.token) {
      authToken.set(data.token);
      setDefaultHeader('Authorization', `Bearer ${data.token}`);
      persistToken(data.token);
    }
    if (data.user) {
      currentUser.set(data.user);
    }
    return data;
  } finally {
    authLoading.set(false);
  }
}

export async function register(userData) {
  authLoading.set(true);
  try {
    const { data } = await http.post('/api/auth/register', userData);
    if (data.token) {
      authToken.set(data.token);
      setDefaultHeader('Authorization', `Bearer ${data.token}`);
      persistToken(data.token);
    }
    if (data.user) {
      currentUser.set(data.user);
    }
    return data;
  } finally {
    authLoading.set(false);
  }
}

export async function logout() {
  try {
    if (authToken()) {
      await http.post('/api/auth/logout', {});
    }
  } catch (err) {
    // ignore network errors on logout
  } finally {
    currentUser.set(null);
    authToken.set(null);
    removeDefaultHeader('Authorization');
    clearPersistedToken();
  }
}

export async function refresh() {
  if (!authToken()) return null;
  try {
    const { data } = await http.post('/api/auth/refresh', {});
    if (data.token) {
      authToken.set(data.token);
      setDefaultHeader('Authorization', `Bearer ${data.token}`);
      persistToken(data.token);
    }
    if (data.user) currentUser.set(data.user);
    return data;
  } catch (err) {
    await logout();
    return null;
  }
}

export async function fetchCurrentUser() {
  if (!authToken()) return null;
  try {
    const { data } = await http.get('/api/auth/me');
    currentUser.set(data);
    return data;
  } catch (err) {
    if (err.status === 401) {
      await logout();
    }
    return null;
  }
}

function persistToken(token) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('elmoorx_token', token);
  }
}

function clearPersistedToken() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('elmoorx_token');
  }
}

export function loadPersistedToken() {
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('elmoorx_token');
    if (token) {
      authToken.set(token);
      setDefaultHeader('Authorization', `Bearer ${token}`);
      return token;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) STORAGE HELPERS — localStorage + cookies
// ─────────────────────────────────────────────────────────────────────────────

export const storage = {
  get(key, defaultValue = null) {
    if (typeof localStorage === 'undefined') return defaultValue;
    const val = localStorage.getItem(key);
    if (val === null) return defaultValue;
    try { return JSON.parse(val); } catch { return val; }
  },
  set(key, value) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  },
  remove(key) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
  clear() {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  },
};

export const cookies = {
  get(name) {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  },
  set(name, value, options = {}) {
    if (typeof document === 'undefined') return;
    const { maxAge = 86400, path = '/', secure = false, sameSite = 'lax' } = options;
    let cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=${path}; SameSite=${sameSite}`;
    if (secure) cookie += '; Secure';
    document.cookie = cookie;
  },
  delete(name) {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=; max-age=0; path=/`;
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4) QUERY CACHE — for data fetching
// ─────────────────────────────────────────────────────────────────────────────

const queryCache = new Map();

export function useQuery(key, fetcher, options = {}) {
  const { enabled = true, refetchOnMount = true, cacheTime = 5 * 60 * 1000 } = options;
  const data = $state(null);
  const error = $state(null);
  const loading = $state(false);

  const fetchData = async () => {
    loading.set(true);
    error.set(null);
    try {
      // تحقق من cache
      const cached = queryCache.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        data.set(cached.data);
        return;
      }
      const result = await fetcher();
      data.set(result);
      queryCache.set(key, { data: result, timestamp: Date.now() });
    } catch (err) {
      error.set(err);
    } finally {
      loading.set(false);
    }
  };

  if (enabled && refetchOnMount) {
    fetchData();
  }

  return { data, error, loading, refetch: fetchData };
}

export function invalidateQuery(key) {
  if (key) queryCache.delete(key);
  else queryCache.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  http,
  HttpError,
  setBaseURL,
  setDefaultHeader,
  addRequestInterceptor,
  addResponseInterceptor,
  useAuth,
  login,
  logout,
  register,
  refresh,
  fetchCurrentUser,
  loadPersistedToken,
  storage,
  cookies,
  useQuery,
  invalidateQuery,
};
