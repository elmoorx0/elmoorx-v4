/**
 * Elmoorx v4 — Scope-aware Variable Mangler (بدون تبعيات)
 * =====================================================
 * يحلّل scopes ويُعيد تسمية المتغيرات المحلية بأسماء قصيرة (a, b, c, ...)
 *
 * القواعد الآمنة:
 *  - لا يمسّ: التعريفات الـ top-level، الأسماء المُصدّرة (export)،
 *    خصائص الكائنات (obj.prop)، أسماء الدوال المُسماة في object literals،
 *    المعاملات في import statements، arguments في calls، الـ globals
 *  - يُعيد تسمية: متغيرات const/let/var المحلية داخل الدوال، parameters، loop variables
 *
 * الخوارزمية المُبسّطة:
 *  1) Tokenize الكود (identifiers, strings, comments, regex, numbers, punctuation).
 *  2) امشِ الـ tokens متتبعاً nesting (function, {, }, =>, class).
 *  3) في كل function body، ابحث عن declarations وأضفها لـ scope table.
 *  4) في كل identifier reference، تحقق: هل هو declaration مسجّلة في scope نشطة؟
 *     إذا نعم، استبدله بالاسم القصير. تجاهل properties (بعد `.`).
 */

const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if',
  'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch', 'this', 'throw',
  'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static',
  'enum', 'await', 'async', 'implements', 'interface', 'package', 'private',
  'protected', 'public', 'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
  'arguments', 'eval', 'window', 'globalThis', 'self', 'document', 'console',
  'module', 'require', 'exports', 'process', 'Buffer', 'global', 'Promise',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'Function', 'Symbol', 'Map',
  'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error', 'JSON', 'Math',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'queueMicrotask', 'structuredClone',
]);

const GLOBAL_BUILTINS = new Set([
  'window', 'globalThis', 'self', 'document', 'console', 'process', 'Buffer',
  'global', 'Promise', 'Array', 'Object', 'String', 'Number', 'Boolean',
  'Function', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp',
  'Error', 'JSON', 'Math', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'queueMicrotask', 'structuredClone', 'fetch', 'Request', 'Response',
  'Headers', 'URL', 'URLSearchParams', 'FormData', 'Blob', 'File',
  'ReadableStream', 'WritableStream', 'TransformStream', 'TextEncoder',
  'TextDecoder', 'crypto', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'indexedDB', 'CustomEvent',
  'EventEmitter', 'Stream', 'Readable', 'Writable', 'NodeEventEmitter',
]);

/**
 * توليد اسم متغير قصير: a, b, ..., z, aa, ab, ...
 */
function genName(idx) {
  let name = '';
  idx++;
  while (idx > 0) {
    idx--;
    name = String.fromCharCode(97 + (idx % 26)) + name;
    idx = Math.floor(idx / 26);
  }
  if (RESERVED.has(name)) return genName(idx + 26);
  return name;
}

/**
 * Tokenizer بسيط
 */
function tokenize(code) {
  const tokens = [];
  let i = 0;
  const len = code.length;
  const isIdentStart = (c) => /[a-zA-Z_$]/.test(c);
  const isIdent = (c) => /[a-zA-Z0-9_$]/.test(c);
  const isDigit = (c) => /[0-9]/.test(c);

  while (i < len) {
    const c = code[i];

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      let start = i;
      while (i < len && /[ \t\n\r]/.test(code[i])) i++;
      tokens.push({ type: 'ws', value: code.slice(start, i), pos: start });
      continue;
    }

    if (c === '/' && code[i + 1] === '/') {
      let start = i;
      while (i < len && code[i] !== '\n') i++;
      tokens.push({ type: 'comment', value: code.slice(start, i), pos: start });
      continue;
    }
    if (c === '/' && code[i + 1] === '*') {
      let start = i;
      i += 2;
      while (i < len && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      tokens.push({ type: 'comment', value: code.slice(start, i), pos: start });
      continue;
    }

    if (c === '"' || c === "'" || c === '`') {
      let start = i;
      const quote = c;
      i++;
      while (i < len) {
        if (code[i] === '\\') { i += 2; continue; }
        if (code[i] === quote) { i++; break; }
        if (quote === '`' && code[i] === '$' && code[i + 1] === '{') {
          i += 2;
          let depth = 1;
          while (i < len && depth > 0) {
            if (code[i] === '{') depth++;
            if (code[i] === '}') depth--;
            i++;
          }
          continue;
        }
        i++;
      }
      tokens.push({ type: 'string', value: code.slice(start, i), pos: start });
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(code[i + 1]))) {
      let start = i;
      while (i < len && /[0-9._eExXa-fA-F]/.test(code[i])) i++;
      tokens.push({ type: 'number', value: code.slice(start, i), pos: start });
      continue;
    }

    if (isIdentStart(c)) {
      let start = i;
      while (i < len && isIdent(code[i])) i++;
      tokens.push({ type: 'ident', value: code.slice(start, i), pos: start });
      continue;
    }

    if (c === '/') {
      const prev = tokens.filter(t => t.type !== 'ws' && t.type !== 'comment').pop();
      const isRegexContext = !prev || prev.type === 'punct' ||
        (prev.type === 'ident' && ['return', 'typeof', 'in', 'of', 'instanceof', 'do', 'else', 'throw', 'case', 'new'].includes(prev.value));
      if (isRegexContext) {
        let start = i;
        i++;
        let inClass = false;
        while (i < len) {
          if (code[i] === '\\') { i += 2; continue; }
          if (code[i] === '[') inClass = true;
          if (code[i] === ']') inClass = false;
          if (code[i] === '/' && !inClass) { i++; break; }
          i++;
        }
        while (i < len && /[a-z]/.test(code[i])) i++;
        tokens.push({ type: 'regex', value: code.slice(start, i), pos: start });
        continue;
      }
    }

    if ('!%^&*()-+=[]{}|;:,.<>?/~`'.includes(c)) {
      const three = code.slice(i, i + 3);
      const two = code.slice(i, i + 2);
      if (['===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '???'].includes(three)) {
        tokens.push({ type: 'punct', value: three, pos: i });
        i += 3;
        continue;
      }
      if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '=>', '+=', '-=', '*=', '/=', '%=', '**', '<<', '>>', '?.', '??'].includes(two)) {
        tokens.push({ type: 'punct', value: two, pos: i });
        i += 2;
        continue;
      }
      tokens.push({ type: 'punct', value: c, pos: i });
      i++;
      continue;
    }

    i++;
  }

  return tokens;
}

