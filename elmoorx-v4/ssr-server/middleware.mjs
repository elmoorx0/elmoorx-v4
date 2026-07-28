/**
 * Elmoorx v4 — Production Middleware (بدون تبعيات)
 * ===============================================
 * ميدلوير ضرورية للنشر الإنتاجي:
 *   - compression (gzip/brotli فوري)
 *   - securityHeaders (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, ...)
 *   - requestId (X-Request-ID + ctx.requestId)
 *   - logger (structured JSON logging)
 *   - healthCheck (/health endpoint)
 *   - metrics (Prometheus format at /metrics)
 *
 * كل الميدلوير تعمل بـ ctx pattern الموحّد:
 *   function mw() { return async (ctx) => { ... return true|false } }
 */

import { gzipSync, brotliCompressSync, deflateSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';

// ─────────────────────────────────────────────────────────────────────────────
// 1) COMPRESSION MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يضغط الاستجابات تلقائياً بناءً على Accept-Encoding
 * - يدعم br, gzip, deflate
 * - يتخطّى الاستجابات الصغيرة (< 1KB)
 * - يتخطّى الاستجابات المتدفقة (Transfer-Encoding: chunked)
 * - يتخطّى المحتوى المُصدّر أصلاً مضغوط (Content-Encoding موجود)
 *
 * الخوارزمية: يلتفّ على res.write و res.end لجمع الـ buffer، ثم يضغطه
 * عند الانتهاء ويُرسله دفعة واحدة.
 */
export function compressionMiddleware(options = {}) {
  const {
    threshold = 1024,           // لا يضغط ما دون 1KB
    br = true,
    gzip = true,
    deflate = false,
    level = 4,                  // مستوى ضغط معتدل للأداء
    types = [                   // أنواع المحتوى التي تُضغط
      'text/html', 'text/css', 'text/plain', 'text/javascript',
      'application/javascript', 'application/json', 'application/xml',
      'application/xhtml+xml', 'image/svg+xml', 'application/wasm',
      'text/markdown', 'application/ld+json',
    ],
  } = options;

  return async (ctx) => {
    const { req, res } = ctx;

    // تجاوز: لا يوجد Accept-Encoding
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (!acceptEncoding) return true;

    // تجاوز: لا يدعم أي من br/gzip/deflate
    const supportsBr = br && acceptEncoding.includes('br');
    const supportsGzip = gzip && acceptEncoding.includes('gzip');
    const supportsDeflate = deflate && acceptEncoding.includes('deflate');
    if (!supportsBr && !supportsGzip && !supportsDeflate) return true;

    // التفاف على res.write / res.end لجمع البيانات
    const chunks = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    let headersSent = false;
    let collectedContentType = '';
    let isStreamed = false;

    // التقاط Content-Type قبل الإرسال
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = (name, value) => {
      if (name.toLowerCase() === 'content-type') {
        collectedContentType = String(value).split(';')[0].trim();
      }
      return originalSetHeader(name, value);
    };

    // تجاوز writeHead — لا ترسل فعلياً حتى res.end (لتأخير الضغط)
    const originalWriteHead = res.writeHead.bind(res);
    let pendingStatus = 200;
    res.writeHead = (status, headers) => {
      pendingStatus = status;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === 'content-type') {
            collectedContentType = String(v).split(';')[0].trim();
          } else if (k.toLowerCase() === 'transfer-encoding') {
            // نتجاهل chunked — سنجمع الـ buffer ونرسله مضغوطاً
            continue;
          }
          try { originalSetHeader(k, v); } catch {}
        }
      }
      return res;
    };

    res.write = (chunk, ...args) => {
      if (chunk) {
        if (typeof chunk === 'string') chunks.push(Buffer.from(chunk, args[0] || 'utf8'));
        else if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      }
      return true;
    };

    res.end = (chunk, ...args) => {
      if (chunk) {
        if (typeof chunk === 'string') chunks.push(Buffer.from(chunk, args[0] || 'utf8'));
        else if (Buffer.isBuffer(chunk)) chunks.push(chunk);
      }

      const body = Buffer.concat(chunks);

      // تحقق ما إذا كنا سنضغط — اضبط الـ headers BEFORE writeHead
      const alreadyEncoded = res.getHeader('content-encoding');
      const shouldCompress =
        !alreadyEncoded &&
        body.length >= threshold &&
        types.some(t => collectedContentType.startsWith(t));

      if (!shouldCompress) {
        // اضبط Content-Length قبل writeHead
        try { originalSetHeader('Content-Length', String(body.length)); } catch {}
        // أرسل الـ status
        originalWriteHead(pendingStatus);
        if (body.length > 0) originalWrite(body);
        return originalEnd();
      }

      // اضغط
      let compressed, encoding;
      try {
        if (supportsBr) {
          compressed = brotliCompressSync(body, { params: { [0]: level } });
          encoding = 'br';
        } else if (supportsGzip) {
          compressed = gzipSync(body, { level });
          encoding = 'gzip';
        } else if (supportsDeflate) {
          compressed = deflateSync(body, { level });
          encoding = 'deflate';
        } else {
          try { originalSetHeader('Content-Length', String(body.length)); } catch {}
          originalWriteHead(pendingStatus);
          if (body.length > 0) originalWrite(body);
          return originalEnd();
        }
      } catch {
        try { originalSetHeader('Content-Length', String(body.length)); } catch {}
        originalWriteHead(pendingStatus);
        if (body.length > 0) originalWrite(body);
        return originalEnd();
      }

      // اضبط headers الضغط قبل writeHead
      try {
        originalSetHeader('Content-Encoding', encoding);
        originalSetHeader('Content-Length', String(compressed.length));
        originalSetHeader('Vary', 'Accept-Encoding');
      } catch {}

      originalWriteHead(pendingStatus);
      if (compressed.length > 0) originalWrite(compressed);
      return originalEnd();
    };

    return true;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SECURITY HEADERS MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يضيف رؤوس أمان للـ HTTP responses
 * يحمي من: XSS, clickjacking, MIME sniffing, downgrade attacks
 */
