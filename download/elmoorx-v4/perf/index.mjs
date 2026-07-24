/**
 * Elmoorx v4 — Performance Monitoring (بدون تبعيات)
 * ==================================================
 * راقب أداء التطبيق:
 *   - Render time
 *   - Signal update time
 *   - Memory usage
 *   - FPS
 *   - Network requests
 *   - User timing API
 *   - Web Vitals (LCP, FID, CLS)
 */

import { $state, $effect } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) PERFORMANCE TRACKER
// ─────────────────────────────────────────────────────────────────────────────

class PerfTracker {
  constructor() {
    this.marks = new Map();
    this.measures = [];
    this.metrics = $state({
      renders: 0,
      renderTime: 0,
      signalUpdates: 0,
      signalTime: 0,
      memory: 0,
      fps: 0,
      networkRequests: 0,
      networkTime: 0,
    });
    this.enabled = false;
    this._fpsFrame = 0;
    this._fpsLast = performance.now();
    this._fpsObserver = null;
  }

  enable() {
    this.enabled = true;
    this.startFPSMonitor();
    console.log('%c✦ Performance monitoring مُفعّل', 'color:#10b981;font-weight:bold;');
  }

  disable() {
    this.enabled = false;
    if (this._fpsObserver) cancelAnimationFrame(this._fpsObserver);
  }

  // ─── Marks & Measures ───
  mark(name) {
    this.marks.set(name, performance.now());
  }

  measure(name, startMark, endMark) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    if (start && end) {
      this.measures.push({
        name,
        duration: end - start,
        timestamp: Date.now(),
      });
      return end - start;
    }
    return 0;
  }

  // ─── Render Tracking ───
  trackRender(componentName, fn) {
    if (!this.enabled) return fn();
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.metrics.set(m => ({
      ...m,
      renders: m.renders + 1,
      renderTime: m.renderTime + duration,
    }));
    if (duration > 16) {
      console.warn(`[perf] ${componentName} render took ${duration.toFixed(2)}ms (>16ms)`);
    }
    return result;
  }

  // ─── Signal Tracking ───
  trackSignal(signalName, fn) {
    if (!this.enabled) return fn();
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.metrics.set(m => ({
      ...m,
      signalUpdates: m.signalUpdates + 1,
      signalTime: m.signalTime + duration,
    }));
    return result;
  }

  // ─── Network Tracking ───
  trackNetwork(url, fn) {
    if (!this.enabled) return fn();
    const start = performance.now();
    return Promise.resolve(fn()).finally(() => {
      const duration = performance.now() - start;
      this.metrics.set(m => ({
        ...m,
        networkRequests: m.networkRequests + 1,
        networkTime: m.networkTime + duration,
      }));
    });
  }

  // ─── FPS Monitor ───
  startFPSMonitor() {
    if (typeof window === 'undefined') return;
    const tick = (now) => {
      this._fpsFrame++;
      if (now - this._fpsLast >= 1000) {
        const fps = Math.round((this._fpsFrame * 1000) / (now - this._fpsLast));
        this.metrics.set(m => ({ ...m, fps }));
        this._fpsFrame = 0;
        this._fpsLast = now;
      }
      this._fpsObserver = requestAnimationFrame(tick);
    };
    this._fpsObserver = requestAnimationFrame(tick);
  }

  // ─── Memory ───
  updateMemory() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      this.metrics.set(m => ({ ...m, memory: mem.heapUsed }));
    } else if (typeof performance !== 'undefined' && performance.memory) {
      this.metrics.set(m => ({ ...m, memory: performance.memory.usedJSHeapSize }));
    }
  }

  // ─── Get Stats ───
  getStats() {
    this.updateMemory();
    return this.metrics();
  }

  // ─── Report ───
  report() {
    const stats = this.getStats();
    const avgRender = stats.renders > 0 ? (stats.renderTime / stats.renders).toFixed(2) : 0;
    const avgSignal = stats.signalUpdates > 0 ? (stats.signalTime / stats.signalUpdates).toFixed(2) : 0;
    const avgNetwork = stats.networkRequests > 0 ? (stats.networkTime / stats.networkRequests).toFixed(2) : 0;

    return {
      ...stats,
      avgRenderTime: parseFloat(avgRender),
      avgSignalTime: parseFloat(avgSignal),
      avgNetworkTime: parseFloat(avgNetwork),
      memoryMB: Math.round(stats.memory / 1024 / 1024 * 100) / 100,
      measures: this.measures.slice(-20),
    };
  }

  // ─── Reset ───
  reset() {
    this.marks.clear();
    this.measures = [];
    this.metrics.set({
      renders: 0,
      renderTime: 0,
      signalUpdates: 0,
      signalTime: 0,
      memory: 0,
      fps: 0,
      networkRequests: 0,
      networkTime: 0,
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

export const perf = new PerfTracker();

// ─────────────────────────────────────────────────────────────────────────────
// 3) WEB VITALS
// ─────────────────────────────────────────────────────────────────────────────

export function measureWebVitals() {
  if (typeof window === 'undefined') return null;

  const vitals = {};

  // LCP (Largest Contentful Paint)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}

    // FID (First Input Delay)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          vitals.fid = entries[0].processingStart - entries[0].startTime;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {}

    // CLS (Cumulative Layout Shift)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        vitals.cls = clsValue;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {}
  }

  return vitals;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) PROFILER
// ─────────────────────────────────────────────────────────────────────────────

export function profile(name, fn) {
  return perf.trackRender(name, fn);
}

export function profileAsync(name, fn) {
  if (!perf.enabled) return fn();
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    perf.metrics.set(m => ({
      ...m,
      renders: m.renders + 1,
      renderTime: m.renderTime + duration,
    }));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) PERFORMANCE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function PerfMonitor(props = {}) {
  const { position = 'bottom-left' } = props;
  const stats = $state(perf.report());

  $effect(() => {
    const id = setInterval(() => stats.set(perf.report()), 1000);
    return () => clearInterval(id);
  });

  if (!perf.enabled) return null;

  const positions = {
    'bottom-left': 'bottom:0.5rem;left:0.5rem;',
    'bottom-right': 'bottom:0.5rem;right:0.5rem;',
    'top-left': 'top:0.5rem;left:0.5rem;',
    'top-right': 'top:0.5rem;right:0.5rem;',
  };

  // حساب بسيط — في الإنتاج يستخدم h()
  return null; // يحتاج h() — نتجنبه هنا
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  perf,
  PerfTracker,
  measureWebVitals,
  profile,
  profileAsync,
  PerfMonitor,
};