/**
 * ابحث عن next non-whitespace, non-comment token
 */
function nextMeaningful(tokens, i) {
  let j = i + 1;
  while (j < tokens.length && (tokens[j].type === 'ws' || tokens[j].type === 'comment')) j++;
  return { token: tokens[j], index: j };
}

function prevMeaningful(tokens, i) {
  let j = i - 1;
  while (j >= 0 && (tokens[j].type === 'ws' || tokens[j].type === 'comment')) j--;
  return { token: tokens[j], index: j };
}

/**
 * ابحث عن نهاية الـ parameter list (تغلق بـ `)`)
 */
function findParamsEnd(tokens, start) {
  let depth = 1;
  let j = start + 1;
  while (j < tokens.length && depth > 0) {
    if (tokens[j].value === '(') depth++;
    if (tokens[j].value === ')') depth--;
    j++;
  }
  return j - 1;
}

/**
 * استخرج أسماء الـ parameters من قوسين
 */
function extractParamNames(tokens, start, end) {
  const names = [];
  for (let i = start + 1; i < end; i++) {
    if (tokens[i].type === 'ident' && !RESERVED.has(tokens[i].value)) {
      // تحقق: هل التالي `=` أو `,` أو `)`؟
      const next = nextMeaningful(tokens, i);
      if (next.token && (next.token.value === '=' || next.token.value === ',' || next.token.value === ')')) {
        // تحقق: هل السابق ليس `.`؟ (property access)
        const prev = prevMeaningful(tokens, i);
        if (!prev.token || prev.token.value !== '.' && prev.token.value !== '?.') {
          names.push(tokens[i].value);
        }
      }
    }
    // تجاوز default values { ... } أو [ ... ] أو `...`
    if (tokens[i].value === '{' || tokens[i].value === '[') {
      let depth = 1;
      i++;
      while (i < end && depth > 0) {
        if (tokens[i].value === '{' || tokens[i].value === '[') depth++;
        if (tokens[i].value === '}' || tokens[i].value === ']') depth--;
        i++;
      }
      i--;
    }
  }
  return names;
}

/**
 * مُصغّر المتغيرات الرئيسي
 * يعيد الكود بعد إعادة تسمية المتغيرات المحلية بأسماء قصيرة.
 */
