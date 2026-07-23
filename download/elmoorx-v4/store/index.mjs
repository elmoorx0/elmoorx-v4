/**
 * Elmoorx v4 — Global Store مع DevTools + Time-Travel
 * ====================================================
 * مخزن عالمي متقدم مع:
 *   - Time-travel debugging (undo/redo)
 *   - Persistence (localStorage/sessionStorage/IndexedDB)
 *   - DevTools integration
 *   - Middleware (logger, thunk, persist)
 *   - Selectors مع memoization
 *   - Actions مع async support
 *   - Modular stores (slices)
 *   - Cross-tab sync
 */

import { $state, $effect, $computed } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) HISTORY — Time-Travel
// ─────────────────────────────────────────────────────────────────────────────

const MAX_HISTORY = 100;

class TimeTravel {
  constructor(initial) {
    this.past = [];
    this.present = structuredClone(initial);
    this.future = [];
  }

  set(state, action = 'set') {
    this.past.push({ state: structuredClone(this.present), action, timestamp: Date.now() });
    if (this.past.length > MAX_HISTORY) this.past.shift();
    this.present = structuredClone(state);
    this.future = [];
  }

  undo() {
    if (this.past.length === 0) return null;
    const prev = this.past.pop();
    this.future.unshift({ state: structuredClone(this.present), action: 'redo', timestamp: Date.now() });
    this.present = prev.state;
    return prev;
  }

  redo() {
    if (this.future.length === 0) return null;
    const next = this.future.shift();
    this.past.push({ state: structuredClone(this.present), action: 'undo', timestamp: Date.now() });
    this.present = next.state;
    return next;
  }

  jump(index) {
    // -1 = undo, +1 = redo
    if (index < 0) for (let i = 0; i > index; i--) this.undo();
    if (index > 0) for (let i = 0; i < index; i++) this.redo();
  }

  canUndo() { return this.past.length > 0; }
  canRedo() { return this.future.length > 0; }

