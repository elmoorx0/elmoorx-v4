/**
 * Elmoorx v4 — E2E Testing Helpers (بدون تبعيات)
 * ================================================
 * أدوات اختبار E2E بدون متصفح خارجي:
 *   - DOM simulation (jsdom-like)
 *   - Element queries (getByText, getByRole, etc.)
 *   - User events (click, type, etc.)
 *   - Assertions (isVisible, isDisabled, etc.)
 *   - Wait helpers (waitFor, waitForElement)
 *   - Screenshot (text-based)
 *   - Route testing
 */

import { h, $state, $effect, mount, renderToString } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) DOM SIMULATION — محاكاة DOM بسيطة
// ─────────────────────────────────────────────────────────────────────────────

class SimulatedElement {
  constructor(tag, props = {}) {
    this.tagName = tag.toUpperCase();
    this.props = props;
    this.children = [];
    this.textContent = '';
    this.style = {};
    this.classList = new Set();
    this.attributes = {};
    this.eventListeners = {};
    this.parentNode = null;
    this.visible = true;
    this.disabled = false;

    if (props.class) {
      props.class.split(' ').forEach(c => c && this.classList.add(c));
    }
    if (props.style && typeof props.style === 'object') {
      this.style = props.style;
    }
    Object.assign(this.attributes, props);
  }

  appendChild(child) {
    this.children.push(child);
    if (typeof child !== 'string') {
      child.parentNode = this;
      this.textContent += child.textContent || '';
    } else {
      this.textContent += child;
    }
  }

  addEventListener(event, handler) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }

  removeEventListener(event, handler) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }

  dispatchEvent(event) {
    const handlers = this.eventListeners[event.type];
    if (handlers) handlers.forEach(h => h(event));
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
  }

  focus() { this.dispatchEvent({ type: 'focus', target: this }); }
  blur() { this.dispatchEvent({ type: 'blur', target: this }); }

  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  hasAttribute(name) { return name in this.attributes; }
  removeAttribute(name) { delete this.attributes[name]; }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (el) => {
      if (typeof el === 'string') return;
      if (matchesSelector(el, selector)) results.push(el);
      if (el.children) el.children.forEach(walk);
    };
    this.children.forEach(walk);
    return results;
  }

  get innerHTML() {
    return this.children.map(c => typeof c === 'string' ? c : c.outerHTML).join('');
  }

  get outerHTML() {
    const attrs = Object.entries(this.attributes)
      .filter(([k]) => !['children'].includes(k))
      .map(([k, v]) => v === true ? k : `${k}="${v}"`)
      .join(' ');
    return `<${this.tagName.toLowerCase()}${attrs ? ' ' + attrs : ''}>${this.innerHTML}</${this.tagName.toLowerCase()}>`;
  }
}

function matchesSelector(el, selector) {
  if (typeof el === 'string') return false;
  // attribute selector: [attr="value"]
  const attrMatch = selector.match(/^\[([^=\]]+)(?:="([^"]+)")?\]$/);
  if (attrMatch) {
    const [, name, value] = attrMatch;
    if (value === undefined) return el.hasAttribute(name);
    return el.getAttribute(name) === value;
  }
  // class selector
  if (selector.startsWith('.')) {
    return el.classList.has(selector.slice(1));
  }
  // id selector
  if (selector.startsWith('#')) {
    return el.attributes.id === selector.slice(1);
  }
  // tag selector
  return el.tagName === selector.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) RENDER — يعرض مكون في DOM محاكى
// ─────────────────────────────────────────────────────────────────────────────

export function render(component) {
  const container = new SimulatedElement('div');
  const vdom = typeof component === 'function' ? component() : component;
  renderToSimulated(container, vdom);
  return { container, unmount: () => { container.children = []; } };
}

