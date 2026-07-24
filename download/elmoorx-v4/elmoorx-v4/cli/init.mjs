/**
 * elmoorx init — يحوّل مشروع موجود إلى مشروع Elmoorx
 * يُنشئ .elmoorx/ و elmoorx script في المشروع الحالي
 */
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

export async function initProject(options = {}) {
  const cwd = process.cwd();
  const force = options.force || false;

  console.log(`\n  ✦ Elmoorx v4 — Init`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المجلد: ${cwd}`);

  // تحقق من المشروع الحالي
  if (existsSync(join(cwd, '.elmoorx')) && !force) {
    console.error(`  ✗ المشروع يحتوي بالفعل على .elmoorx/`);
    console.error(`  استخدم --force للإجبار`);
    process.exit(1);
  }

  // 1) انسخ الإطار
  console.log(`  │ نسخ الإطار إلى .elmoorx/...`);
  const elmoorxDir = join(cwd, '.elmoorx');
  mkdirSync(elmoorxDir, { recursive: true });

  const packagesToCopy = [
    'runtime', 'compiler', 'cli', 'vendor',
    'router', 'ssr', 'i18n', 'http', 'testing', 'adapters',
    'store', 'forms', 'animation', 'database', 'realtime', 'pwa', 'ui',
  ];
  for (const pkg of packagesToCopy) {
    const src = join(FRAMEWORK_ROOT, pkg);
    if (existsSync(src)) copyDirSync(src, join(elmoorxDir, pkg));
  }
  copyFileSync(join(FRAMEWORK_ROOT, 'elmoorx.mjs'), join(elmoorxDir, 'elmoorx.mjs'));

  // 2) أنشئ elmoorx shell script
  writeFileSync(join(cwd, 'elmoorx'), generateShellScript());
  chmodSync(join(cwd, 'elmoorx'), 0o755);

  // 3) أنشئ src/ إن لم يوجد
  if (!existsSync(join(cwd, 'src'))) {
    mkdirSync(join(cwd, 'src'), { recursive: true });
    writeFileSync(join(cwd, 'src', 'index.tsx'), generateEntry());
  }

  // 4) أنشئ index.html إن لم يوجد
  if (!existsSync(join(cwd, 'index.html'))) {
    writeFileSync(join(cwd, 'index.html'), generateIndex());
  }

  // 5) حدّث/أنشئ package.json
  const pkgPath = join(cwd, 'package.json');
  let pkg = {};
  if (existsSync(pkgPath)) {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  }
  pkg.type = pkg.type || 'module';
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.dev = './elmoorx dev';
  pkg.scripts.build = './elmoorx build --target=browser';
  pkg.scripts.serve = './elmoorx static dist';
  pkg.elmoorx = { version: '4.0.0' };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  console.log(`  │ ✓ تم ✓`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`\n  الآن شغّل: ./elmoorx dev\n`);
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

function generateShellScript() {
  return [
    '#!/bin/bash',
    '# Elmoorx v4 — مُشغّل مستقل',
    'set -e',
    'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
    'NODE="${NODE:-node}"',
    'if ! command -v $NODE &> /dev/null; then',
    '  echo "✗ خطأ: Node.js غير مُثبّت. ثبّته من https://nodejs.org/"',
    '  exit 1',
    'fi',
    'exec $NODE --experimental-strip-types "$SCRIPT_DIR/.elmoorx/elmoorx.mjs" "$@"',
    '',
  ].join('\n');
}

function generateEntry() {
  return `import { h, $state } from '@elmoorx/runtime';

export default function App() {
  const count = $state(0);
  return h('div', { style: 'padding:2rem;text-align:center;font-family:system-ui;' },
    h('h1', { style: 'color:#0ea5e9;' }, '✦ مرحباً Elmoorx v4'),
    h('button', {
      onClick: () => count.set(c => c + 1),
      style: 'padding:1rem 2rem;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.2rem;',
    }, 'العدد: ', () => count())
  );
}
`;
}

function generateIndex() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elmoorx v4</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
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

import { readdirSync, readFileSync, chmodSync } from 'node:fs';
