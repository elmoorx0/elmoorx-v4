/**
 * اختبارات Visualization UI Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { Heatmap, Calendar, Gantt, QRCode, FunnelChart, Treemap, WordCloud } from '../ui/visualization.mjs';

describe('Visualization — Heatmap', () => {
  it('should render SVG', () => {
    const html = renderToString(h(Heatmap, {
      data: [{ x: 0, y: 0, value: 5 }],
      xLabels: ['A'],
      yLabels: ['1'],
    }));
    expect(html).toContain('<svg');
    expect(html).toContain('<rect');
  });

  it('should render values when enabled', () => {
    const html = renderToString(h(Heatmap, {
      data: [{ x: 0, y: 0, value: 42 }],
      xLabels: ['A'],
      yLabels: ['1'],
      showValues: true,
    }));
    expect(html).toContain('42');
  });
});

describe('Visualization — Calendar', () => {
  it('should render month name', () => {
    const html = renderToString(h(Calendar, {
      date: '2026-07-15',
    }));
    expect(html).toContain('يوليو');
    expect(html).toContain('2026');
  });

  it('should render day headers', () => {
    const html = renderToString(h(Calendar, {}));
    expect(html).toContain('أحد');
    expect(html).toContain('سبت');
  });

  it('should render events indicators', () => {
    const html = renderToString(h(Calendar, {
      date: '2026-07-15',
      events: [{ date: '2026-07-20', title: 'Meeting', color: '#0ea5e9' }],
    }));
    // should have event dots
    expect(html).toContain('border-radius:50%');
  });
});

describe('Visualization — Gantt', () => {
  it('should render SVG with tasks', () => {
    const html = renderToString(h(Gantt, {
      tasks: [
        { id: 1, name: 'Task 1', start: '2026-07-01', end: '2026-07-10', progress: 50 },
        { id: 2, name: 'Task 2', start: '2026-07-05', end: '2026-07-15', progress: 30 },
      ],
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    }));
    expect(html).toContain('<svg');
    expect(html).toContain('Task 1');
    expect(html).toContain('Task 2');
  });

  it('should show progress percentage', () => {
    const html = renderToString(h(Gantt, {
      tasks: [{ id: 1, name: 'T', start: '2026-07-01', end: '2026-07-10', progress: 75 }],
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    }));
    expect(html).toContain('75%');
  });
});

describe('Visualization — QRCode', () => {
  it('should render SVG', () => {
    const html = renderToString(h(QRCode, { text: 'hello' }));
    expect(html).toContain('<svg');
    expect(html).toContain('<rect');
  });

  it('should accept custom colors', () => {
    const html = renderToString(h(QRCode, { text: 'test', fgColor: '#ff0000', bgColor: '#ffffff' }));
    expect(html).toContain('#ff0000');
    expect(html).toContain('#ffffff');
  });

  it('should accept custom size', () => {
    const html = renderToString(h(QRCode, { text: 'x', size: 300 }));
    expect(html).toContain('width="300"');
    expect(html).toContain('height="300"');
  });
});

describe('Visualization — FunnelChart', () => {
  it('should render SVG with sections', () => {
    const html = renderToString(h(FunnelChart, {
      data: [
        { label: 'Visits', value: 1000 },
        { label: 'Signups', value: 500 },
        { label: 'Purchases', value: 100 },
      ],
    }));
    expect(html).toContain('<svg');
    expect(html).toContain('polygon');
    expect(html).toContain('Visits');
    expect(html).toContain('Purchases');
  });

  it('should show percentages', () => {
    const html = renderToString(h(FunnelChart, {
      data: [{ label: 'A', value: 100 }, { label: 'B', value: 50 }],
    }));
    expect(html).toContain('%');
  });
});

describe('Visualization — Treemap', () => {
  it('should render SVG with rectangles', () => {
    const html = renderToString(h(Treemap, {
      data: [
        { label: 'A', value: 50 },
        { label: 'B', value: 30 },
        { label: 'C', value: 20 },
      ],
    }));
    expect(html).toContain('<svg');
    expect(html).toContain('rect');
  });

  it('should show labels for large items', () => {
    const html = renderToString(h(Treemap, {
      data: [{ label: 'Big', value: 100 }],
      width: 400,
      height: 300,
    }));
    expect(html).toContain('Big');
  });
});

describe('Visualization — WordCloud', () => {
  it('should render SVG with text elements', () => {
    const html = renderToString(h(WordCloud, {
      words: [
        { text: 'Hello', weight: 10 },
        { text: 'World', weight: 5 },
      ],
    }));
    expect(html).toContain('<svg');
    expect(html).toContain('Hello');
    expect(html).toContain('World');
  });

  it('should vary font sizes by weight', () => {
    const html = renderToString(h(WordCloud, {
      words: [
        { text: 'Big', weight: 100 },
        { text: 'Small', weight: 1 },
      ],
      minSize: 10,
      maxSize: 40,
    }));
    // Big should have larger font-size than Small
    expect(html).toContain('font-size');
  });
});
