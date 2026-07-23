/**
 * Elmoorx v4 — Testing Framework مدمج
 * =====================================
 * إطار اختبار بدون تبعيات:
 *   - describe / it / test
 *   - expect مع matchers شاملة
 *   - before/after hooks
 *   - async tests
 *   - coverage بسيط
 *   - colored output
 *   - watch mode
 *   - mock/spy
 *
 * استخدام:
 *   import { describe, it, expect } from '@elmoorx/testing';
 *   describe('signals', () => {
 *     it('should work', () => {
 *       expect(1 + 1).toBe(2);
 *     });
 *   });
 *
 * تشغيل: elmoorx test
 */

// ─────────────────────────────────────────────────────────────────────────────
// 0) BROWSER SHIMS — للـ tests في Node
// ─────────────────────────────────────────────────────────────────────────────

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
if (typeof globalThis.performance === 'undefined') {
  const { performance: nodePerf } = await import('node:perf_hooks');
  globalThis.performance = nodePerf;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) STATE
// ─────────────────────────────────────────────────────────────────────────────

const suites = [];
let currentSuite = null;
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;
const failures = [];

// ─────────────────────────────────────────────────────────────────────────────
// 2) DESCRIBE / IT / TEST
// ─────────────────────────────────────────────────────────────────────────────

export function describe(name, fn) {
  const suite = { name, tests: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [], suites: [] };
  if (currentSuite) currentSuite.suites.push(suite);
  else suites.push(suite);
  const prevSuite = currentSuite;
  currentSuite = suite;
  fn();
  currentSuite = prevSuite;
}

export const it = test;
export function test(name, fn, options = {}) {
  if (!currentSuite) {
    suites.push({ name: '', tests: [], suites: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [] });
    currentSuite = suites[suites.length - 1];
  }
  currentSuite.tests.push({ name, fn, ...options });
}

export function it_skip(name, fn) {
  test(name, fn, { skip: true });
}
export const xit = it_skip;
export const xdescribe = (name, fn) => {
  const suite = { name, tests: [], suites: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [], skip: true };
  if (currentSuite) currentSuite.suites.push(suite);
  else suites.push(suite);
};

// ─────────────────────────────────────────────────────────────────────────────
// 3) HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function beforeAll(fn) { currentSuite?.beforeAll.push(fn); }
export function afterAll(fn) { currentSuite?.afterAll.push(fn); }
export function beforeEach(fn) { currentSuite?.beforeEach.push(fn); }
export function afterEach(fn) { currentSuite?.afterEach.push(fn); }

// ─────────────────────────────────────────────────────────────────────────────
// 4) EXPECT — matchers
// ─────────────────────────────────────────────────────────────────────────────

export function expect(actual) {
  return new Expectation(actual);
}

class Expectation {
  constructor(actual) {
    this.actual = actual;
  }

