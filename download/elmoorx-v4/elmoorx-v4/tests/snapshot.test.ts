/**
 * اختبارات Snapshot Testing
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import {
  SnapshotManager,
  initSnapshots,
  toMatchSnapshot,
  toMatchHTMLSnapshot,
  expectSnapshot,
  computeDiff,
  formatDiff,
} from '../snapshot/index.mjs';

describe('Snapshot — SnapshotManager', () => {
  it('should create manager', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    expect(mgr).toBeTruthy();
    expect(mgr.snapshots).toBeTruthy();
  });

  it('should add new snapshot', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    const result = mgr.match('test1', 'hello');
    expect(result.status).toBe('added');
    expect(mgr.snapshots.get('test1')).toBe('hello');
  });

  it('should pass matching snapshot', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    mgr.match('test2', 'world');
    const result = mgr.match('test2', 'world');
    expect(result.status).toBe('passed');
  });

  it('should fail non-matching snapshot', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    mgr.match('test3', 'expected');
    const result = mgr.match('test3', 'actual');
    expect(result.status).toBe('failed');
    expect(result.diff).toBeTruthy();
  });

  it('should update in update mode', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    mgr.match('test4', 'old');
    mgr.setMode('update');
    const result = mgr.match('test4', 'new');
    expect(result.status).toBe('updated');
    expect(mgr.snapshots.get('test4')).toBe('new');
  });

  it('should track stats', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    mgr.match('a', '1');
    mgr.match('a', '1');
    mgr.match('b', '2');
    const stats = mgr.getStats();
    expect(stats.total).toBe(3);
    expect(stats.passed).toBe(1);
    expect(stats.added).toBe(2);
  });

  it('should remove snapshot', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    mgr.match('removable', 'data');
    const removed = mgr.remove('removable');
    expect(removed).toBe(true);
    expect(mgr.snapshots.has('removable')).toBe(false);
  });

  it('should prune unused snapshots', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    mgr.match('keep', '1');
    mgr.match('remove', '2');
    const pruned = mgr.prune(['keep']);
    expect(pruned).toBe(1);
    expect(mgr.snapshots.has('keep')).toBe(true);
    expect(mgr.snapshots.has('remove')).toBe(false);
  });

  it('should generate report', () => {
    const mgr = new SnapshotManager('/tmp/test-snapshots');
    mgr.match('x', '1');
    const report = mgr.report();
    expect(report).toContain('Snapshot Testing Report');
    expect(report).toContain('الإجمالي');
  });
});

describe('Snapshot — computeDiff', () => {
  it('should compute diff for identical strings', () => {
    const diff = computeDiff('hello', 'hello');
    expect(diff.length).toBe(1);
    expect(diff[0].type).toBe('same');
  });

  it('should compute diff for different strings', () => {
    const diff = computeDiff('line1\nline2', 'line1\nmodified');
    expect(diff.length).toBeGreaterThanOrEqual(2);
    // should have removed and added
    const hasRemoved = diff.some(d => d.type === 'removed');
    const hasAdded = diff.some(d => d.type === 'added');
    expect(hasRemoved).toBe(true);
    expect(hasAdded).toBe(true);
  });

  it('should handle different lengths', () => {
    const diff = computeDiff('a\nb\nc', 'a\nb');
    expect(diff.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Snapshot — formatDiff', () => {
  it('should format diff as string', () => {
    const diff = computeDiff('old', 'new');
    const formatted = formatDiff(diff);
    expect(typeof formatted).toBe('string');
  });
});

describe('Snapshot — toMatchHTMLSnapshot', () => {
  it('should capture HTML from vdom', () => {
    const result = toMatchHTMLSnapshot('html-test-1', h('div', null, 'Hello'));
    expect(result.status).toBe('added');
  });

  it('should match HTML on second call', () => {
    toMatchHTMLSnapshot('html-test-2', h('div', { id: 'x' }, 'Content'));
    const result = toMatchHTMLSnapshot('html-test-2', h('div', { id: 'x' }, 'Content'));
    expect(result.status).toBe('passed');
  });
});

describe('Snapshot — expectSnapshot', () => {
  it('should not throw for matching snapshot', () => {
    expectSnapshot('expect-1', 'value');
    let threw = false;
    try { expectSnapshot('expect-1', 'value'); }
    catch (e) { threw = true; }
    expect(threw).toBe(false);
  });

  it('should throw for non-matching snapshot', () => {
    expectSnapshot('expect-2', 'original');
    let error = null;
    try { expectSnapshot('expect-2', 'different'); }
    catch (e) { error = e; }
    expect(error).not.toBe(null);
    expect(error.message).toContain('Snapshot mismatch');
  });
});
