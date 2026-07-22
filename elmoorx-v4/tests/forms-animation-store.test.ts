/**
 * اختبارات Forms + Animation + Store
 */
import { describe, it, expect } from '@elmoorx/testing';
import { createForm, validators } from '../forms/index.mjs';
import { easing, animate, spring } from '../animation/index.mjs';
import { store } from '../store/index.mjs';

describe('Forms — createForm', () => {
  it('should create form with initial values', () => {
    const form = createForm({
      initialValues: { name: '', email: '' },
    });
    expect(form.values().name).toBe('');
    expect(form.values().email).toBe('');
  });

  it('should set values', () => {
    const form = createForm({
      initialValues: { name: '' },
    });
    form.setValue('name', 'محمد');
    expect(form.values().name).toBe('محمد');
  });

  it('should track touched', () => {
    const form = createForm({
      initialValues: { name: '' },
    });
    expect(form.isTouched ? form.isTouched('name') : false).toBe(false);
    form.setTouched('name');
    // isTouched عبر form.field
    const f = form.field('name');
    expect(f.touched).toBe(true);
  });

  it('should track dirty', () => {
    const form = createForm({
      initialValues: { name: '' },
    });
    form.setValue('name', 'changed');
    const f = form.field('name');
    expect(f.dirty).toBe(true);
  });
});

describe('Forms — validators', () => {
  it('required validator', () => {
    const v = validators.required();
    expect(v('')).not.toBe(null);
    expect(v('text')).toBe(null);
    expect(v(null)).not.toBe(null);
  });

  it('minLength validator', () => {
    const v = validators.minLength(3);
    expect(v('ab')).not.toBe(null);
    expect(v('abc')).toBe(null);
    expect(v('abcd')).toBe(null);
  });

  it('maxLength validator', () => {
    const v = validators.maxLength(3);
    expect(v('abcd')).not.toBe(null);
    expect(v('abc')).toBe(null);
    expect(v('ab')).toBe(null);
  });

  it('email validator', () => {
    const v = validators.email();
    expect(v('not-email')).not.toBe(null);
    expect(v('a@b.com')).toBe(null);
    expect(v('')).toBe(null); // empty = valid (use required)
  });

  it('number validator', () => {
    const v = validators.number();
    expect(v('abc')).not.toBe(null);
    expect(v('123')).toBe(null);
    expect(v('12.5')).toBe(null);
  });

  it('pattern validator', () => {
    const v = validators.pattern(/^[A-Z]+$/);
    expect(v('abc')).not.toBe(null);
    expect(v('ABC')).toBe(null);
  });

  it('compose validators', () => {
    const v = validators.compose(
      validators.required(),
      validators.minLength(3),
    );
    expect(v('')).not.toBe(null);
    expect(v('ab')).not.toBe(null);
    expect(v('abc')).toBe(null);
  });
});

describe('Animation — easing', () => {
  it('linear easing', () => {
    expect(easing.linear(0)).toBe(0);
    expect(easing.linear(0.5)).toBe(0.5);
    expect(easing.linear(1)).toBe(1);
  });

  it('easeIn easing', () => {
    expect(easing.easeIn(0)).toBe(0);
    expect(easing.easeIn(1)).toBe(1);
    expect(easing.easeIn(0.5)).toBe(0.25);
  });

  it('easeOut easing', () => {
    expect(easing.easeOut(0)).toBe(0);
    expect(easing.easeOut(1)).toBe(1);
  });

  it('bounce easing returns valid value', () => {
    const v = easing.bounce(0.5);
    expect(typeof v).toBe('number');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('elastic easing', () => {
    expect(easing.elastic(0)).toBe(0);
    expect(easing.elastic(1)).toBe(1);
  });
});

describe('Animation — animate', () => {
  it('should call onUpdate', async () => {
    let lastValue = null;
    let completed = false;
    const cancel = animate({
      from: 0,
      to: 100,
      duration: 50,
      onUpdate: (v) => { lastValue = v; },
      onComplete: () => { completed = true; },
    });
    await new Promise(r => setTimeout(r, 100));
    expect(lastValue).not.toBe(null);
    expect(completed).toBe(true);
  });

  it('should be cancellable', async () => {
    let calls = 0;
    const cancel = animate({
      from: 0,
      to: 100,
      duration: 100,
      onUpdate: () => { calls++; },
    });
    cancel();
    const callsAfterCancel = calls;
    await new Promise(r => setTimeout(r, 150));
    // يجب ألا يزداد calls بعد الإلغاء
    expect(calls).toBe(callsAfterCancel);
  });
});

describe('Animation — spring', () => {
  it('should animate towards target', async () => {
    let lastValue = 0;
    let completed = false;
    spring({
      from: 0,
      to: 100,
      stiffness: 200,
      damping: 20,
      onUpdate: (v) => { lastValue = v; },
      onComplete: () => { completed = true; },
    });
    await new Promise(r => setTimeout(r, 1000));
    expect(lastValue).not.toBe(0);
    // spring قد يأخذ وقت أطول — فقط نتحقق أنه تحرك
    expect(lastValue).toBeGreaterThan(50);
  });
});

describe('Store — GlobalStore', () => {
  it('should define slice', () => {
    store.defineSlice('test1', { count: 0 }, {
      increment: (state) => ({ ...state, count: state.count + 1 }),
    });
    expect(store.getState().test1.count).toBe(0);
  });

  it('should dispatch action', () => {
    store.defineSlice('test2', { count: 0 }, {
      increment: (state) => ({ ...state, count: state.count + 1 }),
    });
    store.dispatch('test2', 'increment');
    expect(store.getState().test2.count).toBe(1);
    store.dispatch('test2', 'increment');
    expect(store.getState().test2.count).toBe(2);
  });

  it('should select slice', () => {
    store.defineSlice('test3', { items: [1, 2, 3] }, {
      addItem: (state, item) => ({ ...state, items: [...state.items, item] }),
    });
    const selector = store.select('test3', s => s.items.length);
    expect(selector()).toBe(3);
    store.dispatch('test3', 'addItem', 4);
    expect(selector()).toBe(4);
  });

  it('should handle unknown slice gracefully', () => {
    // لا يجب أن يرمي خطأ
    store.dispatch('nonexistent', 'action');
  });

  it('should handle unknown action gracefully', () => {
    store.defineSlice('test4', { count: 0 }, {});
    store.dispatch('test4', 'nonexistent');
    // يجب أن يبقى state كما هو
    expect(store.getState().test4.count).toBe(0);
  });

  it('should reset slice', () => {
    store.defineSlice('test5', { count: 5 }, {
      increment: (s) => ({ ...s, count: s.count + 1 }),
    });
    store.dispatch('test5', 'increment');
    expect(store.getState().test5.count).toBe(6);
    store.reset('test5');
    expect(store.getState().test5.count).toBe(5);
  });
});