  toBe(expected) {
    if (Object.is(this.actual, expected)) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be ${format(expected)}`);
  }

  toEqual(expected) {
    if (deepEqual(this.actual, expected)) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to equal ${format(expected)}`);
  }

  toBeTruthy() {
    if (this.actual) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be truthy`);
  }

  toBeFalsy() {
    if (!this.actual) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be falsy`);
  }

  toBeNull() {
    if (this.actual === null) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be null`);
  }

  toBeUndefined() {
    if (this.actual === undefined) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be undefined`);
  }

  toBeDefined() {
    if (this.actual !== undefined) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be defined`);
  }

  toBeNaN() {
    if (Number.isNaN(this.actual)) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be NaN`);
  }

  toBeGreaterThan(expected) {
    if (this.actual > expected) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be greater than ${format(expected)}`);
  }

  toBeGreaterThanOrEqual(expected) {
    if (this.actual >= expected) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be >= ${format(expected)}`);
  }

  toBeLessThan(expected) {
    if (this.actual < expected) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be less than ${format(expected)}`);
  }

  toBeLessThanOrEqual(expected) {
    if (this.actual <= expected) return this;
    throw new AssertionError(`Expected ${format(this.actual)} to be <= ${format(expected)}`);
  }

  toContain(expected) {
    if (typeof this.actual === 'string') {
      if (this.actual.includes(expected)) return this;
      throw new AssertionError(`Expected "${this.actual}" to contain "${expected}"`);
    }
    if (Array.isArray(this.actual)) {
      if (this.actual.includes(expected)) return this;
      throw new AssertionError(`Expected array to contain ${format(expected)}`);
    }
    throw new AssertionError(`toContain requires string or array, got ${typeof this.actual}`);
  }

  toHaveLength(expected) {
    if (this.actual?.length === expected) return this;
    throw new AssertionError(`Expected length ${expected}, got ${this.actual?.length}`);
  }

  toMatch(regex) {
    if (regex.test(this.actual)) return this;
    throw new AssertionError(`Expected "${this.actual}" to match ${regex}`);
  }

  toThrow(expectedMessage) {
    if (typeof this.actual !== 'function') {
      throw new AssertionError(`toThrow requires a function`);
    }
    try {
      this.actual();
      throw new AssertionError(`Expected function to throw`);
    } catch (err) {
      if (err instanceof AssertionError && err.message === 'Expected function to throw') throw err;
      if (expectedMessage && !err.message.includes(expectedMessage)) {
        throw new AssertionError(`Expected error message "${err.message}" to contain "${expectedMessage}"`);
      }
      return this;
    }
  }

  async toResolve() {
    if (!(this.actual instanceof Promise)) {
      throw new AssertionError(`Expected ${format(this.actual)} to be a Promise`);
    }
    try { await this.actual; return this; }
    catch (err) { throw new AssertionError(`Expected Promise to resolve, but it rejected: ${err.message}`); }
  }

  async toReject() {
    if (!(this.actual instanceof Promise)) {
      throw new AssertionError(`Expected ${format(this.actual)} to be a Promise`);
    }
    try {
      await this.actual;
      throw new AssertionError(`Expected Promise to reject`);
    } catch (err) {
      if (err instanceof AssertionError && err.message === 'Expected Promise to reject') throw err;
      return this;
    }
  }

  not = {
    toBe: (expected) => {
      if (Object.is(this.actual, expected)) {
        throw new AssertionError(`Expected ${format(this.actual)} NOT to be ${format(expected)}`);
      }
      return this;
    },
    toEqual: (expected) => {
      if (deepEqual(this.actual, expected)) {
        throw new AssertionError(`Expected ${format(this.actual)} NOT to equal ${format(expected)}`);
      }
      return this;
    },
    toContain: (expected) => {
      if (typeof this.actual === 'string' && this.actual.includes(expected)) {
        throw new AssertionError(`Expected "${this.actual}" NOT to contain "${expected}"`);
      }
      return this;
    },
    toBeNull: () => {
      if (this.actual === null) throw new AssertionError(`Expected NOT to be null`);
      return this;
    },
    toBeTruthy: () => {
      if (this.actual) throw new AssertionError(`Expected NOT to be truthy`);
      return this;
    },
  };
}

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) MOCK / SPY
// ─────────────────────────────────────────────────────────────────────────────

export function mock(fn) {
  const calls = [];
  const results = [];
  const mockFn = function (...args) {
    calls.push(args);
    if (fn) {
      const result = fn.apply(this, args);
      results.push(result);
      return result;
    }
    return undefined;
  };
  mockFn.calls = calls;
  mockFn.results = results;
  mockFn.mockReturnValue = (val) => { fn = () => val; return mockFn; };
  mockFn.mockImplementation = (impl) => { fn = impl; return mockFn; };
  mockFn.toHaveBeenCalled = () => calls.length > 0;
  mockFn.toHaveBeenCalledTimes = (n) => calls.length === n;
  mockFn.toHaveBeenCalledWith = (...args) => calls.some(c => deepEqual(c, args));
  return mockFn;
}

export function spy(obj, method) {
  const original = obj[method];
  const spyFn = mock(original);
  obj[method] = spyFn;
  spyFn.restore = () => { obj[method] = original; };
  return spyFn;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) RUNNER
// ─────────────────────────────────────────────────────────────────────────────

export async function runTests() {
  const startTime = performance.now();
  console.log('\n  ✦ Elmoorx v4 — Test Runner\n  ' + '═'.repeat(50));

  for (const suite of suites) {
    await runSuite(suite, 0);
  }

  const elapsed = (performance.now() - startTime).toFixed(2);
  console.log('\n  ' + '═'.repeat(50));
  const color = failedTests > 0 ? '\x1b[31m' : '\x1b[32m';
  console.log(`  ${color}Tests: ${passedTests} passed, ${failedTests} failed, ${skippedTests} skipped, ${totalTests} total\x1b[0m`);
  console.log(`  Time:  ${elapsed}ms\n`);

  if (failures.length > 0) {
    console.log('  ' + '─'.repeat(50));
    console.log('  Failures:');
    for (const f of failures) {
      console.log(`\n  ✗ ${f.suite} > ${f.test}`);
      console.log(`    ${f.error.message}`);
    }
  }

  return { passed: passedTests, failed: failedTests, skipped: skippedTests, total: totalTests, elapsed };
}

async function runSuite(suite, depth) {
  const indent = '  '.repeat(depth + 1);
  if (suite.skip) {
    console.log(`${indent}${colorize('yellow', '○')} ${suite.name} (skipped)`);
    return;
  }

  console.log(`${indent}${colorize('cyan', suite.name)}`);

  // beforeAll
  for (const hook of suite.beforeAll) await hook();

  // tests
  for (const test of suite.tests) {
    totalTests++;
    if (test.skip) {
      skippedTests++;
      console.log(`${indent}  ${colorize('yellow', '○')} ${test.name} (skipped)`);
      continue;
    }
    try {
      for (const hook of suite.beforeEach) await hook();
      await test.fn();
      for (const hook of suite.afterEach) await hook();
      passedTests++;
      console.log(`${indent}  ${colorize('green', '✓')} ${test.name}`);
    } catch (err) {
      failedTests++;
      for (const hook of suite.afterEach) await hook();
      console.log(`${indent}  ${colorize('red', '✗')} ${test.name}`);
      failures.push({ suite: suite.name, test: test.name, error: err });
    }
  }

  // nested suites
  for (const child of suite.suites) {
    await runSuite(child, depth + 1);
  }

  // afterAll
  for (const hook of suite.afterAll) await hook();
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
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

function format(val) {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
  try { return JSON.stringify(val); } catch { return String(val); }
}

function colorize(color, text) {
  const colors = {
    red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
    cyan: '\x1b[36m', gray: '\x1b[90m', reset: '\x1b[0m',
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  mock,
  spy,
  runTests,
};
