/**
 * اختبارات Utils + Markdown + Charts
 */
import { describe, it, expect } from '@elmoorx/testing';
import { date, string, number, array, object, color, async_, url, random } from '../utils/index.mjs';
import { parseMarkdown, renderMarkdown, parseInline } from '../markdown/index.mjs';
import { BarChart, LineChart, PieChart, chartColors } from '../charts/index.mjs';
import { h, renderToString } from '@elmoorx/runtime';

describe('Utils — date', () => {
  it('should format date', () => {
    const d = new Date('2026-07-22');
    expect(date.format(d, 'YYYY-MM-DD')).toBe('2026-07-22');
  });

  it('should format with Arabic months', () => {
    const d = new Date('2026-07-22');
    const formatted = date.format(d, 'MMMM');
    expect(formatted).toBe('يوليو');
  });

  it('should calculate diff', () => {
    const d1 = new Date('2026-07-22');
    const d2 = new Date('2026-07-25');
    expect(date.diff(d1, d2, 'days')).toBe(3);
  });

  it('should add days', () => {
    const d = new Date('2026-07-22');
    const newDate = date.add(d, 5, 'days');
    expect(newDate.getDate()).toBe(27);
  });

  it('should check isToday', () => {
    expect(date.isToday(new Date())).toBe(true);
    expect(date.isToday(new Date('2020-01-01'))).toBe(false);
  });

  it('should check isFuture', () => {
    expect(date.isFuture(new Date(Date.now() + 86400000))).toBe(true);
    expect(date.isFuture(new Date(Date.now() - 86400000))).toBe(false);
  });
});

describe('Utils — string', () => {
  it('should slugify', () => {
    expect(string.slugify('Hello World')).toBe('hello-world');
    expect(string.slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });

  it('should camelCase', () => {
    expect(string.camelCase('hello world')).toBe('helloWorld');
    expect(string.camelCase('hello-world')).toBe('helloWorld');
    expect(string.camelCase('hello_world')).toBe('helloWorld');
  });

  it('should pascalCase', () => {
    expect(string.pascalCase('hello world')).toBe('HelloWorld');
  });

  it('should kebabCase', () => {
    expect(string.kebabCase('HelloWorld')).toBe('hello-world');
  });

  it('should capitalize', () => {
    expect(string.capitalize('hello')).toBe('Hello');
  });

  it('should truncate', () => {
    expect(string.truncate('Hello World', 8)).toBe('Hello...');
    expect(string.truncate('Hello', 10)).toBe('Hello');
  });

  it('should template', () => {
    const result = string.template('Hello {name}!', { name: 'محمد' });
    expect(result).toBe('Hello محمد!');
  });

  it('should wordCount', () => {
    expect(string.wordCount('Hello World')).toBe(2);
    expect(string.wordCount('')).toBe(0);
  });

  it('should reverse', () => {
    expect(string.reverse('hello')).toBe('olleh');
  });
});

describe('Utils — number', () => {
  it('should format number', () => {
    expect(number.format(1234.56)).toContain('1,234');
  });

  it('should currency', () => {
    const result = number.currency(99.99, 'USD');
    expect(result).toContain('99');
  });

  it('should percentage', () => {
    expect(number.percentage(25, 100)).toBe('25.0%');
    expect(number.percentage(0, 0)).toBe('0%');
  });

  it('should ordinal', () => {
    expect(number.ordinal(1)).toBe('1st');
    expect(number.ordinal(2)).toBe('2nd');
    expect(number.ordinal(3)).toBe('3rd');
    expect(number.ordinal(4)).toBe('4th');
  });

  it('should clamp', () => {
    expect(number.clamp(5, 0, 10)).toBe(5);
    expect(number.clamp(-5, 0, 10)).toBe(0);
    expect(number.clamp(15, 0, 10)).toBe(10);
  });

  it('should bytes', () => {
    expect(number.bytes(0)).toBe('0 B');
    expect(number.bytes(1024)).toBe('1 KB');
    expect(number.bytes(1048576)).toBe('1 MB');
  });

  it('should round', () => {
    expect(number.round(3.14159, 2)).toBe(3.14);
    expect(number.round(3.5)).toBe(4);
  });
});

describe('Utils — array', () => {
  it('should chunk', () => {
    expect(array.chunk([1,2,3,4,5], 2)).toEqual([[1,2],[3,4],[5]]);
  });

  it('should unique', () => {
    expect(array.unique([1,2,2,3,3,3])).toEqual([1,2,3]);
  });

  it('should unique by key', () => {
    const arr = [{id:1}, {id:2}, {id:1}];
    expect(array.unique(arr, 'id')).toEqual([{id:1}, {id:2}]);
  });

  it('should group', () => {
    const arr = [{type:'a', v:1}, {type:'b', v:2}, {type:'a', v:3}];
    const grouped = array.group(arr, 'type');
    expect(grouped.a.length).toBe(2);
    expect(grouped.b.length).toBe(1);
  });

  it('should sortBy', () => {
    const arr = [{n:3}, {n:1}, {n:2}];
    expect(array.sortBy(arr, 'n')[0].n).toBe(1);
    expect(array.sortBy(arr, 'n', 'desc')[0].n).toBe(3);
  });

  it('should range', () => {
    expect(array.range(5)).toEqual([0,1,2,3,4]);
    expect(array.range(2, 5)).toEqual([2,3,4]);
  });

  it('should flatten', () => {
    expect(array.flatten([1,[2,[3]]])).toEqual([1,2,3]);
  });
});

describe('Utils — object', () => {
  it('should deepClone', () => {
    const obj = { a: { b: 1 } };
    const clone = object.deepClone(obj);
    clone.a.b = 2;
    expect(obj.a.b).toBe(1);
  });

  it('should deepMerge', () => {
    const a = { a: 1, b: { c: 2 } };
    const b = { b: { d: 3 } };
    const merged = object.deepMerge({}, a, b);
    expect(merged.a).toBe(1);
    expect(merged.b.c).toBe(2);
    expect(merged.b.d).toBe(3);
  });

  it('should get path', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(object.get(obj, 'a.b.c')).toBe(42);
    expect(object.get(obj, 'a.x', 'default')).toBe('default');
  });

  it('should set path', () => {
    const obj = {};
    object.set(obj, 'a.b.c', 42);
    expect(obj.a.b.c).toBe(42);
  });

  it('should deepEqual', () => {
    expect(object.deepEqual({a:1}, {a:1})).toBe(true);
    expect(object.deepEqual({a:1}, {a:2})).toBe(false);
    expect(object.deepEqual([1,2], [1,2])).toBe(true);
  });

  it('should omit', () => {
    const obj = { a:1, b:2, c:3 };
    expect(object.omit(obj, ['b'])).toEqual({a:1, c:3});
  });

  it('should pick', () => {
    const obj = { a:1, b:2, c:3 };
    expect(object.pick(obj, ['a', 'c'])).toEqual({a:1, c:3});
  });
});

