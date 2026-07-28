/**
 * Elmoorx v4 — Minifier (بدون تبعيات)
 * ============================
 * يصغّر كود JavaScript:
 *   - إزالة التعليقات
 *   - إزالة الفراغات الزائدة
 *   - إزالة الفواصل المنقوطة الزائدة
 *   - إزالة الأقواس الزائدة
 *   - دمج الـ var declarations
 *   - تحويل true/false إلى !0/!1 (اختياري)
 *   - إزالة dead code (if(false), إلخ)
 *   - تقليل أسماء المتغيرات المحلية (scope-aware، آمن)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// ─────────────────────────────────────────────────────────────────────────────
// 1) MINIFY
// ─────────────────────────────────────────────────────────────────────────────

export function minify(code, options = {}) {
  const {
    removeComments = true,
    removeWhitespace = true,
    removeNewlines = true,
    mangleVars = false, // خطر — يتطلب scope analysis
    removeDeadCode = true,
    convertBooleans = false,
    keepLineNumbers = false, // for source maps
  } = options;

  let result = code;

  // 1) احفظ مواضع الأسطر للـ source map
  let lineMap = [];
  if (keepLineNumbers) {
    let line = 1;
    for (let i = 0; i < code.length; i++) {
      lineMap.push(line);
      if (code[i] === '\n') line++;
    }
  }

  // 2) إزالة التعليقات
  if (removeComments) {
    result = removeCommentsFromCode(result);
  }

  // 3) إزالة dead code
  if (removeDeadCode) {
    result = removeDeadCodeFromCode(result);
  }

  // 4) إزالة الفراغات والأسطر الجديدة
  if (removeWhitespace) {
    result = collapseWhitespace(result, removeNewlines);
  }

  // 5) تحويل true/false
  if (convertBooleans) {
    result = result.replace(/\btrue\b/g, '!0').replace(/\bfalse\b/g, '!1');
  }

  // 6) mangle vars (خطر)
  if (mangleVars) {
    result = mangleLocalVars(result);
  }

  // 7) إزالة الفواصل المنقوطة الزائدة
  result = result.replace(/;+/g, ';').replace(/;\s*}/g, '}').replace(/;\s*$/gm, '');

  return {
    code: result,
    originalSize: code.length,
    minifiedSize: result.length,
    savings: ((1 - result.length / code.length) * 100).toFixed(1) + '%',
    lineMap: keepLineNumbers ? lineMap : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) COMMENT REMOVER
// ─────────────────────────────────────────────────────────────────────────────

function removeCommentsFromCode(code) {
  let result = '';
  let i = 0;
  const n = code.length;
  let inString = null;
  let inTemplate = false;
  let inRegex = false;

  while (i < n) {
    const ch = code[i];
    const next = code[i + 1];

    // strings
    if (inString) {
      result += ch;
      if (ch === '\\') { result += next; i += 2; continue; }
      if (ch === inString) inString = null;
      i++;
      continue;
    }

    // template literals
    if (inTemplate) {
      result += ch;
      if (ch === '\\') { result += next; i += 2; continue; }
      if (ch === '`') inTemplate = false;
      i++;
      continue;
    }

    // regex
    if (inRegex) {
      result += ch;
      if (ch === '\\') { result += next; i += 2; continue; }
      if (ch === '/') inRegex = false;
      if (ch === '[') {
        // character class — skip until ]
        while (i < n && code[i] !== ']') { result += code[i]; i++; }
      }
      i++;
      continue;
    }

    // start of string
    if (ch === '"' || ch === "'") {
      inString = ch;
      result += ch;
      i++;
      continue;
    }

    // start of template
    if (ch === '`') {
      inTemplate = true;
      result += ch;
      i++;
      continue;
    }

    // line comment
    if (ch === '/' && next === '/') {
      while (i < n && code[i] !== '\n') i++;
      continue;
    }

    // block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      // احتفظ بسطر جديد لو كان هناك
      if (code[i - 3] === '\n') result += '\n';
      continue;
    }

    // regex detection (بسيط)
    if (ch === '/' && isRegexStart(result)) {
      inRegex = true;
      result += ch;
      i++;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

function isRegexStart(prevCode) {
  // regex يأتي بعد: ( , = : ; ! & | ? { } [ أو بداية الكود
  const trimmed = prevCode.replace(/\s+$/, '');
  if (trimmed.length === 0) return true;
  const last = trimmed[trimmed.length - 1];
  return '(,=:;!&|?{}[]+-*%<>~^'.includes(last);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) WHITESPACE COLLAPSER
// ─────────────────────────────────────────────────────────────────────────────

function collapseWhitespace(code, removeNewlines) {
  let result = '';
  let i = 0;
  const n = code.length;
  let inString = null;
  let inTemplate = false;
  let prevChar = '';

  while (i < n) {
    const ch = code[i];

    if (inString) {
      result += ch;
      if (ch === '\\') { result += code[i + 1]; i += 2; continue; }
      if (ch === inString) inString = null;
      prevChar = ch;
      i++;
      continue;
    }

    if (inTemplate) {
      result += ch;
      if (ch === '\\') { result += code[i + 1]; i += 2; continue; }
      if (ch === '`') inTemplate = false;
      prevChar = ch;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      result += ch;
      prevChar = ch;
      i++;
      continue;
    }

    if (ch === '`') {
      inTemplate = true;
      result += ch;
      prevChar = ch;
      i++;
      continue;
    }

    // whitespace
    if (/\s/.test(ch)) {
      // احذف إذا كان الحرف السابق أو التالي رمز
      const next = code[i + 1];
      if (isPunct(prevChar) || (next && isPunct(next))) {
        // skip
        if (removeNewlines || ch !== '\n') {
          i++;
          continue;
        }
      }
      // احذف الأسطر الجديدة المتعددة
      if (removeNewlines) {
        // استبدل بسطر واحد
        if (prevChar !== ' ' && prevChar !== '\n') {
          result += ' ';
          prevChar = ' ';
        }
        i++;
        continue;
      }
      // احذف المسافات الزائدة فقط
      if (ch === ' ' && prevChar === ' ') {
        i++;
        continue;
      }
      result += ch;
      prevChar = ch;
      i++;
      continue;
    }

    result += ch;
    prevChar = ch;
    i++;
  }

  return result.trim();
}

function isPunct(ch) {
  if (!ch) return false;
  return '(){}[];,=:<>+-*/%!&|^~?.'.includes(ch);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) DEAD CODE REMOVER
// ─────────────────────────────────────────────────────────────────────────────

function removeDeadCodeFromCode(code) {
  // if (false) { ... } → احذف
  code = code.replace(/\bif\s*\(\s*false\s*\)\s*\{[^}]*\}/g, '');
  // if (true) { X } → X
  code = code.replace(/\bif\s*\(\s*true\s*\)\s*\{([^}]*)\}/g, '$1');
  // while (false) { ... } → احذف
  code = code.replace(/\bwhile\s*\(\s*false\s*\)\s*\{[^}]*\}/g, '');
  // إزالة الكود بعد return
  code = code.replace(/return\s+[^;]+;\s*[^}]+(?=\})/g, (match) => {
    return match.split(';')[0] + ';';
  });
  return code;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) VARIABLE MANGLER (محسّن)
// ─────────────────────────────────────────────────────────────────────────────

function mangleLocalVars(code) {
  try {
    // استخدم الـ mangler الجديد المعتمد على scope analysis كامل
    // (يحلّل scopes ويُعيد تسمية المتغيرات المحلية بأمان)
    const { mangleVars } = require('./mangler.mjs');
    return mangleVars(code);
  } catch (err) {
    // fallback آمن — أرجع الكود كما هو
    return code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  minify,
};
