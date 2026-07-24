/**
 * اختبارات UI Data Components
 */
import { describe, it, expect } from '@elmoorx/testing';
import { h, renderToString } from '@elmoorx/runtime';
import { DataGrid, FormWizard, DiffViewer, KeyValueEditor, SearchInput, RangeSlider } from '../ui/data.mjs';

describe('UI Data — DataGrid', () => {
  it('should render table', () => {
    const html = renderToString(h(DataGrid, {
      columns: [{ key: 'name', label: 'Name' }],
      data: [{ id: 1, name: 'Test' }],
    }));
    expect(html).toContain('<table');
    expect(html).toContain('Name');
    expect(html).toContain('Test');
  });

  it('should render search box', () => {
    const html = renderToString(h(DataGrid, {
      columns: [{ key: 'name', label: 'Name' }],
      data: [],
    }));
    expect(html).toContain('type="search"');
    expect(html).toContain('بحث');
  });

  it('should render empty state', () => {
    const html = renderToString(h(DataGrid, {
      columns: [{ key: 'name', label: 'Name' }],
      data: [],
    }));
    expect(html).toContain('لا توجد بيانات');
  });

  it('should render pagination', () => {
    const html = renderToString(h(DataGrid, {
      columns: [{ key: 'name', label: 'Name' }],
      data: [{ id: 1, name: 'A' }],
      pageSize: 10,
    }));
    expect(html).toContain('السابق');
    expect(html).toContain('التالي');
  });

  it('should render sortable columns', () => {
    const html = renderToString(h(DataGrid, {
      columns: [{ key: 'name', label: 'Name', sortable: true }],
      data: [],
    }));
    expect(html).toContain('↕');
  });

  it('should render filterable columns', () => {
    const html = renderToString(h(DataGrid, {
      columns: [{ key: 'name', label: 'Name', filterable: true }],
      data: [],
    }));
    expect(html).toContain('تصفية');
  });
});

describe('UI Data — FormWizard', () => {
  it('should render wizard with steps', () => {
    const html = renderToString(h(FormWizard, {
      steps: [
        { title: 'Step 1', component: () => h('div', null, 'Content 1') },
        { title: 'Step 2', component: () => h('div', null, 'Content 2') },
      ],
    }));
    expect(html).toContain('Step 1');
    expect(html).toContain('Step 2');
  });

  it('should render progress bar', () => {
    const html = renderToString(h(FormWizard, {
      steps: [{ title: 'A', component: () => null }],
    }));
    expect(html).toContain('width:100%');
  });

  it('should render navigation buttons', () => {
    const html = renderToString(h(FormWizard, {
      steps: [
        { title: 'A', component: () => null },
        { title: 'B', component: () => null },
      ],
    }));
    expect(html).toContain('السابق');
    expect(html).toContain('التالي');
  });
});

describe('UI Data — DiffViewer', () => {
  it('should render diff', () => {
    const html = renderToString(h(DiffViewer, {
      oldText: 'line1\nline2',
      newText: 'line1\nmodified',
    }));
    expect(html).toContain('line1');
    expect(html).toContain('modified');
  });

  it('should highlight additions', () => {
    const html = renderToString(h(DiffViewer, {
      oldText: 'a',
      newText: 'a\nb',
    }));
    expect(html).toContain('+');
  });

  it('should highlight removals', () => {
    const html = renderToString(h(DiffViewer, {
      oldText: 'a\nb',
      newText: 'a',
    }));
    expect(html).toContain('-');
  });
});

describe('UI Data — KeyValueEditor', () => {
  it('should render key-value pairs', () => {
    const html = renderToString(h(KeyValueEditor, {
      pairs: [{ key: 'name', value: 'test' }],
    }));
    expect(html).toContain('name');
    expect(html).toContain('test');
  });

  it('should render add button', () => {
    const html = renderToString(h(KeyValueEditor, {}));
    expect(html).toContain('إضافة');
  });

  it('should render with empty pairs', () => {
    const html = renderToString(h(KeyValueEditor, { pairs: [] }));
    expect(html).toContain('المفتاح');
    expect(html).toContain('القيمة');
  });
});

describe('UI Data — SearchInput', () => {
  it('should render search input', () => {
    const html = renderToString(h(SearchInput, {
      suggestions: ['Apple', 'Banana'],
      placeholder: 'Search fruits...',
    }));
    expect(html).toContain('type="search"');
    expect(html).toContain('Search fruits');
  });

  it('should not show suggestions initially', () => {
    const html = renderToString(h(SearchInput, {
      suggestions: ['Apple'],
    }));
    // suggestions تظهر فقط عند focus + typing
    expect(html).not.toContain('Apple');
  });
});

describe('UI Data — RangeSlider', () => {
  it('should render two range inputs', () => {
    const html = renderToString(h(RangeSlider, {
      min: 0, max: 100,
      value: [20, 80],
    }));
    const inputCount = html.split('type="range"').length - 1;
    expect(inputCount).toBe(2);
  });

  it('should display min and max values', () => {
    const html = renderToString(h(RangeSlider, {
      min: 0, max: 100,
      value: [30, 70],
    }));
    expect(html).toContain('30');
    expect(html).toContain('70');
  });
});
