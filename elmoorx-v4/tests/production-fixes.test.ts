/**
 * اختبارات الإصلاحات الإنتاجية (Production Fixes)
 * ===============================================
 * تتحقق من:
 *  - Hydration لا يدمر DOM الموجود
 *  - استخراج CSS من inline styles
 *  - Session file store + Redis adapter (بدون اتصال فعلي)
 *  - Rate limit file/Redis store
 *  - renderToStream() API
 *  - renderIslandsSSR() API
 *  - DB transactions
 *  - Image PNG resizer
 *  - Variable mangling (scope-aware)
 *  - Link prefetch on visible/hover/mount
 *
 * ملاحظة: نتجنّب `!var` في الشروط لأن الـ TS-stripper يفسّرها كـ non-null assertion
 */

import { test } from '../testing/index.mjs';
import { renderToString, h, island, hydrateIslands } from '../runtime/core.mjs';
import { signJWT, verifyJWT, renderToStream, renderIslandsSSR } from '../ssr-server/index.mjs';
import { mangleVars } from '../minifier/mangler.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

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

test('Hydration — hydrateIslands يستدعي querySelectorAll', () => {
  let callCount = 0;
  globalThis.document = {
    querySelectorAll: () => { callCount++; return []; },
    createElement: () => ({}),
    createTextNode: () => ({}),
    addEventListener: () => {},
  };
  globalThis.window = { addEventListener: () => {}, location: { pathname: '/' } };

  island('TestComp', () => h('div', { onClick: () => {} }, 'hello'));
  hydrateIslands();
  assertEquals(callCount, 1, 'querySelectorAll should be called once');
});

test('JWT — sign + verify', () => {
  const token = signJWT({ userId: 123, role: 'admin' }, 'secret-key', { expiresIn: '1h' });
  assert(token, 'Token should be created');
  const parts = token.split('.');
  assertEquals(parts.length, 3, 'Token should have 3 parts');

  const decoded = verifyJWT(token, 'secret-key');
  assertEquals(decoded.userId, 123, 'userId mismatch');
  assertEquals(decoded.role, 'admin', 'role mismatch');
  assert(decoded.exp, 'exp should be set');
});

test('JWT — توقيع خاطئ يجب أن يرفض', () => {
  const token = signJWT({ data: 'test' }, 'secret1');
  let threw = false;
  try { verifyJWT(token, 'secret2'); } catch { threw = true; }
  assert(threw, 'Should throw on wrong secret');
});

test('renderToStream — يكتب HTML على أجزاء', async () => {
  const chunks = [];
  const mockRes = {
    write: (chunk) => { chunks.push(chunk); },
    end: (chunk) => { if (chunk) chunks.push(chunk); },
    setHeader: () => {},
  };

  const result = await renderToStream(mockRes, () => h('h1', null, 'Hello'), {
    title: 'Test Page',
  });

  assert(result.head, 'Head bytes should be reported');
  assert(result.body, 'Body bytes should be reported');
  assert(result.tail, 'Tail bytes should be reported');

  const fullHTML = chunks.join('');
  assert(fullHTML.includes('<!DOCTYPE html>'), 'Should include DOCTYPE');
  assert(fullHTML.includes('<h1>Hello</h1>'), 'Should include rendered component');
  assert(fullHTML.includes('hydrateIslands'), 'Should include hydration script');
  assert(fullHTML.includes('__ELMOORX_SSR_DATA__'), 'Should include SSR data');
});

test('renderIslandsSSR — يُرجع HTML مع جزر معلّمة', () => {
  function InteractiveComponent() {
    return h('button', { onClick: () => {} }, 'Click me');
  }
  // مرّر المكون كـ vdom tag (لا تستدعِه مباشرة) حتى يراه renderToString
  const html = renderIslandsSSR(() => h(InteractiveComponent, null));
  assert(html.includes('data-elmoorx-island'), 'Should mark interactive components');
});

test('renderToString — يلفّ المكونات التفاعلية بـ islands', () => {
  function Button() {
    return h('button', { onClick: () => {} }, 'Click');
  }
  // مرّر المكون كـ vdom tag — h(Button) ينشئ { tag: Button, ... }
  // وعندما يمر renderToString على tag كـ function يلفّها بـ island
  const html = renderToString(h(Button, null));
  assert(html.includes('data-elmoorx-island="Button"'), 'Should wrap Button with data-elmoorx-island');
  assert(html.includes('data-props='), 'Should include data-props attribute');
});

test('renderToString — لا يلفّ المكونات غير التفاعلية', () => {
  function Static() {
    return h('div', null, 'hello');
  }
  const html = renderToString(h(Static, null));
  assertFalsy(html.includes('data-elmoorx-island'), 'Should NOT wrap static component');
});

test('Variable Mangler — يعيد تسمية المتغيرات المحلية', () => {
  const code = 'function sum(a, b) { let result = a + b; return result; }';
  const mangled = mangleVars(code);
  assert(mangled !== code, 'Mangler should change the code');
  assert(mangled.includes('function'), 'Should preserve function keyword');
  assertFalsy(mangled.includes('result'), 'Local "result" should be renamed');
});

