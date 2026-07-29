/**
 * اختبارات Tracing + Cache + Config
 * =================================
 */

import { test } from '../testing/index.mjs';
import {
  initTracing,
  startSpan,
  endSpan,
  addEvent,
  setAttribute,
  setStatus,
  tracingMiddleware,
  propagateTrace,
  Tracer,
} from '../ssr-server/tracing.mjs';
import { Cache, createCache, cacheMiddleware } from '../ssr-server/cache.mjs';
import { parseEnvFile, loadEnv, getConfig, validateConfig, getConfigByPrefix } from '../utils/config.mjs';

function assert(value, msg) {
  if (value === null || value === undefined || value === false || value === 0 || value === '') {
    throw new Error(msg || 'Assertion failed');
  }
}
function assertFalsy(value, msg) {
  if (value) throw new Error(msg || 'Expected falsy');
}
function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + ` Expected ${expected}, got ${actual}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tracing Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Tracing — startSpan + endSpan', () => {
  const tracer = initTracing({ serviceName: 'test', exporter: 'console' });
  const span = startSpan('test-op', { user: 'alice' });
  assert(span.spanId, 'Should generate spanId');
  assert(span.traceId, 'Should generate traceId');
  assertEquals(span.name, 'test-op', 'Should have name');
  assertEquals(span.attrs.user, 'alice', 'Should have attrs');
  assertFalsy(span.endTime, 'Should not have endTime before endSpan');

  const ended = endSpan(span, { result: 'success' });
  assert(ended.endTime, 'Should have endTime after endSpan');
  assert(ended.durationMs >= 0, 'Should have durationMs');
  assertEquals(ended.attrs.result, 'success', 'Should merge endAttrs');
});

test('Tracing — nested spans تحافظ على traceId', () => {
  initTracing({ serviceName: 'test', exporter: 'console' });
  const parent = startSpan('parent');
  const child = startSpan('child', {}, parent);

  assertEquals(child.traceId, parent.traceId, 'Child should inherit traceId');
  assertEquals(child.parentSpanId, parent.spanId, 'Child should have parentSpanId');
  assertFalsy(child.spanId === parent.spanId, 'Child should have unique spanId');

  endSpan(child);
  endSpan(parent);
});

test('Tracing — addEvent + setAttribute + setStatus', () => {
  initTracing({ serviceName: 'test', exporter: 'console' });
  const span = startSpan('test');

  addEvent(span, 'cache-hit', { key: 'user:123' });
  assertEquals(span.events.length, 1, 'Should have 1 event');
  assertEquals(span.events[0].name, 'cache-hit', 'Event name');

  setAttribute(span, 'user.id', 42);
  assertEquals(span.attrs['user.id'], 42, 'Should set attribute');

  setStatus(span, 'ERROR', 'something failed');
  assertEquals(span.status, 'ERROR', 'Should set status');
  assertEquals(span.statusMessage, 'something failed', 'Should set statusMessage');

  endSpan(span);
});

test('Tracing — propagateTrace يبني traceparent', () => {
  initTracing({ serviceName: 'test', exporter: 'console' });
  const span = startSpan('test');
  const ctx = { span };
  const headers = propagateTrace(ctx);
  assert(headers.traceparent, 'Should return traceparent header');
  // W3C format: 00-<traceId>-<spanId>-01
  const parts = headers.traceparent.split('-');
  assertEquals(parts.length, 4, 'Should have 4 parts');
  assertEquals(parts[0], '00', 'Version 00');
  assertEquals(parts[1], span.traceId, 'traceId matches');
  assertEquals(parts[2], span.spanId, 'spanId matches');
  assertEquals(parts[3], '01', 'Sampled flag 01');
  endSpan(span);
});

test('Tracing — Tracer class exists', () => {
  const tracer = new Tracer({ serviceName: 'my-svc', exporter: 'console' });
  assertEquals(tracer.serviceName, 'my-svc', 'Should set serviceName');
  assertEquals(typeof tracer.exportSpan, 'function', 'Should have exportSpan');
  assertEquals(typeof tracer.flush, 'function', 'Should have flush');
  assertEquals(typeof tracer.shutdown, 'function', 'Should have shutdown');
});

// ─────────────────────────────────────────────────────────────────────────────
// Cache Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Cache — set + get', () => {
  const cache = createCache({ ttl: 60000 });
  cache.set('user:1', { name: 'Alice' });
  const user = cache.get('user:1');
  assertEquals(user.name, 'Alice', 'Should retrieve cached value');
  cache.destroy();
});

test('Cache — TTL expiry', async () => {
  const cache = createCache({ ttl: 50 }); // 50ms
  cache.set('temp', 'value');
  assertEquals(cache.get('temp'), 'value', 'Should be cached initially');
  await new Promise(r => setTimeout(r, 100));
  assertFalsy(cache.get('temp'), 'Should expire after TTL');
  cache.destroy();
});

test('Cache — LRU eviction', () => {
  const cache = createCache({ max: 3, ttl: 0 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  // الوصول لـ 'a' يجعله الأحدث استخداماً
  cache.get('a');
  // أضف 'd' — يجب أن يحذف 'b' (الأقل استخداماً)
  cache.set('d', 4);

  assertFalsy(cache.get('b'), 'b should be evicted (LRU)');
  assert(cache.get('a'), 'a should still be cached (recently used)');
  assert(cache.get('c'), 'c should still be cached');
  assert(cache.get('d'), 'd should be cached');
  cache.destroy();
});

test('Cache — getOrSet يحسب القيمة إن لم تكن موجودة', async () => {
  const cache = createCache({ ttl: 60000 });
  let callCount = 0;
  const factory = async () => {
    callCount++;
    return { computed: true };
  };

  const r1 = await cache.getOrSet('key1', factory);
  assertEquals(r1.computed, true, 'Should return computed value');
  assertEquals(callCount, 1, 'Should call factory once');

  const r2 = await cache.getOrSet('key1', factory);
  assertEquals(callCount, 1, 'Should NOT call factory second time (cached)');
  cache.destroy();
});

test('Cache — tag-based invalidation', () => {
  const cache = createCache({ ttl: 0 });
  cache.set('user:1', { name: 'Alice' }, { tags: ['users'] });
  cache.set('user:2', { name: 'Bob' }, { tags: ['users'] });
  cache.set('post:1', { title: 'Hello' }, { tags: ['posts'] });

  const invalidated = cache.invalidateTag('users');
  assertEquals(invalidated, 2, 'Should invalidate 2 user entries');
  assertFalsy(cache.get('user:1'), 'user:1 should be invalidated');
  assertFalsy(cache.get('user:2'), 'user:2 should be invalidated');
  assert(cache.get('post:1'), 'post:1 should still be cached (different tag)');
  cache.destroy();
});

test('Cache — has (بدون تحديث access time)', () => {
  const cache = createCache({ ttl: 0 });
  cache.set('x', 42);
  assert(cache.has('x'), 'Should have x');
  assertFalsy(cache.has('y'), 'Should not have y');
  cache.destroy();
});

test('Cache — delete', () => {
  const cache = createCache({ ttl: 0 });
  cache.set('x', 42);
  assert(cache.delete('x'), 'Should delete x');
  assertFalsy(cache.get('x'), 'Should be deleted');
  assertFalsy(cache.delete('nonexistent'), 'Should return false for nonexistent');
  cache.destroy();
});

test('Cache — getStats', () => {
  const cache = createCache({ ttl: 0 });
  cache.set('a', 1);
  cache.get('a'); // hit
  cache.get('b'); // miss

  const stats = cache.getStats();
  assertEquals(stats.hits, 1, 'Should have 1 hit');
  assertEquals(stats.misses, 1, 'Should have 1 miss');
  assertEquals(stats.size, 1, 'Should have 1 entry');
  assert(stats.hitRate, 'Should have hitRate');
  cache.destroy();
});

test('Cache — clear', () => {
  const cache = createCache({ ttl: 0 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.clear();
  assertFalsy(cache.get('a'), 'Should be cleared');
  assertFalsy(cache.get('b'), 'Should be cleared');
  assertEquals(cache.getStats().size, 0, 'Size should be 0');
  cache.destroy();
});

// ─────────────────────────────────────────────────────────────────────────────
// Config Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Config — parseEnvFile', () => {
  const content = `
