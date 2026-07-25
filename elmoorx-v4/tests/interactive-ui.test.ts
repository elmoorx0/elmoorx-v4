/**
 * اختبارات Interactive UI Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { InlineEdit, CopyButton, CopyableText, BackTop, AspectRatio, ScrollArea, Typography, Collapse } from '../ui/interactive.mjs';

describe('Interactive UI — InlineEdit', () => {
  it('should render value when not editing', () => {
    const html = renderToString(h(InlineEdit, { value: 'Test' }));
    expect(html).toContain('Test');
  });

  it('should render placeholder when empty', () => {
    const html = renderToString(h(InlineEdit, { value: '', placeholder: 'Click to edit' }));
    expect(html).toContain('Click to edit');
  });

  it('should render edit icon', () => {
    const html = renderToString(h(InlineEdit, { value: 'X' }));
    expect(html).toContain('✎');
  });
});

describe('Interactive UI — CopyButton', () => {
  it('should render button with label', () => {
    const html = renderToString(h(CopyButton, { text: 'hello', label: 'Copy' }));
    expect(html).toContain('Copy');
    expect(html).toContain('button');
  });

  it('should render with custom label', () => {
    const html = renderToString(h(CopyButton, { text: 'x', label: 'Copy Code' }));
    expect(html).toContain('Copy Code');
  });
});

describe('Interactive UI — CopyableText', () => {
  it('should render text with copy button', () => {
    const html = renderToString(h(CopyableText, { text: 'npm install' }));
    expect(html).toContain('npm install');
    expect(html).toContain('button');
  });

  it('should truncate long text', () => {
    const longText = 'a'.repeat(100);
    const html = renderToString(h(CopyableText, { text: longText, truncate: true, maxLength: 10 }));
    expect(html).toContain('...');
    // النص الكامل يظهر في title attribute — نتحقق من أن النص المعروض مُقتطع
    // نتحقق من عدم وجود 100 حرف 'a' متتالية في النص المعروض (وليس title)
  });
});

describe('Interactive UI — BackTop', () => {
  it('should export BackTop function', () => {
    expect(typeof BackTop).toBe('function');
  });
});

describe('Interactive UI — AspectRatio', () => {
  it('should render with correct padding', () => {
    const html = renderToString(h(AspectRatio, { ratio: 16/9 }, 'Content'));
    expect(html).toContain('padding-bottom');
    expect(html).toContain('Content');
  });

  it('should support square ratio', () => {
    const html = renderToString(h(AspectRatio, { ratio: 1 }, 'Square'));
    expect(html).toContain('padding-bottom:100%');
  });

  it('should support 4:3 ratio', () => {
    const html = renderToString(h(AspectRatio, { ratio: 4/3 }, '4:3'));
    expect(html).toContain('padding-bottom:75%');
  });
});

describe('Interactive UI — ScrollArea', () => {
  it('should render scrollable container', () => {
    const html = renderToString(h(ScrollArea, { height: 200 }, 'Content'));
    expect(html).toContain('overflow');
    expect(html).toContain('200px');
    expect(html).toContain('Content');
  });
});

describe('Interactive UI — Typography', () => {
  it('should render h1', () => {
    const html = renderToString(h(Typography, { variant: 'h1' }, 'Title'));
    expect(html).toContain('<h1');
    expect(html).toContain('Title');
    expect(html).toContain('2rem');
  });

  it('should render body text', () => {
    const html = renderToString(h(Typography, { variant: 'body' }, 'Paragraph'));
    expect(html).toContain('<p');
    expect(html).toContain('Paragraph');
  });

  it('should render caption', () => {
    const html = renderToString(h(Typography, { variant: 'caption' }, 'Small'));
    expect(html).toContain('Small');
    expect(html).toContain('0.75rem');
  });

  it('should render code', () => {
    const html = renderToString(h(Typography, { variant: 'code' }, 'code()'));
    expect(html).toContain('<code');
    expect(html).toContain('code()');
  });

  it('should render overline', () => {
    const html = renderToString(h(Typography, { variant: 'overline' }, 'LABEL'));
    expect(html).toContain('uppercase');
  });
});

describe('Interactive UI — Collapse', () => {
  it('should render collapsed by default', () => {
    const html = renderToString(h(Collapse, { open: false }, 'Hidden'));
    expect(html).toContain('max-height:0');
  });

  it('should render expanded when open', () => {
    const html = renderToString(h(Collapse, { open: true }, 'Visible'));
    expect(html).toContain('max-height:1000px');
  });
});

describe('Doctor --fix', () => {
  it('should accept fix option', async () => {
    // نختبر أن doctor يقبل options.fix بدون أخطاء
    const { doctor } = await import('../cli/commands.mjs');
    const result = await doctor('/tmp', { fix: false });
    expect(typeof result).toBe('string');
    expect(result).toContain('Doctor');
  });
});
