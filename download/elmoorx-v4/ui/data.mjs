/**
 * Elmoorx v4 — Advanced Data Components
 * ======================================
 * مكونات بيانات متقدمة:
 *   - DataGrid (filters + sort + pagination + selection)
 *   - FormWizard (multi-step forms)
 *   - DiffViewer (compare two texts)
 *   - KeyValueEditor
 *   - FilterBuilder
 *   - SearchInput (with suggestions)
 *   - RangeSlider
 *   - MentionsInput
 */

import { h, $state, $computed, $effect } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) DATAGRID — جدول بيانات متقدم
// ─────────────────────────────────────────────────────────────────────────────

export function DataGrid(props) {
  const {
    columns = [], // [{ key, label, sortable, filterable, render, width }]
    data = [],
    pageSize = 10,
    selectable = false,
    onRowClick,
    ...rest
  } = props;

  const currentPage = $state(1);
  const sortBy = $state(null);
  const sortDir = $state('asc');
  const filters = $state({});
  const selected = $state(new Set());
  const searchQuery = $state('');

  // Filter
  const filtered = $computed(() => {
    let result = [...data];
    // global search
    if (searchQuery()) {
      const q = searchQuery().toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }
    // column filters
    const f = filters();
    for (const [key, value] of Object.entries(f)) {
      if (value) {
        result = result.filter(row =>
          String(row[key]).toLowerCase().includes(String(value).toLowerCase())
        );
      }
    }
    // sort
    if (sortBy()) {
      const key = sortBy();
      const dir = sortDir() === 'asc' ? 1 : -1;
      result.sort((a, b) => {
        if (a[key] < b[key]) return -dir;
        if (a[key] > b[key]) return dir;
        return 0;
      });
    }
    return result;
  });

  // Pagination
  const totalPages = $computed(() => Math.ceil(filtered().length / pageSize) || 1);
  const paginated = $computed(() => {
    const start = (currentPage() - 1) * pageSize;
    return filtered().slice(start, start + pageSize);
  });

  const handleSort = (col) => {
    if (!col.sortable) return;
    if (sortBy() === col.key) {
      sortDir.set(sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      sortBy.set(col.key);
      sortDir.set('asc');
    }
  };

  const toggleSelect = (id) => {
    const s = new Set(selected());
    if (s.has(id)) s.delete(id); else s.add(id);
    selected.set(s);
  };

  const toggleSelectAll = () => {
    const s = new Set(selected());
    if (s.size === paginated().length) {
      s.clear();
    } else {
      paginated().forEach(row => s.add(row.id));
    }
    selected.set(s);
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.md};overflow:hidden;`,
    ...rest,
  },
    // Toolbar
    h('div', {
      style: `padding:0.75rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};display:flex;gap:0.5rem;align-items:center;`,
    },
      // Search
      h('input', {
        type: 'search',
        placeholder: 'بحث...',
        value: searchQuery(),
        onInput: e => { searchQuery.set(e.target.value); currentPage.set(1); },
        style: `flex:1;padding:0.5rem;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};`,
      }),
      // Selection info
      selectable && selected().size > 0 && h('span', {
        style: `color:${theme.colors.primary};font-size:${theme.fontSize.sm};`,
      }, `${selected().size} محدد`)
    ),
    // Table
    h('div', { style: 'overflow-x:auto;' },
      h('table', { style: 'width:100%;border-collapse:collapse;' },
        // Header
        h('thead', null,
          h('tr', null,
            selectable && h('th', {
              style: `padding:0.75rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};width:40px;`,
            },
              h('input', {
                type: 'checkbox',
                checked: selected().size === paginated().length && paginated().length > 0,
                onChange: toggleSelectAll,
                style: 'accent-color:' + theme.colors.primary,
              })
            ),
            columns.map(col =>
              h('th', {
                key: col.key,
                onClick: () => handleSort(col),
                style: `padding:0.75rem;background:${theme.colors.dark};color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};text-align:right;cursor:${col.sortable ? 'pointer' : 'default'};border-bottom:1px solid ${theme.colors.border};${col.width ? `width:${col.width};` : ''}white-space:nowrap;`,
              },
                h('span', { style: 'display:flex;align-items:center;gap:0.25rem;' },
                  h('span', null, col.label),
                  col.sortable && h('span', {
                    style: `color:${sortBy() === col.key ? theme.colors.primary : theme.colors.textMuted};`,
                  }, sortBy() === col.key ? (sortDir() === 'asc' ? '↑' : '↓') : '↕')
                )
              )
            )
          )
        ),
        // Filters row
        h('thead', null,
          h('tr', null,
            selectable && h('th', { style: `background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};` }),
            columns.map(col =>
              col.filterable
                ? h('th', {
                    key: col.key,
                    style: `padding:0.4rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};`,
                  },
                    h('input', {
                      type: 'text',
                      placeholder: 'تصفية...',
                      value: filters()[col.key] || '',
                      onInput: e => { filters.set({ ...filters(), [col.key]: e.target.value }); currentPage.set(1); },
                      style: `width:100%;padding:0.25rem 0.4rem;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};font-size:${theme.fontSize.xs};box-sizing:border-box;`,
                    })
                  )
                : h('th', { key: col.key, style: `background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};` })
            )
          )
        ),
        // Body
        h('tbody', null,
          paginated().length === 0
            ? h('tr', null,
                h('td', {
                  colSpan: columns.length + (selectable ? 1 : 0),
                  style: `padding:2rem;text-align:center;color:${theme.colors.textMuted};`,
                }, 'لا توجد بيانات')
              )
            : paginated().map((row, i) =>
                h('tr', {
                  key: row.id || i,
                  onClick: () => onRowClick?.(row),
                  style: `cursor:${onRowClick ? 'pointer' : 'default'};:hover{background:${theme.colors.dark};}transition:background 0.15s;`,
                },
                  selectable && h('td', {
                    style: `padding:0.5rem 0.75rem;border-bottom:1px solid ${theme.colors.border};`,
                  },
                    h('input', {
                      type: 'checkbox',
                      checked: selected().has(row.id),
                      onChange: () => toggleSelect(row.id),
                      style: 'accent-color:' + theme.colors.primary,
                    })
                  ),
                  columns.map(col =>
                    h('td', {
                      key: col.key,
                      style: `padding:0.5rem 0.75rem;border-bottom:1px solid ${theme.colors.border};color:${theme.colors.text};font-size:${theme.fontSize.sm};`,
                    }, col.render ? col.render(row[col.key], row, i) : row[col.key])
                  )
                )
              )
        )
      )
    ),
    // Pagination
    h('div', {
      style: `padding:0.75rem;background:${theme.colors.dark};border-top:1px solid ${theme.colors.border};display:flex;justify-content:space-between;align-items:center;`,
    },
      h('span', {
        style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};`,
      }, `${filtered().length} عنصر`),
      h('div', { style: 'display:flex;gap:0.25rem;align-items:center;' },
        h('button', {
          onClick: () => currentPage.set(p => Math.max(1, p - 1)),
          disabled: currentPage() === 1,
          style: `padding:0.25rem 0.75rem;background:${theme.colors.surface};color:${theme.colors.text};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};cursor:pointer;${currentPage() === 1 ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
        }, 'السابق'),
        h('span', {
          style: `color:${theme.colors.text};font-size:${theme.fontSize.sm};padding:0 0.5rem;`,
        }, `${currentPage()} / ${totalPages()}`),
        h('button', {
          onClick: () => currentPage.set(p => Math.min(totalPages(), p + 1)),
          disabled: currentPage() === totalPages(),
          style: `padding:0.25rem 0.75rem;background:${theme.colors.surface};color:${theme.colors.text};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};cursor:pointer;${currentPage() === totalPages() ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
        }, 'التالي')
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) FORM WIZARD — نموذج متعدد الخطوات
// ─────────────────────────────────────────────────────────────────────────────

