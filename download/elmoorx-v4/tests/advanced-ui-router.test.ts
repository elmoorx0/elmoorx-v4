/**
 * اختبارات Advanced UI + Router (lazy)
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import {
  FileUpload, DatePicker, ColorPicker, VirtualList,
  Pagination, Breadcrumb, Stepper, Tooltip,
} from '../ui/advanced.mjs';
import { lazyRoute, lazy, prefetchRoute } from '../router/index.mjs';

describe('Advanced UI — FileUpload', () => {
  it('should render upload area', () => {
    const html = renderToString(h(FileUpload, {}));
    expect(html).toContain('اسحب الملفات');
  });

  it('should accept custom label', () => {
    const html = renderToString(h(FileUpload, { label: 'Custom' }));
    expect(html).toContain('Custom');
  });

  it('should render input', () => {
    const html = renderToString(h(FileUpload, {}));
    expect(html).toContain('type="file"');
  });
});

describe('Advanced UI — DatePicker', () => {
  it('should render input', () => {
    const html = renderToString(h(DatePicker, { value: '2026-07-22' }));
    expect(html).toContain('input');
    expect(html).toContain('2026-07-22');
  });

  it('should render placeholder', () => {
    const html = renderToString(h(DatePicker, {}));
    expect(html).toContain('اختر تاريخاً');
  });
});

describe('Advanced UI — ColorPicker', () => {
  it('should render color swatch', () => {
    const html = renderToString(h(ColorPicker, { value: '#ff0000' }));
    expect(html).toContain('background:#ff0000');
  });

  it('should render default color', () => {
    const html = renderToString(h(ColorPicker, {}));
    expect(html).toContain('background:#0ea5e9');
  });
});

describe('Advanced UI — VirtualList', () => {
  it('should render container', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    const html = renderToString(h(VirtualList, {
      items,
      itemHeight: 40,
      height: 400,
      renderItem: (item) => h('div', null, item.name),
    }));
    expect(html).toContain('overflow-y:auto');
  });
});

describe('Advanced UI — Pagination', () => {
  it('should render prev/next buttons', () => {
    const html = renderToString(h(Pagination, { total: 100, page: 1, perPage: 10 }));
    expect(html).toContain('السابق');
    expect(html).toContain('التالي');
  });

  it('should render page numbers', () => {
    const html = renderToString(h(Pagination, { total: 100, page: 5, perPage: 10 }));
    expect(html).toContain('5');
  });
});

describe('Advanced UI — Breadcrumb', () => {
  it('should render items', () => {
    const html = renderToString(h(Breadcrumb, {
      items: [
        { label: 'الرئيسية', href: '/' },
        { label: 'المستخدمون', href: '/users' },
        { label: 'محمد' },
      ],
    }));
    expect(html).toContain('الرئيسية');
    expect(html).toContain('المستخدمون');
    expect(html).toContain('محمد');
  });

  it('should render separator', () => {
    const html = renderToString(h(Breadcrumb, {
      items: [{ label: 'A' }, { label: 'B' }],
      separator: '|',
    }));
    expect(html).toContain('|');
  });
});

describe('Advanced UI — Stepper', () => {
  it('should render steps', () => {
    const html = renderToString(h(Stepper, {
      steps: [
        { label: 'الخطوة 1' },
        { label: 'الخطوة 2' },
        { label: 'الخطوة 3' },
      ],
      current: 1,
    }));
    expect(html).toContain('الخطوة 1');
    expect(html).toContain('الخطوة 2');
    expect(html).toContain('الخطوة 3');
  });
});

describe('Advanced UI — Tooltip', () => {
  it('should render children', () => {
    const html = renderToString(h(Tooltip, { content: 'Help text' }, 'Hover me'));
    expect(html).toContain('Hover me');
  });

  it('should not show tooltip by default', () => {
    const html = renderToString(h(Tooltip, { content: 'Hidden text' }, 'Target'));
    expect(html).not.toContain('Hidden text');
  });
});

describe('Router — lazy functions', () => {
  it('should export lazyRoute function', () => {
    expect(typeof lazyRoute).toBe('function');
  });

  it('should export lazy function', () => {
    expect(typeof lazy).toBe('function');
  });

  it('should export prefetchRoute function', () => {
    expect(typeof prefetchRoute).toBe('function');
  });

  it('lazyRoute should return a component function', () => {
    const loader = async () => ({ default: () => h('div', null, 'loaded') });
    const LazyComp = lazyRoute(loader, { prefetch: false });
    expect(typeof LazyComp).toBe('function');
  });

  it('lazy should return a component function', () => {
    const loader = async () => ({ default: () => h('div', null, 'lazy') });
    const LazyComp = lazy(loader, { prefetch: false });
    expect(typeof LazyComp).toBe('function');
  });
});
