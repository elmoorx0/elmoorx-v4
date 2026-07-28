/**
 * اختبارات الميدلوير الإنتاجية الجديدة
 * ==================================
 * تتحقق من:
 *  - compressionMiddleware (gzip/brotli)
 *  - securityHeadersMiddleware (CSP, HSTS, X-Frame-Options, ...)
 *  - requestIdMiddleware (X-Request-ID per request)
 *  - loggerMiddleware (structured JSON logging)
 *  - healthCheckMiddleware (/health endpoint)
 *  - metricsMiddleware (Prometheus format /metrics)
 *  - setupGracefulShutdown (SIGTERM/SIGINT handling)
 */

import { test } from '../testing/index.mjs';
import {
  compressionMiddleware,
  securityHeadersMiddleware,
  requestIdMiddleware,
  loggerMiddleware,
  healthCheckMiddleware,
  metricsMiddleware,
  setupGracefulShutdown,
} from '../ssr-server/middleware.mjs';

// Helper: assert truthy
function assert(value, msg) {
  if (value === null || value === undefined || value === false || value === 0 || value === '') {
    throw new Error(msg || 'Assertion failed');
  }
}
// Helper: assert falsy
function assertFalsy(value, msg) {
  if (value) throw new Error(msg || 'Expected falsy');
}
// Helper: assert equals
function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + ` Expected ${expected}, got ${actual}`);
  }
}

// Mock response object
function createMockRes() {
  const headers = {};
  const chunks = [];
  let statusCode = 200;
  let ended = false;
  const res = {
    headers,
    chunks,
    get statusCode() { return statusCode; },
    get ended() { return ended; },
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    getHeader(name) { return headers[name.toLowerCase()]; },
    removeHeader(name) { delete headers[name.toLowerCase()]; },
    writeHead(status, hdrs) {
      statusCode = status;
      if (hdrs) for (const [k, v] of Object.entries(hdrs)) headers[k.toLowerCase()] = v;
    },
    write(chunk) {
      let buf;
      if (Buffer.isBuffer(chunk)) { buf = chunk; } else { buf = Buffer.from(chunk); }
      chunks.push(buf);
      return true;
    },
    end(chunk) {
      if (chunk) {
        let buf;
        if (Buffer.isBuffer(chunk)) { buf = chunk; } else { buf = Buffer.from(chunk); }
        chunks.push(buf);
      }
      ended = true;
      return this;
    },
    get body() { return Buffer.concat(chunks); },
  };
  return res;
}