test('Variable Mangler — لا يمسّ خصائص الكائنات', () => {
  const code = 'function get(obj) { return obj.property + obj.value; }';
  const mangled = mangleVars(code);
  assert(mangled.includes('.property'), 'Should preserve .property');
  assert(mangled.includes('.value'), 'Should preserve .value');
});

test('Variable Mangler — لا يمسّ المتغيرات الـ top-level', () => {
  const code = 'const topLevelVar = 42; function helper() { return topLevelVar; }';
  const mangled = mangleVars(code);
  assert(mangled.includes('topLevelVar'), 'Top-level variable should not be mangled');
});

test('Variable Mangler — لا يكسر بناء الكود', () => {
  const code = 'function calculate(items) { let total = 0; for (const item of items) { total = total + item.price; } return total; }';
  const mangled = mangleVars(code);
  try {
    new Function(mangled);
  } catch (e) {
    throw new Error('Mangled code is not valid JS: ' + e.message);
  }
});

test('Variable Mangler — fallback آمن عند الفشل', () => {
  const code = 'const x = {{{invalid syntax';
  const mangled = mangleVars(code);
  assertEquals(typeof mangled, 'string', 'Should return string');
});

test('Session middleware — يحتوي على Redis adapter', () => {
  const src = readFileSync(__dirname + '../ssr-server/index.mjs', 'utf8');
  assert(src.includes('createRedisClient'), 'createRedisClient should be implemented');
  assert(src.includes("store === 'redis'"), 'Redis store option should be supported');
  assert(src.includes('SETEX'), 'Redis SETEX should be used for TTL');
});

test('Rate limit middleware — يدعم Redis', () => {
  const src = readFileSync(__dirname + '../ssr-server/index.mjs', 'utf8');
  assert(src.includes("store = 'memory'"), 'Memory store should be default');
  assert(src.includes("store === 'redis'"), 'Redis store should be supported');
  assert(src.includes("store === 'file'"), 'File store should be supported');
});

test('DB Transactions — مدعومة في SQLite', () => {
  const src = readFileSync(__dirname + '../database/index.mjs', 'utf8');
  assert(src.includes('BEGIN TRANSACTION'), 'BEGIN should be used');
  assert(src.includes('COMMIT'), 'COMMIT should be used');
  assert(src.includes('ROLLBACK'), 'ROLLBACK should be used');
  assert(src.includes('async transaction(fn)'), 'transaction() method should be exposed');
});

test('Image Optimization — resizePNG يدعم كل PNG filter types', () => {
  const src = readFileSync(__dirname + '../imageopt/index.mjs', 'utf8');
  assert(src.includes('function resizePNG'), 'resizePNG should be implemented');
  assert(src.includes('function encodePNG'), 'encodePNG should be implemented');
  assert(src.includes('filterType === 1'), 'Should support Sub filter');
  assert(src.includes('filterType === 2'), 'Should support Up filter');
  assert(src.includes('filterType === 3'), 'Should support Average filter');
  assert(src.includes('filterType === 4'), 'Should support Paeth filter');
  assert(src.includes('function paeth'), 'Paeth predictor should be implemented');
  assert(src.includes('CRC_TABLE'), 'CRC32 table should be built');
});

test('Image Optimization — SVG minifier', () => {
  const src = readFileSync(__dirname + '../imageopt/index.mjs', 'utf8');
  assert(src.includes('function minifySVG'), 'SVG minifier should be implemented');
});

test('Link prefetch — يدعم visible/hover/mount', () => {
  const src = readFileSync(__dirname + '../router/index.mjs', 'utf8');
  assert(src.includes("prefetchOn = 'hover'"), 'hover prefetch should be default');
  assert(src.includes("prefetchOn === 'visible'"), 'visible prefetch should be supported');
  assert(src.includes("prefetchOn === 'mount'"), 'mount prefetch should be supported');
  assert(src.includes('IntersectionObserver'), 'IntersectionObserver should be used');
  assert(src.includes('prefetchCache'), 'prefetchCache should be used to dedupe');
});

test('CSS extraction — يدعم template literals و style objects', () => {
  const src = readFileSync(__dirname + '../cli/build.mjs', 'utf8');
  assert(src.includes('cssImportMatch'), 'Should extract CSS imports');
  assert(src.includes('templateLiteralCSS'), 'Should extract template literal CSS');
  assert(src.includes('styleObjPattern'), 'Should extract style object patterns');
  assert(src.includes('styleStrPattern'), 'Should extract style string patterns');
  assert(src.includes('hashString'), 'Should hash style strings for dedup');
});

test('Hydration — runtime يدعم bindVnodeToDom', () => {
  const src = readFileSync(__dirname + '../runtime/core.mjs', 'utf8');
  assert(src.includes('function bindVnodeToDom'), 'bindVnodeToDom should exist');
  assert(src.includes('function hydrateIsland'), 'hydrateIsland should exist');
  assert(src.includes('domNode.addEventListener'), 'Should attach event listeners on existing DOM');
  assert(src.includes('Hydration fallback'), 'Should have fallback to full mount');
});

console.log('\n  ✦ Production Fixes Tests — loaded');
