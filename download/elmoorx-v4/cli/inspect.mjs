/**
 * elmoorx inspect <file> — يفحص ملف ويظهر معلوماته
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, basename, resolve } from 'node:path';
import { compile } from '../compiler/index.mjs';

export async function inspectFile(filePath, options = {}) {
  console.log(`\n  ✦ Elmoorx v4 — Inspect`);
  console.log(`  ─────────────────────────────────────`);

  const fullPath = resolve(filePath);
  if (!existsSync(fullPath)) {
    console.error(`  ✗ الملف غير موجود: ${filePath}`);
    process.exit(1);
  }

  const stat = statSync(fullPath);
  const ext = extname(fullPath).toLowerCase();
  const content = readFileSync(fullPath, 'utf8');

  console.log(`  │ الملف:      ${basename(fullPath)}`);
  console.log(`  │ المسار:     ${fullPath}`);
  console.log(`  │ الحجم:      ${formatBytes(stat.size)}`);
  console.log(`  │ النوع:      ${ext || 'غير معروف'}`);
  console.log(`  │ السطور:     ${content.split('\n').length}`);
  console.log(`  │ الكلمات:    ${content.split(/\s+/).filter(Boolean).length}`);
  console.log(`  │ الأحرف:     ${content.length}`);
  console.log(`  │ آخر تعديل:  ${stat.mtime.toLocaleString('ar')}`);

  // معلومات خاصة بالـ TS/TSX
  if (ext === '.ts' || ext === '.tsx' || ext === '.mtsx') {
    console.log(`  ─────────────────────────────────────`);
    console.log(`  │ تحليل TypeScript:`);

    // عدّ imports
    const imports = content.match(/^import\s+.*$/gm) || [];
    console.log(`  │ Imports:    ${imports.length}`);
    imports.forEach(imp => console.log(`  │   ${imp.trim().slice(0, 80)}`));

    // عدّ exports
    const exports = content.match(/^export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/gm) || [];
    console.log(`  │ Exports:    ${exports.length}`);

    // عدّ functions
    const functions = content.match(/(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g) || [];
    console.log(`  │ Functions:  ${functions.length}`);

    // عدّ interfaces و types
    const interfaces = content.match(/^interface\s+\w+/gm) || [];
    const types = content.match(/^type\s+\w+/gm) || [];
    console.log(`  │ Interfaces: ${interfaces.length}`);
    console.log(`  │ Types:      ${types.length}`);

    // إذا كان JSX
    if (ext === '.tsx') {
      const jsxElements = content.match(/<(\w+)/g) || [];
      console.log(`  │ JSX عناصر:  ${jsxElements.length}`);
    }

    // جرّب التجميع
    console.log(`  ─────────────────────────────────────`);
    console.log(`  │ تجربة التجميع:`);
    try {
      const start = performance.now();
      const compiled = compile(content, fullPath);
      const elapsed = (performance.now() - start).toFixed(2);
      console.log(`  │ ✓ نجح التجميع في ${elapsed}ms`);
      console.log(`  │ الحجم بعد التجميع: ${formatBytes(Buffer.byteLength(compiled))}`);
      console.log(`  │ نسبة الضغط: ${((1 - Buffer.byteLength(compiled) / content.length) * 100).toFixed(1)}%`);

      if (options.showOutput) {
        console.log(`  ─────────────────────────────────────`);
        console.log(`  │ الكود المُجمّع:`);
        console.log(compiled);
      }
    } catch (err) {
      console.log(`  │ ✗ فشل التجميع: ${err.message}`);
    }
  }

  // معلومات JSON
  if (ext === '.json') {
    try {
      const parsed = JSON.parse(content);
      console.log(`  ─────────────────────────────────────`);
      console.log(`  │ تحليل JSON:`);
      console.log(`  │ المفاتيح: ${Object.keys(parsed).length}`);
      console.log(`  │ النوع: ${Array.isArray(parsed) ? 'Array' : typeof parsed}`);
    } catch (err) {
      console.log(`  │ ✗ JSON غير صالح: ${err.message}`);
    }
  }

  console.log(`  ─────────────────────────────────────\n`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
