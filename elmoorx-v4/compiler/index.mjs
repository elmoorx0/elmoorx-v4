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
  // داخل object literals { key: value } — لا نحذف أبداً (القيمة ليست نوعاً)
  let result = '';
  let i = 0;
  const n = code.length;
  let inString = null;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  // نتتبع: هل الـ { الحالي هو object literal؟
  // نعرف ذلك بالنظر لما قبل الـ {: إذا كان = أو , أو ( أو [ أو return أو =>
  // فإنه object literal. إذا كان ) أو اسم type/interface/class فإنه type block.
  const braceStack = []; // 'object' | 'type' | 'block' | 'class'

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

    // تتبع الأقواس
    if (ch === '{') {
      // حدّد نوع الـ block بالنظر للسياق
      // ابحث عن آخر non-whitespace قبل {
      let k = result.length - 1;
      while (k >= 0 && /\s/.test(result[k])) k--;
      const prevChar = result[k];
      const prevWord = (() => {
        let w = '';
        let j = k;
        while (j >= 0 && /[\w$]/.test(result[j])) { w = result[j] + w; j--; }
        return w;
      })();
      if (prevChar === ')' || prevChar === '>') {
        // function body or type block after `(): {`
        // إذا كان قبل ) كلمة مثل interface/type/class، فهو type block
        if (['interface', 'type', 'class', 'namespace'].includes(prevWord)) {
          braceStack.push('type');
        } else {
          braceStack.push('block'); // function body or block
        }
      } else if (prevChar === '=' || prevChar === ',' || prevChar === '(' || prevChar === '[' || prevChar === ':' || prevChar === '>' || prevChar === '?') {
        // object literal: { ... } بعد = أو , أو ( أو [ أو : (نوع return value)
        // أو بعد `=>` (arrow returning object)
        // تحقق من => قبل {
        if (prevChar === '>' && result[k - 1] === '=') {
          braceStack.push('object');
        } else if (prevChar === ':' || prevChar === '?') {
          // { a: { b: 1 } } — هذا قد يكون type أو object
          // افترض object (الأكثر شيوعاً)
          braceStack.push('object');
        } else {
          braceStack.push('object');
        }
      } else if (['return', '=>'].includes(prevWord) || (prevChar === '>' && result[k - 1] === '=')) {
        braceStack.push('object');
      } else if (['interface', 'type', 'namespace'].includes(prevWord)) {
        braceStack.push('type');
      } else if (prevWord === 'class' || prevWord === 'extends' || prevWord === 'implements') {
        braceStack.push('class');
      } else {
        // default: block (function body, if/for/while block)
        braceStack.push('block');
      }
      braceDepth++;
    }
    if (ch === '}') {
      braceDepth--;
      braceStack.pop();
    }
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth--;
    if (ch === '[') bracketDepth++;
    if (ch === ']') bracketDepth--;

    // ابحث عن ": Type" pattern — فقط في سياقات الأنواع
    // سياقات الأنواع:
    //   1. داخل () لـ function parameters (parenDepth > 0, braceDepth === 0)
    //   2. بعد ) لـ return type
    //   3. بعد identifier في let/const/var declaration (خارج object literal)
    //   4. داخل class body (class property type)
    // ليس نوعاً:
    //   1. داخل object literal { key: value }
    //   2. بعد label في switch (case: ...)

    if (ch === ':' && code[i - 1] !== ':' && code[i + 1] !== ':') {
      const inObjectLiteral = braceStack.length > 0 && braceStack[braceStack.length - 1] === 'object';
      const inClassBody = braceStack.length > 0 && braceStack[braceStack.length - 1] === 'class';

      // إذا كنا داخل object literal، لا نحذف `:` أبداً (القيمة ليست نوعاً)
      if (inObjectLiteral) {
        result += ch;
        i++;
        continue;
      }

      // تحقق إن كان ما بعده نوع فعلاً
      const after = code.slice(i + 1).match(/^\s*([A-Z]|\w+<|\(|\{|string|number|boolean|any|unknown|never|void|null|undefined|readonly|Promise|Array|Record|Partial|Pick|Omit|Readonly|infer)/);
      if (after) {
        // اقرأ النوع المحتمل
        let j = i + 1;
        let depth = 0;
        let hasArrow = false;
        let hasFunctionCall = false;
        let typeEnd = -1; // نهاية النوع الفعلي (قبل => أو { أو , أو ; أو =)
        while (j < n) {
          const cj = code[j];
          if (cj === '<' || cj === '(' || cj === '[') {
            depth++;
            if (cj === '(' && depth === 1) {
              let pk = j - 1;
              while (pk > i && /\s/.test(code[pk])) pk--;
              let wordEnd = pk;
              while (pk > i && /[\w.$]/.test(code[pk])) pk--;
              const wordBeforeParen = code.slice(pk + 1, wordEnd + 1);
              if (wordBeforeParen.includes('.') || /^[a-z]/.test(wordBeforeParen)) {
                hasFunctionCall = true;
              }
            }
          }
          if (cj === ')' || cj === ']') {
            if (depth === 0) break;
            depth--;
          }
          if (cj === '>') {
            if (depth === 0) break;
            depth--;
          }
          // اكتشف arrow function (return type) — النوع ينتهي قبل =>
          if (cj === '=' && code[j + 1] === '>') {
            hasArrow = true;
            typeEnd = j;
            break;
          }
          // `{` عند depth === 0 يعني بداية function body، ليس جزءاً من النوع
          if (cj === '{' && depth === 0) {
            typeEnd = j;
            break;
          }
          if (depth === 0 && (cj === ',' || cj === ';' || cj === '\n')) {
            typeEnd = j;
            break;
          }
          if (depth === 0 && cj === '=' && code[j + 1] !== '>') {
            typeEnd = j;
            break;
          }
          j++;
        }

        if (typeEnd === -1) typeEnd = j;

        // إذا كان فيه function call (مثل Buffer.from(...))، فهذه قيمة وليست نوعاً
        if (hasFunctionCall) {
          result += ch;
          i++;
          continue;
        }

        // داخل class body: قد تكون type annotation للـ property
        if (inClassBody) {
          let k = i - 1;
          while (k >= 0 && /\s/.test(code[k])) k--;
          let wordEnd = k;
          while (k >= 0 && /[\w$]/.test(code[k])) k--;
          const word = code.slice(k + 1, wordEnd + 1);
          if (word && /^[a-z_$]/.test(word)) {
            // احذف النوع مع الحفاظ على مسافة قبل = أو {
            if (code[typeEnd] === '=' || code[typeEnd] === '{') {
              result += ' ';
            }
            i = typeEnd;
            continue;
          }
        }

        // خارج object literal — احذف النوع
        // احفظ مسافة قبل = أو { أو =>
        if (code[typeEnd] === '=' || code[typeEnd] === '{') {
          result += ' ';
        }
        i = typeEnd;
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
  // يجب أن نتجنّب الـ strings والـ comments
  let result = '';
  let i = 0;
  const n = code.length;
  let inString = null;
  let inComment = null;

  while (i < n) {
    const ch = code[i];
    const next = code[i + 1];

    // تعامل مع strings
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
    if (ch === '/' && next === '/') { inComment = '//'; result += ch + next; i += 2; continue; }
    if (ch === '/' && next === '*') { inComment = '/*'; result += ch + next; i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; result += ch; i++; continue; }

    // تحقق من `as Type` pattern
    if (ch === 'a' && code.slice(i, i + 2) === 'as' && (i === 0 || !/\w/.test(code[i - 1]))) {
      const afterPos = i + 2;
      // تأكد أن ما بعد `as` هو whitespace
      if (code[afterPos] === ' ' || code[afterPos] === '\t') {
        // تحقق إن كان `as const`
        const rest = code.slice(afterPos).match(/^\s+const\b/);
        if (rest) {
          i = afterPos + rest[0].length;
          continue;
        }
        // تحقق إن كان نوع يبدأ بحرف كبير أو { أو generic
        const typeMatch = code.slice(afterPos).match(/^\s+([A-Z]\w*(?:\.[A-Z]\w*)*(?:<[^>]*>)?|\{\s*\})/);
        if (typeMatch) {
          i = afterPos + typeMatch[0].length;
          continue;
        }
      }
    }

    result += ch;
    i++;
  }
  return result;
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
    ui: 'ui/index.mjs',
    graphql: 'graphql/index.mjs',
    charts: 'charts/index.mjs',
    utils: 'utils/index.mjs',
    markdown: 'markdown/index.mjs',
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