describe('Utils — color', () => {
  it('should hexToRgb', () => {
    expect(color.hexToRgb('#0ea5e9')).toEqual({ r: 14, g: 165, b: 233 });
  });

  it('should rgbToHex', () => {
    expect(color.rgbToHex(14, 165, 233)).toBe('#0ea5e9');
  });

  it('should shade lighten', () => {
    const light = color.shade('#000000', 50);
    expect(light).not.toBe('#000000');
  });

  it('should random', () => {
    const c = color.random();
    expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('Utils — async', () => {
  it('should debounce', async () => {
    let count = 0;
    const fn = async_.debounce(() => { count++; }, 50);
    fn(); fn(); fn();
    await async_.sleep(150);
    expect(count).toBe(1);
  });

  it('should sleep', async () => {
    const start = Date.now();
    await async_.sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('should retry', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    };
    const result = await async_.retry(fn, 5, 10);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should timeout', async () => {
    const slow = new Promise(r => setTimeout(r, 1000));
    let error = null;
    try { await async_.timeout(slow, 50); }
    catch (e) { error = e; }
    expect(error).not.toBe(null);
    expect(error.message).toBe('Timeout');
  });
});

describe('Utils — url', () => {
  it('should parseQuery', () => {
    expect(url.parseQuery('?a=1&b=2')).toEqual({ a: '1', b: '2' });
  });

  it('should buildQuery', () => {
    expect(url.buildQuery({ a: 1, b: 2 })).toContain('a=1');
    expect(url.buildQuery({ a: 1, b: 2 })).toContain('b=2');
  });

  it('should buildUrl', () => {
    expect(url.buildUrl('/api', { a: 1 })).toBe('/api?a=1');
    expect(url.buildUrl('/api?x=0', { a: 1 })).toBe('/api?x=0&a=1');
  });

  it('should isValid', () => {
    expect(url.isValid('https://example.com')).toBe(true);
    expect(url.isValid('not-url')).toBe(false);
  });
});

describe('Utils — random', () => {
  it('should id', () => {
    const id = random.id(10);
    expect(id.length).toBe(10);
  });

  it('should uuid', () => {
    const u = random.uuid();
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('should int', () => {
    const n = random.int(1, 10);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(10);
  });

  it('should pick', () => {
    const arr = [1, 2, 3];
    const picked = random.pick(arr);
    expect(arr).toContain(picked);
  });

  it('should boolean', () => {
    expect(typeof random.boolean()).toBe('boolean');
  });
});

describe('Markdown — parseMarkdown', () => {
  it('should parse heading', () => {
    const blocks = parseMarkdown('# Hello');
    expect(blocks[0].type).toBe('heading');
    expect(blocks[0].level).toBe(1);
    expect(blocks[0].text).toBe('Hello');
  });

  it('should parse h1-h6', () => {
    for (let i = 1; i <= 6; i++) {
      const blocks = parseMarkdown('#'.repeat(i) + ' Title');
      expect(blocks[0].level).toBe(i);
    }
  });

  it('should parse code block', () => {
    const md = [
      '```js',
      'console.log("hi");',
      '```',
    ].join('\n');
    const blocks = parseMarkdown(md);
    expect(blocks[0].type).toBe('code');
    expect(blocks[0].lang).toBe('js');
    expect(blocks[0].code).toContain('console.log');
  });

  it('should parse blockquote', () => {
    const blocks = parseMarkdown('> Hello quote');
    expect(blocks[0].type).toBe('blockquote');
  });

  it('should parse unordered list', () => {
    const md = '- item 1\n- item 2';
    const blocks = parseMarkdown(md);
    expect(blocks[0].type).toBe('ul');
    expect(blocks[0].items.length).toBe(2);
  });

  it('should parse ordered list', () => {
    const md = '1. first\n2. second';
    const blocks = parseMarkdown(md);
    expect(blocks[0].type).toBe('ol');
    expect(blocks[0].items.length).toBe(2);
  });

  it('should parse paragraph', () => {
    const blocks = parseMarkdown('Hello World');
    expect(blocks[0].type).toBe('paragraph');
    expect(blocks[0].text).toBe('Hello World');
  });

  it('should parse task list', () => {
    const md = '- [x] done\n- [ ] todo';
    const blocks = parseMarkdown(md);
    expect(blocks[0].type).toBe('ul');
    expect(blocks[0].items[0].checked).toBe(true);
    expect(blocks[0].items[1].checked).toBe(false);
  });

  it('should parse hr', () => {
    const blocks = parseMarkdown('---');
    expect(blocks[0].type).toBe('hr');
  });
});

describe('Markdown — parseInline', () => {
  it('should parse bold', () => {
    const html = parseInline('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('should parse italic', () => {
    const html = parseInline('*italic*');
    expect(html).toContain('<em>italic</em>');
  });

  it('should parse strikethrough', () => {
    const html = parseInline('~~deleted~~');
    expect(html).toContain('<del>deleted</del>');
  });

  it('should parse inline code', () => {
    const html = parseInline('`code`');
    expect(html).toContain('<code');
    expect(html).toContain('code');
  });

  it('should parse link', () => {
    const html = parseInline('[text](http://example.com)');
    expect(html).toContain('<a');
    expect(html).toContain('href="http://example.com"');
    expect(html).toContain('text');
  });

  it('should escape HTML', () => {
    const html = parseInline('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('Markdown — renderMarkdown', () => {
  it('should render full document', () => {
    const md = '# Title\n\nParagraph text.\n\n- item 1\n- item 2';
    const html = renderMarkdown(md);
    expect(html).toContain('<h1');
    expect(html).toContain('Title');
    expect(html).toContain('<ul');
    expect(html).toContain('item 1');
  });
});

describe('Charts', () => {
  it('should export chart colors', () => {
    expect(chartColors.blue).toBe('#0ea5e9');
    expect(chartColors.red).toBe('#ef4444');
  });

  it('should render BarChart', () => {
    const html = renderToString(h(BarChart, { data: [{label: 'A', value: 10}] }));
    expect(html).toContain('<svg');
    expect(html).toContain('<rect');
  });

  it('should render LineChart', () => {
    const html = renderToString(h(LineChart, { data: [{x:0,y:1},{x:1,y:2}] }));
    expect(html).toContain('<svg');
    expect(html).toContain('<path');
  });

  it('should render PieChart', () => {
    const html = renderToString(h(PieChart, { data: [{label: 'A', value: 60}, {label: 'B', value: 40}] }));
    expect(html).toContain('<svg');
    expect(html).toContain('<path');
  });
});