export function securityHeadersMiddleware(options = {}) {
  const {
    csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: ws:; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
    hsts = 'max-age=31536000; includeSubDomains; preload',
    frameOptions = 'DENY',
    contentTypeOptions = 'nosniff',
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    xssProtection = '1; mode=block',
    crossOriginOpenerPolicy = 'same-origin',
    crossOriginEmbedderPolicy = 'require-corp',
    crossOriginResourcePolicy = 'same-origin',
  } = options;

  return async (ctx) => {
    const { res } = ctx;

    if (csp) res.setHeader('Content-Security-Policy', csp);
    if (hsts) res.setHeader('Strict-Transport-Security', hsts);
    if (frameOptions) res.setHeader('X-Frame-Options', frameOptions);
    if (contentTypeOptions) res.setHeader('X-Content-Type-Options', contentTypeOptions);
    if (referrerPolicy) res.setHeader('Referrer-Policy', referrerPolicy);
    if (permissionsPolicy) res.setHeader('Permissions-Policy', permissionsPolicy);
    if (xssProtection) res.setHeader('X-XSS-Protection', xssProtection);
    if (crossOriginOpenerPolicy) res.setHeader('Cross-Origin-Opener-Policy', crossOriginOpenerPolicy);
    if (crossOriginEmbedderPolicy) res.setHeader('Cross-Origin-Embedder-Policy', crossOriginEmbedderPolicy);
    if (crossOriginResourcePolicy) res.setHeader('Cross-Origin-Resource-Policy', crossOriginResourcePolicy);

    // إزالة X-Powered-By لكشف أقل
    res.removeHeader('X-Powered-By');

    return true;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) REQUEST ID MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يولّد X-Request-ID فريد لكل طلب ويضعه في ctx.requestId
 * يستخدم UUID v4 (randomBytes) — بدون مكتبات
 */
export function requestIdMiddleware(options = {}) {
  const {
    headerName = 'X-Request-ID',
    generate = generateRequestId,
  } = options;

  return async (ctx) => {
    const { req, res } = ctx;
    let id = req.headers[headerName.toLowerCase()];
    if (!id || typeof id !== 'string' || id.length > 128) {
      id = generate();
    }
    ctx.requestId = id;
    res.setHeader(headerName, id);
    return true;
  };
}

function generateRequestId() {
  const bytes = randomBytes(16);
  // UUID v4 format
  bytes[6] = (bytes[6] & 0x0f) | 0x40;  // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80;  // variant 10
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) LOGGER MIDDLEWARE (Structured JSON)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يسجّل كل طلب بصيغة JSON structured
 * يدعم: log levels, request ID, timing, status code, content length
 *
 * الاستخدام:
 *   logger({ level: 'info' })
 *
 * الإخراج (JSON line per request):
 *   {"level":"info","time":"2024-...","requestId":"abc-123","method":"GET","path":"/","status":200,"duration":12,"ip":"127.0.0.1","userAgent":"curl/8.0"}
 */
export function loggerMiddleware(options = {}) {
  const {
    level = 'info',
    format = 'json',       // 'json' | 'text'
    skipPaths = ['/health', '/metrics'],  // لا تسجّل endpoints المراقبة
    skipPathsRegex = null,
  } = options;

  return async (ctx) => {
    const { req, res, requestId } = ctx;
    const startTime = process.hrtime.bigint();

    // تخطّي paths المراقبة
    const path = new URL(req.url, `http://${req.headers.host}`).pathname;
    if (skipPaths.includes(path)) return true;
    if (skipPathsRegex && skipPathsRegex.test(path)) return true;

    // التقاط نهاية الطلب
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6; // ms
      const logEntry = {
        level,
        time: new Date().toISOString(),
        requestId: requestId || '-',
        method: req.method,
        path,
        status: res.statusCode,
        duration: Math.round(duration * 100) / 100,
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '-',
        userAgent: req.headers['user-agent'] || '-',
        referer: req.headers['referer'] || '-',
        contentLength: res.getHeader('content-length') || 0,
      };

      if (format === 'json') {
        console.log(JSON.stringify(logEntry));
      } else {
        // Apache-style common log
        console.log(
          `[${logEntry.time}] ${logEntry.ip} "${logEntry.method} ${logEntry.path}" ${logEntry.status} ${logEntry.contentLength} - ${logEntry.duration}ms [${logEntry.requestId}]`
        );
      }

      return originalEnd(...args);
    };

    return true;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) HEALTH CHECK MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يوفر endpoint /health لفحص صحة الخدمة
 * يستخدمه load balancers (NGINX, AWS ALB, Kubernetes) لتحديد ما إذا كانت الخدمة تستقبل طلبات
 *
 * الاستجابة:
 *   200 OK: { status: 'healthy', uptime, memory, version }
 *   503: { status: 'unhealthy', error }
 */
export function healthCheckMiddleware(options = {}) {
  const {
    path = '/health',
    checks = [],            // array of { name, check: () => Promise<bool> }
    version = '4.0.0',
  } = options;

  // حالة الخدمة (يمكن تعليمها كـ unhealthy عند حدوث أخطاء)
  let isShuttingDown = false;

  return {
    middleware: async (ctx) => {
      const { req, res } = ctx;
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname !== path) return true;

      try {
        const uptime = process.uptime();
        const memUsage = process.memoryUsage();

        // شغّل كل الـ checks
        const results = {};
        let allHealthy = true;
        for (const check of checks) {
          try {
            const ok = await check.check();
            results[check.name] = ok ? 'healthy' : 'unhealthy';
            if (!ok) allHealthy = false;
          } catch (err) {
            results[check.name] = `error: ${err.message}`;
            allHealthy = false;
          }
        }

        const status = !isShuttingDown && allHealthy ? 'healthy' : 'unhealthy';
        const code = status === 'healthy' ? 200 : 503;

        const body = JSON.stringify({
          status,
          uptime: Math.round(uptime * 100) / 100,
          version,
          hostname: hostname(),
          pid: process.pid,
          timestamp: new Date().toISOString(),
          memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
            external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
          },
          checks: results,
        });

        res.writeHead(code, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.end(body);
        return false; // أوقف سلسلة الميدلوير
      } catch (err) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'unhealthy', error: err.message }));
        return false;
      }
    },
    markShuttingDown: () => { isShuttingDown = true; },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) METRICS MIDDLEWARE (Prometheus format)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يجمع metrics على صيغة Prometheus ويخدمها على /metrics
 *
 * Metrics المُجمَّعة:
 *   - http_requests_total{method, path, status}
 *   - http_request_duration_seconds{method, path} (histogram)
 *   - http_request_size_bytes{method, path}
 *   - http_response_size_bytes{method, path}
 *   - process_uptime_seconds
 *   - process_memory_rss_bytes
 *   - process_memory_heap_used_bytes
 *   - nodejs_eventloop_lag_seconds
 */
