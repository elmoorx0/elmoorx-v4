/**
 * اختبارات Utility UI Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { ColorPalette, GradientPicker, ConfirmDialog, KeyboardShortcuts } from '../ui/utility.mjs';

describe('Utility — ColorPalette', () => {
  it('should render palette', () => {
    const html = renderToString(h(ColorPalette, { baseColor: '#0ea5e9' }));
    expect(html).toContain('#0ea5e9');
  });

  it('should render shades grid', () => {
    const html = renderToString(h(ColorPalette, {}));
    expect(html).toContain('grid-template-columns:repeat(10');
  });

  it('should render harmony colors', () => {
    const html = renderToString(h(ColorPalette, {}));
    expect(html).toContain('الألوان المتناغمة');
    expect(html).toContain('Complement');
    expect(html).toContain('Triadic');
  });

  it('should render color input', () => {
    const html = renderToString(h(ColorPalette, {}));
    expect(html).toContain('type="color"');
  });
});

describe('Utility — GradientPicker', () => {
  it('should render preview', () => {
    const html = renderToString(h(GradientPicker, {}));
    expect(html).toContain('linear-gradient');
  });

  it('should render color inputs', () => {
    const html = renderToString(h(GradientPicker, {}));
    const colorCount = html.split('type="color"').length - 1;
    expect(colorCount).toBe(2);
  });

  it('should render presets', () => {
    const html = renderToString(h(GradientPicker, {}));
    expect(html).toContain('grid-template-columns:repeat(3');
  });

  it('should render angle slider for linear', () => {
    const html = renderToString(h(GradientPicker, { value: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' }));
    expect(html).toContain('type="range"');
    expect(html).toContain('135');
  });
});

describe('Utility — ConfirmDialog', () => {
  it('should not render when closed', () => {
    const html = renderToString(h(ConfirmDialog, { open: false }));
    expect(html).toBe('');
  });

  it('should render message when open', () => {
    const html = renderToString(h(ConfirmDialog, {
      open: true,
      message: 'هل تريد الحذف؟',
    }));
    expect(html).toContain('هل تريد الحذف؟');
  });

  it('should render confirm and cancel buttons', () => {
    const html = renderToString(h(ConfirmDialog, {
      open: true,
      confirmText: 'حذف',
      cancelText: 'تراجع',
    }));
    expect(html).toContain('حذف');
    expect(html).toContain('تراجع');
  });
});

describe('Utility — KeyboardShortcuts', () => {
  it('should render shortcuts list', () => {
    const html = renderToString(h(KeyboardShortcuts, {
      shortcuts: [
        { keys: 'Ctrl+S', description: 'حفظ' },
        { keys: 'Ctrl+Z', description: 'تراجع' },
        { keys: 'Ctrl+F', description: 'بحث' },
      ],
    }));
    expect(html).toContain('Ctrl+S');
    expect(html).toContain('Ctrl+Z');
    expect(html).toContain('Ctrl+F');
    expect(html).toContain('حفظ');
    expect(html).toContain('تراجع');
    expect(html).toContain('بحث');
  });

  it('should render kbd elements', () => {
    const html = renderToString(h(KeyboardShortcuts, {
      shortcuts: [{ keys: 'Esc', description: 'خروج' }],
    }));
    expect(html).toContain('kbd');
  });

  it('should render title', () => {
    const html = renderToString(h(KeyboardShortcuts, {
      shortcuts: [],
    }));
    expect(html).toContain('اختصارات لوحة المفاتيح');
  });
});
