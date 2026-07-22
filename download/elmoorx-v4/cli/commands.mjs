/**
 * elmoorx doctor / info
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function doctor(rootDir) {
  const checks = [];

  // 1) ملف index.html
  checks.push({ name: 'index.html', ok: existsSync(join(rootDir, 'index.html')), fix: 'أنشئ index.html في جذر المشروع' });

  // 2) مجلد src/
  checks.push({ name: 'مجلد src/', ok: existsSync(join(rootDir, 'src')), fix: 'أنشئ مجلد src/ للكود' });

  // 3) ملف دخول
  const entryExists = existsSync(join(rootDir, 'src', 'index.tsx')) || existsSync(join(rootDir, 'src', 'index.ts'));
  checks.push({ name: 'src/index.tsx', ok: entryExists, fix: 'أنشئ src/index.tsx كنقطة دخول' });

  // 4) elmoorx.config.mjs
  checks.push({ name: 'elmoorx.config.mjs', ok: existsSync(join(rootDir, 'elmoorx.config.mjs')), fix: 'اختياري — أنشئ elmoorx.config.mjs للتخصيص' });

  // 5) Node version
  const nodeOk = parseInt(process.version.slice(1)) >= 22;
  checks.push({ name: 'Node.js >= 22', ok: nodeOk, current: process.version, fix: 'حدّث Node.js إلى 22 أو أحدث' });

  // 6) package.json (optional)
  checks.push({ name: 'package.json', ok: existsSync(join(rootDir, 'package.json')), fix: 'اختياري — للتوافق مع IDE' });

  // 7) tests
  checks.push({ name: 'مجلد tests/', ok: existsSync(join(rootDir, 'tests')), fix: 'اختياري — أنشئ tests/ للاختبارات' });

  let result = '\n  ✦ Elmoorx Doctor — فحص صحة المشروع\n  ─────────────────────────────────────\n';
  let passCount = 0;
  for (const c of checks) {
    const status = c.ok ? '✓' : '✗';
    result += `  ${status} ${c.name}${c.current ? ' (' + c.current + ')' : ''}\n`;
    if (!c.ok) result += `      → ${c.fix}\n`;
    else passCount++;
  }
  result += `\n  النتيجة: ${passCount}/${checks.length} فحص ناجح\n`;
  if (passCount === checks.length) result += '  ✓ المشروع سليم!\n';
  return result;
}

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
  result += `  ✦ المميزات المدمجة:\n`;
  result += `  │ • Runtime (signals, store, islands) — مدمج\n`;
  result += `  │ • TypeScript + JSX compiler — مدمج\n`;
  result += `  │ • HMR صفر-زمني — مدمج\n`;
  result += `  │ • Visual Builder — مدمج\n`;
  result += `  │ • Adapters: browser/cloudflare/vercel/deno/native — مدمجة\n`;
  result += `  │ • WebSocket (بدون npm ws) — مدمج\n`;
  result += `  ─────────────────────────────────────\n`;
  return result;
}
