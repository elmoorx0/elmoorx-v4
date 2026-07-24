/**
 * Elmoorx v4 — Snapshot Testing (بدون تبعيات)
 * =============================================
 * اختبار اللقطات:
 *   - حفظ ومقارنة لقطات
 *   - تحديث اللقطات
 *   - diff output
 *   - JSON snapshots
 *   - HTML snapshots
 *   - Component snapshots
 */

import { renderToString, h } from '../runtime/core.mjs';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) SNAPSHOT MANAGER
// ─────────────────────────────────────────────────────────────────────────────

class SnapshotManager {
  constructor(snapshotsDir = './tests/__snapshots__') {
    this.snapshotsDir = resolve(snapshotsDir);
    this.snapshots = new Map();
    this.results = { added: 0, updated: 0, passed: 0, failed: 0, total: 0 };
    this.mode = 'test'; // 'test' | 'update'
    this.load();
  }

  load() {
    if (!existsSync(this.snapshotsDir)) {
      mkdirSync(this.snapshotsDir, { recursive: true });
      return;
    }
    const files = readdirSync(this.snapshotsDir).filter(f => f.endsWith('.snap.json'));
    for (const file of files) {
      try {
        const content = JSON.parse(readFileSync(join(this.snapshotsDir, file), 'utf8'));
        for (const [key, value] of Object.entries(content)) {
          this.snapshots.set(key, value);
        }
      } catch {}
    }
  }

  save() {
    if (!existsSync(this.snapshotsDir)) mkdirSync(this.snapshotsDir, { recursive: true });
    // group by file prefix
    const groups = new Map();
    for (const [key, value] of this.snapshots) {
      const prefix = key.split(':')[0] || 'default';
      if (!groups.has(prefix)) groups.set(prefix, {});
      groups.get(prefix)[key] = value;
    }
    for (const [prefix, data] of groups) {
      writeFileSync(join(this.snapshotsDir, `${prefix}.snap.json`), JSON.stringify(data, null, 2));
    }
  }

  /**
   * يقارن لقطة
   */
  match(name, actual) {
    this.results.total++;
    const serialized = typeof actual === 'string' ? actual : JSON.stringify(actual, null, 2);
    const existing = this.snapshots.get(name);

    if (existing === undefined) {
      // new snapshot
      this.snapshots.set(name, serialized);
      this.results.added++;
      if (this.mode === 'test') {
        return { status: 'added', message: `لقطة جديدة: ${name}` };
      }
      return { status: 'added', message: `لقطة جديدة: ${name}` };
    }

    if (this.mode === 'update') {
      this.snapshots.set(name, serialized);
      this.results.updated++;
      return { status: 'updated', message: `تم تحديث: ${name}` };
    }

    if (existing === serialized) {
      this.results.passed++;
      return { status: 'passed', message: `✓ ${name}` };
    }

    this.results.failed++;
    const diff = computeDiff(existing, serialized);
    return {
      status: 'failed',
      message: `✗ ${name}`,
      diff,
      expected: existing,
      actual: serialized,
    };
  }

  /**
   * يحذف لقطة
   */
  remove(name) {
    return this.snapshots.delete(name);
  }

  /**
   * يحذف اللقطات غير المستخدمة
   */
  prune(usedKeys) {
    let pruned = 0;
    for (const key of this.snapshots.keys()) {
      if (!usedKeys.includes(key)) {
        this.snapshots.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * يحفظ كل اللقطات
   */
  commit() {
    this.save();
  }

  /**
   * يعيد الإحصائيات
   */
  getStats() {
    return { ...this.results, snapshots: this.snapshots.size };
  }

  /**
   * يحدّث الوضع
   */
  setMode(mode) {
    this.mode = mode;
  }

  /**
   * يعيد تقرير
   */
  report() {
    const stats = this.getStats();
    let output = '\n  ✦ Snapshot Testing Report\n';
    output += `  ${'═'.repeat(50)}\n`;
    output += `  │ الإجمالي:     ${stats.total}\n`;
    output += `  │ ✓ ناجح:       ${stats.passed}\n`;
    output += `  │ + جديد:       ${stats.added}\n`;
    output += `  │ ↻ محدّث:      ${stats.updated}\n`;
    output += `  │ ✗ فاشل:       ${stats.failed}\n`;
    output += `  │ اللقطات:      ${stats.snapshots}\n`;
    output += `  ${'═'.repeat(50)}\n`;
    return output;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) DIFF COMPUTATION
// ─────────────────────────────────────────────────────────────────────────────

export function computeDiff(expected, actual) {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLen = Math.max(expectedLines.length, actualLines.length);
  const diff = [];

  for (let i = 0; i < maxLen; i++) {
    const exp = expectedLines[i] || '';
    const act = actualLines[i] || '';
    if (exp === act) {
      diff.push({ type: 'same', line: exp, num: i + 1 });
    } else {
      if (exp) diff.push({ type: 'removed', line: exp, num: i + 1 });
      if (act) diff.push({ type: 'added', line: act, num: i + 1 });
    }
  }

  return diff;
}

export function formatDiff(diff) {
  let output = '';
  for (const d of diff) {
    const prefix = d.type === 'added' ? '+' : d.type === 'removed' ? '-' : ' ';
    const color = d.type === 'added' ? '\x1b[32m' : d.type === 'removed' ? '\x1b[31m' : '\x1b[90m';
    output += `${color}${prefix} ${d.line}\x1b[0m\n`;
  }
  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) SNAPSHOT TESTING API
// ─────────────────────────────────────────────────────────────────────────────

let manager = null;

export function initSnapshots(options = {}) {
  const { dir, mode = 'test' } = options;
  manager = new SnapshotManager(dir);
  manager.setMode(mode);
  return manager;
}

export function getManager() {
  if (!manager) manager = new SnapshotManager();
  return manager;
}

/**
 * toMatchSnapshot — يقارن مع لقطة محفوظة
 */
export function toMatchSnapshot(name, value) {
  if (!manager) manager = new SnapshotManager();
  return manager.match(name, value);
}

/**
 * toMatchHTMLSnapshot — يلتقط HTML من مكون
 */
export function toMatchHTMLSnapshot(name, component) {
  const html = renderToString(component);
  return toMatchSnapshot(name, html);
}

/**
 * toMatchComponentSnapshot — يلتقط مكون كامل
 */
export function toMatchComponentSnapshot(name, Component, props = {}) {
  const vdom = h(Component, props);
  const html = renderToString(vdom);
  return toMatchSnapshot(name, html);
}

/**
 * updateSnapshots — يحفظ كل اللقطات
 */
export function updateSnapshots() {
  if (!manager) return;
  manager.setMode('update');
  manager.commit();
}

/**
 * clearSnapshots — يحذف كل اللقطات
 */
export function clearSnapshots() {
  if (!manager) return;
  manager.snapshots.clear();
  manager.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) SNAPSHOT ASSERTION HELPER
// ─────────────────────────────────────────────────────────────────────────────

export function expectSnapshot(name, value) {
  const result = toMatchSnapshot(name, value);
  if (result.status === 'failed') {
    throw new Error(`Snapshot mismatch: ${name}\n\nExpected:\n${result.expected}\n\nActual:\n${result.actual}\n\nDiff:\n${formatDiff(result.diff)}`);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { SnapshotManager };

export default {
  SnapshotManager,
  initSnapshots,
  getManager,
  toMatchSnapshot,
  toMatchHTMLSnapshot,
  toMatchComponentSnapshot,
  updateSnapshots,
  clearSnapshots,
  expectSnapshot,
  computeDiff,
  formatDiff,
};
