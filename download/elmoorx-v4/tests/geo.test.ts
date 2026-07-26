/**
 * اختبارات Geo UI Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { WorldMap, GeoChart, CoordinatePicker, DistanceCalculator } from '../ui/geo.mjs';

describe('Geo — WorldMap', () => {
  it('should render SVG map', () => {
    const html = renderToString(h(WorldMap, {}));
    expect(html).toContain('<svg');
    expect(html).toContain('path');
  });

  it('should render markers', () => {
    const html = renderToString(h(WorldMap, {
      markers: [
        { lat: 24.7136, lng: 46.6753, label: 'الرياض' },
        { lat: 21.4858, lng: 39.1925, label: 'مكة' },
      ],
    }));
    expect(html).toContain('الرياض');
    expect(html).toContain('مكة');
    expect(html).toContain('circle');
  });

  it('should render grid lines', () => {
    const html = renderToString(h(WorldMap, {}));
    expect(html).toContain('stroke-dasharray');
  });
});

describe('Geo — GeoChart', () => {
  it('should render SVG with regions', () => {
    const html = renderToString(h(GeoChart, {
      data: [
        { region: 'AS', value: 100 },
        { region: 'AF', value: 50 },
      ],
    }));
    expect(html).toContain('<svg');
    expect(html).toContain('path');
  });

  it('should render legend', () => {
    const html = renderToString(h(GeoChart, {
      data: [{ region: 'AS', value: 100 }],
    }));
    // legend is rendered as color scale divs
    expect(html).toContain('flex:1;height:12px');
  });

  it('should show values on regions', () => {
    const html = renderToString(h(GeoChart, {
      data: [{ region: 'EU', value: 75 }],
    }));
    expect(html).toContain('75');
  });
});

describe('Geo — CoordinatePicker', () => {
  it('should render map area', () => {
    const html = renderToString(h(CoordinatePicker, {}));
    expect(html).toContain('cursor:crosshair');
  });

  it('should render coordinate inputs', () => {
    const html = renderToString(h(CoordinatePicker, { lat: 24, lng: 46 }));
    expect(html).toContain('type="number"');
    expect(html).toContain('24');
    expect(html).toContain('46');
  });

  it('should render marker', () => {
    const html = renderToString(h(CoordinatePicker, { lat: 24, lng: 46 }));
    expect(html).toContain('border-radius:50%');
  });

  it('should show latitude and longitude labels', () => {
    const html = renderToString(h(CoordinatePicker, {}));
    expect(html).toContain('Latitude');
    expect(html).toContain('Longitude');
  });
});

describe('Geo — DistanceCalculator', () => {
  it('should render distance', () => {
    const html = renderToString(h(DistanceCalculator, {}));
    expect(html).toContain('كم');
    expect(html).toContain('ميل');
  });

  it('should render direction', () => {
    const html = renderToString(h(DistanceCalculator, {}));
    expect(html).toContain('الاتجاه');
  });

  it('should render inputs for both points', () => {
    const html = renderToString(h(DistanceCalculator, {
      point1: { lat: 24.7136, lng: 46.6753, label: 'الرياض' },
      point2: { lat: 21.4858, lng: 39.1925, label: 'مكة' },
    }));
    expect(html).toContain('الرياض');
    expect(html).toContain('مكة');
  });

  it('should show distance value', () => {
    const html = renderToString(h(DistanceCalculator, {}));
    // distance should be a number
    expect(html).toMatch(/\d+\.\d/);
  });
});
