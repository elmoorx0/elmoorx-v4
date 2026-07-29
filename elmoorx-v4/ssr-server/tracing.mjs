/**
 * Elmoorx v4 — Tracing (OpenTelemetry-style، بدون تبعيات)
 * =====================================================
 * تتبّع موزّع للطلبات عبر الـ services.
 *
 * المميزات:
 *   - Span generation لكل طلب HTTP
 *   - Context propagation عبر services (W3C Trace Context)
 *   - Exporters: console, file, OTLP/HTTP (JSON)
 *   - Sampling rate قابل للتخصيص
 *   - Integration مع requestId + logger
 *
 * الاستخدام:
 *   import { tracingMiddleware, startSpan, endSpan } from './tracing.mjs';
 *   tracingMiddleware({ serviceName: 'my-api', exporter: 'console' })
 *
 *   const span = startSpan('db-query');
 *   // ... do work
 *   endSpan(span, { rows: 42 });
 */

import { randomBytes } from 'node:crypto';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) TRACE CONTEXT (W3C Trace Context)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يولّد trace ID بصيغة W3C (32 hex chars)
 */
function generateTraceId() {
  return randomBytes(16).toString('hex');
}

/**
 * يولّد span ID (16 hex chars)
 */
function generateSpanId() {
  return randomBytes(8).toString('hex');
}

/**
 * يبني traceparent header بصيغة W3C
 *   version-traceid-spanid-flags
 *   مثال: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 */
function buildTraceparent(traceId, spanId, sampled = true) {
  return `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`;
}

/**
 * يحلّل traceparent header
 */
