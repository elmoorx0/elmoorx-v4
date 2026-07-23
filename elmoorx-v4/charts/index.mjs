/**
 * Elmoorx v4 — Charts Library (بدون تبعيات)
 * ===========================================
 * مكتبة رسوم بيانية بدون أي تبعية خارجية:
 *   - SVG-based (قابل للتوسيع)
 *   - Bar charts (vertical + horizontal)
 *   - Line charts (with smooth curves)
 *   - Area charts
 *   - Pie/Donut charts
 *   - Scatter plots
 *   - Responsive
 *   - Customizable colors, labels, grid
 */

import { h, $state, $effect, $computed } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) THEME
// ─────────────────────────────────────────────────────────────────────────────

export const chartColors = {
  blue: '#0ea5e9',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  orange: '#f97316',
  gray: '#64748b',
};

const defaultPalette = [
  chartColors.blue, chartColors.green, chartColors.yellow,
  chartColors.red, chartColors.purple, chartColors.pink,
];

// ─────────────────────────────────────────────────────────────────────────────
// 2) BAR CHART
// ─────────────────────────────────────────────────────────────────────────────

export function BarChart(props) {
  const {
    data = [],
    width = 600,
    height = 300,
    color = chartColors.blue,
    horizontal = false,
    showLabels = true,
    showGrid = true,
    padding = { top: 20, right: 20, bottom: 40, left: 40 },
  } = props;

  const values = data.map(d => typeof d === 'object' ? d.value : d);
  const labels = data.map((d, i) => typeof d === 'object' ? (d.label || d.name || `#${i+1}`) : `#${i+1}`);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barCount = data.length;
  const barSize = (horizontal ? chartHeight : chartWidth) / barCount;
  const barThickness = barSize * 0.7;

  const bars = data.map((d, i) => {
    const value = typeof d === 'object' ? d.value : d;
    const scaled = horizontal
      ? (value / max) * chartWidth
      : (value / max) * chartHeight;
    return {
      value,
      label: labels[i],
      x: horizontal ? padding.left : padding.left + i * barSize + (barSize - barThickness) / 2,
      y: horizontal ? padding.top + i * barSize + (barSize - barThickness) / 2 : padding.top + chartHeight - scaled,
      width: horizontal ? scaled : barThickness,
      height: horizontal ? barThickness : scaled,
    };
  });

  return h('svg', {
    width,
    height,
    style: 'background:#1e293b;border-radius:8px;',
    viewBox: `0 0 ${width} ${height}`,
  },
    // grid
    showGrid && h(Grid, { width: chartWidth, height: chartHeight, padding, horizontal, max }),

    // bars
    ...bars.map((bar, i) =>
      h('g', { key: i },
        h('rect', {
          x: bar.x,
          y: bar.y,
          width: bar.width,
          height: bar.height,
          fill: typeof data[i] === 'object' && data[i].color ? data[i].color : color,
          rx: 2,
          style: 'transition:all 0.3s;',
        }),
        showLabels && (
          horizontal
            ? h('text', {
                x: bar.x + bar.width + 5,
                y: bar.y + bar.height / 2 + 4,
                fill: '#94a3b8',
                'font-size': 11,
              }, String(bar.value))
            : h('text', {
                x: bar.x + bar.width / 2,
                y: bar.y - 5,
                'text-anchor': 'middle',
                fill: '#94a3b8',
                'font-size': 11,
              }, String(bar.value))
        ),
        // axis labels
        horizontal
          ? h('text', {
              x: padding.left - 5,
              y: bar.y + bar.height / 2 + 4,
              'text-anchor': 'end',
              fill: '#94a3b8',
              'font-size': 11,
            }, bar.label)
          : h('text', {
              x: bar.x + bar.width / 2,
              y: padding.top + chartHeight + 15,
              'text-anchor': 'middle',
              fill: '#94a3b8',
              'font-size': 11,
            }, bar.label)
      )
    )
  );
}

