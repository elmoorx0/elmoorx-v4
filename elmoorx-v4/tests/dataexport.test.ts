/**
 * اختبارات DataExport
 */
import { describe, it, expect } from '@elmoorx/testing';
import { exportCSV, exportJSON, exportHTML, exportMarkdown, importCSV, importJSON, copyToClipboard } from '../dataexport/index.mjs';

const testData = [
  { name: 'محمد', age: 30, city: 'الرياض' },
  { name: 'فاطمة', age: 25, city: 'جدة' },
  { name: 'أحمد', age: 35, city: 'الدمام' },
];

const testColumns = [
  { key: 'name', label: 'الاسم' },
  { key: 'age', label: 'العمر' },
  { key: 'city', label: 'المدينة' },
];

describe('DataExport — CSV', () => {
  it('should export CSV with header', () => {
    const result = exportCSV(testData, testColumns);
    expect(result.content).toContain('الاسم');
    expect(result.content).toContain('العمر');
    expect(result.content).toContain('محمد');
    expect(result.content).toContain('30');
  });

  it('should include BOM for Excel', () => {
    const result = exportCSV(testData, testColumns);
    expect(result.content.charCodeAt(0)).toBe(0xFEFF);
  });

  it('should support custom delimiter', () => {
    const result = exportCSV(testData, testColumns, { delimiter: ';' });
    expect(result.content).toContain(';');
  });

  it('should escape values with commas', () => {
    const data = [{ text: 'hello, world' }];
    const cols = [{ key: 'text', label: 'Text' }];
    const result = exportCSV(data, cols);
    expect(result.content).toContain('"hello, world"');
  });

  it('should skip header when disabled', () => {
    const result = exportCSV(testData, testColumns, { includeHeader: false });
    expect(result.content).not.toContain('الاسم');
  });

  it('should set correct mime type', () => {
    const result = exportCSV(testData, testColumns);
    expect(result.mime).toContain('text/csv');
  });
});

describe('DataExport — JSON', () => {
  it('should export JSON', () => {
    const result = exportJSON(testData);
    const parsed = JSON.parse(result.content);
    expect(parsed.length).toBe(3);
    expect(parsed[0].name).toBe('محمد');
  });

  it('should support pretty print', () => {
    const pretty = exportJSON(testData, { pretty: true });
    const compact = exportJSON(testData, { pretty: false });
    expect(pretty.content.length).toBeGreaterThan(compact.content.length);
  });

  it('should filter fields', () => {
    const result = exportJSON(testData, { fields: ['name', 'age'] });
    const parsed = JSON.parse(result.content);
    expect(parsed[0].name).toBe('محمد');
    expect(parsed[0].city).toBeUndefined();
  });
});

describe('DataExport — HTML', () => {
  it('should export HTML table', () => {
    const result = exportHTML(testData, testColumns);
    expect(result.content).toContain('<table');
    expect(result.content).toContain('الاسم');
    expect(result.content).toContain('محمد');
    expect(result.content).toContain('3 سجل');
  });

  it('should include styling by default', () => {
    const result = exportHTML(testData, testColumns);
    expect(result.content).toContain('<style>');
  });

  it('should skip styling when disabled', () => {
    const result = exportHTML(testData, testColumns, { styling: false });
    expect(result.content).not.toContain('<style>');
  });
});

describe('DataExport — Markdown', () => {
  it('should export markdown table', () => {
    const result = exportMarkdown(testData, testColumns);
    expect(result.content).toContain('|');
    expect(result.content).toContain('---');
    expect(result.content).toContain('الاسم');
    expect(result.content).toContain('محمد');
  });

  it('should escape pipe characters', () => {
    const data = [{ text: 'a|b' }];
    const cols = [{ key: 'text', label: 'T' }];
    const result = exportMarkdown(data, cols);
    expect(result.content).toContain('a\\|b');
  });
});

describe('DataExport — Import CSV', () => {
  it('should import CSV with header', () => {
    const csv = 'name,age,city\nمحمد,30,الرياض\nفاطمة,25,جدة';
    const data = importCSV(csv);
    expect(data.length).toBe(2);
    expect(data[0].name).toBe('محمد');
    expect(data[0].age).toBe('30');
  });

  it('should import CSV without header', () => {
    const csv = 'محمد,30,الرياض\nفاطمة,25,جدة';
    const data = importCSV(csv, { hasHeader: false });
    expect(data.length).toBe(2);
    expect(data[0][0]).toBe('محمد');
  });

  it('should handle quoted values', () => {
    const csv = 'name,text\n"محمد","hello, world"';
    const data = importCSV(csv);
    expect(data[0].name).toBe('محمد');
    expect(data[0].text).toBe('hello, world');
  });

  it('should handle BOM', () => {
    const csv = '\uFEFFname,age\nمحمد,30';
    const data = importCSV(csv);
    expect(data[0].name).toBe('محمد');
  });

  it('should round-trip export then import', () => {
    const exported = exportCSV(testData, testColumns, { bom: false });
    const imported = importCSV(exported.content);
    expect(imported.length).toBe(3);
    expect(imported[0].الاسم).toBe('محمد');
  });
});

describe('DataExport — Import JSON', () => {
  it('should import valid JSON', () => {
    const json = JSON.stringify(testData);
    const data = importJSON(json);
    expect(data.length).toBe(3);
    expect(data[0].name).toBe('محمد');
  });

  it('should throw on invalid JSON', () => {
    let error = null;
    try { importJSON('{ invalid'); }
    catch (e) { error = e; }
    expect(error).not.toBe(null);
    expect(error.message).toContain('JSON غير صالح');
  });
});

describe('DataExport — copyToClipboard', () => {
  it('should be a function', () => {
    expect(typeof copyToClipboard).toBe('function');
  });
});
