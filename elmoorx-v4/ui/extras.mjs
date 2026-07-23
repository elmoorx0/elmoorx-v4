/**
 * Elmoorx v4 — Advanced UI Components (Set 3)
 * ============================================
 * مكونات إضافية متقدمة:
 *   - Menu (vertical + horizontal)
 *   - ContextMenu
 *   - Transfer (transfer items between lists)
 *   - Cascader (multi-level select)
 *   - TreeSelect
 *   - Collapse (controlled accordion)
 *   - Countdown
 *   - CodeBlock (syntax highlighted)
 *   - ProgressBar (circular)
 *   - ToggleGroup
 */

import { h, $state, $computed, $effect } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) MENU — قائمة عمودية أو أفقية
// ─────────────────────────────────────────────────────────────────────────────

export function Menu(props) {
  const {
    items = [], // [{ key, label, icon, disabled, children }]
    mode = 'vertical', // vertical | horizontal
    selectedKey,
    onSelect,
    ...rest
  } = props;

  const current = $state(selectedKey || '');

  const handleClick = (item) => {
    if (item.disabled) return;
    current.set(item.key);
    onSelect?.(item);
  };

  return h('div', {
    style: `display:flex;flex-direction:${mode === 'horizontal' ? 'row' : 'column'};background:${theme.colors.surface};border-radius:${theme.radius.md};padding:0.25rem;`,
    ...rest,
  },
    items.map(item =>
      h('div', {
        key: item.key,
        onClick: () => handleClick(item),
        style: `padding:0.6rem 1rem;cursor:${item.disabled ? 'not-allowed' : 'pointer'};border-radius:${theme.radius.sm};color:${current() === item.key ? theme.colors.primary : theme.colors.text};background:${current() === item.key ? theme.colors.primary + '20' : 'transparent'};opacity:${item.disabled ? 0.5 : 1};display:flex;align-items:center;gap:0.5rem;font-size:0.9rem;${mode === 'horizontal' ? 'margin-left:0.25rem;' : 'margin-bottom:0.15rem;'}`,
      },
        item.icon && h('span', null, item.icon),
        h('span', null, item.label),
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) CONTEXT MENU — قائمة سياق (right-click)
// ─────────────────────────────────────────────────────────────────────────────

export function ContextMenu(props) {
  const {
    items = [],
    children,
    ...rest
  } = props;

  const visible = $state(false);
  const x = $state(0);
  const y = $state(0);

  const handleContextMenu = (e) => {
    e.preventDefault();
    x.set(e.clientX);
    y.set(e.clientY);
    visible.set(true);
  };

  $effect(() => {
    if (!visible()) return;
    const close = () => visible.set(false);
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.addEventListener('click', close);
        window.addEventListener('scroll', close);
      }, 0);
      return () => {
        window.removeEventListener('click', close);
        window.removeEventListener('scroll', close);
      };
    }
  });

  return h('div', {
    onContextMenu: handleContextMenu,
    style: 'position:relative;',
    ...rest,
  },
    children,
    visible() && h('div', {
      style: `position:fixed;left:${x()}px;top:${y()}px;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};box-shadow:${theme.shadows.lg};padding:0.25rem;z-index:9999;min-width:180px;`,
    },
      items.map((item, i) =>
        item.divider
          ? h('div', { key: i, style: `height:1px;background:${theme.colors.border};margin:0.25rem 0;` })
          : h('div', {
              key: i,
              onClick: () => { item.onClick?.(); visible.set(false); },
              style: `padding:0.5rem 0.75rem;cursor:pointer;color:${item.danger ? theme.colors.danger : theme.colors.text};border-radius:${theme.radius.sm};font-size:0.9rem;display:flex;align-items:center;gap:0.5rem;:hover{background:${theme.colors.dark};}`,
            },
              item.icon && h('span', null, item.icon),
              h('span', null, item.label),
            )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) TRANSFER — نقل عناصر بين قائمتين
// ─────────────────────────────────────────────────────────────────────────────

export function Transfer(props) {
  const {
    dataSource = [], // [{ key, label, disabled }]
    targetKeys: targetKeysProp = [],
    onChange,
    titles = ['المصدر', 'الهدف'],
    ...rest
  } = props;

  const targetKeys = $state([...targetKeysProp]);
  const sourceSelected = $state(new Set());
  const targetSelected = $state(new Set());

  const leftItems = $computed(() => dataSource.filter(i => !targetKeys().includes(i.key)));
  const rightItems = $computed(() => dataSource.filter(i => targetKeys().includes(i.key)));

  const moveToRight = () => {
    const selected = Array.from(sourceSelected());
    const newTarget = [...targetKeys(), ...selected];
    targetKeys.set(newTarget);
    sourceSelected.set(new Set());
    onChange?.(newTarget);
  };

  const moveToLeft = () => {
    const selected = Array.from(targetSelected());
    const newTarget = targetKeys().filter(k => !selected.includes(k));
    targetKeys.set(newTarget);
    targetSelected.set(new Set());
    onChange?.(newTarget);
  };

  const toggleSource = (key) => {
    const s = new Set(sourceSelected());
    if (s.has(key)) s.delete(key); else s.add(key);
    sourceSelected.set(s);
  };

  const toggleTarget = (key) => {
    const s = new Set(targetSelected());
    if (s.has(key)) s.delete(key); else s.add(key);
    targetSelected.set(s);
  };

  return h('div', {
    style: `display:flex;gap:0.5rem;align-items:center;`,
    ...rest,
  },
    // Left panel
    h('div', {
      style: `flex:1;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};padding:0.5rem;min-height:200px;`,
    },
      h('div', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};margin-bottom:0.5rem;` }, titles[0]),
      leftItems().map(item =>
        h('label', {
          key: item.key,
          style: `display:flex;align-items:center;gap:0.5rem;padding:0.4rem;cursor:pointer;color:${theme.colors.text};`,
        },
          h('input', {
            type: 'checkbox',
            checked: sourceSelected().has(item.key),
            onChange: () => toggleSource(item.key),
            disabled: item.disabled,
            style: 'accent-color:' + theme.colors.primary,
          }),
          h('span', null, item.label)
        )
      )
    ),
    // Buttons
    h('div', { style: 'display:flex;flex-direction:column;gap:0.25rem;' },
      h('button', {
        onClick: moveToRight,
        disabled: sourceSelected().size === 0,
        style: `padding:0.4rem;background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.sm};cursor:pointer;${sourceSelected().size === 0 ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
      }, '→'),
      h('button', {
        onClick: moveToLeft,
        disabled: targetSelected().size === 0,
        style: `padding:0.4rem;background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.sm};cursor:pointer;${targetSelected().size === 0 ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
      }, '←')
    ),
    // Right panel
    h('div', {
      style: `flex:1;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};padding:0.5rem;min-height:200px;`,
    },
      h('div', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};margin-bottom:0.5rem;` }, titles[1]),
      rightItems().map(item =>
        h('label', {
          key: item.key,
          style: `display:flex;align-items:center;gap:0.5rem;padding:0.4rem;cursor:pointer;color:${theme.colors.text};`,
        },
          h('input', {
            type: 'checkbox',
            checked: targetSelected().has(item.key),
            onChange: () => toggleTarget(item.key),
            style: 'accent-color:' + theme.colors.primary,
          }),
          h('span', null, item.label)
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) CASCADER — اختيار متعدد المستويات
// ─────────────────────────────────────────────────────────────────────────────

export function Cascader(props) {
  const {
    options = [], // [{ value, label, children: [...] }]
    value = [],
    onChange,
    placeholder = 'اختر...',
    ...rest
  } = props;

  const open = $state(false);
  const currentPath = $state([...value]);

  const getOptions = (level) => {
    let opts = options;
    for (let i = 0; i < level; i++) {
      const selected = opts.find(o => o.value === currentPath()[i]);
      if (!selected?.children) return [];
      opts = selected.children;
    }
    return opts;
  };

  const select = (level, option) => {
    const newPath = currentPath().slice(0, level);
    newPath[level] = option.value;
    currentPath.set(newPath);
    if (!option.children) {
      onChange?.(newPath, getLabels(newPath));
      open.set(false);
    }
  };

  const getLabels = (path) => {
    let opts = options;
    const labels = [];
    for (const val of path) {
      const found = opts.find(o => o.value === val);
      if (!found) break;
      labels.push(found.label);
      opts = found.children || [];
    }
    return labels;
  };

  const displayValue = () => {
    const labels = getLabels(currentPath());
    return labels.length > 0 ? labels.join(' / ') : placeholder;
  };

  return h('div', { style: 'position:relative;display:inline-block;' },
    h('div', {
      onClick: () => open.set(!open()),
      style: `padding:0.5rem 0.75rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};cursor:pointer;min-width:200px;display:flex;justify-content:space-between;align-items:center;`,
      ...rest,
    },
      h('span', { style: currentPath().length === 0 ? `color:${theme.colors.textMuted};` : '' }, displayValue()),
      h('span', null, '▾')
    ),
    open() && h('div', {
      style: `position:absolute;top:100%;right:0;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};box-shadow:${theme.shadows.lg};z-index:100;display:flex;margin-top:0.25rem;`,
    },
      // اعرض عمود لكل مستوى
      Array.from({ length: Math.max(currentPath().length + 1, 1) }, (_, level) => {
        const opts = getOptions(level);
        if (opts.length === 0) return null;
        return h('div', {
          key: level,
          style: `min-width:150px;border-left:${level > 0 ? '1px solid ' + theme.colors.border : 'none'};padding:0.25rem;`,
        },
          opts.map(opt =>
            h('div', {
              key: opt.value,
              onClick: () => select(level, opt),
              style: `padding:0.4rem 0.6rem;cursor:pointer;border-radius:${theme.radius.sm};color:${currentPath()[level] === opt.value ? theme.colors.primary : theme.colors.text};background:${currentPath()[level] === opt.value ? theme.colors.primary + '20' : 'transparent'};font-size:0.9rem;display:flex;justify-content:space-between;align-items:center;`,
            },
              h('span', null, opt.label),
              opt.children && h('span', null, '›')
            )
          )
        );
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) CIRCULAR PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

export function CircularProgress(props) {
  const {
    value = 0,
    max = 100,
    size = 80,
    strokeWidth = 8,
    color = theme.colors.primary,
    showLabel = true,
    ...rest
  } = props;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const offset = circumference - (pct / 100) * circumference;

  return h('div', {
    style: `position:relative;width:${size}px;height:${size}px;`,
    ...rest,
  },
    h('svg', {
      width: size,
      height: size,
      style: 'transform:rotate(-90deg);',
    },
      h('circle', {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        stroke: theme.colors.border,
        'stroke-width': strokeWidth,
        fill: 'none',
      }),
      h('circle', {
        cx: size / 2,
        cy: size / 2,
        r: radius,
        stroke: color,
        'stroke-width': strokeWidth,
        fill: 'none',
        'stroke-dasharray': circumference,
        'stroke-dashoffset': offset,
        'stroke-linecap': 'round',
        style: 'transition:stroke-dashoffset 0.3s;',
      })
    ),
    showLabel && h('div', {
      style: `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:${theme.colors.text};font-weight:bold;font-size:${size * 0.2}px;`,
    }, `${Math.round(pct)}%`)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) COUNTDOWN
// ─────────────────────────────────────────────────────────────────────────────

export function Countdown(props) {
  const {
    to, // Date or timestamp
    format = 'DD:HH:mm:ss',
    onComplete,
    ...rest
  } = props;

  const remaining = $state(0);

  $effect(() => {
    const update = () => {
      const target = new Date(to).getTime();
      const now = Date.now();
      const diff = target - now;
      remaining.set(Math.max(0, diff));
      if (diff <= 0 && onComplete) onComplete();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  });

  const display = $computed(() => {
    const ms = remaining();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return format
      .replace('DD', String(days).padStart(2, '0'))
      .replace('HH', String(hours).padStart(2, '0'))
      .replace('mm', String(minutes).padStart(2, '0'))
      .replace('ss', String(seconds).padStart(2, '0'));
  });

  return h('div', {
    style: `font-family:monospace;font-size:2rem;color:${theme.colors.primary};font-weight:bold;direction:ltr;`,
    ...rest,
  }, display());
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) CODE BLOCK — عرض كود مع syntax highlighting بسيط
// ─────────────────────────────────────────────────────────────────────────────

export function CodeBlock(props) {
  const {
    code = '',
    language = 'javascript',
    showLineNumbers = true,
    ...rest
  } = props;

  const lines = code.split('\n');

  // syntax highlighting بسيط
  const highlight = (line) => {
    // keywords
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'new', 'this', 'null', 'undefined', 'true', 'false'];
    let html = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // strings
    html = html.replace(/(["'`])((?:\\.|(?!\1).)*)\1/g, '<span style="color:#a7f3d0;">$1$2$1</span>');
    // comments
    html = html.replace(/(\/\/.*$)/g, '<span style="color:#64748b;">$1</span>');
    // numbers
    html = html.replace(/\b(\d+)\b/g, '<span style="color:#fde68a;">$1</span>');

    // keywords
    for (const kw of keywords) {
      html = html.replace(new RegExp(`\\b${kw}\\b`, 'g'), `<span style="color:#bfdbfe;">${kw}</span>`);
    }

    return html;
  };

  return h('pre', {
    style: `background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:${theme.radius.md};overflow-x:auto;border:1px solid ${theme.colors.border};direction:ltr;text-align:left;font-family:monospace;font-size:0.9rem;`,
    ...rest,
  },
    h('code', null,
      lines.map((line, i) =>
        h('div', { key: i, style: 'display:flex;' },
          showLineNumbers && h('span', {
            style: `color:#475569;min-width:2rem;text-align:right;margin-right:1rem;user-select:none;`,
          }, String(i + 1)),
          h('span', {
            innerHTML: highlight(line) || ' ',
          })
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) TOGGLE GROUP — مجموعة أزرار تبديل
// ─────────────────────────────────────────────────────────────────────────────

export function ToggleGroup(props) {
  const {
    options = [], // [{ value, label, icon }]
    value,
    onChange,
    multiple = false,
    ...rest
  } = props;

  const selected = $state(multiple ? [...(value || [])] : value);

  const handleClick = (val) => {
    if (multiple) {
      const arr = [...selected()];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      selected.set(arr);
      onChange?.(arr);
    } else {
      selected.set(val);
      onChange?.(val);
    }
  };

  const isActive = (val) => {
    if (multiple) return selected().includes(val);
    return selected() === val;
  };

  return h('div', {
    style: `display:inline-flex;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};padding:2px;gap:2px;`,
    ...rest,
  },
    options.map(opt =>
      h('button', {
        key: opt.value,
        onClick: () => handleClick(opt.value),
        style: `padding:0.4rem 0.8rem;background:${isActive(opt.value) ? theme.colors.primary : 'transparent'};color:${isActive(opt.value) ? 'white' : theme.colors.textMuted};border:none;border-radius:${theme.radius.sm};cursor:pointer;font-size:0.9rem;display:flex;align-items:center;gap:0.3rem;transition:all 0.15s;`,
      },
        opt.icon && h('span', null, opt.icon),
        h('span', null, opt.label)
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  Menu,
  ContextMenu,
  Transfer,
  Cascader,
  CircularProgress,
  Countdown,
  CodeBlock,
  ToggleGroup,
};
