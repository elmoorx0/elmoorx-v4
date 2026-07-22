/**
 * اختبارات الـ runtime — signals, store, islands
 */
import { describe, it, expect, beforeAll, afterAll } from '@elmoorx/testing';
import { $state, $computed, $effect, $batch, $store, sanitize, h, renderToString } from '@elmoorx/runtime';

describe('Signals', () => {
  it('should create a signal with initial value', () => {
    const s = $state(42);
    expect(s()).toBe(42);
  });

  it('should update signal value', () => {
    const s = $state(0);
    s.set(10);
    expect(s()).toBe(10);
  });

  it('should support functional updates', () => {
    const s = $state(5);
    s.set(c => c + 1);
    expect(s()).toBe(6);
    s.update(c => c * 2);
    expect(s()).toBe(12);
  });

  it('should peek without tracking', () => {
    const s = $state('hello');
    expect(s.peek()).toBe('hello');
  });

  it('should compute derived values', () => {
    const a = $state(2);
    const b = $state(3);
    const sum = $computed(() => a() + b());
    expect(sum()).toBe(5);
    a.set(10);
    expect(sum()).toBe(13);
  });

  it('should run effects', () => {
    const s = $state(0);
    let observed = -1;
    $effect(() => { observed = s(); });
    expect(observed).toBe(0);
    s.set(5);
    expect(observed).toBe(5);
  });

  it('should batch updates', () => {
    const s = $state(0);
    let runs = 0;
    $effect(() => { s(); runs++; });
    expect(runs).toBe(1);
    $batch(() => {
      s.set(1);
      s.set(2);
      s.set(3);
    });
    expect(runs).toBe(2);
    expect(s()).toBe(3);
  });

  it('should support subscribe/unsubscribe', () => {
    const s = $state(0);
    let count = 0;
    const unsub = s.subscribe(() => count++);
    s.set(1);
    expect(count).toBe(1);
    unsub();
    s.set(2);
    expect(count).toBe(1);
  });
});

describe('Store', () => {
  it('should create a reactive store', () => {
    const store = $store({ count: 0, name: 'test' });
    expect(store.count).toBe(0);
    expect(store.name).toBe('test');
  });

  it('should update properties reactively', () => {
    const store = $store({ user: { name: 'A' } });
    store.user.name = 'B';
    expect(store.user.name).toBe('B');
  });

  it('should support array operations', () => {
    const store = $store({ items: [1, 2, 3] });
    store.items.push(4);
    expect(store.items.length).toBe(4);
    expect(store.items[3]).toBe(4);
  });

  it('should support nested mutations', () => {
    const store = $store({ cart: [{ id: 1, qty: 1 }] });
    store.cart[0].qty = 5;
    expect(store.cart[0].qty).toBe(5);
  });

  it('should subscribe to changes', () => {
    const store = $store({ count: 0 });
    let paths = [];
    store.subscribe(p => paths.push(p));
    store.count = 5;
    expect(paths.length).toBe(1);
    expect(paths[0]).toEqual(['count']);
  });

  it('should get raw target via get()', () => {
    const store = $store({ a: 1, b: 2 });
    const raw = store.get();
    expect(raw.a).toBe(1);
    expect(raw.b).toBe(2);
  });
});

describe('Security', () => {
  it('should sanitize XSS scripts', () => {
    const input = '<script>alert("xss")</script><b>safe</b>';
    const clean = sanitize(input);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('<b>safe</b>');
  });

  it('should remove onXxx handlers', () => {
    const input = '<img src=x onerror=alert(1)>';
    const clean = sanitize(input);
    expect(clean).not.toContain('onerror');
  });

  it('should remove javascript: URIs', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const clean = sanitize(input);
    expect(clean.toLowerCase()).not.toContain('javascript:');
  });

  it('should allow safe HTML', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const clean = sanitize(input);
    expect(clean).toContain('<p>');
    expect(clean).toContain('<strong>');
  });

  it('should keep data-* and aria-* attributes', () => {
    const input = '<div data-id="123" aria-label="test">x</div>';
    const clean = sanitize(input);
    expect(clean).toContain('data-id');
    expect(clean).toContain('aria-label');
  });

  it('should handle non-string input', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
    expect(sanitize(123)).toBe('');
  });
});

describe('h() — JSX factory', () => {
  it('should create a vdom node', () => {
    const node = h('div', { id: 'test' }, 'hello');
    expect(node.tag).toBe('div');
    expect(node.props.id).toBe('test');
    expect(node.children[0]).toBe('hello');
  });

  it('should flatten children arrays', () => {
    const node = h('ul', null, [1, 2, 3]);
    expect(node.children.length).toBe(3);
  });

  it('should skip null/undefined/false children', () => {
    const node = h('div', null, null, undefined, false, 'ok');
    expect(node.children.length).toBe(1);
  });
});

describe('renderToString', () => {
  it('should render simple elements', () => {
    const html = renderToString(h('div', null, 'hello'));
    expect(html).toBe('<div>hello</div>');
  });

  it('should render attributes', () => {
    const html = renderToString(h('a', { href: '/foo' }, 'link'));
    expect(html).toContain('href="/foo"');
    expect(html).toContain('link');
  });

  it('should render self-closing tags', () => {
    const html = renderToString(h('img', { src: 'x.png', alt: '' }));
    expect(html).toContain('<img');
    expect(html).toContain('/>');
  });

  it('should escape HTML in text', () => {
    const html = renderToString(h('p', null, '<script>'));
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('should convert className to class', () => {
    const html = renderToString(h('div', { className: 'box' }, 'x'));
    expect(html).toContain('class="box"');
  });

  it('should render nested elements', () => {
    const html = renderToString(h('div', null, h('p', null, 'inner')));
    expect(html).toBe('<div><p>inner</p></div>');
  });
});