function createMockReq(overrides = {}) {
  return {
    method: 'GET',
    url: '/',
    headers: { host: 'localhost:3000', ...overrides.headers },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

test('Compression — يضغط الاستجابات الكبيرة بـ gzip', async () => {
  const req = createMockReq({ headers: { host: 'localhost', 'accept-encoding': 'gzip, br' } });
  const res = createMockRes();
  const ctx = { req, res };

  const mw = compressionMiddleware({ threshold: 10 });
  await mw(ctx);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.write('<html><body>'.repeat(100) + 'Hello World!' + '</body></html>'.repeat(100));
  res.end();

  assert(res.headers['content-encoding'], 'Should have Content-Encoding header');
  assert(['gzip', 'br'].includes(res.headers['content-encoding']), 'Should use gzip or br');
  assert(res.headers['vary'], 'Should have Vary header');
  // streaming compression يستخدم chunked encoding بدلاً من Content-Length
  // فلا نتحقق من Content-Length هنا
});

test('Compression — يتخطّى الاستجابات الصغيرة', async () => {
  const req = createMockReq({ headers: { host: 'localhost', 'accept-encoding': 'gzip' } });
  const res = createMockRes();
  const ctx = { req, res };

  const mw = compressionMiddleware({ threshold: 1024 });
  await mw(ctx);

  res.setHeader('Content-Type', 'text/html');
  res.write('hi');
  res.end();

  assertFalsy(res.headers['content-encoding'], 'Should NOT compress small responses');
});

test('Compression — يتخطّى المحتوى المضغوط مسبقاً', async () => {
  const req = createMockReq({ headers: { host: 'localhost', 'accept-encoding': 'gzip' } });
  const res = createMockRes();
  const ctx = { req, res };

  const mw = compressionMiddleware();
  await mw(ctx);

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Encoding', 'identity'); // already encoded
  res.write(Buffer.alloc(2000, 0xFF));
  res.end();

  // لا يجب أن يُعاد ضغط المحتوى المُضغوط أصلاً
  assertEquals(res.headers['content-encoding'], 'identity', 'Should not re-compress');
});

test('Compression — يتخطّى إذا Accept-Encoding غير موجود', async () => {
  const req = createMockReq({ headers: { host: 'localhost' } });
  const res = createMockRes();
  const ctx = { req, res };

  const mw = compressionMiddleware();
  const result = await mw(ctx);

  assert(result, 'Should return true');
});

test('Security Headers — يضيف كل الرؤوس', async () => {
  const req = createMockReq();
  const res = createMockRes();
  const ctx = { req, res };

  const mw = securityHeadersMiddleware();
  await mw(ctx);

  assert(res.headers['content-security-policy'], 'Should set CSP');
  assert(res.headers['strict-transport-security'], 'Should set HSTS');
  assert(res.headers['x-frame-options'], 'Should set X-Frame-Options');
  assert(res.headers['x-content-type-options'], 'Should set X-Content-Type-Options');
  assert(res.headers['referrer-policy'], 'Should set Referrer-Policy');
  assert(res.headers['permissions-policy'], 'Should set Permissions-Policy');
  assert(res.headers['x-xss-protection'], 'Should set X-XSS-Protection');
  assert(res.headers['cross-origin-opener-policy'], 'Should set COOP');
  assert(res.headers['cross-origin-embedder-policy'], 'Should set COEP');
  assert(res.headers['cross-origin-resource-policy'], 'Should set CORP');
});

test('Security Headers — يدعم التخصيص', async () => {
  const req = createMockReq();
  const res = createMockRes();
  const ctx = { req, res };

  const mw = securityHeadersMiddleware({
    csp: "default-src 'none'",
    hsts: 'max-age=100',
  });
  await mw(ctx);

  assertEquals(res.headers['content-security-policy'], "default-src 'none'", 'Custom CSP');
  assertEquals(res.headers['strict-transport-security'], 'max-age=100', 'Custom HSTS');
});

test('Request ID — يولّد UUID فريد لكل طلب', async () => {
  const req1 = createMockReq();
  const res1 = createMockRes();
  const ctx1 = { req: req1, res: res1 };

  const mw = requestIdMiddleware();
  await mw(ctx1);

  const id1 = ctx1.requestId;
  assert(id1, 'Should generate request ID');
  assert(res1.headers['x-request-id'], 'Should set X-Request-ID header');
  assertEquals(id1, res1.headers['x-request-id'], 'Header should match ctx.requestId');

  // تحقق من تنسيق UUID v4
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert(uuidRegex.test(id1), 'Should be valid UUID v4');

  // طلب ثانٍ يجب أن يولّد ID مختلف
  const req2 = createMockReq();
  const res2 = createMockRes();
  const ctx2 = { req: req2, res: res2 };
  await mw(ctx2);

  assert(ctx2.requestId !== id1, 'Should generate unique ID per request');
});

test('Request ID — يحترم الـ header الوارد', async () => {
  const incomingId = 'incoming-request-id-123';
  const req = createMockReq({ headers: { host: 'localhost', 'x-request-id': incomingId } });
  const res = createMockRes();
  const ctx = { req, res };

  const mw = requestIdMiddleware();
  await mw(ctx);

  assertEquals(ctx.requestId, incomingId, 'Should use incoming X-Request-ID');
});

test('Logger — يلتقط مدة الطلب وكتابتها JSON', async () => {
  const req = createMockReq({ method: 'GET', url: '/test' });
  const res = createMockRes();
  const ctx = { req, res, requestId: 'test-id-123' };

  const originalLog = console.log;
  let loggedLine = '';
  console.log = (line) => { loggedLine = line; };

  try {
    const mw = loggerMiddleware({ skipPaths: [] });
    await mw(ctx);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html>test</html>');

    // انتظر قليلاً للـ async log
    await new Promise(r => setTimeout(r, 10));

    assert(loggedLine, 'Should have logged something');
    const parsed = JSON.parse(loggedLine);
    assertEquals(parsed.method, 'GET', 'Should log method');
    assertEquals(parsed.path, '/test', 'Should log path');
    assertEquals(parsed.status, 200, 'Should log status');
    assertEquals(parsed.requestId, 'test-id-123', 'Should log requestId');
    assert(typeof parsed.duration === 'number', 'Should log duration');
    assert(parsed.time, 'Should log timestamp');
  } finally {
    console.log = originalLog;
  }
});

test('Logger — يتخطّي paths المراقبة', async () => {
  const req = createMockReq({ url: '/health' });
  const res = createMockRes();
  const ctx = { req, res };

  let logged = false;
  const originalLog = console.log;
  console.log = () => { logged = true; };

  try {
    const mw = loggerMiddleware();
    await mw(ctx);
    res.writeHead(200);
    res.end('ok');
    await new Promise(r => setTimeout(r, 10));
    assertFalsy(logged, 'Should not log /health');
  } finally {
    console.log = originalLog;
  }
});

test('Health Check — يُرجع 200 + JSON صحيح', async () => {
  const req = createMockReq({ url: '/health' });
  const res = createMockRes();
  const ctx = { req, res };

  const hc = healthCheckMiddleware({ version: '1.2.3' });
  const result = await hc.middleware(ctx);

  assertFalsy(result, 'Should return false to stop middleware chain');
  assertEquals(res.statusCode, 200, 'Should be 200 OK');
  const body = JSON.parse(res.body.toString());
  assertEquals(body.status, 'healthy', 'Should be healthy');
  assertEquals(body.version, '1.2.3', 'Should report version');
  assert(typeof body.uptime === 'number', 'Should have uptime');
  assert(body.memory, 'Should have memory info');
  assert(body.memory.rss, 'Should have rss memory');
  assert(body.hostname, 'Should have hostname');
  assert(body.pid, 'Should have pid');
});

test('Health Check — يتخطّى paths غير المطابقة', async () => {
  const req = createMockReq({ url: '/some-other-path' });
  const res = createMockRes();
  const ctx = { req, res };

  const hc = healthCheckMiddleware();
  const result = await hc.middleware(ctx);
  assert(result, 'Should return true for non-health paths');
});

test('Health Check — يدعم custom checks', async () => {
  const req = createMockReq({ url: '/health' });
  const res = createMockRes();
  const ctx = { req, res };

  const hc = healthCheckMiddleware({
    checks: [
      { name: 'database', check: async () => true },
      { name: 'redis', check: async () => false },
    ],
  });
  await hc.middleware(ctx);

  const body = JSON.parse(res.body.toString());
  assertEquals(body.status, 'unhealthy', 'Should be unhealthy when a check fails');
  assertEquals(res.statusCode, 503, 'Should be 503');
  assertEquals(body.checks.database, 'healthy', 'Database check should pass');
  assertEquals(body.checks.redis, 'unhealthy', 'Redis check should fail');
});

test('Health Check — markShuttingDown يُغيّر الحالة', async () => {
  const req = createMockReq({ url: '/health' });
  const res = createMockRes();
  const ctx = { req, res };

  const hc = healthCheckMiddleware();
  hc.markShuttingDown();
  await hc.middleware(ctx);

  const body = JSON.parse(res.body.toString());
  assertEquals(body.status, 'unhealthy', 'Should be unhealthy during shutdown');
  assertEquals(res.statusCode, 503, 'Should be 503');
});

test('Metrics — يخدم /metrics بصيغة Prometheus', async () => {
  const req = createMockReq({ url: '/metrics' });
  const res = createMockRes();
  const ctx = { req, res };

  const m = metricsMiddleware();
  const result = await m.middleware(ctx);

  assertFalsy(result, 'Should return false for /metrics');
  assertEquals(res.statusCode, 200, 'Should be 200');
  assert(res.headers['content-type'].includes('text/plain'), 'Should be text/plain');
  const body = res.body.toString();
  assert(body.includes('elmoorx_'), 'Should include elmoorx_ metrics');
  assert(body.includes('process_uptime_seconds'), 'Should include uptime');
  assert(body.includes('process_memory_rss_bytes'), 'Should include memory');
  assert(body.includes('# HELP'), 'Should include HELP comments');
  assert(body.includes('# TYPE'), 'Should include TYPE comments');
});

test('Metrics — يجمع counters للطلبات', async () => {
  const m = metricsMiddleware();

  // شغّل 3 طلبات
  for (let i = 0; i < 3; i++) {
    const req = createMockReq({ url: '/api/test', method: 'GET' });
    const res = createMockRes();
    const ctx = { req, res };
    await m.middleware(ctx);
    res.writeHead(200);
    res.end('{"ok":true}');
  }

  // تحقق من الـ metrics
  const req = createMockReq({ url: '/metrics' });
  const res = createMockRes();
  const ctx = { req, res };
  await m.middleware(ctx);

  const body = res.body.toString();
  assert(body.includes('elmoorx_http_requests_total'), 'Should have request counter');
  assert(body.includes('method=GET'), 'Should have method label');
  assert(body.includes('path=/api/test'), 'Should have path label');
  assert(body.includes('status=200'), 'Should have status label');
});

test('Metrics — يتخطّى paths غير المطابقة', async () => {
  const req = createMockReq({ url: '/normal-path' });
  const res = createMockRes();
  const ctx = { req, res };

  const m = metricsMiddleware();
  const result = await m.middleware(ctx);
  assert(result, 'Should return true for non-metrics paths');
});

test('Graceful Shutdown — يُرجع shutdown function', () => {
  const mockServer = {
    close: (cb) => { if (cb) cb(); },
  };
  const { shutdown, isShuttingDown } = setupGracefulShutdown(mockServer, {
    forceExit: false,
    signals: [],
  });
  assert(typeof shutdown === 'function', 'Should expose shutdown function');
  assert(typeof isShuttingDown === 'function', 'Should expose isShuttingDown function');
  assertFalsy(isShuttingDown(), 'Should not be shutting down initially');
});

test('Graceful Shutdown — يستدعي onShutdown callback', async () => {
  const mockServer = { close: (cb) => { if (cb) cb(); } };
  let cleanupCalled = false;
  const { shutdown } = setupGracefulShutdown(mockServer, {
    forceExit: false,
    signals: [],
    onShutdown: async () => { cleanupCalled = true; },
  });

  await shutdown('test');
  assert(cleanupCalled, 'Should have called onShutdown');
});

console.log('\n  ✦ Production Middleware Tests — loaded');