export function mangleVars(code) {
  try {
    const tokens = tokenize(code);
    if (tokens.length === 0) return code;

    // scope stack — كل scope له جدول variable mappings
    const scopes = [new Map()]; // top-level (no mangling)
    let nameCounter = 0;
    let functionDepth = 0;

    const pushScope = () => scopes.push(new Map());
    const popScope = () => scopes.pop();
    const findScope = (name) => {
      for (let s = scopes.length - 1; s >= 1; s--) { // تخطّي top-level
        if (scopes[s].has(name)) return scopes[s].get(name);
      }
      return null;
    };

    // PASS 1: walk + identify declarations + mark references
    const skipAfter = new Set(); // indices to skip in PASS 1 (already-processed declarations)
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== 'ident') continue;

      // 1) function keyword → ابدأ scope جديد
      if (t.value === 'function') {
        // skip async/function name (if any) — collect params + body
        let j = i + 1;
        // async function / function*
        while (j < tokens.length && (tokens[j].type === 'ws' || tokens[j].value === '*')) j++;
        // function name (optional)
        if (tokens[j] && tokens[j].type === 'ident') {
          // if not at top level, mangle the function name
          if (scopes.length > 1 && !RESERVED.has(tokens[j].value)) {
            const newName = genName(nameCounter++);
            scopes[scopes.length - 1].set(tokens[j].value, newName);
            tokens[j]._mangled = newName;
          }
          j++;
          while (j < tokens.length && tokens[j].type === 'ws') j++;
        }
        // parameters (
        if (tokens[j] && tokens[j].value === '(') {
          const end = findParamsEnd(tokens, j);
          pushScope();
          functionDepth++;
          // mangle params
          const params = extractParamNames(tokens, j, end);
          for (const p of params) {
            const newName = genName(nameCounter++);
            scopes[scopes.length - 1].set(p, newName);
          }
          // don't mark tokens here yet — let PASS 2 handle them
          i = end;
          continue;
        }
      }

      // 2) arrow function: (params) => ...  OR  x => ...
      //    ابحث عن `=>` قادم
      if (t.value === '=>' || (tokens[i + 1] && tokens[i + 1].value === '=>')) {
        // ضعيف: نتحقق أن السابق هو `)` أو identifier واحد (param)
        // لتبسيط: نتخطّى هذا النوع — سيُلتقط من خلال function body detection
      }

      // 3) const/let/var declaration
      if ((t.value === 'const' || t.value === 'let' || t.value === 'var') && scopes.length > 1) {
        // استخرج أسماء المتغيرات حتى `;` أو نهاية block
        let j = i + 1;
        let depth = 0;
        while (j < tokens.length) {
          if (tokens[j].value === '{' || tokens[j].value === '[' || tokens[j].value === '(') depth++;
          if (tokens[j].value === '}' || tokens[j].value === ']' || tokens[j].value === ')') depth--;

          if (depth === 0) {
            if (tokens[j].type === 'ident' && !RESERVED.has(tokens[j].value)) {
              // تحقق: هل السابق ليس `.` (property access)
              const prev = prevMeaningful(tokens, j);
              const next = nextMeaningful(tokens, j);
              const isVarName = prev.token && (
                prev.token.value === 'const' || prev.token.value === 'let' ||
                prev.token.value === 'var' || prev.token.value === ',' ||
                prev.token.value === '=' || prev.token.value === '(' ||
                prev.token.value === '['
              );
              const isValidNext = next.token && (
                next.token.value === '=' || next.token.value === ',' ||
                next.token.value === ';' || next.token.value === 'in' ||
                next.token.value === 'of'
              );
              if (isVarName && isValidNext && !scopes[scopes.length - 1].has(tokens[j].value)) {
                const newName = genName(nameCounter++);
                scopes[scopes.length - 1].set(tokens[j].value, newName);
                tokens[j]._mangled = newName;
              }
            }
            if (tokens[j].value === ';') { i = j; break; }
          }
          j++;
        }
        continue;
      }

      // 4) `}` → إنهاء scope
      if (t.value === '}') {
        if (scopes.length > 1) {
          popScope();
          if (functionDepth > 0) functionDepth--;
        }
        continue;
      }

      // 5) import statements — لا تمسّ
      if (t.value === 'import' || t.value === 'export') {
        // تخطّي حتى نهاية الـ statement
        while (i < tokens.length && tokens[i].value !== ';' && tokens[i].type !== 'string') i++;
        // إن كان string، تخطّه
        if (tokens[i] && tokens[i].type === 'string') i++;
        while (i < tokens.length && tokens[i].value !== ';' && tokens[i].value !== '\n') i++;
        continue;
      }
    }

    // PASS 2: replace identifier references
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type !== 'ident' || t._mangled) continue;
      if (RESERVED.has(t.value) || GLOBAL_BUILTINS.has(t.value)) continue;

      // تجاهل: properties بعد `.` أو `?.`
      const prev = prevMeaningful(tokens, i);
      if (prev.token && prev.token.type === 'punct' && (prev.token.value === '.' || prev.token.value === '?.')) continue;

      // تجاهل: keys في object literals ({ foo: ... } or { foo })
      const next = nextMeaningful(tokens, i);
      if (next.token && next.token.type === 'punct' && next.token.value === ':' &&
          prev.token && prev.token.type === 'punct' && (prev.token.value === '{' || prev.token.value === ',')) {
        continue;
      }

      // تجاهل: object shorthand `{ foo }` — يجب أن تكون declaration أيضاً
      // تجاهلها للسلامة

      // ابحث في الـ scopes
      const mangled = findScope(t.value);
      if (mangled) {
        t._mangled = mangled;
      }
    }

    // إعادة بناء الكود
    let result = '';
    for (const t of tokens) {
      if (t.type === 'ident' && t._mangled) {
        result += t._mangled;
      } else {
        result += t.value;
      }
    }

    return result;
  } catch (err) {
    // fallback آمن
    return code;
  }
}

export default { mangleVars };
