/**
 * اختبارات UI Extras + E2E
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import {
  Menu, ContextMenu, Transfer, Cascader,
  CircularProgress, Countdown, CodeBlock, ToggleGroup,
} from '../ui/extras.mjs';
import { render, queries, userEvent, assertions, waitFor, textScreenshot } from '../e2e/index.mjs';

describe('UI Extras — Menu', () => {
  it('should render menu items', () => {
    const html = renderToString(h(Menu, {
      items: [
        { key: 'home', label: 'الرئيسية' },
        { key: 'about', label: 'من نحن' },
      ],
    }));
    expect(html).toContain('الرئيسية');
    expect(html).toContain('من نحن');
  });

  it('should support horizontal mode', () => {
    const html = renderToString(h(Menu, {
      mode: 'horizontal',
      items: [{ key: 'a', label: 'A' }],
    }));
    expect(html).toContain('flex-direction:row');
  });

  it('should support vertical mode', () => {
    const html = renderToString(h(Menu, {
      mode: 'vertical',
      items: [{ key: 'a', label: 'A' }],
    }));
    expect(html).toContain('flex-direction:column');
  });
});

describe('UI Extras — ContextMenu', () => {
  it('should render children', () => {
    const html = renderToString(h(ContextMenu, {
      items: [{ label: 'Copy' }],
    }, 'Right click here'));
    expect(html).toContain('Right click here');
  });

  it('should not show menu initially', () => {
    const html = renderToString(h(ContextMenu, {
      items: [{ label: 'Copy' }],
    }, 'Target'));
    expect(html).not.toContain('Copy');
  });
});

describe('UI Extras — Transfer', () => {
  it('should render two panels', () => {
    const html = renderToString(h(Transfer, {
      dataSource: [
        { key: '1', label: 'Item 1' },
        { key: '2', label: 'Item 2' },
      ],
    }));
    expect(html).toContain('Item 1');
    expect(html).toContain('Item 2');
  });

  it('should render transfer buttons', () => {
    const html = renderToString(h(Transfer, {
      dataSource: [{ key: '1', label: 'A' }],
    }));
    expect(html).toContain('→');
    expect(html).toContain('←');
  });
});

describe('UI Extras — Cascader', () => {
  it('should render trigger', () => {
    const html = renderToString(h(Cascader, {
      options: [{ value: 'a', label: 'Option A' }],
      placeholder: 'اختر...',
    }));
    expect(html).toContain('اختر...');
  });

  it('should display selected path', () => {
    const html = renderToString(h(Cascader, {
      options: [{ value: 'a', label: 'Option A' }],
      value: ['a'],
    }));
    expect(html).toContain('Option A');
  });
});

describe('UI Extras — CircularProgress', () => {
  it('should render SVG', () => {
    const html = renderToString(h(CircularProgress, { value: 50 }));
    expect(html).toContain('<svg');
    expect(html).toContain('<circle');
  });

  it('should show percentage', () => {
    const html = renderToString(h(CircularProgress, { value: 75, showLabel: true }));
    expect(html).toContain('75%');
  });
});

describe('UI Extras — Countdown', () => {
  it('should render countdown', () => {
    const future = new Date(Date.now() + 86400000); // tomorrow
    const html = renderToString(h(Countdown, { to: future }));
    expect(html).toContain('01'); // 1 day
  });
});

describe('UI Extras — CodeBlock', () => {
  it('should render code', () => {
    const html = renderToString(h(CodeBlock, { code: 'const x = 5;' }));
    expect(html).toContain('const');
    expect(html).toContain('x');
    expect(html).toContain('5');
  });

  it('should show line numbers', () => {
    const html = renderToString(h(CodeBlock, {
      code: 'line1\nline2',
      showLineNumbers: true,
    }));
    expect(html).toContain('1');
    expect(html).toContain('2');
  });

  it('should highlight keywords', () => {
    const html = renderToString(h(CodeBlock, { code: 'const x = 5;' }));
    expect(html).toContain('bfdbfe'); // keyword color
  });
});

describe('UI Extras — ToggleGroup', () => {
  it('should render options', () => {
    const html = renderToString(h(ToggleGroup, {
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ],
    }));
    expect(html).toContain('A');
    expect(html).toContain('B');
  });

  it('should highlight selected', () => {
    const html = renderToString(h(ToggleGroup, {
      options: [{ value: 'a', label: 'A' }],
      value: 'a',
    }));
    expect(html).toContain('background:#0ea5e9');
  });
});

describe('E2E — render', () => {
  it('should render component to container', () => {
    const { container } = render(() => h('div', null, 'Hello World'));
    expect(container.textContent).toContain('Hello World');
  });

  it('should render nested elements', () => {
    const { container } = render(() =>
      h('div', null,
        h('p', null, 'Paragraph 1'),
        h('p', null, 'Paragraph 2')
      )
    );
    expect(container.textContent).toContain('Paragraph 1');
    expect(container.textContent).toContain('Paragraph 2');
  });

  it('should render component functions', () => {
    const Component = () => h('button', null, 'Click me');
    const { container } = render(h(Component, null));
    expect(container.textContent).toContain('Click me');
  });
});

describe('E2E — queries', () => {
  it('getByText should find element', () => {
    const { container } = render(() => h('div', null, h('span', null, 'Find me')));
    const el = queries.getByText(container, 'Find me');
    expect(el).not.toBe(null);
  });

  it('getByRole should find element', () => {
    const { container } = render(() => h('div', null, h('button', { role: 'submit' }, 'Submit')));
    const el = queries.getByRole(container, 'submit');
    expect(el).not.toBe(null);
  });

  it('getByText should return null if not found', () => {
    const { container } = render(() => h('div', null, 'Hello'));
    const el = queries.getByText(container, 'Not exists');
    expect(el).toBe(null);
  });
});

describe('E2E — assertions', () => {
  it('isVisible should return true for normal element', () => {
    const { container } = render(() => h('div', null, 'Visible'));
    expect(assertions.isVisible(container)).toBe(true);
  });

  it('hasText should check text content', () => {
    const { container } = render(() => h('div', null, 'Hello World'));
    expect(assertions.hasText(container, 'Hello')).toBe(true);
    expect(assertions.hasText(container, 'Goodbye')).toBe(false);
  });
});

describe('E2E — textScreenshot', () => {
  it('should generate text representation', () => {
    const { container } = render(() =>
      h('div', { class: 'container' },
        h('h1', null, 'Title'),
        h('p', null, 'Content')
      )
    );
    const screenshot = textScreenshot(container);
    expect(typeof screenshot).toBe('string');
    expect(screenshot).toContain('Title');
    expect(screenshot).toContain('Content');
  });
});

describe('E2E — waitFor', () => {
  it('should resolve when condition is true', async () => {
    let ready = false;
    setTimeout(() => { ready = true; }, 100);
    await waitFor(() => ready, { timeout: 500 });
    expect(ready).toBe(true);
  });

  it('should timeout when condition is never true', async () => {
    let error = null;
    try {
      await waitFor(() => false, { timeout: 100 });
    } catch (e) { error = e; }
    expect(error).not.toBe(null);
    expect(error.message).toContain('timeout');
  });
});
