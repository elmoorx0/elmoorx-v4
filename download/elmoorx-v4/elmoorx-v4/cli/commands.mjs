/**
 * elmoorx doctor / info
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function doctor(rootDir, options = {}) {
  const { fix = false } = options;
  const checks = [];

  // 1) ملف index.html
  const indexHtmlOk = existsSync(join(rootDir, 'index.html'));
  checks.push({ name: 'index.html', ok: indexHtmlOk, fix: 'أنشئ index.html في جذر المشروع', fixFn: () => createIndexHtml(rootDir) });

  // 2) مجلد src/
  const srcOk = existsSync(join(rootDir, 'src'));
  checks.push({ name: 'مجلد src/', ok: srcOk, fix: 'أنشئ مجلد src/ للكود', fixFn: () => mkdirSync(join(rootDir, 'src'), { recursive: true }) });

  // 3) ملف دخول
  const entryExists = existsSync(join(rootDir, 'src', 'index.tsx')) || existsSync(join(rootDir, 'src', 'index.ts'));
  checks.push({ name: 'src/index.tsx', ok: entryExists, fix: 'أنشئ src/index.tsx كنقطة دخول', fixFn: () => createEntryFile(rootDir) });

  // 4) elmoorx.config.mjs
  checks.push({ name: 'elmoorx.config.mjs', ok: existsSync(join(rootDir, 'elmoorx.config.mjs')), fix: 'اختياري — أنشئ elmoorx.config.mjs للتخصيص', fixFn: () => createConfig(rootDir) });

  // 5) Node version
  const nodeOk = parseInt(process.version.slice(1)) >= 22;
  checks.push({ name: 'Node.js >= 22', ok: nodeOk, current: process.version, fix: 'حدّث Node.js إلى 22 أو أحدث' });

  // 6) package.json
  checks.push({ name: 'package.json', ok: existsSync(join(rootDir, 'package.json')), fix: 'اختياري — للتوافق مع IDE', fixFn: () => createPackageJson(rootDir) });

  // 7) tests
  checks.push({ name: 'مجلد tests/', ok: existsSync(join(rootDir, 'tests')), fix: 'اختياري — أنشئ tests/ للاختبارات', fixFn: () => mkdirSync(join(rootDir, 'tests'), { recursive: true }) });

  // 8) .elmoorx/
  checks.push({ name: '.elmoorx/', ok: existsSync(join(rootDir, '.elmoorx')), fix: 'شغّل: elmoorx init', fixFn: null });

  // 9) elmoorx executable
  checks.push({ name: 'elmoorx script', ok: existsSync(join(rootDir, 'elmoorx')), fix: 'شغّل: elmoorx init', fixFn: null });

  // 10) .gitignore
  checks.push({ name: '.gitignore', ok: existsSync(join(rootDir, '.gitignore')), fix: 'أنشئ .gitignore', fixFn: () => createGitignore(rootDir) });

  let result = '\n  ✦ Elmoorx Doctor — فحص صحة المشروع\n  ─────────────────────────────────────\n';
  let passCount = 0;
  let fixedCount = 0;

  for (const c of checks) {
    const status = c.ok ? '✓' : (fix && c.fixFn ? '🔧' : '✗');
    result += `  ${status} ${c.name}${c.current ? ' (' + c.current + ')' : ''}\n`;
    if (!c.ok) {
      if (fix && c.fixFn) {
        try {
          c.fixFn();
          result += `      → تم الإصلاح ✓\n`;
          fixedCount++;
        } catch (err) {
          result += `      → فشل الإصلاح: ${err.message}\n`;
          result += `      → ${c.fix}\n`;
        }
      } else {
        result += `      → ${c.fix}\n`;
      }
    } else {
      passCount++;
    }
  }

  const totalFixed = passCount + fixedCount;
  result += `\n  النتيجة: ${totalFixed}/${checks.length} فحص ناجح`;
  if (fixedCount > 0) result += ` (${fixedCount} تم إصلاحها)`;
  result += '\n';
  if (totalFixed === checks.length) result += '  ✓ المشروع سليم!\n';

  return result;
}

function createIndexHtml(rootDir) {
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elmoorx App</title>
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
  writeFileSync(join(rootDir, 'index.html'), html);
}

function createEntryFile(rootDir) {
  const srcDir = join(rootDir, 'src');
  if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true });
  writeFileSync(join(srcDir, 'index.tsx'), `import { h, $state } from '@elmoorx/runtime';

export default function App() {
  const count = $state(0);
  return h('div', { style: 'padding:2rem;text-align:center;' },
    h('h1', { style: 'color:#0ea5e9;' }, '✦ مرحباً Elmoorx'),
    h('button', {
      onClick: () => count.set(c => c + 1),
      style: 'padding:1rem 2rem;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.2rem;',
    }, 'العدد: ', () => count())
  );
}
`);
}

function createConfig(rootDir) {
  writeFileSync(join(rootDir, 'elmoorx.config.mjs'), `export default {
  port: 3000,
  target: 'browser',
  hmr: true,
  entry: '/src/index.tsx',
};
`);
}

function createPackageJson(rootDir) {
  const name = rootDir.split('/').pop() || 'elmoorx-app';
  writeFileSync(join(rootDir, 'package.json'), JSON.stringify({
    name,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: './elmoorx dev',
      build: './elmoorx build --target=browser',
      serve: './elmoorx static dist',
      test: './elmoorx test',
    },
    elmoorx: { version: '4.0.0' },
  }, null, 2));
}

function createGitignore(rootDir) {
  writeFileSync(join(rootDir, '.gitignore'), `node_modules/
dist/
.cache/
.env
*.log
.elmoorx-test-cache/
`);
}

import { writeFileSync, mkdirSync } from 'node:fs';

export async function info() {
  const { cpus, totalmem, freemem } = await import('node:os');
  let result = '\n  ✦ Elmoorx — معلومات البيئة\n  ─────────────────────────────────────\n';
  result += `  │ الإطار:     Elmoorx v4.0.0\n`;
  result += `  │ Node:       ${process.version}\n`;
  result += `  │ المنصة:     ${process.platform} ${process.arch}\n`;
  result += `  │ المعالج:    ${cpus()[0].model} (${cpus().length} cores)\n`;
  result += `  │ الذاكرة:    ${(freemem() / 1024 / 1024 / 1024).toFixed(1)} GB / ${(totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB حرة\n`;
  result += `  │ cwd:        ${process.cwd()}\n`;
  result += `  │ PID:        ${process.pid}\n`;
  result += `  ─────────────────────────────────────\n`;
  result += `  ✦ Packages المدمجة (15):\n`;
  result += `  │ • runtime     — signals, store, islands, security\n`;
  result += `  │ • compiler    — TS + JSX بدون Babel\n`;
  result += `  │ • router      — file-based + dynamic routing\n`;
  result += `  │ • ssr         — renderToString + streaming\n`;
  result += `  │ • i18n        — ترجمات + RTL + Intl\n`;
  result += `  │ • http        — fetch + auth + useQuery\n`;
  result += `  │ • testing     — describe/it/expect + mock\n`;
  result += `  │ • adapters    — Edge + Native (6 منصات)\n`;
  result += `  │ • store       — global + devtools + time-travel\n`;
  result += `  │ • forms       — validation + reactive forms\n`;
  result += `  │ • animation   — transitions + spring + keyframes\n`;
  result += `  │ • database    — SQLite + IndexedDB\n`;
  result += `  │ • realtime    — WebSocket server + client\n`;
  result += `  │ • pwa         — service worker + manifest\n`;
  result += `  │ • ui          — 25+ components جاهزة\n`;
  result += `  ─────────────────────────────────────\n`;
  result += `  ✦ CLI commands (14):\n`;
  result += `  │ create, init, dev, build, deploy, generate, add,\n`;
  result += `  │ visual, docs, static, test, bench, doctor, info\n`;
  result += `  ─────────────────────────────────────\n`;
  return result;
}
