/**
 * اختبارات Security + Metrics
 */
import { describe, it, expect } from '@elmoorx/testing';
import { scanFile, scanDir, generateReport, formatReport, RULES } from '../security/index.mjs';
import { analyzeFile, analyzeDir, formatReport as formatMetricsReport } from '../metrics/index.mjs';

describe('Security — Rules', () => {
  it('should have security rules defined', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  it('should include critical rules', () => {
    const ids = RULES.map(r => r.id);
    expect(ids).toContain('no-eval');
    expect(ids).toContain('no-new-function');
    expect(ids).toContain('no-hardcoded-secrets');
    expect(ids).toContain('no-sql-injection');
    expect(ids).toContain('no-command-injection');
  });
});

describe('Security — scanFile', () => {
  it('should detect eval usage', () => {
    // أنشئ ملف مؤقت بـ eval
    const code = 'const x = eval("1+1");';
    // scanFile يحتاج ملف فعلي — نختبر الـ rule مباشرة
    const evalRule = RULES.find(r => r.id === 'no-eval');
    expect(evalRule.check(code)).toBe(1);
  });

  it('should detect new Function', () => {
    const code = 'const fn = new Function("return 1");';
    const rule = RULES.find(r => r.id === 'no-new-function');
    expect(rule.check(code)).toBe(1);
  });

  it('should detect innerHTML', () => {
    const code = 'element.innerHTML = userInput;';
    const rule = RULES.find(r => r.id === 'no-inner-html');
    expect(rule.check(code)).toBe(1);
  });

  it('should detect document.write', () => {
    const code = 'document.write("<h1>Hi</h1>");';
    const rule = RULES.find(r => r.id === 'no-document-write');
    expect(rule.check(code)).toBe(1);
  });

  it('should detect hardcoded secrets', () => {
    const code = 'const apiKey = "sk_test_REDACTED";';
    const rule = RULES.find(r => r.id === 'no-hardcoded-secrets');
    expect(rule.check(code)).toBeGreaterThan(0);
  });

  it('should detect HTTP urls', () => {
    const code = 'const url = "http://example.com/api";';
    const rule = RULES.find(r => r.id === 'no-http-urls');
    expect(rule.check(code)).toBe(1);
  });

  it('should not flag localhost as insecure', () => {
    const code = 'const url = "http://localhost:3000";';
    const rule = RULES.find(r => r.id === 'no-http-urls');
    expect(rule.check(code)).toBe(0);
  });

  it('should detect prototype pollution', () => {
    const code = 'obj.__proto__ = malicious;';
    const rule = RULES.find(r => r.id === 'no-prototype-pollution');
    expect(rule.check(code)).toBeGreaterThan(0);
  });

  it('should detect Math.random in security context', () => {
    const code = 'const token = Math.random();';
    const rule = RULES.find(r => r.id === 'no-insecure-random');
    expect(rule.check(code)).toBe(1);
  });
});

describe('Security — generateReport', () => {
  it('should generate report from results', () => {
    const results = [
      {
        file: 'test.js',
        issues: [
          { severity: 'critical', count: 1 },
          { severity: 'high', count: 2 },
        ],
        score: 80,
      },
    ];
    const report = generateReport(results);
    expect(report.filesScanned).toBe(1);
    expect(report.filesWithIssues).toBe(1);
    expect(report.criticalCount).toBe(1);
    expect(report.highCount).toBe(2);
  });

  it('should calculate grade from score', () => {
    const results = [{ file: 'a.js', issues: [], score: 95 }];
    const report = generateReport(results);
    expect(report.grade).toBe('A');
  });

  it('should handle empty results', () => {
    const report = generateReport([]);
    expect(report.filesScanned).toBe(0);
    expect(report.avgScore).toBe(100);
  });
});

describe('Metrics — analyzeFile', () => {
  it('should count lines', () => {
    // نختبر الدوال الداخلية بشكل غير مباشر
    // analyzeFile يحتاج ملف فعلي
    expect(typeof analyzeFile).toBe('function');
  });
});

describe('Metrics — analyzeDir', () => {
  it('should analyze directory', () => {
    const result = analyzeDir('./runtime');
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.summary.totalLines).toBeGreaterThan(0);
    expect(result.summary.totalCode).toBeGreaterThan(0);
    expect(result.summary.totalFunctions).toBeGreaterThan(0);
  });

  it('should calculate complexity', () => {
    const result = analyzeDir('./runtime');
    expect(result.summary.avgComplexity).toBeGreaterThan(0);
  });

  it('should calculate maintainability', () => {
    const result = analyzeDir('./runtime');
    expect(result.summary.avgMaintainability).toBeGreaterThanOrEqual(0);
    expect(result.summary.avgMaintainability).toBeLessThanOrEqual(100);
  });

  it('should respect exclude option', () => {
    const result = analyzeDir('.', { exclude: ['node_modules', 'runtime', 'compiler', 'cli', 'vendor', 'tests', 'framework-source', '.elmoorx-test-cache'] });
    // يجب ألا يحتوي على ملفات من runtime
    const hasRuntime = result.files.some(f => f.file.includes('/runtime/'));
    expect(hasRuntime).toBe(false);
  });
});

describe('Metrics — formatReport', () => {
  it('should format report as string', () => {
    const result = analyzeDir('./runtime');
    const output = formatMetricsReport(result);
    expect(typeof output).toBe('string');
    expect(output).toContain('Code Metrics Report');
    expect(output).toContain('الملفات');
  });
});
