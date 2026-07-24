/**
 * Elmoorx v4 — Interactive UI Components
 * =======================================
 * مكونات تفاعلية:
 *   - InlineEdit (تحرير في مكانه)
 *   - CopyButton (نسخ للحافظة)
 *   - Affix (تثبيت عند التمرير)
 *   - BackTop (زر العودة للأعلى)
 *   - Typography components
 *   - AspectRatio
 *   - ScrollArea
 */

import { h, $state, $effect, onMount, onCleanup } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) INLINE EDIT — تحرير في مكانه
// ─────────────────────────────────────────────────────────────────────────────

export function InlineEdit(props) {
  const {
    value: valueProp = '',
    onChange,
    onSave,
    onCancel,
    type = 'text',
    placeholder = 'انقر للتحرير',
    validator,
    ...rest
  } = props;

  const editing = $state(false);
  const value = $state(valueProp);
  const original = $state(valueProp);
  const error = $state('');

  const startEdit = () => {
    original.set(value());
    editing.set(true);
    error.set('');
    requestAnimationFrame(() => {
      const input = document.querySelector('[data-inline-edit-input]');
      input?.focus();
      input?.select();
    });
  };

  const save = () => {
    if (validator) {
      const err = validator(value());
      if (err) { error.set(err); return; }
    }
    error.set('');
    editing.set(false);
    if (value() !== original()) {
      onChange?.(value());
      onSave?.(value());
    }
  };

  const cancel = () => {
    value.set(original());
    editing.set(false);
    error.set('');
    onCancel?.();
  };

  const handleKeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  if (editing()) {
    return h('div', { style: 'display:inline-flex;flex-direction:column;gap:0.25rem;', ...rest },
      h('input', {
        'data-inline-edit-input': true,
        type,
        value: value(),
        onInput: e => value.set(e.target.value),
        onKeyDown: handleKeydown,
        onBlur: save,
        placeholder,
        style: `padding:0.3rem 0.6rem;background:${theme.colors.dark};border:1px solid ${error() ? theme.colors.danger : theme.colors.primary};border-radius:${theme.radius.sm};color:${theme.colors.text};outline:none;font-size:inherit;`,
      }),
      error() && h('span', {
        style: `color:${theme.colors.danger};font-size:${theme.fontSize.xs};`,
      }, error())
    );
  }

  return h('span', {
    onClick: startEdit,
    style: `cursor:pointer;padding:0.2rem 0.4rem;border-radius:${theme.radius.sm};border:1px dashed transparent;display:inline-flex;align-items:center;gap:0.25rem;transition:all 0.15s;:hover{border-color:${theme.colors.border};background:${theme.colors.surface};}`,
    ...rest,
  },
    h('span', { style: value() ? '' : `color:${theme.colors.textMuted};` }, value() || placeholder),
    h('span', { style: `color:${theme.colors.textMuted};font-size:0.75rem;opacity:0;transition:opacity 0.15s;` }, '✎')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) COPY BUTTON — نسخ للحافظة
// ─────────────────────────────────────────────────────────────────────────────

export function CopyButton(props) {
  const {
    text,
    label = 'نسخ',
    copiedLabel = 'تم النسخ ✓',
    timeout = 2000,
    ...rest
  } = props;

  const copied = $state(false);

  const copy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      copied.set(true);
      setTimeout(() => copied.set(false), timeout);
    } catch (err) {
      console.error('فشل النسخ:', err);
    }
  };

  return h('button', {
    onClick: copy,
    style: `padding:0.3rem 0.75rem;background:${copied() ? theme.colors.success : theme.colors.surface};color:${copied() ? 'white' : theme.colors.text};border:1px solid ${copied() ? theme.colors.success : theme.colors.border};border-radius:${theme.radius.sm};cursor:pointer;font-size:${theme.fontSize.sm};display:inline-flex;align-items:center;gap:0.3rem;transition:all 0.15s;`,
    ...rest,
  },
    h('span', null, copied() ? copiedLabel : label)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) COPYABLE TEXT — نص قابل للنسخ
// ─────────────────────────────────────────────────────────────────────────────

