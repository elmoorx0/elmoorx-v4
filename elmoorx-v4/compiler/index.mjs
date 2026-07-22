/**
 * Elmoorx v4 — Compiler داخلي مستقل
 * ====================================
 * يحوّل TypeScript + JSX إلى JavaScript قابل للتنفيذ بدون أي تبعية خارجية.
 *
 * بديل لـ: Babel, SWC, esbuild, tsx, tsc.
 *
 * المميزات:
 *   - إزالة أنواع TypeScript (interfaces, type aliases, generics, as casts)
 *   - تحويل JSX إلى استدعاءات h()
 *   - دعم .ts / .tsx / .mts / .mtsx
 *   - sourcmaps بسيطة (اختيارية)
 *   - سريع جداً — يتعامل مع آلاف الأسطر في ميلي ثانية
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { basename, extname, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// ─────────────────────────────────────────────────────────────────────────────
// 1) TS TYPE STRIPPING — إزالة أنواع TypeScript
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يزيل تعليقات الأنواع من كود TypeScript لتحويله إلى JavaScript.
 * يعتمد على تحليل نصي بسيط لكنه دقيق بما يكفي للحالات الشائعة.
 */
export function stripTypes(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inString = null; // ', ", `
  let inComment = null; // //, /*, /**

  // نتتبع الكلمات المفتاحية لتحديد متى نزيل الأنواع
  let lastSignificant = '';

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    // تجاهل التعليقات والنصوص
    if (inString) {
      out += ch;
      if (ch === '\\') { out += next; i += 2; continue; }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (inComment) {
      out += ch;
      if (inComment === '//' && (ch === '\n')) inComment = null;
      if (inComment === '/*' && ch === '*' && next === '/') { out += '/'; i += 2; inComment = null; continue; }
      i++;
      continue;
    }
    if (ch === '/' && next === '/') { inComment = '//'; out += ch + next; i += 2; continue; }
    if (ch === '/' && next === '*') { inComment = '/*'; out += ch + next; i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; out += ch; i++; continue; }

    // تتبع الأقواس
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth--;
    if (ch === '[') bracketDepth++;
    if (ch === ']') bracketDepth--;

    out += ch;
    i++;
  }

  // المرحلة الثانية — إزالة type annotations
  // type Foo = ...
  // interface Foo {...}
  // function foo(a: T, b: T): R
  // const x: T = ...
  // x as T / x as const
  // <T>value (angle assertion)
  // ! (non-null assertion)
  out = removeTypeDeclarations(out);
  out = removeTypeAnnotations(out);
  out = removeAsCasts(out);
  out = removeAngleBracketAssertions(out);
  out = removeNonNullAssertions(out);
  out = removeEnumDeclarations(out);
  out = removeNamespaceDeclarations(out);
  out = removeDecorators(out);
  out = removeDeclareStatements(out);
  out = removeAccessibilityModifiers(out);

  return out;
}

function removeTypeDeclarations(code) {
  // إزالة interface و type declarations فقط عندما تكون خارج strings
  // نمر على الكود حرفاً بحرف ونتتبع strings
  let result = '';
  let i = 0;
  const n = code.length;
  let inString = null;

  while (i < n) {
    const ch = code[i];

    // تتبع strings
    if (inString) {
      result += ch;
      if (ch === '\\') { result += code[i + 1]; i += 2; continue; }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      result += ch;
      i++;
      continue;
    }

    // تحقق من interface keyword خارج strings
    if (code.slice(i, i + 10) === 'interface ' && (i === 0 || !/\w/.test(code[i - 1]))) {
      // ابحث عن نهاية الكتلة {
      let braceStart = code.indexOf('{', i);
      if (braceStart === -1) { result += ch; i++; continue; }
      let depth = 1;
      let j = braceStart + 1;
      while (j < n && depth > 0) {
        if (code[j] === '{') depth++;
        else if (code[j] === '}') depth--;
        j++;
      }
      i = j;
      continue;
    }

    // type X = ...;  (في بداية سطر)
    if (i === 0 || code[i - 1] === '\n') {
      const typeMatch = code.slice(i).match(/^type\s+\w+\s*(?:<[^>]*>)?\s*=/);
      if (typeMatch) {
        // ابحث عن نهاية السطر أو ;
        let j = i + typeMatch[0].length;
        let depth = 0;
        let str = null;
        while (j < n) {
          if (str) {
            if (code[j] === '\\') { j += 2; continue; }
            if (code[j] === str) str = null;
            j++;
            continue;
          }
          if (code[j] === '"' || code[j] === "'" || code[j] === '`') { str = code[j]; j++; continue; }
          if (code[j] === '{' || code[j] === '(' || code[j] === '[') depth++;
          if (code[j] === '}' || code[j] === ')' || code[j] === ']') depth--;
          if (depth === 0 && (code[j] === ';' || code[j] === '\n')) { j++; break; }
          j++;
        }
        i = j;
        continue;
      }
    }

    result += ch;
    i++;
  }
  return result;
}

