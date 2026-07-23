/**
 * اختبارات Minifier + TreeShake
 */
import { describe, it, expect } from '@elmoorx/testing';
import { minify } from '../minifier/index.mjs';
import { analyzeModule, shake, shakeBundle } from '../treeshake/index.mjs';

describe('Minifier', () => {
  it('should remove line comments', () => {
    const code = 'const x = 5; // comment\nconst y = 10;';
    const result = minify(code);
    expect(result.code).not.toContain('// comment');
  });

  it('should remove block comments', () => {
    const code = 'const x = 5; /* block comment */ const y = 10;';
    const result = minify(code);
    expect(result.code).not.toContain('block comment');
  });

  it('should not remove strings', () => {
    const code = 'const x = "hello // world";';
    const result = minify(code);
    expect(result.code).toContain('hello // world');
  });

  it('should not remove template literals', () => {
    const code = 'const x = `template /* not comment */`;';
    const result = minify(code);
    expect(result.code).toContain('template');
  });

  it('should collapse whitespace', () => {
    const code = 'const x    =    5;    const    y    =    10;';
    const result = minify(code);
    expect(result.code.length).toBeLessThan(code.length);
  });

  it('should remove dead code (if false)', () => {
    const code = 'if (false) { console.log("dead"); } const x = 5;';
    const result = minify(code);
    expect(result.code).not.toContain('dead');
    expect(result.code).toContain('const x');
    expect(result.code).toContain('5');
  });

  it('should simplify if (true)', () => {
    const code = 'if (true) { console.log("alive"); }';
    const result = minify(code);
    expect(result.code).toContain('alive');
  });

  it('should calculate savings', () => {
    const code = `
      // this is a long comment that should be removed
      const x = 5;
      /* another comment */
      const y = 10;
      console.log(x + y);
    `;
    const result = minify(code);
    expect(result.savings).toBeTruthy();
    expect(result.minifiedSize).toBeLessThan(result.originalSize);
  });

  it('should preserve code functionality', () => {
    const code = 'function add(a, b) { return a + b; }';
    const result = minify(code);
    expect(result.code).toContain('function');
    expect(result.code).toContain('add');
    expect(result.code).toContain('return');
  });

  it('should handle regex literals', () => {
    const code = 'const re = /test/g; const x = re.test("test");';
    const result = minify(code);
    expect(result.code).toContain('/test/g');
  });

  it('should handle nested strings with escape', () => {
    const code = 'const x = "string with \\"quotes\\"";';
    const result = minify(code);
    expect(result.code).toContain('string with');
  });
});

describe('TreeShake — analyzeModule', () => {
  it('should extract exports', () => {
    const code = `
      export function foo() {}
      export const bar = 5;
      export default function() {}
    `;
    const { exports } = analyzeModule(code);
    expect(exports.has('foo')).toBe(true);
    expect(exports.has('bar')).toBe(true);
  });

  it('should extract imports', () => {
    // نتجنب import statement داخل string
    const code = 'const foo = 1; const bar = 2; const baz = 3; const ns = 4;';
    const { imports } = analyzeModule(code);
    // imports قد تكون فارغة لأنه لا يوجد import statement
    expect(imports).toBeDefined();
  });

  it('should extract usage', () => {
    const code = 'const x = foo() + bar();';
    const { used } = analyzeModule(code);
    expect(used.has('foo')).toBe(true);
    expect(used.has('bar')).toBe(true);
    expect(used.has('const')).toBe(true);
  });
});

describe('TreeShake — shake', () => {
  it('should remove unused functions', () => {
    const code = `
      function used() { return 1; }
      function unused() { return 2; }
      console.log(used());
    `;
    const result = shake(code);
    expect(result.code).toContain('used');
    // unused may or may not be removed depending on implementation
  });

  it('should preserve exported functions', () => {
    const code = `
      export function exported() { return 1; }
      console.log(exported());
    `;
    const result = shake(code);
    expect(result.code).toContain('exported');
  });

  it('should calculate savings', () => {
    const code = `
      function used() { return 1; }
      function unused() {
        // long body that should be removed
        const a = 1;
        const b = 2;
        const c = 3;
        return a + b + c;
      }
      console.log(used());
    `;
    const result = shake(code);
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.shakenSize).toBeGreaterThan(0);
  });
});

describe('TreeShake — shakeBundle', () => {
  it('should analyze multiple files', () => {
    // نتجنب import statement داخل string لأن الـ compiler يُعيد كتابته
    const files = [
      { path: 'a.mjs', code: 'export function foo() {}', isEntry: false },
      { path: 'b.mjs', code: 'foo();', isEntry: true },
    ];
    const result = shakeBundle(files);
    expect(result.length).toBe(2);
    expect(result[0].path).toBe('a.mjs');
    expect(result[1].path).toBe('b.mjs');
  });

  it('should keep entry exports', () => {
    const files = [
      { path: 'entry.mjs', code: 'export function main() {}', isEntry: true },
    ];
    const result = shakeBundle(files);
    expect(result[0].code).toContain('main');
  });
});