export function CopyableText(props) {
  const { text, truncate = false, maxLength = 50, ...rest } = props;

  const display = truncate && text.length > maxLength
    ? text.slice(0, maxLength) + '...'
    : text;

  return h('div', {
    style: `display:inline-flex;align-items:center;gap:0.5rem;background:${theme.colors.surface};padding:0.25rem 0.5rem;border-radius:${theme.radius.sm};border:1px solid ${theme.colors.border};`,
    ...rest,
  },
    h('code', {
      style: `color:${theme.colors.primary};font-family:monospace;font-size:0.85rem;direction:ltr;`,
      title: text,
    }, display),
    h(CopyButton, { text, label: '📋', copiedLabel: '✓' })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) AFFIX — تثبيت عنصر عند التمرير
// ─────────────────────────────────────────────────────────────────────────────

export function Affix(props) {
  const {
    children,
    offset = 0,
    position = 'top', // top | bottom
    ...rest
  } = props;

  const affixed = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      if (position === 'top') {
        affixed.set(window.scrollY > offset);
      } else {
        affixed.set(window.scrollY + window.innerHeight < document.body.scrollHeight - offset);
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    onCleanup(() => window.removeEventListener('scroll', handleScroll));
  });

  return h('div', {
    style: affixed()
      ? `position:fixed;${position}:${offset}px;left:0;right:0;z-index:100;box-shadow:${theme.shadows.md};transition:all 0.3s;`
      : 'transition:all 0.3s;',
    ...rest,
  }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) BACK TOP — زر العودة للأعلى
// ─────────────────────────────────────────────────────────────────────────────

export function BackTop(props) {
  const {
    threshold = 400,
    ...rest
  } = props;

  const visible = $state(false);

  $effect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => visible.set(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    onCleanup(() => window.removeEventListener('scroll', handleScroll));
  });

  const scrollTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!visible()) return null;

  return h('button', {
    onClick: scrollTop,
    style: `position:fixed;bottom:2rem;left:2rem;width:44px;height:44px;border-radius:50%;background:${theme.colors.primary};color:white;border:none;cursor:pointer;box-shadow:${theme.shadows.lg};z-index:1000;display:flex;align-items:center;justify-content:center;font-size:1.5rem;transition:all 0.2s;`,
    ...rest,
  }, '↑');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) ASPECT RATIO — حاوية بنسبة أبعاد
// ─────────────────────────────────────────────────────────────────────────────

export function AspectRatio(props) {
  const {
    ratio = 16/9, // width / height
    children,
    ...rest
  } = props;

  const paddingPercent = (1 / ratio) * 100;

  return h('div', {
    style: `position:relative;width:100%;padding-bottom:${paddingPercent}%;`,
    ...rest,
  },
    h('div', {
      style: 'position:absolute;top:0;left:0;right:0;bottom:0;',
    }, children)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) SCROLL AREA — منطقة تمرير مخصصة
// ─────────────────────────────────────────────────────────────────────────────

export function ScrollArea(props) {
  const {
    children,
    height = 300,
    width = '100%',
    showScrollbar = true,
    ...rest
  } = props;

  return h('div', {
    style: `position:relative;width:${width};height:${height}px;overflow:hidden;`,
    ...rest,
  },
    h('div', {
      style: `width:100%;height:100%;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:${theme.colors.primary} ${theme.colors.border};&::-webkit-scrollbar{width:8px;}&::-webkit-scrollbar-track{background:${theme.colors.border};}&::-webkit-scrollbar-thumb{background:${theme.colors.primary};border-radius:4px;}`,
    }, children)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) TYPOGRAPHY COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export function Typography(props) {
  const {
    variant = 'body', // h1, h2, h3, h4, h5, h6, body, caption, overline, code
    children,
    ...rest
  } = props;

  const variants = {
    h1: { tag: 'h1', style: `font-size:2rem;font-weight:700;color:${theme.colors.text};margin:0;` },
    h2: { tag: 'h2', style: `font-size:1.75rem;font-weight:700;color:${theme.colors.text};margin:0;` },
    h3: { tag: 'h3', style: `font-size:1.5rem;font-weight:600;color:${theme.colors.text};margin:0;` },
    h4: { tag: 'h4', style: `font-size:1.25rem;font-weight:600;color:${theme.colors.text};margin:0;` },
    h5: { tag: 'h5', style: `font-size:1.1rem;font-weight:600;color:${theme.colors.text};margin:0;` },
    h6: { tag: 'h6', style: `font-size:1rem;font-weight:600;color:${theme.colors.textMuted};margin:0;` },
    body: { tag: 'p', style: `font-size:1rem;color:${theme.colors.text};line-height:1.6;margin:0;` },
    caption: { tag: 'span', style: `font-size:0.75rem;color:${theme.colors.textMuted};` },
    overline: { tag: 'span', style: `font-size:0.7rem;color:${theme.colors.textMuted};text-transform:uppercase;letter-spacing:1px;` },
    code: { tag: 'code', style: `font-family:monospace;font-size:0.9rem;background:${theme.colors.dark};padding:0.15rem 0.4rem;border-radius:3px;color:${theme.colors.primary};` },
  };

  const v = variants[variant] || variants.body;
  return h(v.tag, { style: v.style, ...rest }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) COLLAPSE — طي/توسيع
// ─────────────────────────────────────────────────────────────────────────────

export function Collapse(props) {
  const {
    open: openProp = false,
    children,
    ...rest
  } = props;

  const open = $state(openProp);

  return h('div', {
    style: `overflow:hidden;transition:max-height 0.3s ease;max-height:${open() ? '1000px' : '0'};`,
    ...rest,
  }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  InlineEdit,
  CopyButton,
  CopyableText,
  Affix,
  BackTop,
  AspectRatio,
  ScrollArea,
  Typography,
  Collapse,
};
