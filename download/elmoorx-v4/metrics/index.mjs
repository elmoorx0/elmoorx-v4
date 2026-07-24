/**
 * Elmoorx v4 — Code Metrics (بدون تبعيات)
 * =========================================
 * يحلل تعقيد الكود وجودته:
 *   - Cyclomatic complexity
 *   - Lines of code (LOC)
 *   - Comment density
 *   - Function count
 *   - Max nesting depth
 *   - Halstead metrics
 *   - Maintainability index
 *   - Code smells
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ANALYZE FILE
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeFile(filePath) {
  if (!existsSync(filePath)) return null;

  const content = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();

  return {
    file: filePath,
    lines: countLines(content),
    code: countCodeLines(content),
    comments: countCommentLines(content),
    blanks: countBlankLines(content),
    functions: countFunctions(content),
    classes: countClasses(content),
    imports: countImports(content),
    exports: countExports(content),
    complexity: calculateComplexity(content),
    maxNesting: calculateMaxNesting(content),
    commentDensity: calculateCommentDensity(content),
    maintainability: 0, // calculated later
    smells: detectSmells(content),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) LINE COUNTERS
// ─────────────────────────────────────────────────────────────────────────────

function countLines(content) {
  return content.split('\n').length;
}

function countCodeLines(content) {
  let count = 0;
  let inBlockComment = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('//')) continue;
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true;
      continue;
    }
    if (trimmed === '') continue;
    count++;
  }
  return count;
}

function countCommentLines(content) {
  let count = 0;
  let inBlockComment = false;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (inBlockComment) {
      count++;
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('//')) count++;
    if (trimmed.startsWith('/*')) {
      count++;
      if (!trimmed.includes('*/')) inBlockComment = true;
    }
  }
  return count;
}

function countBlankLines(content) {
  return content.split('\n').filter(l => l.trim() === '').length;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) STRUCTURE COUNTERS
// ─────────────────────────────────────────────────────────────────────────────

function countFunctions(content) {
  const patterns = [
    /\bfunction\s+\w+/g,
    /\b(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/g,
    /\b(?:async\s+)?\w+\s*\([^)]*\)\s*{/g,
  ];
  let count = 0;
  for (const p of patterns) {
    const m = content.match(p);
    if (m) count += m.length;
  }
  return count;
}

function countClasses(content) {
  const m = content.match(/\bclass\s+\w+/g);
  return m ? m.length : 0;
}

function countImports(content) {
  const m = content.match(/^\s*import\s+/gm);
  return m ? m.length : 0;
}

function countExports(content) {
  const m = content.match(/^\s*export\s+/gm);
  return m ? m.length : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) COMPLEXITY
// ─────────────────────────────────────────────────────────────────────────────

function calculateComplexity(content) {
  // Cyclomatic complexity = 1 + عدد الـ decision points
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^:]+:/g, // ternary
    /&&/g,
    /\|\|/g,
    /\?.*:/g, // optional chaining + ternary
  ];
  let complexity = 1;
  for (const p of patterns) {
    const m = content.match(p);
    if (m) complexity += m.length;
  }
  return complexity;
}

function calculateMaxNesting(content) {
  let maxDepth = 0;
  let currentDepth = 0;
  let inString = null;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }

    if (ch === '{') {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    }
    if (ch === '}') currentDepth = Math.max(0, currentDepth - 1);
  }
  return maxDepth;
}

function calculateCommentDensity(content) {
  const total = countLines(content);
  const comments = countCommentLines(content);
  return total > 0 ? Math.round((comments / total) * 100) : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) CODE SMELLS
// ─────────────────────────────────────────────────────────────────────────────