  getHistory() {
    return {
      past: this.past,
      present: this.present,
      future: this.future,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) GLOBAL STORE
// ─────────────────────────────────────────────────────────────────────────────

class GlobalStore {
  constructor() {
    this.slices = new Map(); // name → slice
    this.history = new TimeTravel({});
    this.middlewares = [];
    this.subscribers = new Set();
    this.persistKey = 'elmoorx_store';
    this.persistTo = null; // 'localStorage' | 'sessionStorage' | null
    this.devToolsEnabled = false;
    this.actionLog = [];
    this._state = $state({});
  }

  /**
   * يعرّف slice جديد (وحدة state)
   */
  defineSlice(name, initialState, reducers = {}) {
    const slice = {
      name,
      state: structuredClone(initialState),
      initialState: structuredClone(initialState),  // احفظ نسخة من الـ initial
      reducers,
    };
    this.slices.set(name, slice);

    // حدّث الـ global state
    const current = this._state();
    this._state.set({ ...current, [name]: structuredClone(initialState) });
  }

  /**
   * يُنفّذ action على slice
   */
  dispatch(sliceName, actionName, payload) {
    const slice = this.slices.get(sliceName);
    if (!slice) {
      console.warn(`[store] Slice "${sliceName}" غير موجود`);
      return;
    }
    const reducer = slice.reducers[actionName];
    if (!reducer) {
      console.warn(`[store] Action "${actionName}" غير موجود في slice "${sliceName}"`);
      return;
    }

    // شغّل middlewares
    let context = {
      slice: sliceName,
      action: actionName,
      payload,
      state: this.getState(),
      timestamp: Date.now(),
    };
    for (const mw of this.middlewares) {
      const result = mw(context);
      if (result === false) return; // middleware أوقف التنفيذ
      if (result) context = { ...context, ...result };
    }

    // نفّذ reducer
    const sliceState = this.getState()[sliceName];
    const newSliceState = reducer(structuredClone(sliceState), payload);
    const newState = { ...this.getState(), [sliceName]: newSliceState };

    // احفظ في history
    this.history.set(newState, `${sliceName}/${actionName}`);

    // حدّث state
    this._state.set(newState);
    slice.state = newSliceState;

    // سجّل في action log
    this.actionLog.push({ ...context, newState });
    if (this.actionLog.length > 200) this.actionLog.shift();

    // أشعِر المشتركين
    for (const sub of this.subscribers) {
      try { sub(newState, context); } catch {}
    }

    // persistence
    if (this.persistTo) this.persist(newState);

    // DevTools
    if (this.devToolsEnabled && typeof window !== 'undefined') {
      window.__ELMOORX_DEVTOOLS__?.emit?.({
        type: 'action',
        slice: sliceName,
        action: actionName,
        payload,
        state: newState,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * action async (thunk)
   */
  async dispatchAsync(sliceName, actionName, payload) {
    const slice = this.slices.get(sliceName);
    if (!slice) return;
    const thunk = slice.reducers[actionName];
    if (typeof thunk !== 'function') return;
    await thunk(payload, {
      dispatch: (s, a, p) => this.dispatch(s, a, p),
      getState: () => this.getState(),
    });
  }

  getState() { return this._state(); }

  select(sliceName, selector) {
    return $computed(() => {
      const slice = this.getState()[sliceName];
      return selector ? selector(slice) : slice;
    });
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  // ─── Middleware ───
  use(middleware) {
    this.middlewares.push(middleware);
  }

  // ─── Persistence ───
  enablePersistence(storage = 'localStorage', key = 'elmoorx_store') {
    this.persistTo = storage;
    this.persistKey = key;
    // حمّل state محفوظ
    this.loadPersisted();
    // cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.persistKey && e.newValue) {
          try {
            const loaded = JSON.parse(e.newValue);
            this._state.set(loaded);
          } catch {}
        }
      });
    }
  }

  persist(state) {
    if (typeof window === 'undefined') return;
    try {
      const storage = window[this.persistTo];
      storage.setItem(this.persistKey, JSON.stringify(state));
    } catch (err) {
      console.warn('[store] فشل الحفظ:', err);
    }
  }

  loadPersisted() {
    if (typeof window === 'undefined') return null;
    try {
      const storage = window[this.persistTo];
      const saved = storage.getItem(this.persistKey);
      if (saved) {
        const loaded = JSON.parse(saved);
        // ادمج مع الـ slices الموجودة
        const current = this.getState();
        this._state.set({ ...current, ...loaded });
        return loaded;
      }
    } catch {}
    return null;
  }

  // ─── DevTools ───
  enableDevTools() {
    this.devToolsEnabled = true;
    if (typeof window !== 'undefined') {
      window.__ELMOORX_DEVTOOLS__ = {
        emit: (msg) => console.log('[devtools]', msg),
        store: this,
        history: this.history,
        actionLog: this.actionLog,
        undo: () => {
          const prev = this.history.undo();
          if (prev) this._state.set(this.history.present);
        },
        redo: () => {
          const next = this.history.redo();
          if (next) this._state.set(this.history.present);
        },
        jump: (i) => {
          this.history.jump(i);
          this._state.set(this.history.present);
        },
      };
      console.log('%c✦ Elmoorx DevTools مُفعّل — استخدم window.__ELMOORX_DEVTOOLS__', 'color:#0ea5e9;font-weight:bold;');
    }
  }

  // ─── Reset ───
  reset(sliceName) {
    if (sliceName) {
      const slice = this.slices.get(sliceName);
      if (slice) {
        const initial = slice.initialState || structuredClone(slice.state);
        slice.state = structuredClone(initial);
        const newState = { ...this.getState(), [sliceName]: structuredClone(initial) };
        this._state.set(newState);
      }
    } else {
      // reset all
      const reset = {};
      for (const [name, slice] of this.slices) {
        const initial = slice.initialState || structuredClone(slice.state);
        slice.state = structuredClone(initial);
        reset[name] = structuredClone(initial);
      }
      this._state.set(reset);
      this.history = new TimeTravel(reset);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

export const store = new GlobalStore();

// ─────────────────────────────────────────────────────────────────────────────
// 4) MIDDLEWARES جاهزة
// ─────────────────────────────────────────────────────────────────────────────

export const logger = (ctx) => {
  console.log(
    `%c[store] ${ctx.slice}/${ctx.action}%c`,
    'color:#0ea5e9;font-weight:bold;',
    'color:inherit;',
    ctx.payload !== undefined ? ctx.payload : ''
  );
};

export const thunk = (fn) => fn; // marker

// ─────────────────────────────────────────────────────────────────────────────
// 5) HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useStore() {
  return store;
}

export function useSelector(sliceName, selector) {
  return store.select(sliceName, selector);
}

export function useDispatch() {
  return (slice, action, payload) => store.dispatch(slice, action, payload);
}

export function useAction(sliceName, actionName) {
  return (payload) => store.dispatch(sliceName, actionName, payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  store,
  TimeTravel,
  logger,
  thunk,
  useStore,
  useSelector,
  useDispatch,
  useAction,
};
