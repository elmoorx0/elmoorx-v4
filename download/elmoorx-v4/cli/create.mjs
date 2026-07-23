/**
 * elmoorx create <name> — ينشئ مشروع Elmoorx جديد
 * ينسخ الإطار بالكامل تحت .elmoorx/ ليكون المشروع مستقلاً تماماً
 */
import { mkdirSync, writeFileSync, existsSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// framework root = elmoorx-v4/
const FRAMEWORK_ROOT = resolve(__dirname, '..');

const TEMPLATES = ['default', 'blog', 'dashboard', 'saas', 'landing'];

export async function createProject(name, template = 'default') {
  const target = resolve(process.cwd(), name);
  if (existsSync(target)) {
    throw new Error(`المجلد "${name}" موجود مسبقاً`);
  }

  console.log(`\n  ✦ إنشاء مشروع Elmoorx جديد: ${name}`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ القالب: ${template}`);

  // بنية المجلدات
  mkdirSync(target, { recursive: true });
  mkdirSync(join(target, 'src'));
  mkdirSync(join(target, 'src', 'pages'));
  mkdirSync(join(target, 'src', 'components'));
  mkdirSync(join(target, 'public'));
  mkdirSync(join(target, 'tests'));

  // نسخ الإطار بالكامل إلى .elmoorx/
  console.log(`  │ نسخ الإطار إلى .elmoorx/...`);
  const elmoorxDir = join(target, '.elmoorx');
  mkdirSync(elmoorxDir, { recursive: true });

  // نسخ المجلدات الأساسية
  const packagesToCopy = [
    'runtime', 'compiler', 'cli', 'vendor',
    'router', 'ssr', 'i18n', 'http', 'testing', 'adapters',
    'store', 'forms', 'animation', 'database', 'realtime', 'pwa', 'ui',
    'graphql', 'charts', 'utils', 'markdown',
  ];
  for (const pkg of packagesToCopy) {
    const src = join(FRAMEWORK_ROOT, pkg);
    if (existsSync(src)) {
      copyDirSync(src, join(elmoorxDir, pkg));
    }
  }
  copyFileSync(join(FRAMEWORK_ROOT, 'elmoorx.mjs'), join(elmoorxDir, 'elmoorx.mjs'));

  // إنشاء elmoorx shell script في جذر المشروع
  writeFileSync(join(target, 'elmoorx'), generateShellScript());
  chmodSync(join(target, 'elmoorx'), 0o755);

  // index.html
  writeFileSync(join(target, 'index.html'), generateIndex(name));

  // src/index.tsx
  writeFileSync(join(target, 'src', 'index.tsx'), generateEntry(template));

  // src/pages/Home.tsx
  writeFileSync(join(target, 'src', 'pages', 'Home.tsx'), generateHome(name));

  // elmoorx.config.mjs
  writeFileSync(join(target, 'elmoorx.config.mjs'), generateConfig());

  // package.json (لا يعتمد على npm!)
  writeFileSync(join(target, 'package.json'), JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: './elmoorx dev --root=./src',
      build: './elmoorx build --target=browser',
      serve: './elmoorx static dist',
    },
    elmoorx: { version: '4.0.0', template },
  }, null, 2));

  // README.md
  writeFileSync(join(target, 'README.md'), generateReadme(name));

  // .gitignore
  writeFileSync(join(target, '.gitignore'), `node_modules/\ndist/\n.cache/\n.env\n*.log\n# .elmoorx/ — اختر: اتركه للمشروع المستقل، أو احذفه واجعل elmoorx عالمي\n`);

  // حساب الحجم
  const size = computeDirSize(elmoorxDir);
  console.log(`  │ حجم الإطار: ${(size / 1024).toFixed(1)} KB`);
  console.log(`  │ تم ✓`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`\n  الخطوات التالية:
    cd ${name}
    ./elmoorx dev

  → http://localhost:3000\n`);
}

function copyDirSync(src, dst) {
  if (!existsSync(src)) return;
  mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, dstPath);
    else copyFileSync(srcPath, dstPath);
  }
}

function computeDirSize(dir) {
  let total = 0;
  if (!existsSync(dir)) return 0;
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else total += statSync(p).size;
    }
  };
  walk(dir);
  return total;
}

function generateShellScript() {
  return [
    '#!/bin/bash',
    '# Elmoorx v4 — مُشغّل مستقل',
    '# يجد الإطار في .elmoorx/ ويُشغّله',
    'set -e',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'NODE="${NODE:-node}"',
    'if ! command -v $NODE &> /dev/null; then',
    '  echo "✗ خطأ: Node.js غير مُثبّت. ثبّته من https://nodejs.org/"',
    '  exit 1',
    'fi',
    '# تحقق من وجود .elmoorx/',
    'if [ ! -d "$SCRIPT_DIR/.elmoorx" ]; then',
    '  echo "✗ خطأ: مجلد .elmoorx/ غير موجود"',
    '  echo "  انسخ الإطار إلى $SCRIPT_DIR/.elmoorx/ أو أعد تشغيل: elmoorx create"',
    '  exit 1',
    'fi',
    'exec $NODE --experimental-strip-types "$SCRIPT_DIR/.elmoorx/elmoorx.mjs" "$@"',
    '',
  ].join('\n');
}

function generateIndex(name) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Elmoorx v4</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    #app { padding: 2rem; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/__hmr_client__.mjs"></script>
  <script type="module">
    import { initHMR, mount } from '/.elmoorx/runtime/core.mjs';
    import App from '/src/index.tsx';
    initHMR(3000);
    mount(App, '#app');
  </script>
