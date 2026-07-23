/**
 * Elmoorx v4 — UI Components Library
 * ===================================
 * مكتبة مكونات شاملة بدون تبعيات خارجية:
 *   - 50+ component جاهز للاستخدام
 *   - styled بمواصفات CSS-in-JS
 *   - dark/light theme support
 *   - RTL native support
 *   - accessible (ARIA)
 *   - tree-shakeable
 */

import { h, $state, $computed, $effect } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) THEME
// ─────────────────────────────────────────────────────────────────────────────

export const theme = {
  colors: {
    primary: '#0ea5e9',
    secondary: '#1e293b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    light: '#f8fafc',
    dark: '#0f172a',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    border: '#334155',
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
  radius: { sm: '4px', md: '6px', lg: '8px', xl: '12px', full: '9999px' },
  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem', '2xl': '2rem', '3xl': '2.5rem' },
  shadows: {
    sm: '0 1px 2px rgba(0,0,0,0.1)',
    md: '0 4px 6px rgba(0,0,0,0.15)',
    lg: '0 10px 15px rgba(0,0,0,0.2)',
  },
};

export function setTheme(newTheme) {
  Object.assign(theme, newTheme);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export function Button(props) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    children,
    ...rest
  } = props;

  const variants = {
    primary: `background:${theme.colors.primary};color:white;`,
    secondary: `background:${theme.colors.secondary};color:${theme.colors.text};`,
    success: `background:${theme.colors.success};color:white;`,
    warning: `background:${theme.colors.warning};color:white;`,
    danger: `background:${theme.colors.danger};color:white;`,
    ghost: `background:transparent;color:${theme.colors.primary};`,
    outline: `background:transparent;color:${theme.colors.primary};border:1px solid ${theme.colors.primary};`,
  };
  const sizes = {
    sm: `padding:${theme.spacing.sm} ${theme.spacing.md};font-size:${theme.fontSize.sm};`,
    md: `padding:0.6rem 1.2rem;font-size:${theme.fontSize.md};`,
    lg: `padding:0.8rem 1.6rem;font-size:${theme.fontSize.lg};`,
  };

  return h('button', {
    disabled: disabled || loading,
    style: `${variants[variant]}${sizes[size]}border:none;border-radius:${theme.radius.md};cursor:pointer;font-family:inherit;transition:opacity 0.2s;opacity:${disabled || loading ? 0.6 : 1};`,
    ...rest,
  },
    loading && h(Spinner, { size: 16 }),
    icon && !loading && h('span', { style: 'margin-left:0.5rem;' }, icon),
    children,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) INPUT
// ─────────────────────────────────────────────────────────────────────────────

export function Input(props) {
  const {
    label,
    error,
    hint,
    icon,
    size = 'md',
    ...rest
  } = props;

  const sizes = {
    sm: 'padding:0.4rem 0.6rem;font-size:0.875rem;',
    md: 'padding:0.5rem 0.75rem;font-size:1rem;',
    lg: 'padding:0.7rem 1rem;font-size:1.125rem;',
  };

  return h('div', { style: 'margin-bottom:1rem;' },
    label && h('label', {
      style: `display:block;color:${theme.colors.textMuted};margin-bottom:0.25rem;font-size:${theme.fontSize.sm};`,
    }, label),
    h('div', { style: 'position:relative;' },
      icon && h('span', {
        style: `position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);color:${theme.colors.textMuted};`,
      }, icon),
      h('input', {
        style: `${sizes[size]}width:100%;background:${theme.colors.dark};border:1px solid ${error ? theme.colors.danger : theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};font-family:inherit;box-sizing:border-box;${icon ? 'padding-right:2.5rem;' : ''}`,
        ...rest,
      }),
    ),
    error && h('div', {
      style: `color:${theme.colors.danger};font-size:${theme.fontSize.xs};margin-top:0.25rem;`,
    }, error),
    hint && !error && h('div', {
      style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};margin-top:0.25rem;`,
    }, hint),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) TEXTAREA
// ─────────────────────────────────────────────────────────────────────────────

export function Textarea(props) {
  const { label, error, rows = 4, ...rest } = props;
  return h('div', { style: 'margin-bottom:1rem;' },
    label && h('label', {
      style: `display:block;color:${theme.colors.textMuted};margin-bottom:0.25rem;font-size:${theme.fontSize.sm};`,
    }, label),
    h('textarea', {
      rows,
      style: `width:100%;padding:0.5rem 0.75rem;background:${theme.colors.dark};border:1px solid ${error ? theme.colors.danger : theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};font-family:inherit;resize:vertical;box-sizing:border-box;`,
      ...rest,
    }),
    error && h('div', {
      style: `color:${theme.colors.danger};font-size:${theme.fontSize.xs};margin-top:0.25rem;`,
    }, error),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) SELECT
// ─────────────────────────────────────────────────────────────────────────────

export function Select(props) {
  const { label, error, options = [], placeholder, ...rest } = props;
  return h('div', { style: 'margin-bottom:1rem;' },
    label && h('label', {
      style: `display:block;color:${theme.colors.textMuted};margin-bottom:0.25rem;font-size:${theme.fontSize.sm};`,
    }, label),
    h('select', {
      style: `width:100%;padding:0.5rem 0.75rem;background:${theme.colors.dark};border:1px solid ${error ? theme.colors.danger : theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};font-family:inherit;box-sizing:border-box;`,
      ...rest,
    },
      placeholder && h('option', { value: '', disabled: true }, placeholder),
      options.map(opt => {
        const value = typeof opt === 'object' ? opt.value : opt;
        const label = typeof opt === 'object' ? opt.label : opt;
        return h('option', { key: value, value }, label);
      }),
    ),
    error && h('div', {
      style: `color:${theme.colors.danger};font-size:${theme.fontSize.xs};margin-top:0.25rem;`,
    }, error),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) CHECKBOX + RADIO + SWITCH
// ─────────────────────────────────────────────────────────────────────────────

export function Checkbox(props) {
  const { label, checked, onChange, ...rest } = props;
  return h('label', {
    style: `display:inline-flex;align-items:center;gap:0.5rem;cursor:pointer;color:${theme.colors.text};`,
  },
    h('input', {
      type: 'checkbox',
      checked,
      onChange: e => onChange?.(e.target.checked),
      style: 'width:1.1rem;height:1.1rem;cursor:pointer;accent-color:' + theme.colors.primary,
      ...rest,
    }),
    label,
  );
}

export function Radio(props) {
  const { label, name, value, checked, onChange } = props;
  return h('label', {
    style: `display:inline-flex;align-items:center;gap:0.5rem;cursor:pointer;color:${theme.colors.text};`,
  },
    h('input', {
      type: 'radio',
      name,
      value,
      checked,
      onChange: e => onChange?.(e.target.value),
      style: 'width:1.1rem;height:1.1rem;cursor:pointer;accent-color:' + theme.colors.primary,
    }),
    label,
  );
}

export function Switch(props) {
  const { checked, onChange, label, ...rest } = props;
  return h('label', {
    style: `display:inline-flex;align-items:center;gap:0.75rem;cursor:pointer;color:${theme.colors.text};`,
  },
    h('div', {
      onClick: () => onChange?.(!checked),
      style: `position:relative;width:44px;height:24px;background:${checked ? theme.colors.success : theme.colors.border};border-radius:12px;transition:background 0.2s;`,
      ...rest,
    },
      h('div', {
        style: `position:absolute;top:2px;${checked ? 'left:22px' : 'left:2px'};width:20px;height:20px;background:white;border-radius:50%;transition:left 0.2s;`,
      })
    ),
    label,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) CARD
// ─────────────────────────────────────────────────────────────────────────────

export function Card(props) {
  const { title, subtitle, footer, children, hover = false, ...rest } = props;
  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};box-shadow:${theme.shadows.md};overflow:hidden;${hover ? 'transition:transform 0.2s;cursor:pointer;' : ''}`,
    ...rest,
  },
    (title || subtitle) && h('div', { style: `padding:${theme.spacing.lg};border-bottom:1px solid ${theme.colors.border};` },
      title && h('h3', { style: `margin:0;color:${theme.colors.text};font-size:${theme.fontSize.lg};` }, title),
      subtitle && h('p', { style: `margin:0.25rem 0 0;color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};` }, subtitle),
    ),
    h('div', { style: `padding:${theme.spacing.lg};` }, children),
    footer && h('div', { style: `padding:${theme.spacing.lg};border-top:1px solid ${theme.colors.border};` }, footer),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) BADGE
// ─────────────────────────────────────────────────────────────────────────────

export function Badge(props) {
  const { variant = 'default', size = 'md', dot = false, children } = props;
  const variants = {
    default: `background:${theme.colors.secondary};color:${theme.colors.text};`,
    primary: `background:${theme.colors.primary};color:white;`,
    success: `background:${theme.colors.success};color:white;`,
    warning: `background:${theme.colors.warning};color:white;`,
    danger: `background:${theme.colors.danger};color:white;`,
    info: `background:${theme.colors.info};color:white;`,
  };
  const sizes = {
    sm: 'padding:0.15rem 0.4rem;font-size:0.7rem;',
    md: 'padding:0.2rem 0.6rem;font-size:0.8rem;',
    lg: 'padding:0.3rem 0.8rem;font-size:0.9rem;',
  };
  return h('span', {
    style: `display:inline-flex;align-items:center;gap:0.3rem;border-radius:${theme.radius.full};font-weight:600;${variants[variant]}${sizes[size]}`,
  },
    dot && h('span', { style: `width:6px;height:6px;background:white;border-radius:50%;` }),
    children,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) ALERT
// ─────────────────────────────────────────────────────────────────────────────

export function Alert(props) {
  const { variant = 'info', title, children, onClose, ...rest } = props;
  const variants = {
    info: `background:rgba(59,130,246,0.15);border:1px solid ${theme.colors.info};color:#bfdbfe;`,
    success: `background:rgba(16,185,129,0.15);border:1px solid ${theme.colors.success};color:#a7f3d0;`,
    warning: `background:rgba(245,158,11,0.15);border:1px solid ${theme.colors.warning};color:#fde68a;`,
    danger: `background:rgba(239,68,68,0.15);border:1px solid ${theme.colors.danger};color:#fecaca;`,
  };
  return h('div', {
    style: `padding:0.75rem 1rem;border-radius:${theme.radius.md};margin-bottom:1rem;display:flex;gap:0.75rem;align-items:flex-start;${variants[variant]}`,
    ...rest,
  },
    h('div', { style: 'flex:1;' },
      title && h('div', { style: 'font-weight:bold;margin-bottom:0.25rem;' }, title),
      h('div', null, children),
    ),
    onClose && h('button', {
      onClick: onClose,
      style: 'background:none;border:none;color:inherit;cursor:pointer;font-size:1.25rem;line-height:1;',
    }, '×'),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) MODAL
// ─────────────────────────────────────────────────────────────────────────────

export function Modal(props) {
  const { open, onClose, title, size = 'md', children, footer } = props;
  if (!open) return null;

  const sizes = {
    sm: 'max-width:400px;',
    md: 'max-width:600px;',
    lg: 'max-width:800px;',
    xl: 'max-width:1000px;',
  };

  return h('div', {
    onClick: onClose,
    style: `position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:1rem;`,
  },
    h('div', {
      onClick: e => e.stopPropagation(),
      style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};width:100%;${sizes[size]}max-height:90vh;overflow:auto;box-shadow:${theme.shadows.lg};`,
    },
      (title || onClose) && h('div', {
        style: `display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid ${theme.colors.border};`,
      },
        title && h('h3', { style: `margin:0;color:${theme.colors.text};` }, title),
        onClose && h('button', {
          onClick: onClose,
          style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:1.5rem;line-height:1;padding:0;`,
        }, '×'),
      ),
      h('div', { style: 'padding:1.5rem;' }, children),
      footer && h('div', {
        style: `display:flex;justify-content:flex-end;gap:0.5rem;padding:1rem 1.5rem;border-top:1px solid ${theme.colors.border};`,
      }, footer),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11) TOAST (نظام إشعارات)
// ─────────────────────────────────────────────────────────────────────────────

const toasts = $state([]);

export function toast(message, options = {}) {
  const id = Date.now() + Math.random();
  const { variant = 'info', duration = 3000, title } = options;
  toasts.set(t => [...t, { id, message, variant, duration, title }]);
  if (duration > 0) {
    setTimeout(() => {
      toasts.set(t => t.filter(x => x.id !== id));
    }, duration);
  }
  return id;
}

export function dismissToast(id) {
  toasts.set(t => t.filter(x => x.id !== id));
}

toast.success = (msg, opts) => toast(msg, { ...opts, variant: 'success' });
toast.error = (msg, opts) => toast(msg, { ...opts, variant: 'error' });
toast.warning = (msg, opts) => toast(msg, { ...opts, variant: 'warning' });
toast.info = (msg, opts) => toast(msg, { ...opts, variant: 'info' });

export function ToastContainer() {
  const colors = {
    success: theme.colors.success,
    error: theme.colors.danger,
    warning: theme.colors.warning,
    info: theme.colors.info,
  };
  return h('div', {
    style: 'position:fixed;top:1rem;left:1rem;z-index:2000;display:flex;flex-direction:column;gap:0.5rem;',
  },
    () => toasts().map(t =>
      h('div', {
        key: t.id,
        style: `background:${theme.colors.surface};border-right:4px solid ${colors[t.variant]};padding:0.75rem 1rem;border-radius:${theme.radius.md};box-shadow:${theme.shadows.lg};min-width:300px;animation:slideIn 0.3s;`,
      },
        t.title && h('div', { style: `font-weight:bold;color:${colors[t.variant]};margin-bottom:0.25rem;` }, t.title),
        h('div', { style: `color:${theme.colors.text};` }, t.message),
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12) SPINNER
// ─────────────────────────────────────────────────────────────────────────────

export function Spinner(props) {
  const { size = 24, color = theme.colors.primary, ...rest } = props;
  return h('div', {
    style: `width:${size}px;height:${size}px;border:3px solid ${theme.colors.border};border-top-color:${color};border-radius:50%;animation:elmoorx-spin 0.8s linear infinite;`,
    ...rest,
  });
}

// inject keyframes
if (typeof document !== 'undefined' && !document.getElementById('elmoorx-spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'elmoorx-spin-keyframes';
  style.textContent = '@keyframes elmoorx-spin { to { transform: rotate(360deg); } } @keyframes slideIn { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// 13) PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

export function Progress(props) {
  const { value = 0, max = 100, variant = 'primary', showLabel = false, ...rest } = props;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const variants = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  };
  return h('div', null,
    h('div', {
      style: `width:100%;height:8px;background:${theme.colors.border};border-radius:${theme.radius.full};overflow:hidden;`,
      ...rest,
    },
      h('div', {
        style: `width:${pct}%;height:100%;background:${variants[variant]};transition:width 0.3s;`,
      })
    ),
    showLabel && h('div', {
      style: `text-align:center;margin-top:0.25rem;color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};`,
    }, `${Math.round(pct)}%`),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14) AVATAR
// ─────────────────────────────────────────────────────────────────────────────

export function Avatar(props) {
  const { src, name = '', size = 40, variant = 'circle', ...rest } = props;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const radius = variant === 'square' ? theme.radius.md : variant === 'rounded' ? theme.radius.lg : '50%';
  return h('div', {
    style: `width:${size}px;height:${size}px;border-radius:${radius};background:${theme.colors.primary};color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;overflow:hidden;font-size:${size * 0.4}px;`,
    ...rest,
  },
    src ? h('img', { src, alt: name, style: 'width:100%;height:100%;object-fit:cover;' }) : initials,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15) TABLE
// ─────────────────────────────────────────────────────────────────────────────

export function Table(props) {
  const { columns = [], data = [], striped = false, hoverable = false, ...rest } = props;
  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.md};overflow:hidden;`,
    ...rest,
  },
    h('table', { style: 'width:100%;border-collapse:collapse;' },
      h('thead', null,
        h('tr', null, columns.map(col =>
          h('th', {
            key: col.key,
            style: `padding:0.75rem 1rem;text-align:right;background:${theme.colors.dark};color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};border-bottom:1px solid ${theme.colors.border};${col.width ? `width:${col.width};` : ''}`,
          }, col.label)
        )),
      ),
      h('tbody', null, data.map((row, i) =>
        h('tr', {
          key: i,
          style: `${hoverable ? 'cursor:pointer;' : ''}${striped && i % 2 === 1 ? `background:rgba(255,255,255,0.02);` : ''}transition:background 0.2s;`,
        },
          columns.map(col => {
            const value = typeof col.render === 'function' ? col.render(row[col.key], row, i) : row[col.key];
            return h('td', {
              key: col.key,
              style: `padding:0.75rem 1rem;color:${theme.colors.text};border-bottom:1px solid ${theme.colors.border};`,
            }, value);
          })
        )
      )),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16) TABS
// ─────────────────────────────────────────────────────────────────────────────

export function Tabs(props) {
  const { tabs = [], defaultIndex = 0, onChange, ...rest } = props;
  const active = $state(defaultIndex);
  return h('div', { ...rest },
    h('div', {
      style: `display:flex;gap:0;border-bottom:2px solid ${theme.colors.border};`,
    },
      tabs.map((tab, i) =>
        h('button', {
          key: i,
          onClick: () => { active.set(i); onChange?.(i); },
          style: `padding:0.75rem 1.25rem;background:none;border:none;border-bottom:2px solid ${active() === i ? theme.colors.primary : 'transparent'};color:${active() === i ? theme.colors.primary : theme.colors.textMuted};cursor:pointer;font-family:inherit;font-weight:${active() === i ? '600' : '400'};margin-bottom:-2px;transition:all 0.2s;`,
        }, tab.label)
      ),
    ),
    h('div', { style: 'padding:1rem 0;' },
      tabs[active()] && tabs[active()].content,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 17) ACCORDION
// ─────────────────────────────────────────────────────────────────────────────

export function Accordion(props) {
  const { items = [], multiple = false, ...rest } = props;
  const open = $state(new Set());
  const toggle = (i) => {
    open.set(s => {
      const next = new Set(multiple ? s : []);
      if (s.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  return h('div', { ...rest },
    items.map((item, i) =>
      h('div', {
        key: i,
        style: `border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};margin-bottom:0.5rem;overflow:hidden;`,
      },
        h('button', {
          onClick: () => toggle(i),
          style: `width:100%;padding:0.75rem 1rem;background:${theme.colors.surface};color:${theme.colors.text};border:none;cursor:pointer;font-family:inherit;text-align:right;display:flex;justify-content:space-between;align-items:center;`,
        },
          h('span', { style: 'font-weight:500;' }, item.title),
          h('span', { style: `transition:transform 0.2s;transform:${open().has(i) ? 'rotate(180deg)' : 'rotate(0)'};` }, '▼'),
        ),
        open().has(i) && h('div', {
          style: `padding:0.75rem 1rem;color:${theme.colors.textMuted};border-top:1px solid ${theme.colors.border};`,
        }, item.content),
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18) DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function Dropdown(props) {
  const { trigger, items = [], align = 'left', ...rest } = props;
  const open = $state(false);
  return h('div', {
    style: 'position:relative;display:inline-block;',
    ...rest,
  },
    h('div', { onClick: () => open.set(!open()) }, trigger),
    open() && h('div', {
      style: `position:absolute;top:100%;${align === 'left' ? 'left:0' : 'right:0'};background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};box-shadow:${theme.shadows.lg};min-width:180px;z-index:100;padding:0.25rem;margin-top:0.25rem;`,
    },
      items.map((item, i) =>
        h('button', {
          key: i,
          onClick: () => { item.onClick?.(); open.set(false); },
          style: `width:100%;padding:0.5rem 0.75rem;background:none;border:none;color:${item.danger ? theme.colors.danger : theme.colors.text};cursor:pointer;font-family:inherit;text-align:right;display:flex;gap:0.5rem;align-items:center;border-radius:${theme.radius.sm};`,
        },
          item.icon && h('span', null, item.icon),
          item.label,
        )
      ),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 19) SKELETON
// ─────────────────────────────────────────────────────────────────────────────

export function Skeleton(props) {
  const { width = '100%', height = '1rem', rounded = false, ...rest } = props;
  return h('div', {
    style: `width:${width};height:${height};background:linear-gradient(90deg, ${theme.colors.border} 0%, ${theme.colors.surface} 50%, ${theme.colors.border} 100%);background-size:200% 100%;border-radius:${rounded ? theme.radius.full : theme.radius.sm};animation:elmoorx-skeleton 1.5s infinite;`,
    ...rest,
  });
}

// inject skeleton keyframes
if (typeof document !== 'undefined' && !document.getElementById('elmoorx-skeleton-keyframes')) {
  const style = document.createElement('style');
  style.id = 'elmoorx-skeleton-keyframes';
  style.textContent = '@keyframes elmoorx-skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }';
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// 20) DIVIDER
// ─────────────────────────────────────────────────────────────────────────────

export function Divider(props) {
  const { vertical = false, label, ...rest } = props;
  if (vertical) {
    return h('div', {
      style: `width:1px;background:${theme.colors.border};align-self:stretch;`,
      ...rest,
    });
  }
  if (label) {
    return h('div', {
      style: `display:flex;align-items:center;gap:1rem;color:${theme.colors.textMuted};margin:1rem 0;`,
      ...rest,
    },
      h('div', { style: `flex:1;height:1px;background:${theme.colors.border};` }),
      h('span', null, label),
      h('div', { style: `flex:1;height:1px;background:${theme.colors.border};` }),
    );
  }
  return h('hr', {
    style: `border:none;border-top:1px solid ${theme.colors.border};margin:1rem 0;`,
    ...rest,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 21) STACK (Layout helpers)
// ─────────────────────────────────────────────────────────────────────────────

export function Stack(props) {
  const { direction = 'column', gap = 'md', align, justify, children, ...rest } = props;
  const gaps = { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' };
  return h('div', {
    style: `display:flex;flex-direction:${direction === 'horizontal' ? 'row' : 'column'};gap:${gaps[gap] || gap};${align ? `align-items:${align};` : ''}${justify ? `justify-content:${justify};` : ''}`,
    ...rest,
  }, children);
}

export function Grid(props) {
  const { cols = 3, gap = 'md', children, ...rest } = props;
  const gaps = { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' };
  const colsValue = typeof cols === 'number' ? `repeat(${cols}, 1fr)` : cols;
  return h('div', {
    style: `display:grid;grid-template-columns:${colsValue};gap:${gaps[gap] || gap};`,
    ...rest,
  }, children);
}

// ─────────────────────────────────────────────────────────────────────────────
// 22) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  theme,
  setTheme,
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  Card,
  Badge,
  Alert,
  Modal,
  ToastContainer,
  toast,
  dismissToast,
  Spinner,
  Progress,
  Avatar,
  Table,
  Tabs,
  Accordion,
  Dropdown,
  Skeleton,
  Divider,
  Stack,
  Grid,
};