function detectSmells(content) {
  const smells = [];

  // long function
  const functions = content.split(/(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s+)?(?:function|\())/);
  for (let i = 1; i < functions.length; i++) {
    const body = functions[i];
    const lines = body.split('\n').length;
    if (lines > 50) {
      smells.push({ type: 'long-function', severity: 'medium', description: `دالة طويلة (${lines} سطر)` });
    }
  }

  // too many params
  const paramMatches = content.matchAll(/(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s+)?)\s*\(([^)]+)\)/g);
  for (const m of paramMatches) {
    const params = m[1].split(',').filter(p => p.trim());
    if (params.length > 5) {
      smells.push({ type: 'too-many-params', severity: 'low', description: `${params.length} معاملات في دالة` });
    }
  }

  // any type
  const anyCount = (content.match(/:\s*any\b/g) || []).length;
  if (anyCount > 3) {
    smells.push({ type: 'any-type', severity: 'medium', description: `${anyCount} استخدام لـ any` });
  }

  // console.log
  const consoleCount = (content.match(/console\.log\s*\(/g) || []).length;
  if (consoleCount > 5) {
    smells.push({ type: 'console-log', severity: 'low', description: `${consoleCount} console.log` });
  }

  // TODO/FIXME
  const todoCount = (content.match(/(?:TODO|FIXME|HACK|XXX)\b/g) || []).length;
  if (todoCount > 0) {
    smells.push({ type: 'todo', severity: 'low', description: `${todoCount} TODO/FIXME` });
  }

  // magic numbers
  const magicNumbers = (content.match(/(?<!['"]\w*)(?<!\w)\d{3,}(?!\w*['"])/g) || []).length;
  if (magicNumbers > 5) {
    smells.push({ type: 'magic-numbers', severity: 'low', description: `${magicNumbers} أرقام سحرية` });
  }

  return smells;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) MAINTAINABILITY INDEX
// ─────────────────────────────────────────────────────────────────────────────

function calculateMaintainability(metrics) {
  // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
  // مبسّط: نستخدم LOC + complexity + comment density
  const loc = metrics.code || 1;
  const cc = metrics.complexity || 1;
  const cd = metrics.commentDensity || 0;

  let mi = 171 - 5.2 * Math.log(loc) - 0.23 * cc - 16.2 * Math.log(loc);
  mi += cd * 0.1; // bonus for comments
  mi = Math.max(0, Math.min(100, mi));

  return Math.round(mi);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) ANALYZE DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeDir(dir, options = {}) {
  const {
    exclude = ['node_modules', '.elmoorx', 'dist', '.git', '.elmoorx-test-cache'],
    extensions = ['.js', '.mjs', '.ts', '.tsx', '.jsx'],
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
          const result = analyzeFile(fullPath);
          if (result) {
            result.maintainability = calculateMaintainability(result);
            results.push(result);
          }
        }
      }
    }
  };

  walk(dir);

  // aggregate
  const summary = {
    files: results.length,
    totalLines: results.reduce((s, r) => s + r.lines, 0),
    totalCode: results.reduce((s, r) => s + r.code, 0),
    totalComments: results.reduce((s, r) => s + r.comments, 0),
    totalFunctions: results.reduce((s, r) => s + r.functions, 0),
    totalClasses: results.reduce((s, r) => s + r.classes, 0),
    avgComplexity: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.complexity, 0) / results.length) : 0,
    avgMaintainability: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.maintainability, 0) / results.length) : 0,
    avgCommentDensity: results.length > 0 ? Math.round(results.reduce((s, r) => s + r.commentDensity, 0) / results.length) : 0,
    totalSmells: results.reduce((s, r) => s + r.smells.length, 0),
  };

  return { files: results, summary };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) FORMAT REPORT
// ─────────────────────────────────────────────────────────────────────────────

export function formatReport(result) {
  const { summary } = result;
  let output = '';

  output += `\n  ✦ Elmoorx v4 — Code Metrics Report\n`;
  output += `  ${'═'.repeat(50)}\n`;
  output += `  │ الملفات:              ${summary.files}\n`;
  output += `  │ إجمالي السطور:        ${summary.totalLines}\n`;
  output += `  │ سطور الكود:           ${summary.totalCode}\n`;
  output += `  │ سطور التعليقات:       ${summary.totalComments}\n`;
  output += `  │ الدوال:               ${summary.totalFunctions}\n`;
  output += `  │ الأصناف:              ${summary.totalClasses}\n`;
  output += `  │ ├─ متوسط التعقيد:     ${summary.avgComplexity}\n`;
  output += `  │ ├─ متوسط القابلية:    ${summary.avgMaintainability}/100\n`;
  output += `  │ └─ كثافة التعليقات:   ${summary.avgCommentDensity}%\n`;
  output += `  │ Code smells:          ${summary.totalSmells}\n`;
  output += `  ${'═'.repeat(50)}\n`;

  // أعلى الملفات تعقيداً
  const sorted = [...result.files].sort((a, b) => b.complexity - a.complexity).slice(0, 5);
  if (sorted.length > 0) {
    output += `\n  أعلى الملفات تعقيداً:\n`;
    output += `  ${'─'.repeat(50)}\n`;
    for (const f of sorted) {
      output += `  ${String(f.complexity).padStart(5)}  ${f.file}\n`;
    }
  }

  // Code smells
  const allSmells = result.files.flatMap(f => f.smells.map(s => ({ ...s, file: f.file })));
  if (allSmells.length > 0) {
    output += `\n  Code Smells:\n`;
    output += `  ${'─'.repeat(50)}\n`;
    for (const s of allSmells.slice(0, 10)) {
      output += `  • ${s.description} — ${s.file}\n`;
    }
    if (allSmells.length > 10) {
      output += `  ... و ${allSmells.length - 10} أخرى\n`;
    }
  }

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  analyzeFile,
  analyzeDir,
  formatReport,
};
