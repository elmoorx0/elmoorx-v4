/**
 * elmoorx help <command> — مساعدة تفصيلية لكل أمر
 * elmoorx version --bump — زيادة الإصدار
 * elmoorx config — عرض/تعديل الإعدادات
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// HELP — مساعدة تفصيلية لكل أمر
// ─────────────────────────────────────────────────────────────────────────────

const COMMAND_HELP = {
  create: {
    description: 'ينشئ مشروع Elmoorx جديد',
    usage: 'elmoorx create <name> [template]',
    options: [
      ['name', 'اسم المشروع (مطلوب)'],
      ['template', 'القالب: default, blog, dashboard, saas, landing (اختياري)'],
    ],
    examples: [
      'elmoorx create my-app',
      'elmoorx create my-app dashboard',
    ],
  },
  new: {
    description: 'ينشئ مشروع من قالب جاهز',
    usage: 'elmoorx new <template> <name>',
    options: [
      ['template', 'القالب: blank, starter, blog, dashboard, ecommerce, saas, landing, docs, portfolio'],
      ['name', 'اسم المشروع (مطلوب)'],
    ],
    examples: [
      'elmoorx new dashboard my-app',
      'elmoorx new blog my-blog',
    ],
  },
  init: {
    description: 'يحوّل مشروع موجود إلى Elmoorx',
    usage: 'elmoorx init [--force]',
    options: [
      ['--force, -f', 'إجبار التحويل حتى لو .elmoorx/ موجود'],
    ],
    examples: [
      'elmoorx init',
      'elmoorx init --force',
    ],
  },
  dev: {
    description: 'يبدأ خادم التطوير مع HMR صفر-زمني',
    usage: 'elmoorx dev [--port=3000] [--root=./src]',
    options: [
      ['--port=N', 'المنفذ (افتراضي: 3000)'],
      ['--root=DIR', 'مجلد الجذر (افتراضي: cwd)'],
    ],
    examples: [
      'elmoorx dev',
      'elmoorx dev --port=8080',
    ],
  },
  build: {
    description: 'يبني المشروع للإنتاج مع minify + gzip + brotli',
    usage: 'elmoorx build [--target=browser] [--out=dist]',
    options: [
      ['--target=X', 'browser|cloudflare|vercel|deno|node|native (افتراضي: browser)'],
      ['--out=DIR', 'مجلد الإخراج (افتراضي: dist)'],
    ],
    examples: [
      'elmoorx build',
      'elmoorx build --target=cloudflare',
      'elmoorx build --target=node --out=build',
    ],
  },
  bundle: {
    description: 'يدمج كل شيء في HTML واحد مع inline JS/CSS',
    usage: 'elmoorx bundle [--out=dist]',
    options: [
      ['--out=DIR', 'مجلد الإخراج (افتراضي: dist)'],
    ],
    examples: [
      'elmoorx bundle',
    ],
  },
  deploy: {
    description: 'ينشر المشروع على المنصة المحددة',
    usage: 'elmoorx deploy --target=<platform> [--host=user@ip]',
    options: [
      ['--target=X', 'cloudflare|vercel|netlify|deno|node|static (افتراضي: static)'],
      ['--host=H', 'SSH host للنشر على VPS (target=node)'],
      ['--out=DIR', 'مجلد الإخراج (افتراضي: dist)'],
    ],
    examples: [
      'elmoorx deploy --target=static',
      'elmoorx deploy --target=cloudflare',
      'elmoorx deploy --target=node --ssh=root@server.com',
    ],
  },
  generate: {
    description: 'يولّد مكون من وصف نصي',
    usage: 'elmoorx generate "<description>"',
    options: [
      ['description', 'وصف المكون (مطلوب)'],
    ],
    examples: [
      'elmoorx generate "login form"',
      'elmoorx generate "data table"',
      'elmoorx generate "todo list"',
    ],
  },
  'generate-app': {
    description: 'يولّد تطبيق كامل من وصف',
    usage: 'elmoorx generate-app "<description>" <name>',
    options: [
      ['description', 'وصف التطبيق (todo app, chat app, weather, ...)'],
      ['name', 'اسم المشروع'],
    ],
    examples: [
      'elmoorx generate-app "todo app" my-todo',
      'elmoorx generate-app "chat app" my-chat',
      'elmoorx generate-app "weather" my-weather',
    ],
  },
  add: {
    description: 'يضيف مكون جاهز للمشروع',
    usage: 'elmoorx add <component>',
    options: [
      ['component', 'اسم المكون: navbar, sidebar, modal, toast, ...'],
    ],
    examples: [
      'elmoorx add navbar',
      'elmoorx add data-table',
      'elmoorx add login-form',
    ],
  },
  test: {
    description: 'يشغّل اختبارات المشروع',
    usage: 'elmoorx test [--watch]',
    options: [
      ['--watch, -w', 'مراقبة التغييرات وإعادة التشغيل'],
    ],
    examples: [
      'elmoorx test',
      'elmoorx test --watch',
    ],
  },
  bench: {
    description: 'يقيس أداء الإطار (signals, store, render, sanitize)',
    usage: 'elmoorx bench',
    options: [],
    examples: [
      'elmoorx bench',
    ],
  },
  visual: {
    description: 'يفتح Visual Builder في المتصفح (drag-drop)',
    usage: 'elmoorx visual [--port=8080]',
    options: [
      ['--port=N', 'المنفذ (افتراضي: 8080)'],
    ],
    examples: [
      'elmoorx visual',
    ],
  },
  docs: {
    description: 'يفتح موقع التوثيق التفاعلي',
    usage: 'elmoorx docs [--port=9000]',
    options: [
      ['--port=N', 'المنفذ (افتراضي: 9000)'],
    ],
    examples: [
      'elmoorx docs',
    ],
  },
  repl: {
    description: 'interactive shell للتجربة السريعة',
    usage: 'elmoorx repl',
    options: [],
    examples: [
      'elmoorx repl',
    ],
  },
  scan: {
    description: 'فحص أمني للكود (15 قاعدة)',
    usage: 'elmoorx scan [--no-exit]',
    options: [
      ['--no-exit', 'لا تخرج بـ exit code 1 عند وجود مشاكل حرجة'],
    ],
    examples: [
      'elmoorx scan',
      'elmoorx scan --no-exit',
    ],
  },
  metrics: {
    description: 'تحليل تعقيد وجودة الكود',
    usage: 'elmoorx metrics',
    options: [],
    examples: [
      'elmoorx metrics',
    ],
  },
  theme: {
    description: 'يولّد ثيمات مخصصة',
    usage: 'elmoorx theme [--primary=COLOR] [--preset=NAME] [--mode=dark] [--list]',
    options: [
      ['--primary=COLOR', 'اللون الأساسي (hex)'],
      ['--preset=NAME', 'استخدام preset جاهز'],
      ['--mode=X', 'dark|light (افتراضي: dark)'],
      ['--list, -l', 'عرض جميع الـ presets'],
      ['--out=DIR', 'مجلد الإخراج'],
    ],
    examples: [
      'elmoorx theme --primary=#ff6b35',
      'elmoorx theme --preset ocean',
      'elmoorx theme --list',
    ],
  },
  graph: {
    description: 'رسم بياني للتبعيات',
    usage: 'elmoorx graph [--ascii] [--dot] [--cycles]',
    options: [
      ['--ascii', 'عرض ASCII graph'],
      ['--dot', 'تصدير DOT format لـ Graphviz'],
      ['--cycles', 'عرض الـ circular dependencies'],
    ],
    examples: [
      'elmoorx graph',
      'elmoorx graph --ascii',
      'elmoorx graph --dot',
    ],
  },
  split: {
    description: 'تقسيم الكود تلقائياً مع lazy loading',
    usage: 'elmoorx split [--out=dist]',
    options: [
      ['--out=DIR', 'مجلد الإخراج (افتراضي: dist)'],
    ],
    examples: [
      'elmoorx split',
    ],
  },
  watch: {
    description: 'يراقب التغييرات ويعيد البناء تلقائياً',
    usage: 'elmoorx watch [--target=browser] [--out=dist]',
    options: [
      ['--target=X', 'هدف البناء (افتراضي: browser)'],
      ['--out=DIR', 'مجلد الإخراج'],
    ],
    examples: [
      'elmoorx watch',
    ],
  },
  inspect: {
    description: 'يفحص ملف ويظهر معلوماته التفصيلية',
    usage: 'elmoorx inspect <file> [--output]',
    options: [
      ['file', 'مسار الملف (مطلوب)'],
      ['--output, -o', 'عرض الكود المُجمّع'],
    ],
    examples: [
      'elmoorx inspect src/index.tsx',
      'elmoorx inspect runtime/core.mjs --output',
    ],
  },
  upgrade: {
    description: 'يحدّث الإطار لأحدث إصدار',
    usage: 'elmoorx upgrade [--local] [--force]',
    options: [
      ['--local', 'التحديث من المصدر المحلي'],
      ['--force, -f', 'إجبار التحديث'],
    ],
    examples: [
      'elmoorx upgrade',
      'elmoorx upgrade --local',
    ],
  },
  analyze: {
    description: 'يحلل حجم المشروع والإطار',
    usage: 'elmoorx analyze',
    options: [],
    examples: [
      'elmoorx analyze',
    ],
  },
  clean: {
    description: 'ينظف ملفات البناء والمؤقتة',
    usage: 'elmoorx clean',
    options: [],
    examples: [
      'elmoorx clean',
    ],
  },
  list: {
    description: 'عرض المكونات/القوالب/الـ packages/الأوامر',
    usage: 'elmoorx list [category]',
    options: [
      ['category', 'components|packages|templates|apps|commands|all'],
    ],
    examples: [
      'elmoorx list',
      'elmoorx list components',
      'elmoorx list packages',
    ],
  },
  doctor: {
    description: 'يفحص صحة المشروع ويصلح المشاكل',
    usage: 'elmoorx doctor [--fix]',
    options: [
      ['--fix, -f', 'إصلاح تلقائي للمشاكل'],
    ],
    examples: [
      'elmoorx doctor',
      'elmoorx doctor --fix',
    ],
  },
  info: {
    description: 'يعرض معلومات البيئة',
    usage: 'elmoorx info',
    options: [],
    examples: [
      'elmoorx info',
    ],
  },
  changelog: {
    description: 'يولّد CHANGELOG من git commits',
    usage: 'elmoorx changelog [--output=FILE] [--from=TAG]',
    options: [
      ['--output=FILE', 'ملف الإخراج (افتراضي: CHANGELOG.md)'],
      ['--from=TAG', 'من tag/commit محدد'],
    ],
    examples: [
      'elmoorx changelog',
      'elmoorx changelog --from=v1.0.0',
    ],
  },
  version: {
    description: 'يعرض أو يزيد الإصدار',
    usage: 'elmoorx version [--bump=major|minor|patch]',
    options: [
      ['--bump=X', 'زيادة: major|minor|patch'],
    ],
    examples: [
      'elmoorx version',
      'elmoorx version --bump=patch',
      'elmoorx version --bump=minor',
      'elmoorx version --bump=major',
    ],
  },
  config: {
    description: 'يعرض أو يعدّل إعدادات المشروع',
    usage: 'elmoorx config [--set=key=value] [--get=key] [--list]',
    options: [
      ['--list, -l', 'عرض كل الإعدادات'],
      ['--get=KEY', 'عرض قيمة مفتاح'],
      ['--set=K=V', 'تعيين قيمة'],
    ],
    examples: [
      'elmoorx config --list',
      'elmoorx config --get=port',
      'elmoorx config --set=port=8080',
    ],
  },
};

export function helpForCommand(command) {
  const info = COMMAND_HELP[command];
  if (!info) {
    console.log(`\n  ✗ أمر غير معروف: ${command}`);
    console.log(`  شغّل: elmoorx --help لعرض كل الأوامر`);
    return;
  }

  console.log(`
  ✦ elmoorx ${command}
  ${'─'.repeat(50)}
  الوصف: ${info.description}

  الاستخدام:
    ${info.usage}
`);

  if (info.options.length > 0) {
    console.log(`  الخيارات:`);
    for (const [opt, desc] of info.options) {
      console.log(`    ${opt.padEnd(20)} ${desc}`);
    }
  }

  console.log(`\n  أمثلة:`);
  for (const ex of info.examples) {
    console.log(`    $ ${ex}`);
  }
  console.log(`\n  ${'─'.repeat(50)}\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// VERSION BUMP
// ─────────────────────────────────────────────────────────────────────────────

export function bumpVersion(type = 'patch') {
  const cwd = process.cwd();
  const pkgPath = join(cwd, 'package.json');

  if (!existsSync(pkgPath)) {
    console.error('  ✗ package.json غير موجود');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const current = pkg.version || '0.0.0';
  const [major, minor, patch] = current.split('.').map(Number);

  let newVersion;
  switch (type) {
    case 'major': newVersion = `${major + 1}.0.0`; break;
    case 'minor': newVersion = `${major}.${minor + 1}.0`; break;
    case 'patch': newVersion = `${major}.${minor}.${patch + 1}`; break;
    default: newVersion = type; // allow custom version
  }

  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  console.log(`\n  ✦ Elmoorx v4 — Version Bump`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ${current} → ${newVersion} (${type})`);
  console.log(`  ─────────────────────────────────────\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export function manageConfig(args) {
  const cwd = process.cwd();
  const configPath = join(cwd, 'elmoorx.config.mjs');

  // list
  if (args.includes('--list') || args.includes('-l')) {
    if (!existsSync(configPath)) {
      console.log(`\n  ✗ elmoorx.config.mjs غير موجود`);
      return;
    }
    const content = readFileSync(configPath, 'utf8');
    console.log(`\n  ✦ elmoorx.config.mjs:\n`);
    console.log(content);
    return;
  }

  // get
  const getArg = args.find(a => a.startsWith('--get='));
  if (getArg) {
    const key = getArg.split('=')[1];
    if (!existsSync(configPath)) {
      console.log(`\n  ✗ elmoorx.config.mjs غير موجود`);
      return;
    }
    const content = readFileSync(configPath, 'utf8');
    const match = content.match(new RegExp(`${key}\\s*:\\s*([^,\\n}]+)`));
    console.log(`\n  ${key} = ${match ? match[1].trim() : '(غير موجود)'}`);
    return;
  }

  // set
  const setArg = args.find(a => a.startsWith('--set='));
  if (setArg) {
    const [key, value] = setArg.split('=')[1].split('=');
    let content = '';
    if (existsSync(configPath)) {
      content = readFileSync(configPath, 'utf8');
      // استبدل القيمة
      const regex = new RegExp(`(${key}\\s*:\\s*)([^,\\n}]+)`);
      if (regex.test(content)) {
        content = content.replace(regex, `$1${value}`);
      } else {
        // أضف قبل الإغلاق
        content = content.replace(/}/, `  ${key}: ${value},\n}`);
      }
    } else {
      content = `export default {\n  ${key}: ${value},\n};\n`;
    }
    writeFileSync(configPath, content);
    console.log(`\n  ✓ ${key} = ${value}`);
    return;
  }

  // default: show help
  console.log(`
  ✦ elmoorx config — إدارة الإعدادات

  الاستخدام:
    elmoorx config --list              عرض كل الإعدادات
    elmoorx config --get=KEY           عرض قيمة مفتاح
    elmoorx config --set=KEY=VALUE     تعيين قيمة
`);
}
