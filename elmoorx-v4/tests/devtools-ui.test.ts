/**
 * اختبارات DevTools UI Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { FileExplorer, CodeExplorer, DevTools, StateInspector, EventLog } from '../ui/devtools-ui.mjs';

describe('DevTools UI — FileExplorer', () => {
  it('should render file tree', () => {
    const html = renderToString(h(FileExplorer, {
      files: [
        { name: 'src', type: 'dir', path: '/src', children: [
          { name: 'index.tsx', type: 'file', path: '/src/index.tsx' },
        ]},
        { name: 'package.json', type: 'file', path: '/package.json' },
      ],
    }));
    expect(html).toContain('src');
    expect(html).toContain('index.tsx');
    expect(html).toContain('package.json');
  });

  it('should show file icons', () => {
    const html = renderToString(h(FileExplorer, {
      files: [{ name: 'test.tsx', type: 'file', path: 'test' }],
    }));
    expect(html).toContain('⚛️');
  });

  it('should show directory icons', () => {
    const html = renderToString(h(FileExplorer, {
      files: [{ name: 'src', type: 'dir', path: 'src', children: [], expanded: false }],
    }));
    // when expanded (default), shows 📂
    expect(html).toContain('📂');
  });

  it('should show file sizes', () => {
    const html = renderToString(h(FileExplorer, {
      files: [{ name: 'big.js', type: 'file', path: 'big', size: 1048576 }],
    }));
    expect(html).toContain('MB');
  });
});

describe('DevTools UI — CodeExplorer', () => {
  it('should render file list', () => {
    const html = renderToString(h(CodeExplorer, {
      files: [
        { name: 'a.ts', path: 'a', content: 'const x = 1;' },
        { name: 'b.ts', path: 'b', content: 'const y = 2;' },
      ],
    }));
    expect(html).toContain('a.ts');
    expect(html).toContain('b.ts');
  });

  it('should render code content', () => {
    const html = renderToString(h(CodeExplorer, {
      files: [{ name: 'test.ts', path: 'test', content: 'const hello = "world";' }],
    }));
    expect(html).toContain('const');
    expect(html).toContain('hello');
    expect(html).toContain('world');
  });

  it('should highlight keywords', () => {
    const html = renderToString(h(CodeExplorer, {
      files: [{ name: 'x.ts', path: 'x', content: 'const x = 5;' }],
    }));
    expect(html).toContain('bfdbfe'); // keyword color
  });
});

describe('DevTools UI — DevTools', () => {
  it('should render toggle button when closed', () => {
    const html = renderToString(h(DevTools, {}));
    expect(html).toContain('DevTools');
    expect(html).toContain('button');
  });

  it('should export DevTools function', () => {
    expect(typeof DevTools).toBe('function');
  });
});

describe('DevTools UI — StateInspector', () => {
  it('should render state tree', () => {
    const html = renderToString(h(StateInspector, {
      state: { user: { name: 'محمد', age: 30 }, count: 5 },
    }));
    // root is collapsed initially — check root shows
    expect(html).toContain('root');
    expect(html).toContain('Object');
  });

  it('should render search input', () => {
    const html = renderToString(h(StateInspector, { state: {} }));
    expect(html).toContain('type="search"');
  });

  it('should show array type at root', () => {
    const html = renderToString(h(StateInspector, {
      state: [1, 2, 3],
    }));
    expect(html).toContain('Array(3)');
  });

  it('should show primitive value at root', () => {
    const html = renderToString(h(StateInspector, {
      state: 'hello',
    }));
    // HTML-encoded quotes
    expect(html).toContain('hello');
  });

  it('should show number at root', () => {
    const html = renderToString(h(StateInspector, {
      state: 42,
    }));
    expect(html).toContain('42');
  });
});

describe('DevTools UI — EventLog', () => {
  it('should render events', () => {
    const html = renderToString(h(EventLog, {
      events: [
        { type: 'click', message: 'Button clicked', time: '10:00', level: 'info' },
        { type: 'error', message: 'Failed to load', time: '10:01', level: 'error' },
      ],
    }));
    expect(html).toContain('Button clicked');
    expect(html).toContain('Failed to load');
  });

  it('should render filter buttons', () => {
    const html = renderToString(h(EventLog, { events: [] }));
    expect(html).toContain('all');
    expect(html).toContain('info');
    expect(html).toContain('error');
  });

  it('should render empty state', () => {
    const html = renderToString(h(EventLog, { events: [] }));
    expect(html).toContain('لا توجد أحداث');
  });

  it('should show level icons', () => {
    const html = renderToString(h(EventLog, {
      events: [
        { type: 'x', message: 'ok', level: 'success', time: '10:00' },
        { type: 'y', message: 'err', level: 'error', time: '10:01' },
      ],
    }));
    expect(html).toContain('✓');
    expect(html).toContain('✗');
  });
});
