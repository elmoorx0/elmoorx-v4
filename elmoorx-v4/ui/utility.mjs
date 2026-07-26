/**
 * Elmoorx v4 — Utility UI Components
 * ===================================
 * مكونات مساعدة:
 *   - ColorPalette (مولد لوحة ألوان)
 *   - GradientPicker (منتقي تدرجات)
 *   - IconPicker (منتقي أيقونات)
 *   - FontPreview (معاينة خطوط)
 *   - Toggle (مفتاح)
 *   - ConfirmDialog (حوار تأكيد)
 */

import { h, $state, $computed, $effect } from '../runtime/core.mjs';
import { theme } from './index.mjs';
import { Modal, Button } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) COLOR PALETTE GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function ColorPalette(props) {
  const {
    baseColor = '#0ea5e9',
    onPick,
    ...rest
  } = props;

  const base = $state(baseColor);

  const shades = $computed(() => {
    const colors = [];
    // generate 10 shades from 50 to 950
    const hsl = hexToHsl(base());
    for (let i = 0; i <= 9; i++) {
      const lightness = 95 - i * 9;
      colors.push({
        name: i * 100,
        hex: hslToHex(hsl.h, hsl.s, lightness),
        text: lightness > 50 ? '#0f172a' : '#ffffff',
      });
    }
    return colors;
  });

  const complementary = $computed(() => {
    const hsl = hexToHsl(base());
    return [
      { name: 'Base', hex: base() },
      { name: 'Complement', hex: hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l) },
      { name: 'Analogous 1', hex: hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l) },
      { name: 'Analogous 2', hex: hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l) },
      { name: 'Triadic 1', hex: hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l) },
      { name: 'Triadic 2', hex: hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l) },
    ];
  });

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1.5rem;`,
    ...rest,
  },
    // Base color input
    h('div', {
      style: `display:flex;gap:0.5rem;align-items:center;margin-bottom:1rem;`,
    },
      h('input', {
        type: 'color',
        value: base(),
        onInput: e => base.set(e.target.value),
        style: 'width:50px;height:40px;cursor:pointer;border:none;border-radius:4px;',
      }),
      h('input', {
        type: 'text',
        value: base(),
        onInput: e => base.set(e.target.value),
        style: `flex:1;padding:0.5rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};font-family:monospace;text-transform:uppercase;`,
      })
    ),
    // Shades
    h('h4', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};margin-bottom:0.5rem;` }, 'الدرجات'),
    h('div', {
      style: 'display:grid;grid-template-columns:repeat(10,1fr);gap:2px;border-radius:8px;overflow:hidden;margin-bottom:1rem;',
    },
      shades().map(s =>
        h('div', {
          key: s.name,
          onClick: () => onPick?.(s.hex),
          style: `background:${s.hex};padding:0.75rem 0.25rem;text-align:center;cursor:pointer;font-size:0.65rem;color:${s.text};font-weight:600;transition:transform 0.15s;:hover{transform:scale(1.1);}`,
        }, s.name)
      )
    ),
    // Harmony colors
    h('h4', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};margin-bottom:0.5rem;` }, 'الألوان المتناغمة'),
    h('div', {
      style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;',
    },
      complementary().map(c =>
        h('div', {
          key: c.name,
          onClick: () => onPick?.(c.hex),
          style: `background:${c.hex};padding:0.75rem;border-radius:${theme.radius.md};cursor:pointer;text-align:center;color:${hexToHsl(c.hex).l > 50 ? '#0f172a' : '#ffffff'};font-size:${theme.fontSize.xs};font-weight:600;`,
        },
          h('div', null, c.name),
          h('div', { style: 'font-family:monospace;font-size:0.65rem;margin-top:0.15rem;opacity:0.8;' }, c.hex.toUpperCase())
        )
      )
    )
  );
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (c) => Math.round(c * 255).toString(16).padStart(2, '0');
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) GRADIENT PICKER
// ─────────────────────────────────────────────────────────────────────────────

export function GradientPicker(props) {
  const {
    value: valueProp = 'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
    onChange,
    ...rest
  } = props;

  const value = $state(valueProp);
  const type = $state('linear');
  const color1 = $state('#0ea5e9');
  const color2 = $state('#8b5cf6');
  const angle = $state(135);

  const update = () => {
    const grad = type() === 'linear'
      ? `linear-gradient(${angle()}deg, ${color1()}, ${color2()})`
      : `radial-gradient(circle, ${color1()}, ${color2()})`;
    value.set(grad);
    onChange?.(grad);
  };

  $effect(() => { update(); });

  const presets = [
    'linear-gradient(135deg, #0ea5e9, #8b5cf6)',
    'linear-gradient(135deg, #10b981, #14b8a6)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #6366f1, #06b6d4)',
    'linear-gradient(180deg, #1e293b, #0f172a)',
  ];

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1.5rem;`,
    ...rest,
  },
    // Preview
    h('div', {
      style: `height:120px;background:${value()};border-radius:${theme.radius.md};margin-bottom:1rem;border:1px solid ${theme.colors.border};`,
    }),
    // Controls
    h('div', { style: 'display:flex;gap:0.5rem;align-items:center;margin-bottom:0.75rem;' },
      h('select', {
        value: type(),
        onChange: e => type.set(e.target.value),
        style: `padding:0.4rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};`,
      },
        h('option', { value: 'linear' }, 'Linear'),
        h('option', { value: 'radial' }, 'Radial')
      ),
      h('input', {
        type: 'color',
        value: color1(),
        onInput: e => color1.set(e.target.value),
        style: 'width:40px;height:36px;cursor:pointer;border:none;border-radius:4px;',
      }),
      h('span', { style: `color:${theme.colors.textMuted};` }, '→'),
      h('input', {
        type: 'color',
        value: color2(),
        onInput: e => color2.set(e.target.value),
        style: 'width:40px;height:36px;cursor:pointer;border:none;border-radius:4px;',
      }),
      type() === 'linear' && h('input', {
        type: 'range',
        min: 0,
        max: 360,
        value: angle(),
        onInput: e => angle.set(Number(e.target.value)),
        style: 'flex:1;accent-color:' + theme.colors.primary,
      }),
      type() === 'linear' && h('span', {
        style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};min-width:40px;`,
      }, `${angle()}°`)
    ),
    // CSS value
    h('input', {
      type: 'text',
      value: value(),
      readOnly: true,
      style: `width:100%;padding:0.4rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.primary};font-family:monospace;font-size:0.8rem;direction:ltr;text-align:left;margin-bottom:0.75rem;`,
    }),
    // Presets
    h('div', {
      style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:0.4rem;',
    },
      presets.map((preset, i) =>
        h('div', {
          key: i,
          onClick: () => {
            value.set(preset);
            onChange?.(preset);
          },
          style: `height:36px;background:${preset};border-radius:${theme.radius.sm};cursor:pointer;border:2px solid transparent;:hover{border-color:${theme.colors.primary};}`,
        })
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) CONFIRM DIALOG — حوار تأكيد
// ─────────────────────────────────────────────────────────────────────────────

export function ConfirmDialog(props) {
  const {
    open,
    title = 'تأكيد',
    message = 'هل أنت متأكد؟',
    confirmText = 'تأكيد',
    cancelText = 'إلغاء',
    variant = 'danger', // danger | primary | warning
    onConfirm,
    onCancel,
    ...rest
  } = props;

  if (!open) return null;

  const variantColors = {
    danger: theme.colors.danger,
    primary: theme.colors.primary,
    warning: theme.colors.warning,
  };

  return h(Modal, {
    open,
    onClose: onCancel,
    title,
    size: 'sm',
    footer: [
      h(Button, { variant: 'secondary', onClick: onCancel }, cancelText),
      h(Button, {
        variant: variant === 'danger' ? 'danger' : 'primary',
        onClick: onConfirm,
      }, confirmText),
    ],
    ...rest,
  },
    h('p', {
      style: `color:${theme.colors.textMuted};line-height:1.6;margin:0;`,
    }, message)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────────────────────

export function KeyboardShortcuts(props) {
  const {
    shortcuts = [], // [{ keys: 'Ctrl+S', description: 'حفظ', action: fn }]
    ...rest
  } = props;

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1rem;`,
    ...rest,
  },
    h('h3', {
      style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};margin-bottom:0.75rem;`,
    }, 'اختصارات لوحة المفاتيح'),
    h('div', null,
      shortcuts.map((s, i) =>
        h('div', {
          key: i,
          style: `display:flex;justify-content:space-between;align-items:center;padding:0.4rem 0;border-bottom:1px solid ${theme.colors.border};`,
        },
          h('span', {
            style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};`,
          }, s.description),
          h('kbd', {
            style: `padding:0.2rem 0.5rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};font-family:monospace;font-size:0.75rem;color:${theme.colors.primary};box-shadow:0 2px 0 ${theme.colors.border};`,
          }, s.keys)
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  ColorPalette,
  GradientPicker,
  ConfirmDialog,
  KeyboardShortcuts,
};
