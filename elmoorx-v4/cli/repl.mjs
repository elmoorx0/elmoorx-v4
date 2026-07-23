/**
 * elmoorx repl — interactive shell للتجربة السريعة
 */
import { createInterface } from 'node:readline';
import { $state, $computed, $effect, $store, h, renderToString, sanitize } from '../runtime/core.mjs';
import { date, string, number, array, object, color, async_, random } from '../utils/index.mjs';

export async function startRepl() {
  console.log(`\n  ✦ Elmoorx v4 — REPL (Interactive Shell)`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ اكتب كود JavaScript واضغط Enter`);
  console.log(`  │ اكتب .help للمساعدة، .exit للخروج`);
  console.log(`  ─────────────────────────────────────\n`);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'elmoorx> ',
  });

  const context = {
    $state, $computed, $effect, $store, h, renderToString, sanitize,
    date, string, number, array, object, color, async_, random,
    console,
    process,
    Buffer,
    setTimeout, setInterval, clearTimeout, clearInterval,
    Promise,
    JSON,
    Math,
    Date,
    Object, Array, String, Number, Boolean, Function, Symbol, Map, Set, WeakMap, WeakSet, RegExp, Error, Proxy, Reflect,
  };

  const multiLineCode = [];

  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();

    // أوامر خاصة
    if (trimmed.startsWith('.')) {
      const [cmd, ...args] = trimmed.slice(1).split(' ');
      switch (cmd) {
        case 'help':
          console.log(`
  أوامر REPL:
    .help           عرض هذه المساعدة
    .exit           الخروج
    .clear          مسح الشاشة
    .vars           عرض المتغيرات المعرفة
    .reset          إعادة تعيين السياق
    .load <file>    تحميل وتنفيذ ملف
    .save <file>    حفظ الجلسة في ملف
    .time <code>    قياس وقت التنفيذ
    .bench <name>   تشغيل benchmark
    .examples       عرض أمثلة

  APIs المتاحة:
    $state, $computed, $effect, $store, h, renderToString, sanitize
    date, string, number, array, object, color, async_, random
    console, process, Buffer, JSON, Math, Date, Promise
`);
          break;
        case 'exit':
        case 'quit':
          console.log('  ✦ مع السلامة!');
          rl.close();
          return;
        case 'clear':
          console.clear();
          break;
        case 'vars':
          console.log('  المتغيرات المعرفة:');
          for (const key of Object.keys(context)) {
            if (!['console', 'process', 'Buffer', 'JSON', 'Math', 'Date', 'Promise'].includes(key)) {
              console.log(`    ${key}`);
            }
          }
          break;
        case 'reset':
          multiLineCode.length = 0;
          console.log('  ✓ تم إعادة التعيين');
          break;
        case 'examples':
          console.log(`
  أمثلة:
    const c = $state(0); c(); c.set(5); c();
    const s = $store({a: 1}); s.a = 2;
    renderToString(h('div', null, 'hello'))
    sanitize('<script>alert(1)</script>')
    string.slugify('Hello World')
    number.bytes(1048576)
    array.chunk([1,2,3,4,5], 2)
    date.format(new Date(), 'YYYY-MM-DD')
    random.uuid()
`);
          break;
        case 'time':
          const code = args.join(' ');
          const start = performance.now();
          try {
            const result = eval(code);
            if (result instanceof Promise) {
              result.then(() => {
                console.log(`  ✓ ${performance.now() - start}ms`);
                rl.prompt();
              });
              return;
            }
            console.log(`  ✓ ${performance.now() - start}ms`);
          } catch (err) {
            console.log('  ✗', err.message);
          }
          break;
        case 'bench':
          runQuickBench(args[0] || 'signals');
          break;
        default:
          console.log(`  أمر غير معروف: .${cmd} — جرّب .help`);
      }
      rl.prompt();
      return;
    }

    // تجميع متعدد الأسطر (إذا انتهى بـ { أو ( غير مغلقة)
    multiLineCode.push(line);
    const fullCode = multiLineCode.join('\n');

    // تحقق من الإغلاق
    if (!isCompleteCode(fullCode)) {
      rl.setPrompt('... ');
      rl.prompt();
      return;
    }

    multiLineCode.length = 0;
    rl.setPrompt('elmoorx> ');

    // نفّذ الكود
    try {
      const wrappedCode = `
        with (this) {
          ${fullCode}
        }
      `;
      const fn = new Function(wrappedCode);
      const result = fn.call(context);

      // اعرض النتيجة
      if (result !== undefined) {
        console.log(formatResult(result));
      }
    } catch (err) {
      console.log('  ✗', err.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n  ✦ مع السلامة!');
    process.exit(0);
  });
}

function isCompleteCode(code) {
  let depth = 0;
  let inString = null;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (inString) {
      if (ch === '\\') { i++; continue; }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inString = ch; continue; }
    if (ch === '{' || ch === '(' || ch === '[') depth++;
    if (ch === '}' || ch === ')' || ch === ']') depth--;
  }
  return depth <= 0;
}

function formatResult(result) {
  if (typeof result === 'function') {
    return `  ${result.name || 'anonymous'} [Function]`;
  }
  if (typeof result === 'object' && result !== null) {
    try {
      return '  ' + JSON.stringify(result, null, 2).split('\n').join('\n  ');
    } catch {
      return '  ' + String(result);
    }
  }
  return `  ${result}`;
}

function runQuickBench(name) {
  const N = 10000;
  const start = performance.now();
  switch (name) {
    case 'signals':
      const s = $state(0);
      for (let i = 0; i < N; i++) s.set(i);
      console.log(`  ✓ ${N} signal writes: ${(performance.now() - start).toFixed(2)}ms`);
      break;
    case 'store':
      const st = $store({ count: 0 });
      for (let i = 0; i < N; i++) st.count = i;
      console.log(`  ✓ ${N} store writes: ${(performance.now() - start).toFixed(2)}ms`);
      break;
    case 'render':
      for (let i = 0; i < N; i++) renderToString(h('div', null, 'hello'));
      console.log(`  ✓ ${N} renders: ${(performance.now() - start).toFixed(2)}ms`);
      break;
    case 'sanitize':
      for (let i = 0; i < N; i++) sanitize('<script>alert(1)</script>');
      console.log(`  ✓ ${N} sanitizes: ${(performance.now() - start).toFixed(2)}ms`);
      break;
    default:
      console.log(`  الأسماء المتاحة: signals, store, render, sanitize`);
  }
}