function renderToSimulated(parent, vdom) {
  if (vdom === null || vdom === undefined || vdom === false || vdom === true) return;
  if (typeof vdom === 'string' || typeof vdom === 'number') {
    parent.appendChild(String(vdom));
    return;
  }
  if (Array.isArray(vdom)) {
    vdom.forEach(c => renderToSimulated(parent, c));
    return;
  }
  if (typeof vdom === 'function') {
    renderToSimulated(parent, vdom());
    return;
  }
  if (vdom && vdom.tag) {
    if (typeof vdom.tag === 'function') {
      const props = { ...vdom.props, children: vdom.children };
      renderToSimulated(parent, vdom.tag(props));
      return;
    }
    const el = new SimulatedElement(vdom.tag, vdom.props);
    if (vdom.children) vdom.children.forEach(c => renderToSimulated(el, c));
    parent.appendChild(el);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) QUERIES — البحث عن العناصر
// ─────────────────────────────────────────────────────────────────────────────

export const queries = {
  getByText(container, text) {
    const walk = (el) => {
      if (typeof el === 'string') {
        if (el.includes(text)) return el;
        return null;
      }
      if (el.textContent && el.textContent.includes(text)) return el;
      if (el.children) {
        for (const child of el.children) {
          const found = walk(child);
          if (found) return found;
        }
      }
      return null;
    };
    return walk(container);
  },

  getByRole(container, role) {
    return container.querySelector(`[role="${role}"]`);
  },

  getByTestId(container, testId) {
    return container.querySelector(`[data-testid="${testId}"]`);
  },

  getByPlaceholder(container, placeholder) {
    return container.querySelector(`[placeholder="${placeholder}"]`);
  },

  getByLabel(container, label) {
    const labels = container.querySelectorAll('label');
    for (const lab of labels) {
      if (lab.textContent.includes(label)) {
        // ابحث عن input مرتبط
        return lab.querySelector('input') || lab.parentNode.querySelector('input');
      }
    }
    return null;
  },

  getAllByText(container, text) {
    const results = [];
    const walk = (el) => {
      if (typeof el === 'string') {
        if (el.includes(text)) results.push(el);
        return;
      }
      if (el.textContent && el.textContent.includes(text)) results.push(el);
      if (el.children) el.children.forEach(walk);
    };
    container.children.forEach(walk);
    return results;
  },

  queryByText(container, text) {
    return queries.getByText(container, text);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4) USER EVENTS — محاكاة أحداث المستخدم
// ─────────────────────────────────────────────────────────────────────────────

export const userEvent = {
  click(element) {
    if (!element) throw new Error('العنصر غير موجود');
    element.click();
  },

  type(element, text) {
    if (!element) throw new Error('العنصر غير موجود');
    if (element.attributes.value !== undefined) {
      element.attributes.value = (element.attributes.value || '') + text;
    }
    element.dispatchEvent({ type: 'input', target: element, data: text });
    element.dispatchEvent({ type: 'change', target: element });
  },

  clear(element) {
    if (!element) throw new Error('العنصر غير موجود');
    element.attributes.value = '';
    element.dispatchEvent({ type: 'input', target: element });
  },

  focus(element) {
    element?.focus();
  },

  blur(element) {
    element?.blur();
  },

  async wait(ms) {
    await new Promise(r => setTimeout(r, ms));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5) ASSERTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const assertions = {
  isVisible(element) {
    if (!element) return false;
    if (typeof element === 'string') return true;
    return element.visible !== false && element.style.display !== 'none';
  },

  isDisabled(element) {
    return element?.disabled === true || element?.attributes?.disabled !== undefined;
  },

  hasClass(element, className) {
    return element?.classList?.has(className) || false;
  },

  hasAttribute(element, attr) {
    return element?.hasAttribute?.(attr) || false;
  },

  hasText(element, text) {
    if (!element) return false;
    if (typeof element === 'string') return element.includes(text);
    return (element.textContent || '').includes(text);
  },

  hasValue(element, value) {
    return element?.attributes?.value === value;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 6) WAIT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export async function waitFor(callback, options = {}) {
  const { timeout = 1000, interval = 50 } = options;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const result = callback();
      if (result) return result;
    } catch {}
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`waitFor انتهى timeout بعد ${timeout}ms`);
}

export async function waitForElement(container, text, options = {}) {
  return waitFor(() => queries.getByText(container, text), options);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) SNAPSHOT — اختبار لقطة
// ─────────────────────────────────────────────────────────────────────────────

const snapshots = new Map();

export function toMatchSnapshot(name, html) {
  const existing = snapshots.get(name);
  if (existing === undefined) {
    snapshots.set(name, html);
    return { pass: true, isNew: true };
  }
  return {
    pass: existing === html,
    diff: existing === html ? null : { expected: existing, actual: html },
  };
}

export function clearSnapshots() {
  snapshots.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) SCREENSHOT (text-based)
// ─────────────────────────────────────────────────────────────────────────────

export function textScreenshot(container) {
  const lines = [];
  const walk = (el, depth = 0) => {
    const indent = '  '.repeat(depth);
    if (typeof el === 'string') {
      if (el.trim()) lines.push(`${indent}${el.trim()}`);
      return;
    }
    if (!el) return;
    const tag = el.tagName?.toLowerCase() || '?';
    const text = el.textContent?.trim();
    const attrs = Object.entries(el.attributes || {})
      .filter(([k]) => !['children'].includes(k))
      .map(([k, v]) => v === true ? k : `${k}="${v}"`)
      .join(' ');
    lines.push(`${indent}<${tag}${attrs ? ' ' + attrs : ''}>${text ? ' ' + text : ''}`);
    if (el.children) el.children.forEach(c => walk(c, depth + 1));
  };
  container.children.forEach(c => walk(c));
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) TEST HELPERS — دوال مساعدة للاختبارات
// ─────────────────────────────────────────────────────────────────────────────

export function describeE2E(name, fn) {
  return describe(name, fn);
}

export function itRenders(name, component, assertions) {
  it(name, () => {
    const { container } = render(component);
    assertions(container, queries, userEvent);
  });
}

export function itBehavesLike(name, Component, testFn) {
  it(name, async () => {
    const { container, unmount } = render(Component);
    try {
      await testFn(container, queries, userEvent, assertions);
    } finally {
      unmount();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  render,
  queries,
  userEvent,
  assertions,
  waitFor,
  waitForElement,
  toMatchSnapshot,
  clearSnapshots,
  textScreenshot,
  describeE2E,
  itRenders,
  itBehavesLike,
};