function Grid({ width, height, padding, horizontal, max }) {
  const lines = [];
  const step = 5;
  for (let i = 0; i <= step; i++) {
    const value = (max / step) * i;
    const pos = horizontal
      ? padding.left + (width / step) * i
      : padding.top + height - (height / step) * i;
    lines.push(
      h('g', { key: i },
        h('line', {
          x1: horizontal ? pos : padding.left,
          y1: horizontal ? padding.top : pos,
          x2: horizontal ? pos : padding.left + width,
          y2: horizontal ? padding.top + height : pos,
          stroke: '#334155',
          'stroke-width': 1,
          'stroke-dasharray': '2,2',
        }),
        h('text', {
          x: horizontal ? pos : padding.left - 5,
          y: horizontal ? padding.top + height + 15 : pos + 3,
          'text-anchor': horizontal ? 'middle' : 'end',
          fill: '#64748b',
          'font-size': 10,
        }, Math.round(value))
      )
    );
  }
  return h('g', null, ...lines);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) LINE CHART
// ─────────────────────────────────────────────────────────────────────────────

export function LineChart(props) {
  const {
    data = [], // [{ x, y, label }]
    width = 600,
    height = 300,
    color = chartColors.blue,
    smooth = true,
    showDots = true,
    showLabels = true,
    fillArea = false,
    padding = { top: 20, right: 20, bottom: 40, left: 40 },
  } = props;

  const points = data.map(d => ({ x: d.x || data.indexOf(d), y: d.y, label: d.label }));
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const xMax = Math.max(...xs, 1);
  const xMin = Math.min(...xs, 0);
  const yMax = Math.max(...ys, 1);
  const yMin = Math.min(...ys, 0);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const coords = points.map(p => ({
    x: padding.left + ((p.x - xMin) / (xMax - xMin || 1)) * chartWidth,
    y: padding.top + chartHeight - ((p.y - yMin) / (yMax - yMin || 1)) * chartHeight,
    raw: p,
  }));

  // build path
  let pathD = '';
  if (smooth && coords.length > 1) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
  } else {
    pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  }

  const areaPath = fillArea
    ? `${pathD} L ${coords[coords.length - 1]?.x || 0} ${padding.top + chartHeight} L ${coords[0]?.x || 0} ${padding.top + chartHeight} Z`
    : '';

  return h('svg', {
    width, height,
    style: 'background:#1e293b;border-radius:8px;',
    viewBox: `0 0 ${width} ${height}`,
  },
    h(Grid, { width: chartWidth, height: chartHeight, padding, horizontal: false, max: yMax }),
    fillArea && h('path', { d: areaPath, fill: color, opacity: 0.2 }),
    h('path', {
      d: pathD,
      fill: 'none',
      stroke: color,
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
    showDots && coords.map((c, i) =>
      h('circle', {
        key: i,
        cx: c.x,
        cy: c.y,
        r: 4,
        fill: color,
        stroke: '#1e293b',
        'stroke-width': 2,
      })
    ),
    showLabels && coords.map((c, i) =>
      h('text', {
        key: `label-${i}`,
        x: c.x,
        y: c.y - 10,
        'text-anchor': 'middle',
        fill: '#94a3b8',
        'font-size': 10,
      }, c.raw.label || String(c.raw.y))
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) AREA CHART
// ─────────────────────────────────────────────────────────────────────────────

export function AreaChart(props) {
  return h(LineChart, { ...props, fillArea: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) PIE / DONUT CHART
// ─────────────────────────────────────────────────────────────────────────────

export function PieChart(props) {
  const {
    data = [], // [{ label, value, color }]
    width = 400,
    height = 400,
    donut = false,
    showLabels = true,
    showLegend = true,
  } = props;

  const total = data.reduce((sum, d) => sum + (d.value || 0), 0) || 1;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 40;
  const innerRadius = donut ? radius * 0.6 : 0;

  let currentAngle = -Math.PI / 2; // ابدأ من الأعلى
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = cx + Math.cos(startAngle) * radius;
    const y1 = cy + Math.sin(startAngle) * radius;
    const x2 = cx + Math.cos(endAngle) * radius;
    const y2 = cy + Math.sin(endAngle) * radius;
    const x1i = cx + Math.cos(startAngle) * innerRadius;
    const y1i = cy + Math.sin(startAngle) * innerRadius;
    const x2i = cx + Math.cos(endAngle) * innerRadius;
    const y2i = cy + Math.sin(endAngle) * innerRadius;
    const largeArc = angle > Math.PI ? 1 : 0;

    const path = donut
      ? `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1i} ${y1i} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    const midAngle = (startAngle + endAngle) / 2;
    const labelX = cx + Math.cos(midAngle) * (radius * 0.7);
    const labelY = cy + Math.sin(midAngle) * (radius * 0.7);

    return {
      path,
      color: d.color || defaultPalette[i % defaultPalette.length],
      label: d.label,
      value: d.value,
      percentage: ((d.value / total) * 100).toFixed(1),
      labelX,
      labelY,
    };
  });

  return h('div', { style: 'display:inline-block;' },
    h('svg', {
      width, height,
      style: 'background:#1e293b;border-radius:8px;',
      viewBox: `0 0 ${width} ${height}`,
    },
      slices.map((s, i) =>
        h('g', { key: i },
          h('path', {
            d: s.path,
            fill: s.color,
            stroke: '#1e293b',
            'stroke-width': 2,
            style: 'transition:opacity 0.2s;cursor:pointer;',
          }),
          showLabels && s.percentage > 5 && h('text', {
            x: s.labelX,
            y: s.labelY,
            'text-anchor': 'middle',
            fill: 'white',
            'font-size': 12,
            'font-weight': 'bold',
          }, s.percentage + '%')
        )
      ),
      donut && h('text', {
        x: cx, y: cy,
        'text-anchor': 'middle',
        fill: '#e2e8f0',
        'font-size': 20,
        'font-weight': 'bold',
      }, String(total))
    ),
    showLegend && h('div', {
      style: 'display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:0.5rem;justify-content:center;',
    },
      slices.map((s, i) =>
        h('div', {
          key: i,
          style: 'display:flex;align-items:center;gap:0.25rem;color:#94a3b8;font-size:0.85rem;',
        },
          h('span', { style: `width:12px;height:12px;background:${s.color};border-radius:2px;` }),
          `${s.label} (${s.value})`
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) SCATTER PLOT
// ─────────────────────────────────────────────────────────────────────────────

export function ScatterChart(props) {
  const {
    data = [], // [{ x, y, label, color, size }]
    width = 600,
    height = 300,
    color = chartColors.blue,
    padding = { top: 20, right: 20, bottom: 40, left: 40 },
  } = props;

  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);
  const xMax = Math.max(...xs, 1);
  const xMin = Math.min(...xs, 0);
  const yMax = Math.max(...ys, 1);
  const yMin = Math.min(...ys, 0);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map(d => ({
    cx: padding.left + ((d.x - xMin) / (xMax - xMin || 1)) * chartWidth,
    cy: padding.top + chartHeight - ((d.y - yMin) / (yMax - yMin || 1)) * chartHeight,
    r: d.size || 5,
    color: d.color || color,
    label: d.label,
    raw: d,
  }));

  return h('svg', {
    width, height,
    style: 'background:#1e293b;border-radius:8px;',
    viewBox: `0 0 ${width} ${height}`,
  },
    h(Grid, { width: chartWidth, height: chartHeight, padding, horizontal: false, max: yMax }),
    points.map((p, i) =>
      h('circle', {
        key: i,
        cx: p.cx,
        cy: p.cy,
        r: p.r,
        fill: p.color,
        opacity: 0.7,
        stroke: '#1e293b',
        'stroke-width': 1,
        style: 'cursor:pointer;',
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) SPARKLINE (mini chart)
// ─────────────────────────────────────────────────────────────────────────────

export function Sparkline(props) {
  const {
    data = [],
    width = 100,
    height = 30,
    color = chartColors.blue,
    fillArea = true,
  } = props;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1 || 1)) * width,
    y: height - ((v - min) / range) * height,
  }));

  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return h('svg', {
    width, height,
    viewBox: `0 0 ${width} ${height}`,
    style: 'display:inline-block;',
  },
    fillArea && h('path', { d: areaPath, fill: color, opacity: 0.3 }),
    h('path', { d: path, fill: 'none', stroke: color, 'stroke-width': 1.5 })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterChart,
  Sparkline,
  chartColors,
};
