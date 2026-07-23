/**
 * اختبارات UI components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import {
  Button, Input, Card, Badge, Alert, Spinner, Progress, Avatar,
  Table, Tabs, Accordion, Divider, Stack, Grid, theme, setTheme,
} from '../ui/index.mjs';

describe('UI — Button', () => {
  it('should render button', () => {
    const html = renderToString(h(Button, null, 'Click'));
    expect(html).toContain('<button');
    expect(html).toContain('Click');
  });

  it('should apply variant styles', () => {
    const html = renderToString(h(Button, { variant: 'danger' }, 'Delete'));
    expect(html).toContain('background:#ef4444');
  });

  it('should apply size styles', () => {
    const html = renderToString(h(Button, { size: 'lg' }, 'Big'));
    expect(html).toContain('padding:0.8rem 1.6rem');
  });

  it('should be disabled when loading', () => {
    const html = renderToString(h(Button, { loading: true }, 'Saving'));
    expect(html).toContain('disabled');
  });
});

describe('UI — Input', () => {
  it('should render input with label', () => {
    const html = renderToString(h(Input, { label: 'Name' }));
    expect(html).toContain('<label');
    expect(html).toContain('Name');
    expect(html).toContain('<input');
  });

  it('should show error', () => {
    const html = renderToString(h(Input, { error: 'Required' }));
    expect(html).toContain('Required');
    expect(html).toContain('#ef4444'); // danger color
  });
});

describe('UI — Card', () => {
  it('should render card with title', () => {
    const html = renderToString(h(Card, { title: 'My Card' }, 'Content'));
    expect(html).toContain('My Card');
    expect(html).toContain('Content');
  });

  it('should render card with footer', () => {
    const html = renderToString(h(Card, { footer: 'Footer text' }, 'Body'));
    expect(html).toContain('Footer text');
  });
});

describe('UI — Badge', () => {
  it('should render badge', () => {
    const html = renderToString(h(Badge, null, 'New'));
    expect(html).toContain('New');
    expect(html).toContain('<span');
  });

  it('should apply variant', () => {
    const html = renderToString(h(Badge, { variant: 'success' }, 'OK'));
    expect(html).toContain('background:#10b981');
  });

  it('should show dot', () => {
    const html = renderToString(h(Badge, { dot: true }, 'Online'));
    expect(html).toContain('border-radius:50%');
  });
});

describe('UI — Alert', () => {
  it('should render alert', () => {
    const html = renderToString(h(Alert, { variant: 'info' }, 'Message'));
    expect(html).toContain('Message');
  });

  it('should render alert with title', () => {
    const html = renderToString(h(Alert, { title: 'Title' }, 'Body'));
    expect(html).toContain('Title');
  });
});

describe('UI — Spinner', () => {
  it('should render spinner', () => {
    const html = renderToString(h(Spinner));
    expect(html).toContain('border');
    expect(html).toContain('border-radius:50%');
  });

  it('should accept size', () => {
    const html = renderToString(h(Spinner, { size: 32 }));
    expect(html).toContain('width:32px');
  });
});

describe('UI — Progress', () => {
  it('should render progress bar', () => {
    const html = renderToString(h(Progress, { value: 50, max: 100 }));
    expect(html).toContain('width:50%');
  });

  it('should clamp value', () => {
    const html = renderToString(h(Progress, { value: 150, max: 100 }));
    expect(html).toContain('width:100%');
  });

  it('should show label', () => {
    const html = renderToString(h(Progress, { value: 75, showLabel: true }));
    expect(html).toContain('75%');
  });
});

describe('UI — Avatar', () => {
  it('should render avatar with initials', () => {
    const html = renderToString(h(Avatar, { name: 'محمد علي' }));
    // يعرض الأحرف الأولى من الاسم
    expect(html).toContain('مع'); // م + ع
  });

  it('should accept size', () => {
    const html = renderToString(h(Avatar, { name: 'AB', size: 60 }));
    expect(html).toContain('width:60px');
    expect(html).toContain('height:60px');
  });
});

describe('UI — Table', () => {
  it('should render table with columns and data', () => {
    const html = renderToString(h(Table, {
      columns: [{ key: 'name', label: 'Name' }],
      data: [{ name: 'Ali' }],
    }));
    expect(html).toContain('<table');
    expect(html).toContain('Name');
    expect(html).toContain('Ali');
  });
});

describe('UI — Divider', () => {
  it('should render horizontal divider', () => {
    const html = renderToString(h(Divider));
    expect(html).toContain('border-top');
  });

  it('should render divider with label', () => {
    const html = renderToString(h(Divider, { label: 'أو' }));
    expect(html).toContain('أو');
  });
});

describe('UI — Theme', () => {
  it('should have default theme', () => {
    expect(theme.colors.primary).toBe('#0ea5e9');
    expect(theme.colors.danger).toBe('#ef4444');
  });

  it('should be customizable', () => {
    const originalPrimary = theme.colors.primary;
    setTheme({ colors: { ...theme.colors, primary: '#ff0000' } });
    expect(theme.colors.primary).toBe('#ff0000');
    // reset
    setTheme({ colors: { ...theme.colors, primary: originalPrimary } });
  });
});
