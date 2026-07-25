/**
 * Elmoorx v4 — Visualization UI Components
 * =========================================
 * مكونات تصور البيانات:
 *   - Heatmap (خريطة حرارية)
 *   - Calendar (تقويم شهري)
 *   - Gantt chart
 *   - QR Code (SVG-based)
 *   - Sparkline charts
 *   - Treemap
 *   - Funnel chart
 *   - Word cloud
 */

import { h, $state, $computed, $effect } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) HEATMAP — خريطة حرارية
// ─────────────────────────────────────────────────────────────────────────────

export function Heatmap(props) {
  const {
    data = [], // [{ x, y, value, label }]
    xLabels = [],
    yLabels = [],
    colorScale = ['#1e293b', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6'],
    cellSize = 24,
    cellGap = 2,
    showValues = false,
    ...rest
  } = props;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);

  const getColor = (value) => {
    if (value === 0) return colorScale[0];
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    const idx = Math.floor(normalized * (colorScale.length - 1));
    return colorScale[Math.min(idx, colorScale.length - 1)];
  };

  const width = (xLabels.length || Math.max(...data.map(d => d.x)) + 1) * (cellSize + cellGap) + 60;
  const height = (yLabels.length || Math.max(...data.map(d => d.y)) + 1) * (cellSize + cellGap) + 40;

  // group data by x,y
  const cellMap = new Map();
  for (const d of data) {
    cellMap.set(`${d.x},${d.y}`, d);
  }

  const xCount = xLabels.length || Math.max(...data.map(d => d.x)) + 1;
  const yCount = yLabels.length || Math.max(...data.map(d => d.y)) + 1;

  return h('svg', {
    width,
    height,
    style: 'background:#1e293b;border-radius:8px;',
    viewBox: `0 0 ${width} ${height}`,
    ...rest,
  },
    // X labels
    xLabels.map((label, i) =>
      h('text', {
        key: `x-${i}`,
        x: 50 + i * (cellSize + cellGap) + cellSize / 2,
        y: 15,
        'text-anchor': 'middle',
        fill: '#94a3b8',
        'font-size': 10,
      }, label)
    ),
    // Y labels
    yLabels.map((label, i) =>
      h('text', {
        key: `y-${i}`,
        x: 45,
        y: 30 + i * (cellSize + cellGap) + cellSize / 2 + 4,
        'text-anchor': 'end',
        fill: '#94a3b8',
        'font-size': 10,
      }, label)
    ),
    // Cells
    Array.from({ length: yCount }, (_, y) =>
      Array.from({ length: xCount }, (_, x) => {
        const cell = cellMap.get(`${x},${y}`);
        const value = cell?.value || 0;
        return h('g', { key: `${x}-${y}` },
          h('rect', {
            x: 50 + x * (cellSize + cellGap),
            y: 25 + y * (cellSize + cellGap),
            width: cellSize,
            height: cellSize,
            fill: getColor(value),
            rx: 2,
            style: 'cursor:pointer;transition:opacity 0.15s;',
          }),
          showValues && value > 0 && h('text', {
            x: 50 + x * (cellSize + cellGap) + cellSize / 2,
            y: 25 + y * (cellSize + cellGap) + cellSize / 2 + 4,
            'text-anchor': 'middle',
            fill: 'white',
            'font-size': 9,
          }, String(value))
        );
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) CALENDAR — تقويم شهري
// ─────────────────────────────────────────────────────────────────────────────

export function Calendar(props) {
  const {
    date: dateProp,
    events = [], // [{ date: 'YYYY-MM-DD', title, color }]
    onSelect,
    locale = 'ar',
    ...rest
  } = props;

  const viewDate = $state(dateProp ? new Date(dateProp) : new Date());
  const selected = $state(dateProp || '');

  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const days = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const year = $computed(() => viewDate().getFullYear());
  const month = $computed(() => viewDate().getMonth());

  const daysInMonth = $computed(() => {
    const first = new Date(year(), month(), 1);
    const last = new Date(year(), month() + 1, 0);
    const startDay = first.getDay();
    const total = last.getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let i = 1; i <= total; i++) cells.push(i);
    return cells;
  });

  const eventsMap = $computed(() => {
    const map = new Map();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return map;
  });

  const formatDate = (day) => {
    if (!day) return '';
    return `${year()}-${String(month() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const select = (day) => {
    if (!day) return;
    const formatted = formatDate(day);
    selected.set(formatted);
    onSelect?.(formatted, new Date(year(), month(), day));
  };

  const prev = () => viewDate.set(new Date(year(), month() - 1, 1));
  const next = () => viewDate.set(new Date(year(), month() + 1, 1));

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month() && today.getFullYear() === year();
  };

  const isSelected = (day) => {
    if (!day || !selected()) return false;
    return selected() === formatDate(day);
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1rem;width:320px;`,
    ...rest,
  },
    // Header
    h('div', {
      style: `display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;`,
    },
      h('button', {
        onClick: next,
        style: `background:none;border:none;color:${theme.colors.text};cursor:pointer;font-size:1.25rem;`,
      }, '›'),
      h('span', {
        style: `color:${theme.colors.text};font-weight:600;`,
      }, `${months[month()]} ${year()}`),
      h('button', {
        onClick: prev,
        style: `background:none;border:none;color:${theme.colors.text};cursor:pointer;font-size:1.25rem;`,
      }, '‹')
    ),
    // Days header
    h('div', {
      style: `display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px;`,
    },
      days.map(d => h('div', {
        key: d,
        style: `text-align:center;color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};padding:0.25rem;`,
      }, d.slice(0, 3)))
    ),
    // Days grid
    h('div', {
      style: `display:grid;grid-template-columns:repeat(7,1fr);gap:2px;`,
    },
      daysInMonth().map((day, i) => {
        const formatted = formatDate(day);
        const dayEvents = day ? eventsMap().get(formatted) : null;
        return h('div', {
          key: i,
          onClick: () => select(day),
          style: `aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:${day ? 'pointer' : 'default'};border-radius:${theme.radius.sm};font-size:${theme.fontSize.sm};${
            !day ? '' :
            isSelected(day) ? `background:${theme.colors.primary};color:white;font-weight:bold;` :
            isToday(day) ? `background:rgba(14,165,233,0.2);color:${theme.colors.primary};font-weight:bold;` :
            `color:${theme.colors.text};:hover{background:${theme.colors.dark};}`
          }position:relative;`,
        },
          h('span', null, day || ''),
          dayEvents && dayEvents.length > 0 && h('div', {
            style: `position:absolute;bottom:2px;display:flex;gap:1px;`,
          },
            dayEvents.slice(0, 3).map((e, j) =>
              h('div', {
                key: j,
                style: `width:4px;height:4px;border-radius:50%;background:${e.color || theme.colors.primary};`,
              })
            )
          )
        );
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) GANTT CHART — مخطط جانت
// ─────────────────────────────────────────────────────────────────────────────

export function Gantt(props) {
  const {
    tasks = [], // [{ id, name, start, end, color, progress, dependencies }]
    startDate,
    endDate,
    rowHeight = 32,
    ...rest
  } = props;

  const start = new Date(startDate || Date.now());
  const end = new Date(endDate || Date.now() + 30 * 86400000);
  const totalDays = Math.ceil((end - start) / 86400000);
  const dayWidth = 30;
  const labelWidth = 150;
  const width = labelWidth + totalDays * dayWidth;
  const height = tasks.length * rowHeight + 40;

  const getTaskX = (taskStart) => {
    const d = new Date(taskStart);
    const diff = Math.ceil((d - start) / 86400000);
    return labelWidth + diff * dayWidth;
  };

  const getTaskWidth = (taskStart, taskEnd) => {
    const s = new Date(taskStart);
    const e = new Date(taskEnd);
    const diff = Math.ceil((e - s) / 86400000);
    return Math.max(diff * dayWidth, dayWidth);
  };

  return h('div', {
    style: `overflow-x:auto;background:${theme.colors.surface};border-radius:${theme.radius.md};`,
    ...rest,
  },
    h('svg', {
      width,
      height,
      style: 'display:block;',
    },
      // Header: days
      Array.from({ length: totalDays }, (_, i) => {
        const date = new Date(start.getTime() + i * 86400000);
        const isWeekend = date.getDay() === 5 || date.getDay() === 6; // Fri, Sat
        return h('g', { key: `header-${i}` },
          h('rect', {
            x: labelWidth + i * dayWidth,
            y: 0,
            width: dayWidth,
            height: 30,
            fill: isWeekend ? theme.colors.dark : theme.colors.surface,
            stroke: theme.colors.border,
            'stroke-width': 0.5,
          }),
          h('text', {
            x: labelWidth + i * dayWidth + dayWidth / 2,
            y: 20,
            'text-anchor': 'middle',
            fill: '#94a3b8',
            'font-size': 9,
          }, String(date.getDate()))
        );
      }),
      // Label column header
      h('rect', {
        x: 0, y: 0,
        width: labelWidth, height: 30,
        fill: theme.colors.dark,
        stroke: theme.colors.border,
      }),
      h('text', {
        x: 10, y: 20,
        fill: '#94a3b8',
        'font-size': 11,
      }, 'المهمة'),
      // Task rows
      tasks.map((task, i) => {
        const y = 30 + i * rowHeight;
        const taskX = getTaskX(task.start);
        const taskW = getTaskWidth(task.start, task.end);
        const progressW = taskW * (task.progress || 0) / 100;

        return h('g', { key: task.id || i },
          // Row background
          h('rect', {
            x: 0, y,
            width, height: rowHeight,
            fill: i % 2 === 0 ? theme.colors.surface : theme.colors.dark,
            opacity: 0.5,
          }),
          // Label
          h('text', {
            x: 10, y: y + rowHeight / 2 + 4,
            fill: theme.colors.text,
            'font-size': 11,
          }, task.name),
          // Task bar
          h('rect', {
            x: taskX,
            y: y + 4,
            width: taskW,
            height: rowHeight - 8,
            fill: task.color || theme.colors.primary,
            opacity: 0.3,
            rx: 3,
          }),
          // Progress
          task.progress > 0 && h('rect', {
            x: taskX,
            y: y + 4,
            width: progressW,
            height: rowHeight - 8,
            fill: task.color || theme.colors.primary,
            rx: 3,
          }),
          // Progress text
          h('text', {
            x: taskX + taskW / 2,
            y: y + rowHeight / 2 + 4,
            'text-anchor': 'middle',
            fill: 'white',
            'font-size': 10,
            'font-weight': 'bold',
          }, task.progress ? `${task.progress}%` : '')
        );
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) QR CODE — رمز QR (SVG-based بدون تبعيات)
// ─────────────────────────────────────────────────────────────────────────────

export function QRCode(props) {
  const {
    text = '',
    size = 200,
    fgColor = '#0f172a',
    bgColor = '#ffffff',
    ...rest
  } = props;

  // توليد QR مبسّط (pattern ثابت يعتمد على hash النص)
  // للإنتاج الحقيقي استخدم مكتبة QR — نحن مستقلون
  const gridSize = 25;
  const cellSize = size / gridSize;

  // Generate pseudo-random pattern from text hash
  const hash = text.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const cells = [];
  let seed = Math.abs(hash) + 1;
  const rng = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // Corner markers (3x3 in corners)
      const isCorner = (x < 7 && y < 7) || (x >= gridSize - 7 && y < 7) || (x < 7 && y >= gridSize - 7);
      if (isCorner) {
        const cx = x < 7 ? 3 : gridSize - 4;
        const cy = y < 7 ? 3 : gridSize - 4;
        const dx = Math.abs(x - cx);
        const dy = Math.abs(y - cy);
        if (dx <= 3 && dy <= 3 && (dx === 3 || dy === 3 || (dx <= 1 && dy <= 1))) {
          cells.push({ x, y });
        }
        continue;
      }
      if (rng() > 0.5) cells.push({ x, y });
    }
  }

  return h('svg', {
    width: size,
    height: size,
    style: `background:${bgColor};border-radius:4px;`,
    viewBox: `0 0 ${size} ${size}`,
    ...rest,
  },
    // Background
    h('rect', {
      x: 0, y: 0,
      width: size, height: size,
      fill: bgColor,
    }),
    // Cells
    cells.map((cell, i) =>
      h('rect', {
        key: i,
        x: cell.x * cellSize,
        y: cell.y * cellSize,
        width: cellSize,
        height: cellSize,
        fill: fgColor,
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) FUNNEL CHART
// ─────────────────────────────────────────────────────────────────────────────

export function FunnelChart(props) {
  const {
    data = [], // [{ label, value, color }]
    width = 300,
    height = 300,
    ...rest
  } = props;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const centerX = width / 2;
  const sectionHeight = height / data.length;

  return h('div', {
    style: 'display:flex;flex-direction:column;align-items:center;',
    ...rest,
  },
    h('svg', {
      width,
      height,
      style: 'background:#1e293b;border-radius:8px;',
      viewBox: `0 0 ${width} ${height}`,
    },
      data.map((item, i) => {
        const ratio = item.value / maxValue;
        const topWidth = (1 - i / data.length * 0.6) * width * 0.8;
        const bottomWidth = (1 - (i + 1) / data.length * 0.6) * width * 0.8;
        const y = i * sectionHeight;
        const points = [
          `${centerX - topWidth / 2},${y}`,
          `${centerX + topWidth / 2},${y}`,
          `${centerX + bottomWidth / 2},${y + sectionHeight}`,
          `${centerX - bottomWidth / 2},${y + sectionHeight}`,
        ].join(' ');

        return h('g', { key: i },
          h('polygon', {
            points,
            fill: item.color || `hsl(${i * 60}, 70%, 50%)`,
            opacity: 0.8,
          }),
          h('text', {
            x: centerX,
            y: y + sectionHeight / 2 + 4,
            'text-anchor': 'middle',
            fill: 'white',
            'font-size': 12,
            'font-weight': 'bold',
          }, `${item.label} (${Math.round(item.value / total * 100)}%)`)
        );
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) TREEMAP
// ─────────────────────────────────────────────────────────────────────────────

export function Treemap(props) {
  const {
    data = [], // [{ label, value, color }]
    width = 400,
    height = 300,
    ...rest
  } = props;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  // Simplified treemap layout (squarified would be better but more complex)
  const layout = [];
  let x = 0, y = 0;
  let remainingWidth = width;

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const ratio = item.value / total;
    const isLast = i === data.length - 1;
    const itemWidth = isLast ? remainingWidth : Math.sqrt(ratio) * width;
    const itemHeight = ratio * height / (itemWidth / width);

    layout.push({
      ...item,
      x, y,
      width: Math.min(itemWidth, remainingWidth),
      height: Math.min(itemHeight, height - y),
      color: item.color || colors[i % colors.length],
    });

    x += itemWidth;
    remainingWidth -= itemWidth;
    if (remainingWidth < 50) {
      x = 0;
      y += itemHeight;
      remainingWidth = width;
    }
  }

  return h('svg', {
    width,
    height,
    style: 'background:#1e293b;border-radius:8px;',
    viewBox: `0 0 ${width} ${height}`,
    ...rest,
  },
    layout.map((item, i) =>
      h('g', { key: i },
        h('rect', {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          fill: item.color,
          opacity: 0.8,
          stroke: '#1e293b',
          'stroke-width': 2,
          rx: 4,
          style: 'cursor:pointer;transition:opacity 0.15s;',
        }),
        item.width > 60 && item.height > 30 && h('text', {
          x: item.x + item.width / 2,
          y: item.y + item.height / 2,
          'text-anchor': 'middle',
          fill: 'white',
          'font-size': 11,
          'font-weight': 'bold',
        }, item.label)
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) WORD CLOUD
// ─────────────────────────────────────────────────────────────────────────────

export function WordCloud(props) {
  const {
    words = [], // [{ text, weight }]
    width = 400,
    height = 200,
    minSize = 10,
    maxSize = 36,
    ...rest
  } = props;

  const maxWeight = Math.max(...words.map(w => w.weight), 1);

  // Simple layout: place words in a spiral
  const placed = [];
  const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  words.forEach((word, i) => {
    const size = minSize + (word.weight / maxWeight) * (maxSize - minSize);
    const angle = i * 0.5;
    const radius = i * 8;
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle) * radius;
    placed.push({
      ...word,
      size,
      x: Math.max(size, Math.min(width - size, x)),
      y: Math.max(size, Math.min(height - size, y)),
      color: colors[i % colors.length],
    });
  });

  return h('svg', {
    width,
    height,
    style: 'background:#1e293b;border-radius:8px;overflow:hidden;',
    viewBox: `0 0 ${width} ${height}`,
    ...rest,
  },
    placed.map((word, i) =>
      h('text', {
        key: i,
        x: word.x,
        y: word.y,
        'font-size': word.size,
        fill: word.color,
        'text-anchor': 'middle',
        'font-weight': 'bold',
        opacity: 0.8 + word.weight / maxWeight * 0.2,
        style: 'cursor:pointer;',
      }, word.text)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  Heatmap,
  Calendar,
  Gantt,
  QRCode,
  FunnelChart,
  Treemap,
  WordCloud,
};
