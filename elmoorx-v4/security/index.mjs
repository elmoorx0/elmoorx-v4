/**
 * Elmoorx v4 — Security Scanner (بدون تبعيات)
 * ===========================================
 * يفحص الكود بحثاً عن:
 *   - XSS vulnerabilities
 *   - SQL injection
 *   - eval / new Function usage
 *   - dangerouslySetInnerHTML
 *   - hardcoded credentials
 *   - insecure HTTP
 *   - prototype pollution
 *   - regex DoS (ReDoS)
 *   - path traversal
 *   - command injection
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) SECURITY RULES
// ─────────────────────────────────────────────────────────────────────────────

const RULES = [
  {
    id: 'no-eval',
    severity: 'critical',
    title: 'استخدام eval()',
    description: 'eval() يسمح بتنفيذ كود تعسفي — تجنبه تماماً',
    pattern: /\beval\s*\(/g,
    check: (code) => {
      const matches = code.match(/\beval\s*\(/g);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-new-function',
    severity: 'critical',
    title: 'استخدام new Function()',
    description: 'new Function() يسمح بتنفيذ كود تعسفي',
    pattern: /new\s+Function\s*\(/g,
    check: (code) => {
      const matches = code.match(/new\s+Function\s*\(/g);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-inner-html',
    severity: 'high',
    title: 'استخدام innerHTML',
    description: 'innerHTML قد يؤدي إلى XSS — استخدم textContent أو sanitize',
    check: (code) => {
      const matches = code.match(/\.innerHTML\s*=/g);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-document-write',
    severity: 'high',
    title: 'استخدام document.write()',
    description: 'document.write() خطر وقد يؤدي إلى XSS',
    check: (code) => {
      const matches = code.match(/document\.write\s*\(/g);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-set-timeout-string',
    severity: 'high',
    title: 'setTimeout مع string',
    description: 'setTimeout("code") يعمل كـ eval',
    check: (code) => {
      const matches = code.match(/setTimeout\s*\(\s*["'`]/g);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-hardcoded-secrets',
    severity: 'critical',
    title: 'أسرار مشفرة في الكود',
    description: 'لا تخزّن API keys أو passwords في الكود',
    check: (code) => {
      const patterns = [
        /(?:api[_-]?key|apikey)\s*[:=]\s*["'`][^"'`]{20,}["'`]/gi,
        /(?:secret|password|passwd|pwd)\s*[:=]\s*["'`][^"'`]{8,}["'`]/gi,
        /(?:token|auth)\s*[:=]\s*["'`][^"'`]{20,}["'`]/gi,
        /AKIA[0-9A-Z]{16}/g, // AWS keys
        /sk_[a-zA-Z0-9]{24,}/g, // Stripe keys
      ];
      let count = 0;
      for (const p of patterns) {
        const m = code.match(p);
        if (m) count += m.length;
      }
      return count;
    },
  },
  {
    id: 'no-http-urls',
    severity: 'medium',
    title: 'روابط HTTP غير آمنة',
    description: 'استخدم HTTPS بدلاً من HTTP',
    check: (code) => {
      // تجاهل localhost و comments
      const matches = code.match(/http:\/\/(?!localhost|127\.0\.0\.1|\s|['"`])/g);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-prototype-pollution',
    severity: 'high',
    title: 'Prototype pollution',
    description: 'تعديل __proto__ أو prototype قد يؤدي إلى ثغرات',
    check: (code) => {
      const patterns = [
        /__proto__/g,
        /\.prototype\.\w+\s*=/g,
      ];
      let count = 0;
      for (const p of patterns) {
        const m = code.match(p);
        if (m) count += m.length;
      }
      return count;
    },
  },
  {
    id: 'no-sql-injection',
    severity: 'critical',
    title: 'SQL injection محتمل',
    description: 'لا تدمج مدخلات المستخدم في استعلامات SQL',
    check: (code) => {
      const patterns = [
        /(?:query|execute|sql)\s*\(\s*["'`].*\$\{/gi,
        /(?:query|execute|sql)\s*\(\s*['"`].*\+/gi,
      ];
      let count = 0;
      for (const p of patterns) {
        const m = code.match(p);
        if (m) count += m.length;
      }
      return count;
    },
  },
  {
    id: 'no-command-injection',
    severity: 'critical',
    title: 'Command injection محتمل',
    description: 'لا تدمج مدخلات المستخدم في أوامر shell',
    check: (code) => {
      const patterns = [
        /(?:exec|spawn|execSync)\s*\(\s*['"`].*\$\{/gi,
        /(?:exec|spawn|execSync)\s*\(\s*['"`].*\+/gi,
      ];
      let count = 0;
      for (const p of patterns) {
        const m = code.match(p);
        if (m) count += m.length;
      }
      return count;
    },
  },
  {
    id: 'no-path-traversal',
    severity: 'high',
    title: 'Path traversal محتمل',
    description: 'تحقق من مدخلات المستخدم قبل استخدامها في مسارات الملفات',
    check: (code) => {
      const patterns = [
        /(?:readFile|writeFile|readFileSync|writeFileSync|createReadStream|createWriteStream)\s*\(\s*.*\$\{/gi,
        /(?:open|unlink|mkdir|rmdir)\s*\(\s*.*\$\{/gi,
      ];
      let count = 0;
      for (const p of patterns) {
        const m = code.match(p);
        if (m) count += m.length;
      }
      return count;
    },
  },
  {
    id: 'no-regex-dos',
    severity: 'medium',
    title: 'Regex DoS محتمل',
    description: 'regex مع تكرار متداخل قد يؤدي إلى DoS',
    check: (code) => {
      // ابحث عن regex مع (a+)+ أو (a*)*
      const matches = code.match(/\([^)]*[+*][^)]*\)[+*]/g);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-cors-wildcard',
    severity: 'medium',
    title: 'CORS wildcard',
    description: 'تجنب Access-Control-Allow-Origin: *',
    check: (code) => {
      const matches = code.match(/Access-Control-Allow-Origin['"\s:]*\*/gi);
      return matches ? matches.length : 0;
    },
  },
  {
    id: 'no-insecure-random',
    severity: 'medium',
    title: 'Math.random للأمان',
    description: 'استخدم crypto.getRandomValues بدلاً من Math.random للأمان',
    check: (code) => {
      // ابحث عن Math.random في سياق أمني
      const matches = code.match(/Math\.random\s*\(\s*\)/g);
      return matches ? matches.length : 0;
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2) SCAN FILE
// ─────────────────────────────────────────────────────────────────────────────

export function scanFile(filePath) {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();
  const supportedExts = ['.js', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.html', '.vue'];

  if (!supportedExts.includes(ext)) return null;

  const issues = [];
  for (const rule of RULES) {
    const count = rule.check(content);
    if (count > 0) {
      issues.push({
        rule: rule.id,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        count,
        file: filePath,
      });
    }
  }

  return {
    file: filePath,
    issues,
    score: calculateScore(issues),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) SCAN DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

export function scanDir(dir, options = {}) {
  const {
    exclude = ['node_modules', '.elmoorx', 'dist', '.git', '.elmoorx-test-cache'],
    extensions = ['.js', '.mjs', '.ts', '.tsx', '.jsx', '.json', '.html'],
  } = options;

  const results = [];

  const walk = (d) => {
    if (!existsSync(d)) return;
    const entries = readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          const result = scanFile(fullPath);
          if (result && result.issues.length > 0) results.push(result);
        }
      }
    }
  };

  walk(dir);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) SCORE CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

