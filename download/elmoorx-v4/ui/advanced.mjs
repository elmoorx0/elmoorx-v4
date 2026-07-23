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
// 10) EXPORTS
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
};