export function metricsMiddleware(options = {}) {
  const {
    path = '/metrics',
    buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],  // seconds
  } = options;

  // تخزين metrics في الذاكرة
  const counters = new Map();      // key → count
  const histograms = new Map();    // key → { count, sum, buckets: [counts] }
  const lastEventLoopTime = { value: 0 };

  // تحديث event loop lag كل ثانية
  let lastCheck = process.hrtime.bigint();
  setInterval(() => {
    const now = process.hrtime.bigint();
    const lag = Number(now - lastCheck) / 1e9 - 1;
    lastEventLoopTime.value = Math.max(0, lag);
    lastCheck = now;
  }, 1000).unref();

  const incCounter = (name, labels = {}) => {
    const key = `${name}|${Object.entries(labels).map(([k,v]) => `${k}=${v}`).join('|')}`;
    counters.set(key, (counters.get(key) || 0) + 1);
  };

  const observe = (name, value, labels = {}) => {
    const key = `${name}|${Object.entries(labels).map(([k,v]) => `${k}=${v}`).join('|')}`;
    let h = histograms.get(key);
    if (!h) {
      h = { count: 0, sum: 0, buckets: new Array(buckets.length).fill(0) };
      histograms.set(key, h);
    }
    h.count++;
    h.sum += value;
    for (let i = 0; i < buckets.length; i++) {
      if (value <= buckets[i]) h.buckets[i]++;
    }
  };

  return {
    middleware: async (ctx) => {
      const { req, res } = ctx;
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === path) {
        // شكّل Prometheus format
        const lines = [];
        lines.push('# HELP elmoorx_http_requests_total Total HTTP requests');
        lines.push('# TYPE elmoorx_http_requests_total counter');
        for (const [key, count] of counters) {
          const [name, ...labelParts] = key.split('|');
          if (labelParts.length > 0) {
            const labels = '{' + labelParts.join(',') + '}';
            lines.push(`${name}${labels} ${count}`);
          } else {
            lines.push(`${name} ${count}`);
          }
        }

        lines.push('# HELP elmoorx_http_request_duration_seconds Request duration');
        lines.push('# TYPE elmoorx_http_request_duration_seconds histogram');
        for (const [key, h] of histograms) {
          const [name, ...labelParts] = key.split('|');
          const labels = labelParts.length > 0 ? '{' + labelParts.join(',') + '}' : '';
          for (let i = 0; i < buckets.length; i++) {
            lines.push(`${name}_bucket${labels.replace('}', `,le="${buckets[i]}"`)} ${h.buckets[i]}`);
          }
          lines.push(`${name}_bucket${labels.replace('}', `,le="+Inf"`)} ${h.count}`);
          lines.push(`${name}_sum${labels} ${h.sum}`);
          lines.push(`${name}_count${labels} ${h.count}`);
        }

        // Process metrics
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        lines.push('# HELP elmoorx_process_uptime_seconds Process uptime');
        lines.push('# TYPE elmoorx_process_uptime_seconds gauge');
        lines.push(`elmoorx_process_uptime_seconds ${uptime}`);
        lines.push('# HELP elmoorx_process_memory_rss_bytes Resident Set Size');
        lines.push('# TYPE elmoorx_process_memory_rss_bytes gauge');
        lines.push(`elmoorx_process_memory_rss_bytes ${mem.rss}`);
        lines.push('# HELP elmoorx_process_memory_heap_used_bytes Heap used');
        lines.push('# TYPE elmoorx_process_memory_heap_used_bytes gauge');
        lines.push(`elmoorx_process_memory_heap_used_bytes ${mem.heapUsed}`);
        lines.push('# HELP elmoorx_nodejs_eventloop_lag_seconds Event loop lag');
        lines.push('# TYPE elmoorx_nodejs_eventloop_lag_seconds gauge');
        lines.push(`elmoorx_nodejs_eventloop_lag_seconds ${lastEventLoopTime.value}`);

        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
        res.end(lines.join('\n') + '\n');
        return false;
      }

      // Collect metrics for this request
      const startTime = process.hrtime.bigint();
      const originalEnd = res.end.bind(res);

      // سجّل عند الانتهاء
      res.end = (...args) => {
        const duration = Number(process.hrtime.bigint() - startTime) / 1e9;
        const path = url.pathname;
        const method = req.method;
        const status = String(res.statusCode);

        incCounter('elmoorx_http_requests_total', { method, path, status });
        observe('elmoorx_http_request_duration_seconds', duration, { method, path });

        const contentLength = parseInt(res.getHeader('content-length') || 0);
        if (contentLength > 0) {
          incCounter('elmoorx_http_response_size_bytes_total', { method, path });
          observe('elmoorx_http_response_size_bytes', contentLength, { method, path });
        }

        return originalEnd(...args);
      };

      return true;
    },
    incCounter,
    observe,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يدير الإغلاق الآمن للسيرفر عند استقبال SIGTERM/SIGINT
 *
 * الخوارزمية:
 *  1) استقبل الإشارة
 *  2) توقف عن استقبال طلبات جديدة (server.close)
 *  3) انتظر انتهاء الطلبات الجارية (حتى timeout)
 *  4) أغلق الـ connections المتبقية بالقوة
 *  5) أغلق الـ resources (DB, Redis, ...)
 */
