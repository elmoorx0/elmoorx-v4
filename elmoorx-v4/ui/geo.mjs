/**
 * Elmoorx v4 — Geo & Map Components (بدون تبعيات)
 * =================================================
 * مكونات جغرافية وخرائط:
 *   - WorldMap (SVG-based)
 *   - GeoChart (choropleth)
 *   - CoordinatePicker
 *   - DistanceCalculator
 *   - TimeZoneDisplay
 */

import { h, $state, $computed, $effect } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) WORLD MAP — خريطة عالمية SVG مبسّطة
// ─────────────────────────────────────────────────────────────────────────────

export function WorldMap(props) {
  const {
    markers = [], // [{ lat, lng, label, color, size }]
    onRegionClick,
    width = 800,
    height = 400,
    ...rest
  } = props;

  // تحويل إحداثيات lat/lng إلى x/y على الخريطة
  const project = (lat, lng) => ({
    x: ((lng + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  });

  // قارات مبسّطة كـ SVG paths (very simplified)
  const continents = [
    // North America (simplified)
    { name: 'NA', path: 'M 80 80 L 200 70 L 240 120 L 220 180 L 150 200 L 100 160 Z' },
    // South America
    { name: 'SA', path: 'M 200 220 L 250 210 L 260 280 L 230 350 L 210 320 Z' },
    // Europe
    { name: 'EU', path: 'M 380 70 L 440 65 L 460 100 L 430 130 L 390 110 Z' },
    // Africa
    { name: 'AF', path: 'M 390 140 L 460 135 L 480 220 L 440 300 L 410 280 L 395 200 Z' },
    // Asia
    { name: 'AS', path: 'M 460 60 L 650 55 L 700 150 L 680 200 L 560 180 L 470 130 Z' },
    // Australia
    { name: 'AU', path: 'M 620 280 L 700 275 L 720 320 L 660 335 Z' },
  ];

  return h('div', {
    style: `background:${theme.colors.dark};border-radius:${theme.radius.lg};overflow:hidden;`,
    ...rest,
  },
    h('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      style: 'display:block;',
    },
      // Ocean background
      h('rect', {
        x: 0, y: 0,
        width, height,
        fill: '#0f172a',
      }),
      // Grid lines (lat/lng)
      ...Array.from({ length: 7 }, (_, i) => {
        const y = (i + 1) * (height / 8);
        return h('line', {
          key: `lat-${i}`,
          x1: 0, y1: y,
          x2: width, y2: y,
          stroke: '#1e293b',
          'stroke-width': 0.5,
          'stroke-dasharray': '2,4',
        });
      }),
      ...Array.from({ length: 11 }, (_, i) => {
        const x = (i + 1) * (width / 12);
        return h('line', {
          key: `lng-${i}`,
          x1: x, y1: 0,
          x2: x, y2: height,
          stroke: '#1e293b',
          'stroke-width': 0.5,
          'stroke-dasharray': '2,4',
        });
      }),
      // Continents
      continents.map((continent, i) =>
        h('path', {
          key: continent.name,
          d: continent.path,
          fill: theme.colors.surface,
          stroke: theme.colors.border,
          'stroke-width': 1,
          onClick: () => onRegionClick?.(continent.name),
          style: 'cursor:pointer;transition:fill 0.15s;',
        })
      ),
      // Markers
      markers.map((marker, i) => {
        const pos = project(marker.lat, marker.lng);
        const size = marker.size || 8;
        return h('g', { key: i },
          h('circle', {
            cx: pos.x,
            cy: pos.y,
            r: size,
            fill: marker.color || theme.colors.danger,
            opacity: 0.3,
            style: 'animation:elmoorx-pulse 2s infinite;',
          }),
          h('circle', {
            cx: pos.x,
            cy: pos.y,
            r: size / 2,
            fill: marker.color || theme.colors.danger,
          }),
          marker.label && h('text', {
            x: pos.x,
            y: pos.y - size - 4,
            'text-anchor': 'middle',
            fill: '#e2e8f0',
            'font-size': 10,
            'font-weight': 'bold',
          }, marker.label)
        );
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) GEO CHART — خريطة حرارية جغرافية
// ─────────────────────────────────────────────────────────────────────────────

export function GeoChart(props) {
  const {
    data = [], // [{ region, value, color }]
    regions = [], // [{ name, path }]
    colorScale = ['#1e293b', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6'],
    width = 800,
    height = 400,
    ...rest
  } = props;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const dataMap = new Map(data.map(d => [d.region, d.value]));

  const getColor = (region) => {
    const value = dataMap.get(region) || 0;
    if (value === 0) return colorScale[0];
    const normalized = value / maxValue;
    const idx = Math.floor(normalized * (colorScale.length - 1));
    return colorScale[idx];
  };

  // Use simplified continents if no regions provided
  const displayRegions = regions.length > 0 ? regions : [
    { name: 'NA', path: 'M 80 80 L 200 70 L 240 120 L 220 180 L 150 200 L 100 160 Z' },
    { name: 'SA', path: 'M 200 220 L 250 210 L 260 280 L 230 350 L 210 320 Z' },
    { name: 'EU', path: 'M 380 70 L 440 65 L 460 100 L 430 130 L 390 110 Z' },
    { name: 'AF', path: 'M 390 140 L 460 135 L 480 220 L 440 300 L 410 280 L 395 200 Z' },
    { name: 'AS', path: 'M 460 60 L 650 55 L 700 150 L 680 200 L 560 180 L 470 130 Z' },
    { name: 'AU', path: 'M 620 280 L 700 275 L 720 320 L 660 335 Z' },
  ];

  return h('div', {
    style: `background:${theme.colors.dark};border-radius:${theme.radius.lg};overflow:hidden;`,
    ...rest,
  },
    h('svg', {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    },
      h('rect', {
        x: 0, y: 0,
        width, height,
        fill: '#0f172a',
      }),
      displayRegions.map((region, i) =>
        h('path', {
          key: i,
          d: region.path,
          fill: getColor(region.name),
          stroke: theme.colors.border,
          'stroke-width': 1,
          style: 'cursor:pointer;transition:opacity 0.15s;',
        })
      ),
      // Labels
      displayRegions.map((region, i) => {
        const centroid = getCentroid(region.path);
        const value = dataMap.get(region.name);
        return h('text', {
          key: `label-${i}`,
          x: centroid.x,
          y: centroid.y,
          'text-anchor': 'middle',
          fill: '#94a3b8',
          'font-size': 11,
          'font-weight': 'bold',
        }, value ? `${region.name}: ${value}` : region.name);
      })
    ),
    // Legend
    h('div', {
      style: `padding:0.5rem 1rem;display:flex;gap:0.25rem;align-items:center;`,
    },
      h('span', { style: `color:${theme.colors.textMuted};font-size:0.7rem;` }, '0'),
      colorScale.map((color, i) =>
        h('div', {
          key: i,
          style: `flex:1;height:12px;background:${color};`,
        })
      ),
      h('span', { style: `color:${theme.colors.textMuted};font-size:0.7rem;` }, String(maxValue))
    )
  );
}

function getCentroid(pathStr) {
  // simplified — extract first coordinate
  const match = pathStr.match(/M\s+([\d.]+)\s+([\d.]+)/);
  if (match) return { x: parseFloat(match[1]) + 50, y: parseFloat(match[2]) + 40 };
  return { x: 400, y: 200 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) COORDINATE PICKER
// ─────────────────────────────────────────────────────────────────────────────

export function CoordinatePicker(props) {
  const {
    lat: latProp = 24.7136,
    lng: lngProp = 46.6753,
    onChange,
    width = 600,
    height = 300,
    ...rest
  } = props;

  const lat = $state(latProp);
  const lng = $state(lngProp);

  const marker = $computed(() => ({
    x: ((lng() + 180) / 360) * width,
    y: ((90 - lat()) / 180) * height,
  }));

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newLng = (x / width) * 360 - 180;
    const newLat = 90 - (y / height) * 180;
    lat.set(parseFloat(newLat.toFixed(4)));
    lng.set(parseFloat(newLng.toFixed(4)));
    onChange?.(lat(), lng());
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1rem;`,
    ...rest,
  },
    h('div', {
      onClick: handleClick,
      style: `position:relative;width:${width}px;height:${height}px;background:linear-gradient(135deg,#0f172a,#1e293b);border-radius:${theme.radius.md};cursor:crosshair;overflow:hidden;border:1px solid ${theme.colors.border};`,
    },
      // Grid
      Array.from({ length: 5 }, (_, i) =>
        h('div', {
          key: `h-${i}`,
          style: `position:absolute;left:0;right:0;top:${(i+1) * 20}%;height:1px;background:${theme.colors.border};opacity:0.3;pointer-events:none;`,
        })
      ),
      // Marker
      h('div', {
        style: `position:absolute;left:${marker().x - 8}px;top:${marker().y - 8}px;width:16px;height:16px;border-radius:50%;background:${theme.colors.danger};border:2px solid white;box-shadow:0 0 8px rgba(239,68,68,0.5);pointer-events:none;`,
      })
    ),
    // Coordinates display
    h('div', {
      style: `display:flex;gap:1rem;margin-top:0.75rem;`,
    },
      h('div', null,
        h('label', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};` }, 'Latitude'),
        h('input', {
          type: 'number',
          value: lat(),
          onChange: e => { lat.set(parseFloat(e.target.value)); onChange?.(lat(), lng()); },
          step: 0.0001,
          min: -90,
          max: 90,
          style: `width:120px;padding:0.3rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};margin-right:0.5rem;direction:ltr;`,
        })
      ),
      h('div', null,
        h('label', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};` }, 'Longitude'),
        h('input', {
          type: 'number',
          value: lng(),
          onChange: e => { lng.set(parseFloat(e.target.value)); onChange?.(lat(), lng()); },
          step: 0.0001,
          min: -180,
          max: 180,
          style: `width:120px;padding:0.3rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};direction:ltr;`,
        })
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) DISTANCE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

export function DistanceCalculator(props) {
  const {
    point1 = { lat: 24.7136, lng: 46.6753, label: 'الرياض' },
    point2 = { lat: 21.4858, lng: 39.1925, label: 'مكة' },
    ...rest
  } = props;

  const p1 = $state(point1);
  const p2 = $state(point2);

  const distance = $computed(() => {
    return haversineDistance(p1().lat, p1().lng, p2().lat, p2().lng);
  });

  const bearing = $computed(() => {
    return calculateBearing(p1().lat, p1().lng, p2().lat, p2().lng);
  });

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.lg};padding:1.5rem;`,
    ...rest,
  },
    h('h3', { style: `color:${theme.colors.text};margin-bottom:1rem;` }, 'حاسبة المسافات'),
    // Point 1
    h('div', { style: 'margin-bottom:0.75rem;' },
      h('label', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};` }, point1.label || 'النقطة 1'),
      h('div', { style: 'display:flex;gap:0.5rem;' },
        h('input', {
          type: 'number', value: p1().lat, step: 0.0001,
          onInput: e => p1.set({ ...p1(), lat: parseFloat(e.target.value) }),
          style: `flex:1;padding:0.4rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};direction:ltr;`,
        }),
        h('input', {
          type: 'number', value: p1().lng, step: 0.0001,
          onInput: e => p1.set({ ...p1(), lng: parseFloat(e.target.value) }),
          style: `flex:1;padding:0.4rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};direction:ltr;`,
        })
      )
    ),
    // Point 2
    h('div', { style: 'margin-bottom:1rem;' },
      h('label', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.sm};` }, point2.label || 'النقطة 2'),
      h('div', { style: 'display:flex;gap:0.5rem;' },
        h('input', {
          type: 'number', value: p2().lat, step: 0.0001,
          onInput: e => p2.set({ ...p2(), lat: parseFloat(e.target.value) }),
          style: `flex:1;padding:0.4rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};direction:ltr;`,
        }),
        h('input', {
          type: 'number', value: p2().lng, step: 0.0001,
          onInput: e => p2.set({ ...p2(), lng: parseFloat(e.target.value) }),
          style: `flex:1;padding:0.4rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};direction:ltr;`,
        })
      )
    ),
    // Results
    h('div', {
      style: `display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;`,
    },
      h('div', {
        style: `background:${theme.colors.dark};padding:0.75rem;border-radius:${theme.radius.md};text-align:center;`,
      },
        h('div', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};margin-bottom:0.25rem;` }, 'المسافة'),
        h('div', { style: `color:${theme.colors.primary};font-size:1.5rem;font-weight:bold;` }, distance().km.toFixed(1)),
        h('div', { style: `color:${theme.colors.textMuted};font-size:0.7rem;` }, 'كم'),
        h('div', { style: `color:${theme.colors.textMuted};font-size:0.7rem;margin-top:0.15rem;` }, `${distance().mi.toFixed(1)} ميل`)
      ),
      h('div', {
        style: `background:${theme.colors.dark};padding:0.75rem;border-radius:${theme.radius.md};text-align:center;`,
      },
        h('div', { style: `color:${theme.colors.textMuted};font-size:${theme.fontSize.xs};margin-bottom:0.25rem;` }, 'الاتجاه'),
        h('div', { style: `color:${theme.colors.success};font-size:1.5rem;font-weight:bold;` }, `${bearing().direction}`),
        h('div', { style: `color:${theme.colors.textMuted};font-size:0.7rem;` }, `${bearing().degrees.toFixed(0)}°`),
        h('div', { style: `color:${theme.colors.textMuted};font-size:0.7rem;margin-top:0.15rem;` }, bearing().arrow)
      )
    )
  );
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  return { km, mi: km * 0.621371 };
}

function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const direction = directions[Math.round(bearing / 45) % 8];
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  const arrow = arrows[Math.round(bearing / 45) % 8];

  return { degrees: bearing, direction, arrow };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  WorldMap,
  GeoChart,
  CoordinatePicker,
  DistanceCalculator,
};