function parseTraceparent(header) {
  if (!header || typeof header !== 'string') return null;
  const m = header.match(/^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i);
  if (!m) return null;
  return {
    version: m[1],
    traceId: m[2],
    spanId: m[3],
    flags: m[4],
    sampled: m[4] === '01',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SPAN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

const activeSpans = new Map(); // spanId → span

/**
 * يبدأ span جديد
 * @param {string} name  اسم العملية
 * @param {object} attrs  attributes إضافية
 * @param {object} parent  parent span (للـ nested spans)
 */
export function startSpan(name, attrs = {}, parent = null) {
  const spanId = generateSpanId();
  const traceId = parent?.traceId || generateTraceId();
  const parentSpanId = parent?.spanId || null;

  const span = {
    spanId,
    traceId,
    parentSpanId,
    name,
    attrs: { ...attrs },
    startTime: Date.now(),
    startHrtime: process.hrtime.bigint(),
    status: 'OK',
    events: [],
  };

  activeSpans.set(spanId, span);
  return span;
}

/**
 * ينهي span ويسجّله
 * @param {object} span  الـ span المراد إنهاؤه
 * @param {object} endAttrs  attributes إضافية عند الإنهاء
 */
export function endSpan(span, endAttrs = {}) {
  if (!span) return;
  const duration = Number(process.hrtime.bigint() - span.startHrtime) / 1e6; // ms
  span.endTime = Date.now();
  span.durationMs = Math.round(duration * 100) / 100;
  Object.assign(span.attrs, endAttrs);

  activeSpans.delete(span.spanId);

  // صدّر الـ span
  if (globalTracer) {
    globalTracer.exportSpan(span);
  }

  return span;
}

/**
 * يضيف event للـ span
 */
export function addEvent(span, name, attrs = {}) {
  if (!span) return;
  span.events.push({
    name,
    attrs,
    time: Date.now(),
  });
}

/**
 * يضع attribute على span
 */
export function setAttribute(span, key, value) {
  if (!span) return;
  span.attrs[key] = value;
}

/**
 * يضع status الـ span
 */
export function setStatus(span, status, message = '') {
  if (!span) return;
  span.status = status; // 'OK' | 'ERROR'
  if (message) span.statusMessage = message;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) TRACER (global)
// ─────────────────────────────────────────────────────────────────────────────

let globalTracer = null;

export class Tracer {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'elmoorx-app';
    this.serviceVersion = options.serviceVersion || '4.0.0';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.samplingRate = options.samplingRate || 1.0; // 100% افتراضياً
    this.exporter = options.exporter || 'console';
    this.exporterOptions = options.exporterOptions || {};
    this.spans = []; // buffer
    this.maxBufferSize = options.maxBufferSize || 1000;
    this.flushInterval = options.flushInterval || 5000; // 5s

    // ابدأ flush دوري
    if (this.exporter !== 'console') {
      this._flushTimer = setInterval(() => this.flush(), this.flushInterval);
      this._flushTimer.unref?.();
    }

    // ملف الـ export
    if (this.exporter === 'file') {
      const filePath = this.exporterOptions.path || './logs/traces.jsonl';
      const dir = resolve(filePath).split('/').slice(0, -1).join('/');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      this.filePath = filePath;
      // اكتب header
      if (!existsSync(filePath)) {
        appendFileSync(filePath, `# Elmoorx v4 Traces — ${new Date().toISOString()}\n`);
      }
    }
  }

  /**
   * يصدّر span واحد
   */
  exportSpan(span) {
    // sampling
    if (Math.random() > this.samplingRate) return;

    if (this.exporter === 'console') {
      this._logSpan(span);
    } else {
      // buffer للـ flush لاحقاً
      this.spans.push(this._formatSpan(span));
      if (this.spans.length >= this.maxBufferSize) {
        this.flush();
      }
    }
  }

  /**
   * يصدّر كل الـ spans المُخزّنة
   */
  async flush() {
    if (this.spans.length === 0) return;

    const batch = [...this.spans];
    this.spans = [];

    if (this.exporter === 'file') {
      for (const span of batch) {
        appendFileSync(this.filePath, JSON.stringify(span) + '\n');
      }
    } else if (this.exporter === 'otlp') {
      // OTLP/HTTP export
      await this._exportOTLP(batch);
    } else if (this.exporter === 'console') {
      for (const span of batch) {
        this._logSpan(span);
      }
    }
  }

  /**
   * OTLP/HTTP export (لـ Tempo, Jaeger, Honeycomb, ...)
   */
  async _exportOTLP(spans) {
    const endpoint = this.exporterOptions.endpoint;
    if (!endpoint) return;
    const headers = this.exporterOptions.headers || {};

    const payload = {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: this.serviceName } },
            { key: 'service.version', value: { stringValue: this.serviceVersion } },
            { key: 'deployment.environment', value: { stringValue: this.environment } },
          ],
        },
        scopeSpans: [{
          spans: spans.map(s => this._toOTLPSpan(s)),
        }],
      }],
    };

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error('[tracing] OTLP export failed:', err.message);
    }
  }

  _toOTLPSpan(span) {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId || undefined,
      name: span.name,
      kind: 'SPAN_KIND_SERVER',
      startTimeUnixNano: String(span.startTime * 1e6),
      endTimeUnixNano: String((span.endTime || Date.now()) * 1e6),
      status: {
        code: span.status === 'ERROR' ? 2 : 1,
        message: span.statusMessage,
      },
      attributes: Object.entries(span.attrs).map(([k, v]) => ({
        key: k,
        value: typeof v === 'number' ? { doubleValue: v } : { stringValue: String(v) },
      })),
      events: span.events.map(e => ({
        name: e.name,
        timeUnixNano: String(e.time * 1e6),
        attributes: Object.entries(e.attrs).map(([k, v]) => ({
          key: k,
          value: { stringValue: String(v) },
        })),
      })),
    };
  }

  _formatSpan(span) {
    return {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      serviceName: this.serviceName,
      startTime: span.startTime,
      endTime: span.endTime,
      durationMs: span.durationMs,
      status: span.status,
      statusMessage: span.statusMessage,
      attrs: span.attrs,
      events: span.events,
    };
  }

  _logSpan(span) {
    const status = span.status === 'ERROR' ? '✗' : '✓';
    const duration = span.durationMs ? `${span.durationMs}ms` : '';
    const attrs = Object.keys(span.attrs).length > 0
      ? ' ' + JSON.stringify(span.attrs)
      : '';
    console.log(`[trace] ${status} ${span.name} ${duration}${attrs}`);
  }

  /**
   * يُنهي الـ tracer ويصدّر كل الـ spans المتبقية
   */
  async shutdown() {
    if (this._flushTimer) clearInterval(this._flushTimer);
    await this.flush();
  }
}