# Comment
KEY1=value1
KEY2="value with spaces"
KEY3='literal $NO_INTERP'
KEY4=with_$KEY1
EMPTY=
export EXPORTED=exported_value
`;
  const result = parseEnvFile(content);
  assertEquals(result.KEY1, 'value1', 'Simple value');
  assertEquals(result.KEY2, 'value with spaces', 'Quoted value');
  assertEquals(result.KEY3, 'literal $NO_INTERP', 'Single quotes (no interpolation)');
  assertEquals(result.KEY4, 'with_value1', 'Interpolation');
  assertEquals(result.EMPTY, '', 'Empty value');
  assertEquals(result.EXPORTED, 'exported_value', 'export keyword');
});

test('Config — parseEnvFile with default value', () => {
  const content = `
WITH_DEFAULT=\${MISSING_VAR:-default_value}
WITH_VALUE=actual
INTERPOLATED=\${WITH_VALUE}
`;
  const result = parseEnvFile(content);
  assertEquals(result.WITH_DEFAULT, 'default_value', 'Should use default when var is missing');
  assertEquals(result.INTERPOLATED, 'actual', 'Should interpolate existing var');
});

test('Config — getConfig مع types', () => {
  // ضبط process.env
  process.env.TEST_NUM = '42';
  process.env.TEST_BOOL_TRUE = 'true';
  process.env.TEST_BOOL_FALSE = 'false';
  process.env.TEST_JSON = '{"key":"value"}';
  process.env.TEST_ARRAY = 'a,b,c';

  assertEquals(getConfig('TEST_NUM', 0, { type: 'number' }), 42, 'Number type');
  assertEquals(getConfig('TEST_BOOL_TRUE', false, { type: 'boolean' }), true, 'Boolean true');
  assertEquals(getConfig('TEST_BOOL_FALSE', true, { type: 'boolean' }), false, 'Boolean false');
  assertEquals(getConfig('TEST_JSON', null, { type: 'json' }).key, 'value', 'JSON type');
  assertEquals(getConfig('TEST_ARRAY', [], { type: 'array' }).length, 3, 'Array type');

  // default value
  assertEquals(getConfig('NONEXISTENT', 'default'), 'default', 'Should use default');

  // cleanup
  delete process.env.TEST_NUM;
  delete process.env.TEST_BOOL_TRUE;
  delete process.env.TEST_BOOL_FALSE;
  delete process.env.TEST_JSON;
  delete process.env.TEST_ARRAY;
});

test('Config — getConfig required', () => {
  let threw = false;
  try {
    getConfig('DEFINITELY_DOES_NOT_EXIST', null, { required: true });
  } catch {
    threw = true;
  }
  assert(threw, 'Should throw when required and missing');
});

test('Config — getConfig with choices', () => {
  process.env.TEST_CHOICE = 'invalid';
  let threw = false;
  try {
    getConfig('TEST_CHOICE', null, { choices: ['valid', 'also-valid'] });
  } catch {
    threw = true;
  }
  assert(threw, 'Should throw when value not in choices');

  process.env.TEST_CHOICE = 'valid';
  assertEquals(getConfig('TEST_CHOICE', null, { choices: ['valid', 'also-valid'] }), 'valid', 'Should accept valid choice');
  delete process.env.TEST_CHOICE;
});

test('Config — getConfig with min/max (number)', () => {
  process.env.TEST_PORT = '99999';
  let threw = false;
  try {
    getConfig('TEST_PORT', 0, { type: 'number', max: 65535 });
  } catch {
    threw = true;
  }
  assert(threw, 'Should throw when above max');

  process.env.TEST_PORT = '80';
  assertEquals(getConfig('TEST_PORT', 0, { type: 'number', min: 1, max: 65535 }), 80, 'Should accept valid range');
  delete process.env.TEST_PORT;
});

test('Config — getConfigByPrefix', () => {
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_USER = 'admin';
  process.env.OTHER_VAR = 'ignore';

  const dbConfig = getConfigByPrefix('DB_');
  assertEquals(dbConfig.host, 'localhost', 'Should extract host');
  assertEquals(dbConfig.port, '5432', 'Should extract port');
  assertEquals(dbConfig.user, 'admin', 'Should extract user');
  assertFalsy(dbConfig.other_var, 'Should not include OTHER_VAR');

  delete process.env.DB_HOST;
  delete process.env.DB_PORT;
  delete process.env.DB_USER;
  delete process.env.OTHER_VAR;
});

test('Config — validateConfig', () => {
  process.env.MY_PORT = '3000';
  process.env.MY_REQUIRED = 'set';

  const config = validateConfig({
    MY_PORT: { type: 'number', default: 8080, min: 1, max: 65535 },
    MY_REQUIRED: { required: true },
    MY_OPTIONAL: { type: 'string', default: 'hello' },
  });

  assertEquals(config.MY_PORT, 3000, 'Should parse number');
  assertEquals(config.MY_REQUIRED, 'set', 'Should get required');
  assertEquals(config.MY_OPTIONAL, 'hello', 'Should use default');

  delete process.env.MY_PORT;
  delete process.env.MY_REQUIRED;
});

test('Config — validateConfig يفشل عند required مفقود', () => {
  // تأكد أن REQUIRED_MISSING غير موجود
  delete process.env.REQUIRED_MISSING;
  let threw = false;
  try {
    validateConfig({
      REQUIRED_MISSING: { required: true },
    });
  } catch {
    threw = true;
  }
  assert(threw, 'Should throw when required is missing');
});

console.log('\n  ✦ Tracing + Cache + Config Tests — loaded');