export function FormWizard(props) {
  const {
    steps = [], // [{ title, description, component, validate }]
    onComplete,
    ...rest
  } = props;

  const current = $state(0);
  const errors = $state({});
  const direction = $state('forward');

  const isFirst = $computed(() => current() === 0);
  const isLast = $computed(() => current() === steps.length - 1);
  const progress = $computed(() => ((current() + 1) / steps.length) * 100);

  const next = async () => {
    const step = steps[current()];
    if (step.validate) {
      const errs = await step.validate();
      if (Object.keys(errs).length > 0) {
        errors.set(errs);
        return;
      }
    }
    errors.set({});
    direction.set('forward');
    if (isLast()) {
      onComplete?.();
    } else {
      current.set(c => c + 1);
    }
  };

  const prev = () => {
    errors.set({});
    direction.set('backward');
    if (!isFirst()) current.set(c => c - 1);
  };

  const goTo = (i) => {
    if (i < current()) {
      direction.set('backward');
      current.set(i);
      errors.set({});
    }
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};overflow:hidden;`,
    ...rest,
  },
    // Progress header
    h('div', {
      style: `padding:1.5rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};`,
    },
      // Progress bar
      h('div', {
        style: `height:4px;background:${theme.colors.border};border-radius:2px;margin-bottom:1rem;overflow:hidden;`,
      },
        h('div', {
          style: `height:100%;background:${theme.colors.primary};transition:width 0.3s;width:${progress()}%;`,
        })
      ),
      // Steps indicators
      h('div', { style: 'display:flex;gap:0.5rem;' },
        steps.map((step, i) =>
          h('div', {
            key: i,
            onClick: () => goTo(i),
            style: `display:flex;align-items:center;gap:0.4rem;cursor:${i <= current() ? 'pointer' : 'default'};flex:1;`,
          },
            h('div', {
              style: `width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${theme.fontSize.xs};font-weight:bold;${
                i < current() ? `background:${theme.colors.success};color:white;` :
                i === current() ? `background:${theme.colors.primary};color:white;` :
                `background:${theme.colors.border};color:${theme.colors.textMuted};`
              }`,
            }, i < current() ? '✓' : String(i + 1)),
            h('span', {
              style: `font-size:${theme.fontSize.sm};${i === current() ? `color:${theme.colors.text};font-weight:600;` : `color:${theme.colors.textMuted};`}`,
            }, step.title)
          )
        )
      )
    ),
    // Content
    h('div', {
      style: `padding:1.5rem;min-height:200px;`,
    },
      steps[current()]?.component?.({ errors: errors() }) || null
    ),
    // Footer
    h('div', {
      style: `padding:1rem 1.5rem;background:${theme.colors.dark};border-top:1px solid ${theme.colors.border};display:flex;justify-content:space-between;`,
    },
      h('button', {
        onClick: prev,
        disabled: isFirst(),
        style: `padding:0.6rem 1.5rem;background:${theme.colors.surface};color:${theme.colors.text};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};cursor:pointer;${isFirst() ? 'opacity:0.5;cursor:not-allowed;' : ''}`,
      }, 'السابق'),
      h('button', {
        onClick: next,
        style: `padding:0.6rem 1.5rem;background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.md};cursor:pointer;`,
      }, isLast() ? 'إكمال' : 'التالي')
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) DIFF VIEWER — مقارنة نصين
// ─────────────────────────────────────────────────────────────────────────────

export function DiffViewer(props) {
  const {
    oldText = '',
    newText = '',
    contextLines = 3,
    ...rest
  } = props;

  // حساب الـ diff (LCS-based مبسّط)
  const diff = computeDiff(oldText.split('\n'), newText.split('\n'));

  return h('div', {
    style: `background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};overflow:hidden;font-family:monospace;font-size:0.85rem;direction:ltr;text-align:left;`,
    ...rest,
  },
    h('pre', { style: 'margin:0;padding:0;' },
      diff.map((line, i) => {
        const bg = line.type === 'add' ? 'rgba(16,185,129,0.15)'
                   : line.type === 'remove' ? 'rgba(239,68,68,0.15)'
                   : 'transparent';
        const color = line.type === 'add' ? '#10b981'
                      : line.type === 'remove' ? '#ef4444'
                      : theme.colors.textMuted;
        const prefix = line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' ';

        return h('div', {
          key: i,
          style: `background:${bg};color:${color};padding:0.1rem 0.75rem;display:flex;`,
        },
          h('span', { style: 'margin-right:0.5rem;opacity:0.5;width:20px;' }, prefix),
          h('span', null, line.text || ' ')
        );
      })
    )
  );
}

function computeDiff(oldLines, newLines) {
  // LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  const lcs = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ type: 'same', text: oldLines[i - 1] });
      i--; j--;
    } else if (lcs[i - 1][j] >= lcs[i][j - 1]) {
      result.unshift({ type: 'remove', text: oldLines[i - 1] });
      i--;
    } else {
      result.unshift({ type: 'add', text: newLines[j - 1] });
      j--;
    }
  }
  while (i > 0) { result.unshift({ type: 'remove', text: oldLines[i - 1] }); i--; }
  while (j > 0) { result.unshift({ type: 'add', text: newLines[j - 1] }); j--; }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) KEY-VALUE EDITOR
// ─────────────────────────────────────────────────────────────────────────────

export function KeyValueEditor(props) {
  const {
    pairs: pairsProp = [],
    onChange,
    keyPlaceholder = 'المفتاح',
    valuePlaceholder = 'القيمة',
    ...rest
  } = props;

  const pairs = $state(pairsProp.length > 0 ? pairsProp : [{ key: '', value: '' }]);

  const update = (i, field, value) => {
    const newPairs = [...pairs()];
    newPairs[i] = { ...newPairs[i], [field]: value };
    pairs.set(newPairs);
    onChange?.(newPairs.filter(p => p.key));
  };

  const add = () => {
    pairs.set([...pairs(), { key: '', value: '' }]);
  };

  const remove = (i) => {
    const newPairs = pairs().filter((_, idx) => idx !== i);
    pairs.set(newPairs.length > 0 ? newPairs : [{ key: '', value: '' }]);
    onChange?.(newPairs.filter(p => p.key));
  };

  return h('div', { ...rest },
    pairs().map((pair, i) =>
      h('div', {
        key: i,
        style: 'display:flex;gap:0.5rem;margin-bottom:0.5rem;',
      },
        h('input', {
          type: 'text',
          placeholder: keyPlaceholder,
          value: pair.key,
          onInput: e => update(i, 'key', e.target.value),
          style: `flex:1;padding:0.4rem 0.6rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};`,
        }),
        h('input', {
          type: 'text',
          placeholder: valuePlaceholder,
          value: pair.value,
          onInput: e => update(i, 'value', e.target.value),
          style: `flex:1;padding:0.4rem 0.6rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};`,
        }),
        h('button', {
          onClick: () => remove(i),
          style: `background:${theme.colors.danger};color:white;border:none;border-radius:${theme.radius.sm};cursor:pointer;padding:0.4rem 0.6rem;`,
        }, '×')
      )
    ),
    h('button', {
      onClick: add,
      style: `padding:0.4rem 1rem;background:${theme.colors.primary}20;color:${theme.colors.primary};border:1px dashed ${theme.colors.primary};border-radius:${theme.radius.sm};cursor:pointer;width:100%;`,
    }, '+ إضافة')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) SEARCH INPUT WITH SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function SearchInput(props) {
  const {
    suggestions = [],
    onSearch,
    onSelect,
    placeholder = 'بحث...',
    ...rest
  } = props;

  const query = $state('');
  const focused = $state(false);
  const selectedIndex = $state(-1);

  const filtered = $computed(() => {
    const q = query().toLowerCase();
    if (!q) return [];
    return suggestions.filter(s =>
      String(s.label || s).toLowerCase().includes(q)
    ).slice(0, 8);
  });

  const handleKeydown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex.set(s => Math.min(s + 1, filtered().length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex.set(s => Math.max(s - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex() >= 0) {
        select(filtered()[selectedIndex()]);
      } else {
        onSearch?.(query());
        focused.set(false);
      }
    } else if (e.key === 'Escape') {
      focused.set(false);
    }
  };

  const select = (item) => {
    query.set(item.label || item);
    onSelect?.(item);
    focused.set(false);
  };

  return h('div', {
    style: 'position:relative;display:inline-block;width:100%;',
    ...rest,
  },
    h('input', {
      type: 'search',
      placeholder,
      value: query(),
      onInput: e => { query.set(e.target.value); selectedIndex.set(-1); },
      onFocus: () => focused.set(true),
      onBlur: () => setTimeout(() => focused.set(false), 200),
      onKeyDown: handleKeydown,
      style: `width:100%;padding:0.5rem 0.75rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};color:${theme.colors.text};box-sizing:border-box;`,
    }),
    focused() && filtered().length > 0 && h('div', {
      style: `position:absolute;top:100%;left:0;right:0;background:${theme.colors.surface};border:1px solid ${theme.colors.border};border-radius:${theme.radius.md};box-shadow:${theme.shadows.lg};z-index:100;margin-top:0.25rem;max-height:300px;overflow-y:auto;`,
    },
      filtered().map((item, i) =>
        h('div', {
          key: i,
          onMouseDown: () => select(item),
          style: `padding:0.5rem 0.75rem;cursor:pointer;color:${selectedIndex() === i ? theme.colors.primary : theme.colors.text};background:${selectedIndex() === i ? theme.colors.primary + '20' : 'transparent'};font-size:${theme.fontSize.sm};`,
        }, item.label || item)
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) RANGE SLIDER — شريط تمرير بنهايتين
// ─────────────────────────────────────────────────────────────────────────────

export function RangeSlider(props) {
  const {
    min = 0,
    max = 100,
    step = 1,
    value: valueProp = [20, 80],
    onChange,
    ...rest
  } = props;

  const value = $state([...valueProp]);
  const minVal = $computed(() => Math.min(value()[0], value()[1]));
  const maxVal = $computed(() => Math.max(value()[0], value()[1]));

  const handleChange = (i, val) => {
    const newVal = [...value()];
    newVal[i] = val;
    value.set(newVal);
    onChange?.([Math.min(newVal[0], newVal[1]), Math.max(newVal[0], newVal[1])]);
  };

  const minPercent = ((minVal() - min) / (max - min)) * 100;
  const maxPercent = ((maxVal() - min) / (max - min)) * 100;

  return h('div', {
    style: 'padding:0.5rem 0;',
    ...rest,
  },
    h('div', {
      style: 'position:relative;height:6px;background:${theme.colors.border};border-radius:3px;margin:0.5rem 0;',
    },
      h('div', {
        style: `position:absolute;height:100%;background:${theme.colors.primary};border-radius:3px;left:${minPercent}%;right:${100 - maxPercent}%;`,
      })
    ),
    h('div', { style: 'position:relative;' },
      h('input', {
        type: 'range',
        min, max, step,
        value: value()[0],
        onChange: e => handleChange(0, Number(e.target.value)),
        style: `position:absolute;width:100%;-webkit-appearance:none;background:transparent;pointer-events:none;&::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${theme.colors.primary};cursor:pointer;}`,
      }),
      h('input', {
        type: 'range',
        min, max, step,
        value: value()[1],
        onChange: e => handleChange(1, Number(e.target.value)),
        style: `position:absolute;width:100%;-webkit-appearance:none;background:transparent;pointer-events:none;&::-webkit-slider-thumb{pointer-events:auto;-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${theme.colors.primary};cursor:pointer;}`,
      })
    ),
    h('div', {
      style: `display:flex;justify-content:space-between;color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};margin-top:0.5rem;`,
    },
      h('span', null, String(minVal())),
      h('span', null, String(maxVal()))
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  DataGrid,
  FormWizard,
  DiffViewer,
  KeyValueEditor,
  SearchInput,
  RangeSlider,
};