/**
 * يبدأ tracer عالمي
 */
export function initTracing(options = {}) {
  globalTracer = new Tracer(options);
  return globalTracer;
}

/**
 * يُرجع الـ tracer الحالي
 */
export function getTracer() {
  return globalTracer;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) TRACING MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ميدلوير تتبّع للـ HTTP requests
 * يبدأ span لكل طلب، يلتقط traceparent الوارد، وينشر traceparent للـ outgoing
 */
export function tracingMiddleware(options = {}) {
  const {
    serviceName = 'elmoorx-app',
    exporter = 'console',
    exporterOptions = {},
    samplingRate = 1.0,
    recordBody = false,
    maxBodySize = 1024,
  } = options;

  // ابدأ tracer عالمي إن لم يكن موجوداً
  if (!globalTracer) {
    initTracing({ serviceName, exporter, exporterOptions, samplingRate });
  }

  return async (ctx) => {
    const { req, res } = ctx;

    // حلّل traceparent الوارد (من upstream service)
    const incoming = parseTraceparent(req.headers['traceparent']);

    // ابدأ span جديد
    const parent = incoming ? { traceId: incoming.traceId, spanId: incoming.spanId } : null;
    const span = startSpan(`HTTP ${req.method} ${new URL(req.url, 'http://x').pathname}`, {
      'http.method': req.method,
      'http.url': req.url,
      'http.host': req.headers.host,
      'http.user_agent': req.headers['user-agent'] || '',
      'http.scheme': 'http',
      'net.peer.ip': req.socket.remoteAddress,
    }, parent);

    ctx.span = span;
    ctx.traceId = span.traceId;

    // أضف traceparent للاستجابة (للتتبّع)
    res.setHeader('traceparent', buildTraceparent(span.traceId, span.spanId, true));

    // التقاط نهاية الطلب
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      const status = res.statusCode;
      setAttribute(span, 'http.status_code', status);
      setStatus(span, status >= 500 ? 'ERROR' : 'OK', status >= 500 ? `HTTP ${status}` : '');
      if (status >= 400) {
        addEvent(span, 'error', { status });
      }
      endSpan(span);
      return originalEnd(...args);
    };

    return true;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) HELPERS FOR OUTGOING REQUESTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يبني traceparent header لـ outgoing request (لنشر الـ context)
 */
export function propagateTrace(ctx) {
  if (!ctx?.span) return {};
  return {
    traceparent: buildTraceparent(ctx.span.traceId, ctx.span.spanId, true),
  };
}

/**
 * يلفّ fetch بـ span تلقائي
 */
export function tracedFetch(url, options = {}, ctx = null) {
  if (ctx?.span) {
    const childSpan = startSpan(`fetch ${options.method || 'GET'} ${new URL(url, 'http://x').pathname}`, {
      'http.url': url,
      'http.method': options.method || 'GET',
    }, ctx.span);

    const headers = {
      ...propagateTrace(ctx),
      ...(options.headers || {}),
    };

    return fetch(url, { ...options, headers }).then(res => {
      setAttribute(childSpan, 'http.status_code', res.status);
      setStatus(childSpan, res.status >= 500 ? 'ERROR' : 'OK');
      endSpan(childSpan);
      return res;
    }).catch(err => {
      setStatus(childSpan, 'ERROR', err.message);
      addEvent(childSpan, 'exception', { message: err.message });
      endSpan(childSpan);
      throw err;
    });
  }
  return fetch(url, options);
}

export default {
  Tracer,
  initTracing,
  getTracer,
  startSpan,
  endSpan,
  addEvent,
  setAttribute,
  setStatus,
  tracingMiddleware,
  propagateTrace,
  tracedFetch,
};
