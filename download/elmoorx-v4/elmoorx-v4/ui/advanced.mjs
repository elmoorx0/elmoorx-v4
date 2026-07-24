/**
 * Elmoorx v4 — Advanced UI Components
 * ====================================
 * مكونات إضافية متقدمة:
 *   - FileUpload (drag-drop + preview)
 *   - DatePicker (calendar)
 *   - ColorPicker
 *   - VirtualList (لأداء القوائم الكبيرة)
 *   - CommandPalette (Cmd+K)
 *   - Pagination
 *   - Breadcrumb
 *   - Stepper
 *   - Tooltip
 *   - Popover
 *   - Tree view
 *   - ImageGallery
 */

import { h, $state, $effect, $computed, onMount, onCleanup } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) FILE UPLOAD — drag-drop + preview
// ─────────────────────────────────────────────────────────────────────────────

export function FileUpload(props) {
  const {
    multiple = true,
    accept = '*',
    maxSize = 10 * 1024 * 1024, // 10MB
    onUpload,
    label = 'اسحب الملفات هنا أو انقر للاختيار',
    ...rest
  } = props;

  const files = $state([]);
  const dragging = $state(false);
  const error = $state('');

  const handleFiles = (newFiles) => {
    error.set('');
    const valid = [];
    for (const file of newFiles) {
      if (file.size > maxSize) {
        error.set(`الملف ${file.name} أكبر من ${Math.round(maxSize / 1024 / 1024)}MB`);
        continue;
      }
      valid.push(file);
    }
    if (multiple) {
      files.set([...files(), ...valid]);
    } else {
      files.set(valid.slice(0, 1));
    }
    onUpload?.(files());
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragging.set(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dragging.set(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragging.set(false);
  };

  const handleInput = (e) => {
    handleFiles(Array.from(e.target.files));
  };

  const remove = (index) => {
    files.set(files().filter((_, i) => i !== index));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return h('div', null,
    h('div', {
      onClick: () => document.getElementById('elmoorx-file-input')?.click(),
      onDrop: handleDrop,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      style: `border:2px dashed ${dragging() ? theme.colors.primary : theme.colors.border};border-radius:${theme.radius.lg};padding:2rem;text-align:center;cursor:pointer;transition:border-color 0.2s;background:${dragging() ? 'rgba(14,165,233,0.05)' : 'transparent'};`,
      ...rest,
    },
      h('div', { style: 'font-size:3rem;margin-bottom:0.5rem;' }, '📁'),
      h('p', { style: `color:${theme.colors.textMuted};` }, label),
      h('input', {
        id: 'elmoorx-file-input',
        type: 'file',
        multiple,
        accept,
        onChange: handleInput,
        style: 'display:none;',
      })
    ),
    error() && h('div', {
      style: `color:${theme.colors.danger};font-size:${theme.fontSize.sm};margin-top:0.5rem;`,
    }, error()),
    files().length > 0 && h('div', { style: 'margin-top:1rem;' },
      files().map((file, i) =>
        h('div', {
          key: i,
          style: `display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0.75rem;background:${theme.colors.surface};border-radius:${theme.radius.md};margin-bottom:0.25rem;`,
        },
          file.type.startsWith('image/') && URL.createObjectURL(file)
            ? h('img', {
                src: URL.createObjectURL(file),
                alt: file.name,
                style: 'width:32px;height:32px;object-fit:cover;border-radius:4px;',
              })
            : h('div', { style: 'font-size:1.5rem;' }, '📄'),
          h('div', { style: 'flex:1;' },
            h('div', { style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};` }, file.name),
            h('div', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};` }, formatSize(file.size))
          ),
          h('button', {
            onClick: () => remove(i),
            style: `background:${theme.colors.danger};color:white;border:none;width:24px;height:24px;border-radius:4px;cursor:pointer;`,
          }, '×')
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) DATE PICKER — تقويم كامل
// ─────────────────────────────────────────────────────────────────────────────

export function DatePicker(props) {
  const {
    value,
    onChange,
    format = 'YYYY-MM-DD',
    locale = 'ar',
    ...rest
  } = props;

  const open = $state(false);
  const viewDate = $state(value ? new Date(value) : new Date());
  const selected = $state(value || '');

  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const year = $computed(() => viewDate().getFullYear());
  const month = $computed(() => viewDate().getMonth());

  const daysInMonth = $computed(() => {
    const first = new Date(year(), month(), 1);
    const last = new Date(year(), month() + 1, 0);
    const startDay = first.getDay();
    const total = last.getDate();
    const days = [];
    // أيام فارغة قبل بداية الشهر
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= total; i++) days.push(i);
    return days;
  });

  const select = (day) => {
    if (!day) return;
    const date = new Date(year(), month(), day);
    const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    selected.set(formatted);
    onChange?.(formatted, date);
    open.set(false);
  };

  const prevMonth = () => {
    viewDate.set(new Date(year(), month() - 1, 1));
  };

  const nextMonth = () => {
    viewDate.set(new Date(year(), month() + 1, 1));
  };

  const isSelected = (day) => {
    if (!day || !selected()) return false;
    const sel = new Date(selected());
    return sel.getDate() === day && sel.getMonth() === month() && sel.getFullYear() === year();
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month() && today.getFullYear() === year();
  };

  return h('div', { style: 'position:relative;display:inline-block;' },
    h('input', {
      type: 'text',
      value: selected(),
      onClick: () => open.set(!open()),
      readOnly: true,
      placeholder: 'اختر تاريخاً',
      style: `padding:0.5rem 0.75rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};cursor:pointer;width:180px;`,
      ...rest,
    }),
    open() && h('div', {
      style: `position:absolute;top:100%;right:0;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};padding:1rem;z-index:100;margin-top:0.25rem;box-shadow:${theme.shadows.lg};width:280px;`,
    },
      // Header
      h('div', { style: `display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;` },
        h('button', { onClick: prevMonth, style: `background:none;border:none;color:${theme.colors.text};cursor:pointer;font-size:1.25rem;` }, '›'),
        h('span', { style: `color:${theme.colors.text};font-weight:600;` }, `${months[month()]} ${year()}`),
        h('button', { onClick: nextMonth, style: `background:none;border:none;color:${theme.colors.text};cursor:pointer;font-size:1.25rem;` }, '‹'),
      ),
      // Days header
      h('div', { style: `display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:0.25rem;` },
        days.map(d => h('div', {
          key: d,
          style: `text-align:center;color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};padding:0.25rem;`,
        }, d.slice(0, 3)))
      ),
      // Days grid
      h('div', { style: `display:grid;grid-template-columns:repeat(7,1fr);gap:2px;` },
        daysInMonth().map((day, i) =>
          h('div', {
            key: i,
            onClick: () => select(day),
            style: `text-align:center;padding:0.4rem;cursor:pointer;border-radius:${theme.radius.sm};font-size:${theme.fontSize.sm};${
              !day ? '' :
              isSelected(day) ? `background:${theme.colors.primary};color:white;` :
              isToday(day) ? `background:rgba(14,165,233,0.2);color:${theme.colors.primary};font-weight:bold;` :
              `color:${theme.colors.text};`
            }${day ? 'cursor:pointer;' : ''}`,
          }, day || '')
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) COLOR PICKER
// ─────────────────────────────────────────────────────────────────────────────

export function ColorPicker(props) {
  const {
    value = '#0ea5e9',
    onChange,
    presets = [
      '#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899',
      '#10b981', '#14b8a6', '#f59e0b', '#f97316',
      '#ef4444', '#64748b', '#1e293b', '#f8fafc',
    ],
    ...rest
  } = props;

  const open = $state(false);
  const current = $state(value);

  const handleChange = (color) => {
    current.set(color);
    onChange?.(color);
  };

  return h('div', { style: 'position:relative;display:inline-block;' },
    h('div', {
      onClick: () => open.set(!open()),
      style: `width:40px;height:40px;background:${current()};border:2px solid ${theme.colors.border};border-radius:${theme.radius.md};cursor:pointer;`,
      ...rest,
    }),
    open() && h('div', {
      style: `position:absolute;top:100%;right:0;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};padding:1rem;z-index:100;margin-top:0.25rem;box-shadow:${theme.shadows.lg};width:200px;`,
    },
      // Native color input
      h('input', {
        type: 'color',
        value: current(),
        onInput: (e) => handleChange(e.target.value),
        style: 'width:100%;height:40px;cursor:pointer;border:none;background:none;',
      }),
      // Hex value
      h('input', {
        type: 'text',
        value: current(),
        onInput: (e) => handleChange(e.target.value),
        style: `width:100%;padding:0.4rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};margin-top:0.5rem;text-align:center;font-family:monospace;`,
      }),
      // Presets
      h('div', {
        style: `display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:0.5rem;`,
      },
        presets.map(color =>
          h('div', {
            key: color,
            onClick: () => handleChange(color),
            style: `width:24px;height:24px;background:${color};border-radius:4px;cursor:pointer;border:2px solid ${current() === color ? theme.colors.text : 'transparent'};`,
          })
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) VIRTUAL LIST — لأداء القوائم الكبيرة
// ─────────────────────────────────────────────────────────────────────────────

export function VirtualList(props) {
  const {
    items = [],
    itemHeight = 40,
    height = 400,
    renderItem,
    overscan = 5,
    ...rest
  } = props;

  const scrollTop = $state(0);
  const containerRef = $state(null);

  const visibleRange = $computed(() => {
    const start = Math.max(0, Math.floor(scrollTop() / itemHeight) - overscan);
    const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
    const end = Math.min(items.length, start + visibleCount);
    return { start, end };
  });

  const visibleItems = $computed(() => {
    const { start, end } = visibleRange();
    return items.slice(start, end).map((item, i) => ({
      item,
      index: start + i,
    }));
  });

  const handleScroll = (e) => {
    scrollTop.set(e.target.scrollTop);
  };

  return h('div', {
    onScroll: handleScroll,
    style: `height:${height}px;overflow-y:auto;position:relative;background:${theme.colors.surface};border-radius:${theme.radius.md};`,
    ...rest,
  },
    h('div', {
      style: `height:${items.length * itemHeight}px;position:relative;`,
    },
      visibleItems().map(({ item, index }) =>
        h('div', {
          key: index,
          style: `position:absolute;top:${index * itemHeight}px;left:0;right:0;height:${itemHeight}px;display:flex;align-items:center;padding:0 0.75rem;`,
        }, renderItem(item, index))
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) COMMAND PALETTE (Cmd+K)
// ─────────────────────────────────────────────────────────────────────────────

export function CommandPalette(props) {
  const {
    commands = [],
    placeholder = 'ابحث عن أمر...',
    hotkey = 'k',
  } = props;

  const open = $state(false);
  const query = $state('');
  const selectedIndex = $state(0);

  const filtered = $computed(() => {
    const q = query().toLowerCase();
    if (!q) return commands;
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.keywords || '').toLowerCase().includes(q)
    );
  });

  const handleKeydown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === hotkey) {
      e.preventDefault();
      open.set(!open());
    } else if (e.key === 'Escape' && open()) {
      open.set(false);
    } else if (open()) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex.set(s => Math.min(s + 1, filtered().length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex.set(s => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filtered()[selectedIndex()];
        if (cmd) {
          cmd.action?.();
          open.set(false);
          query.set('');
        }
      }
    }
  };

  $effect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', handleKeydown);
    onCleanup(() => window.removeEventListener('keydown', handleKeydown));
  });

  if (!open()) return null;

  return h('div', {
    onClick: () => open.set(false),
    style: `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding-top:15vh;`,
  },
    h('div', {
      onClick: e => e.stopPropagation(),
      style: `background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.lg};width:100%;max-width:600px;box-shadow:${theme.shadows.lg};overflow:hidden;`,
    },
      // Input
      h('input', {
        type: 'text',
        value: query(),
        onInput: e => { query.set(e.target.value); selectedIndex.set(0); },
        placeholder,
        autoFocus: true,
        style: `width:100%;padding:1rem 1.5rem;background:transparent;border:none;color:${theme.colors.text};font-size:1.1rem;outline:none;border-bottom:1px solid ${theme.colors.border};box-sizing:border-box;`,
      }),
      // Results
      h('div', { style: 'max-height:400px;overflow-y:auto;padding:0.5rem;' },
        filtered().length === 0
          ? h('div', { style: `padding:1rem;text-align:center;color:${theme.colors.textMuted};` }, 'لا توجد نتائج')
          : filtered().map((cmd, i) =>
              h('div', {
                key: i,
                onClick: () => { cmd.action?.(); open.set(false); query.set(''); },
                onMouseEnter: () => selectedIndex.set(i),
                style: `padding:0.75rem 1rem;border-radius:${theme.radius.md};cursor:pointer;display:flex;align-items:center;gap:0.75rem;${
                  selectedIndex() === i ? `background:${theme.colors.primary};color:white;` : `color:${theme.colors.text};`
                }`,
              },
                cmd.icon && h('span', { style: 'font-size:1.25rem;' }, cmd.icon),
                h('div', { style: 'flex:1;' },
                  h('div', { style: 'font-weight:500;' }, cmd.label),
                  cmd.description && h('div', {
                    style: `font-size:${theme.fontSize.xs};opacity:0.7;`,
                  }, cmd.description)
                ),
                cmd.shortcut && h('kbd', {
                  style: `padding:0.15rem 0.4rem;background:rgba(255,255,255,0.1);border-radius:3px;font-size:${theme.fontSize.xs};font-family:monospace;`,
                }, cmd.shortcut)
              )
            )
      ),
      // Footer
      h('div', {
        style: `padding:0.5rem 1rem;border-top:1px solid ${theme.colors.border};display:flex;justify-content:space-between;color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};`,
      },
        h('span', null, '↑↓ تنقل'),
        h('span', null, 'Enter تنفيذ'),
        h('span', null, 'Esc إغلاق')
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

export function Pagination(props) {
  const {
    total = 0,
    page: pageProp = 1,
    perPage = 10,
    onChange,
    showEdges = true,
    ...rest
  } = props;

  const page = $state(pageProp);
  const totalPages = $computed(() => Math.ceil(total / perPage) || 1);

  const pages = $computed(() => {
    const current = page();
    const total = totalPages();
    const pages = [];
    // الـ 5 صفحات حول الحالي
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    if (showEdges && start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (showEdges && end < total) {
      if (end < total - 1) pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  const goTo = (p) => {
    if (p < 1 || p > totalPages() || p === page()) return;
    page.set(p);
    onChange?.(p);
  };

  return h('div', {
    style: `display:flex;gap:0.25rem;align-items:center;justify-content:center;`,
    ...rest,
  },
    h('button', {
      onClick: () => goTo(page() - 1),
      disabled: page() === 1,
      style: `padding:0.4rem 0.75rem;background:${theme.colors.surface};color:${theme.colors.text};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};cursor:pointer;${page() === 1 ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
    }, 'السابق'),
    pages().map((p, i) =>
      typeof p === 'number'
        ? h('button', {
            key: i,
            onClick: () => goTo(p),
            style: `padding:0.4rem 0.75rem;min-width:36px;background:${p === page() ? theme.colors.primary : theme.colors.surface};color:${p === page() ? 'white' : theme.colors.text};border:1px solid ${p === page() ? theme.colors.primary : theme.colors.border};border-radius:${theme.radius.sm};cursor:pointer;`,
          }, String(p))
        : h('span', { key: i, style: `padding:0.4rem;color:${theme.colors.textMuted};` }, p)
    ),
    h('button', {
      onClick: () => goTo(page() + 1),
      disabled: page() === totalPages(),
      style: `padding:0.4rem 0.75rem;background:${theme.colors.surface};color:${theme.colors.text};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};cursor:pointer;${page() === totalPages() ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
    }, 'التالي')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) BREADCRUMB
// ─────────────────────────────────────────────────────────────────────────────

export function Breadcrumb(props) {
  const {
    items = [], // [{ label, href, icon }]
    separator = '›',
    ...rest
  } = props;

  return h('nav', {
    style: `display:flex;align-items:center;gap:0.5rem;color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};`,
    ...rest,
  },
    items.map((item, i) =>
      h('div', { key: i, style: 'display:flex;align-items:center;gap:0.5rem;' },
        item.icon && h('span', null, item.icon),
        item.href
          ? h('a', { href: item.href, style: `color:${theme.colors.primary};text-decoration:none;` }, item.label)
          : h('span', { style: `color:${theme.colors.text};` }, item.label),
        i < items.length - 1 && h('span', { style: `color:${theme.colors.textMuted};` }, separator)
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) STEPPER
// ─────────────────────────────────────────────────────────────────────────────

export function Stepper(props) {
  const {
    steps = [], // [{ label, description }]
    current = 0,
    onStepClick,
    ...rest
  } = props;

  return h('div', {
    style: `display:flex;align-items:center;`,
    ...rest,
  },
    steps.map((step, i) =>
      h('div', { key: i, style: 'display:flex;align-items:center;flex:1;' },
        h('div', {
          onClick: () => onStepClick?.(i),
          style: `display:flex;flex-direction:column;align-items:center;cursor:${onStepClick ? 'pointer' : 'default'};`,
        },
          h('div', {
            style: `width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;${
              i < current ? `background:${theme.colors.success};color:white;` :
              i === current ? `background:${theme.colors.primary};color:white;` :
              `background:${theme.colors.surface};color:${theme.colors.textMuted};border:2px solid ${theme.colors.border};`
            }`,
          }, i < current ? '✓' : String(i + 1)),
          h('div', {
            style: `margin-top:0.5rem;font-size:${theme.fontSize.sm};text-align:center;${
              i <= current ? `color:${theme.colors.text};font-weight:500;` : `color:${theme.colors.textMuted};`
            }`,
          }, step.label)
        ),
        i < steps.length - 1 && h('div', {
          style: `flex:1;height:2px;background:${i < current ? theme.colors.success : theme.colors.border};margin:0 0.5rem;margin-bottom:1.5rem;`,
        })
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────

export function Tooltip(props) {
  const {
    content,
    children,
    position = 'top', // top, bottom, left, right
    delay = 200,
    ...rest
  } = props;

  const visible = $state(false);
  let timeout;

  const show = () => {
    timeout = setTimeout(() => visible.set(true), delay);
  };

  const hide = () => {
    clearTimeout(timeout);
    visible.set(false);
  };

  const positions = {
    top: 'bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:8px;',
    bottom: 'top:100%;left:50%;transform:translateX(-50%);margin-top:8px;',
    left: 'right:100%;top:50%;transform:translateY(-50%);margin-left:8px;',
    right: 'left:100%;top:50%;transform:translateY(-50%);margin-right:8px;',
  };

  return h('div', {
    onMouseEnter: show,
    onMouseLeave: hide,
    style: 'position:relative;display:inline-block;',
    ...rest,
  },
    children,
    visible() && h('div', {
      style: `position:absolute;${positions[position]}background:${theme.colors.dark};color:${theme.colors.text};padding:0.4rem 0.75rem;border-radius:${theme.radius.sm};font-size:${theme.fontSize.sm};white-space:nowrap;z-index:1000;box-shadow:${theme.shadows.md};pointer-events:none;`,
    }, content)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) TREE VIEW — شجرة قابلة للتوسيع
// ─────────────────────────────────────────────────────────────────────────────

export function TreeView(props) {
  const {
    data = [], // [{ id, label, icon, children: [...], expanded, selected, disabled }]
    onSelect,
    onToggle,
    showIcons = true,
    ...rest
  } = props;

  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    return h('div', { key: node.id },
      h('div', {
        onClick: () => !node.disabled && (onSelect?.(node), node.selected = !node.selected),
        style: `display:flex;align-items:center;gap:0.4rem;padding:0.4rem 0.5rem;cursor:${node.disabled ? 'not-allowed' : 'pointer'};border-radius:${theme.radius.sm};padding-right:${depth * 1.5 + 0.5}rem;${node.selected ? `background:${theme.colors.primary};color:white;` : `color:${theme.colors.text};`}opacity:${node.disabled ? 0.5 : 1};transition:background 0.15s;`,
      },
        hasChildren
          ? h('button', {
              onClick: (e) => { e.stopPropagation(); node.expanded = !node.expanded; onToggle?.(node); },
              style: 'background:none;border:none;cursor:pointer;font-size:0.75rem;padding:0;width:16px;color:inherit;',
            }, node.expanded ? '▼' : '▶')
          : h('span', { style: 'width:16px;' }),
        showIcons && (node.icon || (hasChildren ? '📁' : '📄')) && h('span', { style: 'font-size:1rem;' }, node.icon || (hasChildren ? '📁' : '📄')),
        h('span', { style: 'font-size:0.9rem;' }, node.label)
      ),
      hasChildren && node.expanded && h('div', null,
        node.children.map(child => renderNode(child, depth + 1))
      )
    );
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.md};padding:0.5rem;user-select:none;`,
    ...rest,
  }, data.map(node => renderNode(node)));
}

// ─────────────────────────────────────────────────────────────────────────────
// 11) CAROUSEL / SLIDER
// ─────────────────────────────────────────────────────────────────────────────

export function Carousel(props) {
  const {
    items = [],
    autoplay = false,
    interval = 3000,
    showArrows = true,
    showDots = true,
    loop = true,
    ...rest
  } = props;

  const current = $state(0);

  const next = () => {
    if (current() < items.length - 1) current.set(current() + 1);
    else if (loop) current.set(0);
  };

  const prev = () => {
    if (current() > 0) current.set(current() - 1);
    else if (loop) current.set(items.length - 1);
  };

  const goTo = (i) => current.set(i);

  if (autoplay && typeof window !== 'undefined') {
    let timer;
    $effect(() => {
      timer = setInterval(next, interval);
      onCleanup(() => clearInterval(timer));
    });
  }

  return h('div', {
    style: 'position:relative;overflow:hidden;border-radius:8px;background:#0f172a;',
    ...rest,
  },
    h('div', {
      style: `display:flex;transition:transform 0.3s ease;transform:translateX(-${current() * 100}%);`,
    }, items.map((item, i) =>
      h('div', {
        key: i,
        style: 'min-width:100%;height:300px;display:flex;align-items:center;justify-content:center;',
      }, typeof item === 'function' ? item() : item)
    )),
    showArrows && h('button', {
      onClick: prev,
      style: 'position:absolute;top:50%;right:0.5rem;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:white;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.25rem;',
    }, '›'),
    showArrows && h('button', {
      onClick: next,
      style: 'position:absolute;top:50%;left:0.5rem;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:white;border:none;width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.25rem;',
    }, '‹'),
    showDots && h('div', {
      style: 'position:absolute;bottom:0.5rem;left:50%;transform:translateX(-50%);display:flex;gap:0.25rem;',
    }, items.map((_, i) =>
      h('button', {
        key: i,
        onClick: () => goTo(i),
        style: `width:8px;height:8px;border-radius:50%;border:none;cursor:pointer;background:${i === current() ? 'white' : 'rgba(255,255,255,0.4)'};`,
      })
    ))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12) DRAG-DROP LIST (reorder)
// ─────────────────────────────────────────────────────────────────────────────

export function DragDropList(props) {
  const {
    items: itemsProp = [],
    onReorder,
    renderItem,
    ...rest
  } = props;

  const items = $state([...itemsProp]);
  const dragging = $state(null);

  const handleDragStart = (e, index) => {
    dragging.set(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    const from = dragging();
    if (from === null || from === index) return;
    const newItems = [...items()];
    const [moved] = newItems.splice(from, 1);
    newItems.splice(index, 0, moved);
    items.set(newItems);
    dragging.set(null);
    onReorder?.(newItems);
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.md};padding:0.5rem;`,
    ...rest,
  },
    items().map((item, i) =>
      h('div', {
        key: i,
        draggable: true,
        onDragStart: (e) => handleDragStart(e, i),
        onDragOver: (e) => handleDragOver(e, i),
        onDrop: (e) => handleDrop(e, i),
        style: `padding:0.5rem;margin-bottom:0.25rem;background:${dragging() === i ? theme.colors.border : theme.colors.dark};border-radius:${theme.radius.sm};cursor:move;color:${theme.colors.text};`,
      }, renderItem ? renderItem(item, i) : String(item))
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 13) NOTIFICATION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const notifications = $state([]);

export function notify(message, options = {}) {
  const id = Date.now() + Math.random();
  const { variant = 'info', title, duration = 5000, action, position = 'top-right' } = options;
  notifications.set(n => [...n, { id, message, title, variant, action, position, timestamp: Date.now() }]);
  if (duration > 0) {
    setTimeout(() => dismissNotification(id), duration);
  }
  return id;
}

export function dismissNotification(id) {
  notifications.set(n => n.filter(x => x.id !== id));
}

notify.success = (msg, opts) => notify(msg, { ...opts, variant: 'success' });
notify.error = (msg, opts) => notify(msg, { ...opts, variant: 'error' });
notify.warning = (msg, opts) => notify(msg, { ...opts, variant: 'warning' });
notify.info = (msg, opts) => notify(msg, { ...opts, variant: 'info' });

export function NotificationCenter() {
  const variants = {
    success: { color: theme.colors.success, icon: '✓' },
    error: { color: theme.colors.danger, icon: '✗' },
    warning: { color: theme.colors.warning, icon: '⚠' },
    info: { color: theme.colors.info, icon: 'ℹ' },
  };

  const positions = {
    'top-right': 'top:1rem;right:1rem;',
    'top-left': 'top:1rem;left:1rem;',
    'bottom-right': 'bottom:1rem;right:1rem;',
    'bottom-left': 'bottom:1rem;left:1rem;',
  };

  // group by position
  const grouped = $computed(() => {
    const g = {};
    for (const n of notifications()) {
      const pos = n.position || 'top-right';
      if (!g[pos]) g[pos] = [];
      g[pos].push(n);
    }
    return g;
  });

  return h('div', null,
    ...Object.entries(grouped()).map(([pos, items]) =>
      h('div', {
        key: pos,
        style: `position:fixed;${positions[pos]}z-index:9999;display:flex;flex-direction:column;gap:0.5rem;max-width:360px;`,
      },
        items.map(n => {
          const v = variants[n.variant];
          return h('div', {
            key: n.id,
            style: `background:${theme.colors.surface};border-right:4px solid ${v.color};padding:0.75rem 1rem;border-radius:${theme.radius.md};box-shadow:${theme.shadows.lg};display:flex;align-items:flex-start;gap:0.75rem;animation:elmoorx-slideIn 0.3s;`,
          },
            h('div', { style: `width:24px;height:24px;border-radius:50%;background:${v.color};color:white;display:flex;align-items:center;justify-content:center;font-size:0.85rem;flex-shrink:0;` }, v.icon),
            h('div', { style: 'flex:1;' },
              n.title && h('div', { style: `color:${theme.colors.text};font-weight:600;margin-bottom:0.15rem;` }, n.title),
              h('div', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};` }, n.message),
              n.action && h('button', {
                onClick: () => { n.action.onClick?.(); dismissNotification(n.id); },
                style: `margin-top:0.5rem;padding:0.25rem 0.75rem;background:${v.color};color:white;border:none;border-radius:${theme.radius.sm};cursor:pointer;font-size:${theme.fontSize.sm};`,
              }, n.action.label)
            ),
            h('button', {
              onClick: () => dismissNotification(n.id),
              style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:1.25rem;line-height:1;padding:0;`,
            }, '×')
          );
        })
      )
    )
  );
}

// inject slideIn animation
if (typeof document !== 'undefined' && !document.getElementById('elmoorx-slidein-keyframes')) {
  const style = document.createElement('style');
  style.id = 'elmoorx-slidein-keyframes';
  style.textContent = '@keyframes elmoorx-slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
  document.head.appendChild(style);
}

// ─────────────────────────────────────────────────────────────────────────────
// 14) RICH TEXT EDITOR
// ─────────────────────────────────────────────────────────────────────────────

export function RichTextEditor(props) {
  const {
    initialValue = '',
    onChange,
    placeholder = 'اكتب هنا...',
    ...rest
  } = props;

  const content = $state(initialValue);
  let editorRef = null;

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef) {
      content.set(editorRef.innerHTML);
      onChange?.(content());
    }
  };

  const tools = [
    { cmd: 'bold', icon: '𝐁', title: 'عريض' },
    { cmd: 'italic', icon: '𝐼', title: 'مائل' },
    { cmd: 'underline', icon: '𝑈', title: 'تحته خط' },
    { cmd: 'strikeThrough', icon: '𝑆', title: 'يتوسطه خط' },
    { sep: true },
    { cmd: 'justifyRight', icon: '⇥', title: 'محاذاة لليمين' },
    { cmd: 'justifyCenter', icon: '↔', title: 'توسيط' },
    { cmd: 'justifyLeft', icon: '⇤', title: 'محاذاة لليسار' },
    { sep: true },
    { cmd: 'insertUnorderedList', icon: '•', title: 'قائمة نقطية' },
    { cmd: 'insertOrderedList', icon: '1.', title: 'قائمة مرقمة' },
    { sep: true },
    { cmd: 'formatBlock', value: 'h1', icon: 'H1', title: 'عنوان 1' },
    { cmd: 'formatBlock', value: 'h2', icon: 'H2', title: 'عنوان 2' },
    { cmd: 'formatBlock', value: 'p', icon: '¶', title: 'فقرة' },
    { sep: true },
    { cmd: 'createLink', icon: '🔗', title: 'رابط', prompt: 'أدخل الرابط:' },
    { cmd: 'insertImage', icon: '🖼', title: 'صورة', prompt: 'أدخل رابط الصورة:' },
  ];

  return h('div', {
    style: `background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};overflow:hidden;`,
    ...rest,
  },
    // Toolbar
    h('div', {
      style: `display:flex;gap:0.25rem;padding:0.5rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};flex-wrap:wrap;`,
    },
      tools.map((tool, i) =>
        tool.sep
          ? h('div', { key: i, style: `width:1px;background:${theme.colors.border};margin:0 0.25rem;` })
          : h('button', {
              key: i,
              title: tool.title,
              onClick: () => {
                let value = tool.value;
                if (tool.prompt) value = window.prompt(tool.prompt);
                if (value !== null) exec(tool.cmd, value);
              },
              style: `min-width:32px;height:32px;padding:0 0.5rem;background:${theme.colors.surface};color:${theme.colors.text};border:none;border-radius:${theme.radius.sm};cursor:pointer;font-size:0.9rem;`,
            }, tool.icon)
      )
    ),
    // Editor
    h('div', {
      contentEditable: true,
      ref: (el) => { editorRef = el; },
      onInput: (e) => {
        content.set(e.target.innerHTML);
        onChange?.(content());
      },
      'data-placeholder': placeholder,
      style: `min-height:200px;padding:1rem;color:${theme.colors.text};outline:none;direction:rtl;line-height:1.7;:empty:before{content:attr(data-placeholder);color:${theme.colors.textMuted};}`,
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15) IMAGE WITH LAZY LOAD + FALLBACK
// ─────────────────────────────────────────────────────────────────────────────

export function Image(props) {
  const {
    src,
    alt = '',
    fallback = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23334155"/></svg>',
    lazy = true,
    width,
    height,
    ...rest
  } = props;

  const loaded = $state(false);
  const error = $state(false);
  const currentSrc = $state(error() ? fallback : src);

  return h('div', {
    style: `position:relative;${width ? `width:${width};` : ''}${height ? `height:${height};` : ''}overflow:hidden;background:${theme.colors.dark};`,
    ...rest,
  },
    !loaded() && !error() && h('div', {
      style: `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:${theme.colors.border};`,
    }, h('div', { style: `width:24px;height:24px;border:3px solid ${theme.colors.textMuted};border-top-color:${theme.colors.primary};border-radius:50%;animation:elmoorx-spin 0.8s linear infinite;` })),
    h('img', {
      src: currentSrc(),
      alt,
      loading: lazy ? 'lazy' : 'eager',
      onLoad: () => loaded.set(true),
      onError: () => { error.set(true); currentSrc.set(fallback); loaded.set(true); },
      style: `width:100%;height:100%;object-fit:cover;opacity:${loaded() ? 1 : 0};transition:opacity 0.3s;`,
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 16) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  FileUpload,
  DatePicker,
  ColorPicker,
  VirtualList,
  CommandPalette,
  Pagination,
  Breadcrumb,
  Stepper,
  Tooltip,
  TreeView,
  Carousel,
  DragDropList,
  NotificationCenter,
  notify,
  dismissNotification,
  RichTextEditor,
  Image,
  Drawer,
  Popover,
  Rate,
  Slider,
  OTPInput,
  Tag,
  Timeline,
  Empty,
  Stat,
  Banner,
};

// ─────────────────────────────────────────────────────────────────────────────
// 17) DRAWER — لوحة جانبية منزلقة
// ─────────────────────────────────────────────────────────────────────────────

export function Drawer(props) {
  const {
    open,
    onClose,
    title = '',
    side = 'right', // right | left | top | bottom
    width = 400,
    children,
    ...rest
  } = props;

  if (!open) return null;

  const sideStyles = {
    right: `right:0;top:0;bottom:0;width:${width}px;transform:translateX(0);`,
    left: `left:0;top:0;bottom:0;width:${width}px;transform:translateX(0);`,
    top: `top:0;left:0;right:0;height:${width}px;transform:translateY(0);`,
    bottom: `bottom:0;left:0;right:0;height:${width}px;transform:translateY(0);`,
  };

  return h('div', {
    onClick: onClose,
    style: 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;',
    ...rest,
  },
    h('div', {
      onClick: e => e.stopPropagation(),
      style: `position:absolute;background:${theme.colors.surface};box-shadow:${theme.shadows.lg};display:flex;flex-direction:column;${sideStyles[side]}`,
    },
      (title || onClose) && h('div', {
        style: `display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-bottom:1px solid ${theme.colors.border};`,
      },
        title && h('h3', { style: `margin:0;color:${theme.colors.text};` }, title),
        h('button', {
          onClick: onClose,
          style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:1.5rem;`,
        }, '×')
      ),
      h('div', { style: 'flex:1;overflow-y:auto;padding:1.5rem;' }, children)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 18) POPOVER — نافذة منبثقة مرتبطة بعنصر
// ─────────────────────────────────────────────────────────────────────────────

export function Popover(props) {
  const {
    trigger,
    content,
    position = 'top', // top | bottom | left | right
    triggerType = 'click', // click | hover
    ...rest
  } = props;

  const open = $state(false);

  const positions = {
    top: 'bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:8px;',
    bottom: 'top:100%;left:50%;transform:translateX(-50%);margin-top:8px;',
    left: 'right:100%;top:50%;transform:translateY(-50%);margin-left:8px;',
    right: 'left:100%;top:50%;transform:translateY(-50%);margin-right:8px;',
  };

  const triggerProps = triggerType === 'hover'
    ? { onMouseEnter: () => open.set(true), onMouseLeave: () => open.set(false) }
    : { onClick: () => open.set(!open()) };

  return h('div', {
    style: 'position:relative;display:inline-block;',
    ...triggerProps,
    ...rest,
  },
    trigger,
    open() && h('div', {
      style: `position:absolute;${positions[position]}background:${theme.colors.dark};color:${theme.colors.text};padding:0.75rem;border-radius:${theme.radius.md};box-shadow:${theme.shadows.lg};z-index:1000;min-width:200px;border:1px solid ${theme.colors.border};`,
    }, typeof content === 'function' ? content() : content)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 19) RATE — تقييم بالنجوم
// ─────────────────────────────────────────────────────────────────────────────

export function Rate(props) {
  const {
    count = 5,
    value = 0,
    onChange,
    allowHalf = false,
    disabled = false,
    size = 24,
    ...rest
  } = props;

  const hoverValue = $state(null);
  const current = $state(value);

  const handleClick = (val) => {
    if (disabled) return;
    current.set(val);
    onChange?.(val);
  };

  const handleMouseEnter = (val) => {
    if (disabled) return;
    hoverValue.set(val);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    hoverValue.set(null);
  };

  const displayValue = hoverValue() !== null ? hoverValue() : current();

  return h('div', {
    style: `display:inline-flex;gap:2px;cursor:${disabled ? 'default' : 'pointer'};`,
    onMouseLeave: handleMouseLeave,
    ...rest,
  },
    Array.from({ length: count }, (_, i) => {
      const starValue = i + 1;
      const filled = displayValue >= starValue;
      const half = allowHalf && displayValue >= starValue - 0.5 && displayValue < starValue;
      return h('span', {
        key: i,
        onClick: () => handleClick(starValue),
        onMouseEnter: () => handleMouseEnter(starValue),
        style: `font-size:${size}px;color:${filled || half ? '#f59e0b' : theme.colors.border};transition:color 0.15s;user-select:none;`,
      }, half ? '★' : filled ? '★' : '☆');
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 20) SLIDER — شريط تمرير القيمة
// ─────────────────────────────────────────────────────────────────────────────

export function Slider(props) {
  const {
    min = 0,
    max = 100,
    step = 1,
    value = 50,
    onChange,
    disabled = false,
    showValue = false,
    ...rest
  } = props;

  const current = $state(value);

  const handleChange = (e) => {
    if (disabled) return;
    const val = Number(e.target.value);
    current.set(val);
    onChange?.(val);
  };

  const percentage = ((current() - min) / (max - min)) * 100;

  return h('div', {
    style: `display:flex;align-items:center;gap:0.75rem;${disabled ? 'opacity:0.5;' : ''}`,
    ...rest,
  },
    h('input', {
      type: 'range',
      min,
      max,
      step,
      value: current(),
      onChange: handleChange,
      disabled,
      style: `flex:1;-webkit-appearance:none;height:6px;background:linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${percentage}%, ${theme.colors.border} ${percentage}%);border-radius:3px;outline:none;cursor:pointer;`,
    }),
    showValue && h('span', {
      style: `min-width:40px;color:${theme.colors.text};font-size:${theme.fontSize.sm};text-align:center;`,
    }, String(current()))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 21) OTP INPUT — إدخال OTP
// ─────────────────────────────────────────────────────────────────────────────

export function OTPInput(props) {
  const {
    length = 6,
    onComplete,
    disabled = false,
    ...rest
  } = props;

  const values = $state(Array(length).fill(''));

  const handleChange = (e, index) => {
    if (disabled) return;
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const newValues = [...values()];
    newValues[index] = val;
    values.set(newValues);

    // auto-focus next
    if (val && index < length - 1) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }

    // check complete
    if (newValues.every(v => v !== '') && onComplete) {
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !values()[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newValues = Array(length).fill('');
    for (let i = 0; i < pasted.length; i++) newValues[i] = pasted[i];
    values.set(newValues);
    if (newValues.every(v => v !== '') && onComplete) onComplete(newValues.join(''));
  };

  return h('div', {
    style: 'display:flex;gap:0.5rem;justify-content:center;',
    onPaste: handlePaste,
    ...rest,
  },
    values().map((val, i) =>
      h('input', {
        id: `otp-${i}`,
        key: i,
        type: 'text',
        inputMode: 'numeric',
        maxLength: 1,
        value: val,
        onChange: e => handleChange(e, i),
        onKeyDown: e => handleKeyDown(e, i),
        disabled,
        style: `width:40px;height:50px;text-align:center;font-size:1.5rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};outline:none;${val ? `border-color:${theme.colors.primary};` : ''}`,
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 22) TAG — وسم صغير
// ─────────────────────────────────────────────────────────────────────────────

export function Tag(props) {
  const {
    color = theme.colors.primary,
    closable = false,
    onClose,
    children,
    ...rest
  } = props;

  return h('span', {
    style: `display:inline-flex;align-items:center;gap:0.25rem;padding:0.15rem 0.5rem;background:${color}20;color:${color};border-radius:${theme.radius.sm};font-size:${theme.fontSize.xs};font-weight:500;`,
    ...rest,
  },
    children,
    closable && h('button', {
      onClick: onClose,
      style: `background:none;border:none;color:${color};cursor:pointer;font-size:0.85rem;padding:0;line-height:1;`,
    }, '×')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 23) TIMELINE — خط زمني
// ─────────────────────────────────────────────────────────────────────────────

export function Timeline(props) {
  const {
    items = [], // [{ title, description, time, color, icon }]
    ...rest
  } = props;

  return h('div', {
    style: 'position:relative;padding-right:1.5rem;',
    ...rest,
  },
    // الخط
    h('div', {
      style: `position:absolute;right:8px;top:0;bottom:0;width:2px;background:${theme.colors.border};`,
    }),
    items.map((item, i) =>
      h('div', {
        key: i,
        style: 'position:relative;padding-bottom:1.5rem;padding-right:1.5rem;',
      },
        h('div', {
          style: `position:absolute;right:-1.5rem;top:4px;width:18px;height:18px;border-radius:50%;background:${item.color || theme.colors.primary};border:3px solid ${theme.colors.surface};display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;`,
        }, item.icon || ''),
        item.title && h('div', {
          style: `color:${theme.colors.text};font-weight:600;margin-bottom:0.25rem;`,
        }, item.title),
        item.time && h('div', {
          style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};margin-bottom:0.25rem;`,
        }, item.time),
        item.description && h('div', {
          style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};`,
        }, item.description)
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 24) EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

export function Empty(props) {
  const {
    icon = '📭',
    title = 'لا توجد بيانات',
    description = '',
    action,
    ...rest
  } = props;

  return h('div', {
    style: `text-align:center;padding:3rem 1rem;color:${theme.colors.textMuted};`,
    ...rest,
  },
    h('div', { style: 'font-size:4rem;margin-bottom:1rem;' }, icon),
    h('h3', { style: `color:${theme.colors.text};margin-bottom:0.5rem;` }, title),
    description && h('p', { style: 'margin-bottom:1.5rem;' }, description),
    action
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 25) STAT — بطاقة إحصائية
// ─────────────────────────────────────────────────────────────────────────────

export function Stat(props) {
  const {
    label,
    value,
    icon,
    trend, // { value, direction: 'up' | 'down' }
    color = theme.colors.primary,
    ...rest
  } = props;

  return h('div', {
    style: `background:${theme.colors.surface};padding:1.25rem;border-radius:${theme.radius.lg};border-right:4px solid ${color};`,
    ...rest,
  },
    h('div', {
      style: 'display:flex;justify-content:space-between;align-items:flex-start;',
    },
      h('div', null,
        h('div', {
          style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};margin-bottom:0.25rem;`,
        }, label),
        h('div', {
          style: `color:${theme.colors.text};font-size:1.75rem;font-weight:bold;`,
        }, value)
      ),
      icon && h('div', {
        style: `width:40px;height:40px;border-radius:${theme.radius.md};background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-size:1.25rem;`,
      }, icon)
    ),
    trend && h('div', {
      style: `margin-top:0.5rem;font-size:${theme.fontSize.sm};color:${trend.direction === 'up' ? theme.colors.success : theme.colors.danger};`,
    },
      trend.direction === 'up' ? '↑' : '↓',
      ' ',
      trend.value
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 26) BANNER — شريط إعلان
// ─────────────────────────────────────────────────────────────────────────────

export function Banner(props) {
  const {
    variant = 'info',
    title,
    action,
    onClose,
    children,
    ...rest
  } = props;

  const variants = {
    info: { bg: 'rgba(14,165,233,0.1)', color: theme.colors.primary, border: theme.colors.primary },
    success: { bg: 'rgba(16,185,129,0.1)', color: theme.colors.success, border: theme.colors.success },
    warning: { bg: 'rgba(245,158,11,0.1)', color: theme.colors.warning, border: theme.colors.warning },
    danger: { bg: 'rgba(239,68,68,0.1)', color: theme.colors.danger, border: theme.colors.danger },
  };
  const v = variants[variant];

  return h('div', {
    style: `background:${v.bg};border:1px solid ${v.border};border-radius:${theme.radius.md};padding:1rem 1.5rem;display:flex;align-items:center;gap:1rem;`,
    ...rest,
  },
    h('div', { style: 'flex:1;' },
      title && h('div', { style: `color:${v.color};font-weight:600;margin-bottom:0.15rem;` }, title),
      h('div', { style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};` }, children)
    ),
    action,
    onClose && h('button', {
      onClick: onClose,
      style: `background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:1.25rem;`,
    }, '×')
  );
}