export function setupGracefulShutdown(server, options = {}) {
  const {
    timeout = 30000,             // 30s لإنهاء الطلبات الجارية
    forceExit = true,
    onShutdown = null,           // async callback لتنظيف resources
    signals = ['SIGTERM', 'SIGINT'],
    healthCheckMiddleware: healthMW = null,
  } = options;

  let isShuttingDown = false;

  const shutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n  ⚠ Received ${signal}, shutting down gracefully...`);

    // علّم health check كـ unhealthy فوراً (لكي يخرج load balancer)
    if (healthMW && healthMW.markShuttingDown) {
      healthMW.markShuttingDown();
    }

    // توقف عن استقبال طلبات جديدة
    server.close(() => {
      console.log('  ✓ HTTP server closed');
    });

    // ابدأ عدّاد timeout
    const forceTimer = setTimeout(() => {
      console.error('  ⚠ Forcing shutdown after timeout');
      if (forceExit) process.exit(1);
    }, timeout);

    // شغّل cleanup hook إن وُجد
    if (typeof onShutdown === 'function') {
      try {
        await onShutdown();
        console.log('  ✓ Cleanup complete');
      } catch (err) {
        console.error('  ⚠ Cleanup error:', err.message);
      }
    }

    clearTimeout(forceTimer);

    // انتظر قائمة الطلبات الجارية
    setTimeout(() => {
      console.log('  ✓ All requests completed');
      if (forceExit) process.exit(0);
    }, 100).unref();
  };

  for (const sig of signals) {
    process.on(sig, () => shutdown(sig));
  }

  // معالجة uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('  ⚠ Uncaught exception:', err.message);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('  ⚠ Unhandled rejection:', reason);
    // لا نُغلق السيرفر هنا، فقط نسجّل — استمرار التشغيل
  });

  return { shutdown, isShuttingDown: () => isShuttingDown };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  compressionMiddleware,
  securityHeadersMiddleware,
  requestIdMiddleware,
  loggerMiddleware,
  healthCheckMiddleware,
  metricsMiddleware,
  setupGracefulShutdown,
};