</body>
</html>
`;
}

function generateEntry(template) {
  if (template === 'blog') {
    return `import { h, $state, $effect } from '@elmoorx/runtime';

export default function App() {
  const posts = $state([
    { id: 1, title: 'مرحباً بك في Elmoorx', body: 'أول تدوينة في مدونتك الجديدة' },
    { id: 2, title: 'HMR صفر-زمني', body: 'جرّب تعديل هذا الملف وشاهد التغيير الفوري' },
  ]);

  return h('main', { style: 'max-width:800px;margin:0 auto;padding:2rem;' },
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'مدونتي'),
    posts().map(p => h('article', { key: p.id, style: 'background:#1e293b;padding:1.5rem;border-radius:8px;margin-bottom:1rem;' },
      h('h2', { style: 'color:#e2e8f0;' }, p.title),
      h('p', { style: 'color:#94a3b8;' }, p.body)
    ))
  );
}
`;
  }

  if (template === 'dashboard') {
    return `import { h, $state, $effect } from '@elmoorx/runtime';

export default function App() {
  const stats = $state({
    users: 1248,
    revenue: 45200,
    orders: 387,
    conversion: 3.2,
  });

  return h('main', { style: 'padding:2rem;' },
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'لوحة التحكم'),
    h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;' },
      h('div', { style: 'background:#1e293b;padding:1.5rem;border-radius:8px;' },
        h('div', { style: 'color:#94a3b8;font-size:0.9rem;' }, 'المستخدمون'),
        h('div', { style: 'color:#e2e8f0;font-size:2rem;' }, () => stats().users.toLocaleString())
      ),
      h('div', { style: 'background:#1e293b;padding:1.5rem;border-radius:8px;' },
        h('div', { style: 'color:#94a3b8;font-size:0.9rem;' }, 'الإيراد'),
        h('div', { style: 'color:#10b981;font-size:2rem;' }, () => '$' + stats().revenue.toLocaleString())
      )
    )
  );
}
`;
  }

  // default
  return `import { h, $state } from '@elmoorx/runtime';

export default function App() {
  const count = $state(0);

  return h('main', { style: 'text-align:center;padding:3rem;' },
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, '✦ مرحباً Elmoorx'),
    h('p', { style: 'color:#94a3b8;margin-bottom:2rem;' }, 'إطار عمل مستقل عن npm — جرّب تعديل src/index.tsx'),
    h('button', {
      onClick: () => count.set(c => c + 1),
      style: 'padding:1rem 2rem;font-size:1.2rem;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;'
    }, 'العدد: ', () => count())
  );
}
`;
}

function generateHome(name) {
  return `import { h } from '@elmoorx/runtime';
export function Home() {
  return h('div', null, 'الصفحة الرئيسية — ${name}');
}
`;
}

function generateConfig() {
  return `// إعدادات Elmoorx v4
export default {
  port: 3000,
  target: 'browser',
  hmr: true,
  visualBuilder: true,
  entry: '/src/index.tsx',
};
`;
}

function generateReadme(name) {
  return `# ${name}

مشروع مبني على **Elmoorx v4** — إطار عمل مستقل عن npm/npx.

## ✦ المميزات

- ✅ **مستقل تماماً** — لا يحتاج npm install أو npx
- ✅ **HMR صفر-زمني** عبر WebSocket مباشر (<1ms)
- ✅ **تجميع TypeScript + JSX داخلي** بدون Babel/esbuild
- ✅ **Edge+Native** — كود واحد يعمل على 5 منصات
- ✅ **Visual Builder** — محرر مرئي يولّد كود Elmoorx

## 🚀 البدء السريع

\`\`\`bash
./elmoorx dev
\`\`\`

ثم افتح http://localhost:3000

## 📦 البناء للإنتاج

\`\`\`bash
./elmoorx build --target=browser
# أهداف أخرى: cloudflare | vercel | deno | native | node
\`\`\`

## 🎨 Visual Builder

\`\`\`bash
./elmoorx visual
\`\`\`

## 🔧 توليد مكون

\`\`\`bash
./elmoorx generate "login form"
./elmoorx generate "data table"
./elmoorx generate "todo list"
\`\`\`

## 📁 الهيكل

- \`src/index.tsx\` — نقطة الدخول
- \`src/pages/\` — صفحات التطبيق
- \`src/components/\` — مكونات قابلة لإعادة الاستخدام
- \`public/\` — ملفات ثابتة
- \`tests/\` — اختبارات
- \`.elmoorx/\` — الإطار (مُضمّن، لا يحتاج npm)

## 🌐 النشر

### Cloudflare Workers
\`\`\`bash
./elmoorx build --target=cloudflare
cd dist && wrangler deploy
\`\`\`

### Vercel
\`\`\`bash
./elmoorx build --target=vercel
# ارفع مجلد dist/ إلى Vercel
\`\`\`

### Deno Deploy
\`\`\`bash
./elmoorx build --target=deno
cd dist && deno deploy
\`\`\`

### Node.js
\`\`\`bash
./elmoorx build --target=node
node dist/server.mjs
\`\`\`

### Native (iOS/Android)
\`\`\`bash
./elmoorx build --target=native
# استخدم WebView لتحميل ملفات dist/
\`\`\`

## 📄 الترخيص

MIT
`;
}

import { chmodSync } from 'node:fs';