function calculateScore(issues) {
  const weights = {
    critical: 10,
    high: 5,
    medium: 2,
    low: 1,
  };
  let score = 100;
  for (const issue of issues) {
    score -= (weights[issue.severity] || 1) * issue.count;
  }
  return Math.max(0, score);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) REPORT
// ─────────────────────────────────────────────────────────────────────────────

export function generateReport(results) {
  let totalIssues = 0;
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let filesScanned = 0;
  let filesWithIssues = 0;

  for (const result of results) {
    filesScanned++;
    if (result.issues.length > 0) filesWithIssues++;
    for (const issue of result.issues) {
      totalIssues += issue.count;
      switch (issue.severity) {
        case 'critical': criticalCount += issue.count; break;
        case 'high': highCount += issue.count; break;
        case 'medium': mediumCount += issue.count; break;
        case 'low': lowCount += issue.count; break;
      }
    }
  }

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : 100;

  return {
    filesScanned,
    filesWithIssues,
    totalIssues,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    avgScore,
    grade: avgScore >= 90 ? 'A' : avgScore >= 80 ? 'B' : avgScore >= 70 ? 'C' : avgScore >= 60 ? 'D' : 'F',
  };
}

export function formatReport(results) {
  const report = generateReport(results);
  let output = '';

  output += `\n  ✦ Elmoorx v4 — Security Report\n`;
  output += `  ${'═'.repeat(50)}\n`;
  output += `  │ الملفات المفحوصة:    ${report.filesScanned}\n`;
  output += `  │ ملفات بمشاكل:        ${report.filesWithIssues}\n`;
  output += `  │ إجمالي المشاكل:      ${report.totalIssues}\n`;
  output += `  │ ├─ Critical:         ${report.criticalCount}\n`;
  output += `  │ ├─ High:             ${report.highCount}\n`;
  output += `  │ ├─ Medium:           ${report.mediumCount}\n`;
  output += `  │ └─ Low:              ${report.lowCount}\n`;
  output += `  │ النتيجة:             ${report.avgScore}/100 (${report.grade})\n`;
  output += `  ${'═'.repeat(50)}\n`;

  if (results.length > 0) {
    output += `\n  المشاكل:\n`;
    output += `  ${'─'.repeat(50)}\n`;
    for (const result of results) {
      for (const issue of result.issues) {
        const icon = issue.severity === 'critical' ? '🔴' :
                     issue.severity === 'high' ? '🟠' :
                     issue.severity === 'medium' ? '🟡' : '🔵';
        output += `  ${icon} [${issue.severity.toUpperCase()}] ${issue.title}\n`;
        output += `     ${issue.description}\n`;
        output += `     الملف: ${result.file} (${issue.count}x)\n\n`;
      }
    }
  } else {
    output += `\n  ✓ لا توجد مشاكل أمنية!\n`;
  }

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export { RULES };

export default {
  RULES,
  scanFile,
  scanDir,
  generateReport,
  formatReport,
};