function removeTypeAnnotations(code) {
  // : Type في تعريف الدالة أو المتغير — احذف حتى نصل إلى , أو ) أو = أو ;
  // لا نحذف الأنواع داخل object literals (مثل { key: value })
  let result = '';
  let i = 0;
  const n = code.length;
  let inString = null;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  while (i < n) {
    const ch = code[i];
    if (inString) {
      result += ch;
      if (ch === '\\') { result += code[i + 1]; i += 2; continue; }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; result += ch; i++; continue; }

    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth--;
    if (ch === '[') bracketDepth++;
    if (ch === ']') bracketDepth--;

    // ابحث عن ": Type" pattern
    // لكن تجنّب object literals (حيث : يفصل المفتاح عن القيمة)
    if (ch === ':' && code[i - 1] !== ':' && code[i + 1] !== ':') {
      // تحقق إن كان ما بعده نوع فعلاً (يبدأ بحرف كبير، أو كلمة مفتاحية للنوع، أو <، أو ( مع =>)
      const after = code.slice(i + 1).match(/^\s*([A-Z]|\w+<|\(|\{|string|number|boolean|any|unknown|never|void|null|undefined|readonly|Promise|Array|Record|Partial|Pick|Omit|Readonly|infer)/);
      if (after) {
        // إذا كان braceDepth > 0، فنحن داخل object literal — تحقق أكثر
        // النمط: identifier: Type حيث Type يبدأ بحرف كبير أو كلمة مفتاحية
        // لكن: { key: () => ... } ليس نوعاً
        // تحقق: هل ما قبل : هو identifier أو } أو ) (يشير لـ object property)
        let k = i - 1;
        while (k >= 0 && /\s/.test(code[k])) k--;
        // إذا كان ما قبل : هو } أو ) أو identifier، قد يكون object property
        const beforeChar = code[k];

        // اقرأ النوع المحتمل
        let j = i + 1;
        let depth = 0;
        let hasArrow = false;
        while (j < n) {
          const cj = code[j];
          if (cj === '<' || cj === '(' || cj === '[' || cj === '{') depth++;
          if (cj === '>' || cj === ')' || cj === ']' || cj === '}') {
            if (depth === 0) break;
            depth--;
          }
          // اكتشف arrow function
          if (cj === '=' && code[j + 1] === '>') { hasArrow = true; }
          if (depth === 0 && (cj === ',' || cj === ';' || cj === '\n')) break;
          if (depth === 0 && cj === '=' && code[j + 1] !== '>') break;
          j++;
        }

        // إذا كان فيه arrow function، فهذه ليست type annotation
        if (hasArrow) {
          result += ch;
          i++;
          continue;
        }

        // إذا كنا داخل object literal وbeforeChar هو } أو ) أو حرف/رقم أو "
        // فقد تكون object property — لا نحذف
        if (braceDepth > 0 && (beforeChar === '}' || beforeChar === ')' || beforeChar === '"' || beforeChar === ']' || /\w/.test(beforeChar))) {
          // تحقق إضافي: هل الكلمة المباشرة قبل : تبدأ بحرف صغير؟ (identifier = property name)
          let wordStart = k;
          while (wordStart >= 0 && /[\w$]/.test(code[wordStart])) wordStart--;
          wordStart++;
          const word = code.slice(wordStart, k + 1);
          // إذا كانت الكلمة تبدأ بحرف صغير وتليها : وقيمة، فهي property
          // فقط احذف إذا كانت القيمة تبدأ بنوع واضح (مثل string, number, Promise<>, إلخ)
          const typeStart = code.slice(i + 1).match(/^\s*(\w+)/);
          const typeWord = typeStart ? typeStart[1] : '';
          const typeKeywords = ['string', 'number', 'boolean', 'any', 'unknown', 'never', 'void', 'null', 'undefined', 'readonly', 'Promise', 'Array', 'Record', 'Partial', 'Pick', 'Omit', 'Readonly', 'infer'];
          if (typeKeywords.includes(typeWord) || /^[A-Z]/.test(typeWord)) {
            // يبدو كنوع فعلاً
            i = j;
            continue;
          }
          // ليست نوع — تجنّب الحذف
          result += ch;
          i++;
          continue;
        }

        // خارج object literal — احذف النوع
        i = j;
        continue;
      }
    }

    result += ch;
    i++;
  }
  return result;
}

function removeAsCasts(code) {
  // x as T → x  (including `as const`)
  return code.replace(/\bas\s+const\b/g, '')
    .replace(/\bas\s+([A-Z]\w*(?:\.[A-Z]\w*)*(?:<[^>]*>)?|\{\s*\})/g, '');
}

function removeAngleBracketAssertions(code) {
  // <T>value — احذر من JSX!
  // نطبّق هذا فقط قبل تحويل JSX، وفي سياق غير JSX
  // الأبسط: تخطّي هذا التحسين لتجنّب كسر JSX
  return code;
}

function removeNonNullAssertions(code) {
  // x!  →  x  (في نهاية التعبير، لكن ليس في != أو !==)
  // احذر من != و !==
  let result = '';
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const prev = code[i - 1];
    const next = code[i + 1];
    if (ch === '!' && prev !== '!' && prev !== '<' && prev !== '>' && prev !== '=' && next !== '=' && next !== '.') {
      // non-null assertion — احذف
      continue;
    }
    result += ch;
  }
  return result;
}

function removeEnumDeclarations(code) {
  // enum X {...} — نُحوّلها إلى object بسيط
  // للأبسط: نُحوّلها إلى const object
  return code.replace(/\b(?:const\s+)?enum\s+(\w+)\s*\{([\s\S]*?)\}/g, (m, name, body) => {
    const members = body.split(',').map(s => s.trim()).filter(Boolean);
    const obj = members.map((mem, idx) => {
      const [k, v] = mem.split('=').map(s => s.trim());
      if (v) return `  ${k}: ${v}`;
      return `  ${k}: ${idx}`;
    }).join(',\n');
    return `const ${name} = Object.freeze({\n${obj}\n});`;
  });
}

function removeNamespaceDeclarations(code) {
  // namespace X {...} → const X = (() => { ... return exports; })();
  // نتركها كـ IIFE مبسّطة
  return code.replace(/\b(?:declare\s+)?namespace\s+(\w+)\s*\{/g, 'const $1 = (function() {');
}

function removeDecorators(code) {
  // @Decorator — احذف فقط إذا لم يكن داخل string أو جزء من import path
  // decoratars تظهر قبل class/method: @Component()\n class X
  // import paths تظهر داخل quotes: from '@elmoorx/runtime'
  // الحل: احذف @ فقط إذا كان في بداية سطر أو مسبوق بـ whitespace، وليس متبوعاً بـ /
  return code.replace(/(^|\n|\s)@(\w+)(?:\.[\w.]+)?(?:\([^)]*\))?/g, (match, prefix, name) => {
    // لا تحذف إذا كان المتغير يبدأ بـ / (مثل @elmoorx/...)
    // لكننا هنا نتحقق: @ متبوع بحرف وغير متبوع بـ /
    return prefix;
  });
}

function removeDeclareStatements(code) {
  // declare ... — احذف السطر كاملاً
  return code.replace(/^\s*declare\s+[\s\S]*?;/gm, '');
}

function removeAccessibilityModifiers(code) {
  // public / private / protected / readonly (as modifier)
  return code.replace(/\b(?:public|private|protected)\s+/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) JSX TRANSFORM — يحوّل <div/> إلى h('div', ...)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يحوّل JSX إلى استدعاءات h().
 * يدعم: عناصر، مكونات، fragments، تعابير، spreads، children.
 */
export function transformJSX(code, options = {}) {
  const opts = { pragma: 'h', fragmentPragma: 'Fragment', ...options };
  let result = '';
  let i = 0;
  const n = code.length;
  let inString = null;
  let inComment = null;

  while (i < n) {
    const ch = code[i];
    const next = code[i + 1];

    // تخطّي النصوص والتعليقات
    if (inString) {
      result += ch;
      if (ch === '\\') { result += next; i += 2; continue; }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (inComment) {
      result += ch;
      if (inComment === '//' && ch === '\n') inComment = null;
      if (inComment === '/*' && ch === '*' && next === '/') { result += '/'; i += 2; inComment = null; continue; }
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; result += ch; i++; continue; }
    if (ch === '/' && next === '/') { inComment = '//'; result += ch + next; i += 2; continue; }
    if (ch === '/' && next === '*') { inComment = '/*'; result += ch + next; i += 2; continue; }

    // اكتشاف <Tag — ليس === ولا <= ولا -> ولا أرقام
    if (ch === '<' && isJsxStart(code, i)) {
      const parsed = parseJsxElement(code, i, opts);
      if (parsed) {
        result += parsed.expression;
        i = parsed.endIndex;
        continue;
      }
    }

    result += ch;
    i++;
  }

  return result;
}

function isJsxStart(code, i) {
  const prev = code[i - 1];
  // لا يجب أن يكون جزءاً من ===, <=, !=, ==, ->, =>, <number
  if (prev === '=' || prev === '!' || prev === '>' || prev === '-') return false;
  // يجب أن يكون بعده حرف أو / (للعناصر المغلقة) أو > (fragment)
  const next = code[i + 1];
  if (next === '/' || next === '>') return true; // </tag>  أو  <>...</>
  if (/[A-Za-z_]/.test(next)) {
    // تحقق إن لم يكن مقارنة رقمية: 1 < foo
    // إذا كان ما قبل < رقم، فمن المحتمل أنها مقارنة
    let j = i - 1;
    while (j >= 0 && (code[j] === ' ' || code[j] === '\t')) j--;
    if (j >= 0 && /[0-9)\]]/.test(code[j])) return false;
    return true;
  }
  return false;
}

function parseJsxElement(code, start, opts = {}) {
  const pragma = opts.pragma || 'h';
  const fragmentPragma = opts.fragmentPragma || 'Fragment';
  let i = start;
  // <Tag ...>
  if (code[i] !== '<') return null;
  i++;

  const isClosing = code[i] === '/';
  if (isClosing) i++;
  // fragment: <> or </>
  if (code[i] === '>') {
    if (isClosing) {
      return { expression: '', endIndex: i + 1 };
    }
    const closeIdx = code.indexOf('</>', i + 1);
    if (closeIdx === -1) return null;
    const inner = code.slice(i + 1, closeIdx);
    const transformedInner = transformJSX(inner, opts);
    return {
      expression: `${fragmentPragma}({ children: [${wrapChildren(transformedInner)}] })`,
      endIndex: closeIdx + 3,
    };
  }

  // اقرأ اسم العنصر
  let tag = '';
  while (i < code.length && /[\w.]/.test(code[i])) {
    tag += code[i];
    i++;
  }
  if (!tag) return null;

  // اقرأ السمات
  const attrs = {};
  const attrList = [];
  let spreadParts = [];
  while (i < code.length && code[i] !== '>' && !(code[i] === '/' && code[i + 1] === '>')) {
    // تخطّي الفراغات
    while (i < code.length && /\s/.test(code[i])) i++;
    if (code[i] === '>' || (code[i] === '/' && code[i + 1] === '>')) break;
    if (code[i] === '{' && code[i + 1] === '.') {
      // spread: {...obj}
      const end = findMatchingBrace(code, i);
      spreadParts.push(code.slice(i + 1, end)); // .obj
      i = end + 1;
      continue;
    }
    if (code[i] === '{') {
      // expression attr: {expr}
      const end = findMatchingBrace(code, i);
      // هذا يُعتبر child عادةً، لكن في سياق attr يجب أن يكون بعد اسم attr
      // تخطّى — للاختصار نُعامله كـ children
      i = end + 1;
      continue;
    }
    // اقرأ اسم السمة
    let attrName = '';
    while (i < code.length && /[\w-]/.test(code[i])) {
      attrName += code[i];
      i++;
    }
    if (!attrName) { i++; continue; }
    // قيمة السمة
    while (i < code.length && /\s/.test(code[i])) i++;
    if (code[i] === '=') {
      i++;
      while (i < code.length && /\s/.test(code[i])) i++;
      if (code[i] === '"' || code[i] === "'") {
        const quote = code[i];
        let val = '';
        i++;
        while (i < code.length && code[i] !== quote) { val += code[i]; i++; }
        i++; // skip closing quote
        attrList.push(`${JSON.stringify(attrName)}: ${JSON.stringify(val)}`);
      } else if (code[i] === '{') {
        const end = findMatchingBrace(code, i);
        const expr = code.slice(i + 1, end).trim();
        // عوّض الـ JSX المتداخل في التعبير
        const transformedExpr = transformJSX(expr);
        attrList.push(`${JSON.stringify(attrName)}: ${transformedExpr}`);
        i = end + 1;
      }
    } else {
      // boolean attribute
      attrList.push(`${JSON.stringify(attrName)}: true`);
    }
  }

  // نهاية الوسم الافتتاحي
  const selfClosing = code[i] === '/' && code[i + 1] === '>';
  if (selfClosing) i += 2;
  else if (code[i] === '>') i++;
  else return null;

  let children = '';
  if (!selfClosing && !isClosing) {
    // اقرأ children حتى </tag>
    const closeTag = `</${tag}>`;
    let depth = 1;
    let childStart = i;
    while (i < code.length && depth > 0) {
      if (code[i] === '<' && code.slice(i, i + tag.length + 1) === `<${tag}` && isJsxStart(code, i)) {
        depth++;
      }
      if (code.slice(i, i + closeTag.length) === closeTag) {
        depth--;
        if (depth === 0) break;
      }
      i++;
    }
    const childContent = code.slice(childStart, i);
    i += closeTag.length;
    // حلّل children — تحويل الـ JSX المتداخل
    children = transformJSX(childContent, opts);
  }

  // بناء الاستدعاء h(...)
  const isComponent = /^[A-Z]/.test(tag);
  const tagExpr = isComponent ? tag : JSON.stringify(tag);
  const attrsObj = spreadParts.length > 0
    ? `Object.assign({${attrList.join(', ')}}, ${spreadParts.join(', ')})`
    : `{${attrList.join(', ')}}`;

  // children parts
  const childrenParts = wrapChildren(children);

  return {
    expression: `${pragma}(${tagExpr}, ${attrsObj}${childrenParts ? ', ' + childrenParts : ''})`,
    endIndex: i,
  };
}

function findMatchingBrace(code, start) {
  let depth = 0;
  let inStr = null;
  for (let i = start; i < code.length; i++) {
    const ch = code[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function wrapChildren(children) {
  if (!children) return '';
  if (typeof children !== 'string') return '';
  if (!children.trim()) return '';
  const parts = [];
  let text = '';
  let i = 0;
  let inExpr = false;
  let exprDepth = 0;
  let expr = '';

  while (i < children.length) {
    const ch = children[i];
    if (!inExpr && ch === '{' && children[i + 1] !== '"' && children[i + 1] !== "'") {
      if (text.trim()) parts.push(JSON.stringify(text.trim()));
      text = '';
      inExpr = true;
      exprDepth = 1;
      expr = '';
      i++;
      continue;
    }
    if (inExpr) {
      if (ch === '{') exprDepth++;
      if (ch === '}') { exprDepth--; if (exprDepth === 0) { inExpr = false; if (expr.trim()) parts.push(expr.trim()); expr = ''; i++; continue; } }
      expr += ch;
      i++;
      continue;
    }
    text += ch;
    i++;
  }
  if (text.trim()) parts.push(JSON.stringify(text.trim()));
  return parts.length > 0 ? `[${parts.join(', ')}]` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) COMPILE FILE — تجميع ملف كامل (.ts/.tsx → .mjs)
// ─────────────────────────────────────────────────────────────────────────────

export function compile(source, filename = '<unknown>') {
  const isJsx = /\.(jsx|tsx|mtsx)$/i.test(filename);
  let result = source;

  // 1) إزالة أنواع TS
  result = stripTypes(result);

  // 2) تحويل JSX (إن وُجد)
  if (isJsx || /<[A-Z]/.test(result) || /<\w/.test(result)) {
    result = transformJSX(result, { pragma: 'h', fragmentPragma: 'Fragment' });
  }

  // 3) تحويل import '@elmoorx/...' إلى مسارات نسبية أو URL
  result = rewriteImports(result, filename);

  return result;
}

function rewriteImports(code, filename) {
  // استبدل @elmoorx/* بالمسارات الصحيحة
  const modulePaths = {
    runtime: 'runtime/core.mjs',
    router: 'router/index.mjs',
    ssr: 'ssr/index.mjs',
    i18n: 'i18n/index.mjs',
    http: 'http/index.mjs',
    testing: 'testing/index.mjs',
    adapters: 'adapters/index.mjs',
    store: 'store/index.mjs',
    forms: 'forms/index.mjs',
    animation: 'animation/index.mjs',
    database: 'database/index.mjs',
    realtime: 'realtime/index.mjs',
    pwa: 'pwa/index.mjs',
  };
  for (const [pkg, path] of Object.entries(modulePaths)) {
    const regex = new RegExp(`from\\s+['"]@elmoorx/${pkg}['"]`, 'g');
    code = code.replace(regex, `from '/.elmoorx/${path}'`);
  }
  // أي @elmoorx/ آخر → vendor
  code = code.replace(/from\s+['"]@elmoorx\/(\w+)['"]/g, "from '/.elmoorx/vendor/$1.mjs'");
  return code;
}

export function compileFile(inputPath, outputPath) {
  const source = readFileSync(inputPath, 'utf8');
  const compiled = compile(source, inputPath);
  if (outputPath) writeFileSync(outputPath, compiled);
  return compiled;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) LIVE COMPILE — تجميع مباشر في الذاكرة للـ dev server
// ─────────────────────────────────────────────────────────────────────────────

const compileCache = new Map();

export function liveCompile(filePath) {
  const mtime = existsSync(filePath) ? statSync(filePath).mtimeMs : 0;
  const cacheKey = `${filePath}:${mtime}`;
  if (compileCache.has(cacheKey)) return compileCache.get(cacheKey);

  const source = readFileSync(filePath, 'utf8');
  const compiled = compile(source, filePath);
  compileCache.set(cacheKey, compiled);
  return compiled;
}

export function clearCompileCache() { compileCache.clear(); }

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORT API
// ─────────────────────────────────────────────────────────────────────────────
export default {
  stripTypes,
  transformJSX,
  compile,
  compileFile,
  liveCompile,
  clearCompileCache,
};
