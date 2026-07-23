/**
 * اختبارات Advanced UI + Router (lazy)
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import {
  FileUpload, DatePicker, ColorPicker, VirtualList,
  Pagination, Breadcrumb, Stepper, Tooltip,
  TreeView, Carousel, DragDropList, RichTextEditor, Image,
  notify, dismissNotification, NotificationCenter,
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

describe('Advanced UI — TreeView', () => {
  it('should render tree nodes', () => {
    const data = [
      { id: 1, label: 'Node 1', children: [
        { id: 2, label: 'Child 1' },
        { id: 3, label: 'Child 2' },
      ]},
      { id: 4, label: 'Node 2' },
    ];
    const html = renderToString(h(TreeView, { data }));
    expect(html).toContain('Node 1');
    expect(html).toContain('Node 2');
  });

  it('should show expand/collapse icons for nodes with children', () => {
    const data = [{ id: 1, label: 'Parent', children: [{ id: 2, label: 'Child' }] }];
    const html = renderToString(h(TreeView, { data }));
    expect(html).toContain('▶'); // collapsed by default
  });
});

describe('Advanced UI — Carousel', () => {
  it('should render carousel items', () => {
    const html = renderToString(h(Carousel, {
      items: ['Slide 1', 'Slide 2', 'Slide 3'],
      showArrows: true,
      showDots: true,
    }));
    expect(html).toContain('Slide 1');
    expect(html).toContain('Slide 2');
    expect(html).toContain('Slide 3');
  });

  it('should render arrows when enabled', () => {
    const html = renderToString(h(Carousel, { items: ['A'], showArrows: true }));
    expect(html).toContain('‹');
    expect(html).toContain('›');
  });

  it('should render dots when enabled', () => {
    const html = renderToString(h(Carousel, { items: ['A', 'B'], showDots: true }));
    expect(html).toContain('border-radius:50%');
  });
});

describe('Advanced UI — DragDropList', () => {
  it('should render list items', () => {
    const html = renderToString(h(DragDropList, {
      items: ['Item 1', 'Item 2', 'Item 3'],
    }));
    expect(html).toContain('Item 1');
    expect(html).toContain('Item 2');
    expect(html).toContain('Item 3');
  });

  it('should make items draggable', () => {
    const html = renderToString(h(DragDropList, { items: ['A'] }));
    expect(html).toContain('draggable');
  });
});

describe('Advanced UI — RichTextEditor', () => {
  it('should render toolbar', () => {
    const html = renderToString(h(RichTextEditor, {}));
    expect(html).toContain('𝐁'); // bold
    expect(html).toContain('𝐼'); // italic
  });

  it('should render editable area', () => {
    const html = renderToString(h(RichTextEditor, {}));
    expect(html).toContain('contentEditable');
  });

  it('should accept initial value', () => {
    const html = renderToString(h(RichTextEditor, { initialValue: '<p>Hello</p>' }));
    expect(html).toContain('contentEditable');
  });
});

describe('Advanced UI — Image', () => {
  it('should render image with src', () => {
    const html = renderToString(h(Image, { src: 'test.jpg', alt: 'Test' }));
    expect(html).toContain('<img');
    expect(html).toContain('src="test.jpg"');
    expect(html).toContain('alt="Test"');
  });

  it('should use lazy loading by default', () => {
    const html = renderToString(h(Image, { src: 'test.jpg' }));
    expect(html).toContain('loading="lazy"');
  });

  it('should support eager loading', () => {
    const html = renderToString(h(Image, { src: 'test.jpg', lazy: false }));
    expect(html).toContain('loading="eager"');
  });
});

describe('Advanced UI — Notification system', () => {
  it('should export notify function', () => {
    expect(typeof notify).toBe('function');
  });

  it('should export dismissNotification function', () => {
    expect(typeof dismissNotification).toBe('function');
  });

  it('should export NotificationCenter component', () => {
    expect(typeof NotificationCenter).toBe('function');
  });

  it('notify should have variant helpers', () => {
    expect(typeof notify.success).toBe('function');
    expect(typeof notify.error).toBe('function');
    expect(typeof notify.warning).toBe('function');
    expect(typeof notify.info).toBe('function');
  });

  it('should return notification id', () => {
    const id = notify('Test notification', { duration: 100 });
    expect(typeof id).toBe('number');
    setTimeout(() => dismissNotification(id), 150);
  });
});
