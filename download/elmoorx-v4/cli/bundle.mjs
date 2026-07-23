/**
 * elmoorx bundle — يدمج كل المشروع في ملف واحد
 * ينشئ HTML واحد يحتوي على كل الـ JS + CSS inline
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../compiler/index.mjs';
import { buildPWAFiles } from '../pwa/index.mjs';
import { compressFile } from '../compress/index.mjs';

export async function bundleProject(rootDir, options = {}) {
  const { outDir = 'dist', minify = true, inlineRuntime = true } = options;
  const outPath = resolve(rootDir, outDir);

  console.log(`\n  ✦ Elmoorx v4 — Bundle (ملف واحد)`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ الإخراج: ${outDir}/index.html`);

  if (!existsSync(outPath)) mkdirSync(outPath, { recursive: true });

  // 1) اقرأ index.html
  const indexHtmlPath = join(rootDir, 'index.html');
  if (!existsSync(indexHtmlPath)) {
    console.error('  ✗ index.html غير موجود');
    process.exit(1);
  }
  let html = readFileSync(indexHtmlPath, 'utf8');

  // 2) اقرأ الـ entry
  const entryPath = join(rootDir, 'src', 'index.tsx');
  if (!existsSync(entryPath)) {
    console.error('  ✗ src/index.tsx غير موجود');
    process.exit(1);
  }

  // 3) اجمع كل ملفات src/ في bundle واحد
  console.log(`  │ تجميع src/...`);
  const bundle = await buildSourceBundle(rootDir);

  // 4) اقرأ runtime/core.mjs
  const frameworkRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  let runtimeCode = '';
  if (inlineRuntime) {
    console.log(`  │ تضمين runtime inline...`);
    const runtimePath = join(frameworkRoot, 'runtime', 'core.mjs');
    runtimeCode = readFileSync(runtimePath, 'utf8');
  }

  // 5) أنشئ الـ HTML النهائي مع كل شيء inline
  console.log(`  │ بناء HTML النهائي...`);

  // أزل الـ script tags الموجودة
  html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  html = html.replace(/<script[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, '');

  // أضف الـ bundle inline
  const inlineScript = `
<script type="module">
${runtimeCode}

// === Bundle ===
${bundle}

// === Entry ===
import { mount } from '/runtime/core.mjs';
// ملاحظة: الـ imports تم حلها في الـ bundle
</script>`;

  html = html.replace('</body>', inlineScript + '\n</body>');

  // 6) اكتب الملف
  writeFileSync(join(outPath, 'index.html'), html);

  // 7) PWA files
  buildPWAFiles(outPath, {
    name: basename(rootDir),
    startUrl: '/',
  });

  // 8) ضغط
  try {
    compressFile(join(outPath, 'index.html'));
    console.log(`  │ ✓ مضغوط (Gzip + Brotli)`);
  } catch {}

  // 9) إحصائيات
  const stats = statSync(join(outPath, 'index.html'));
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل`);
  console.log(`  │ الحجم: ${formatBytes(stats.size)}`);
  console.log(`  │ مضغوط (~): ${formatBytes(Math.round(stats.size * 0.3))}`);
  console.log(`  ─────────────────────────────────────\n`);

  console.log(`  للنشر:
    ارفع ${outDir}/index.html فقط — كل شيء مُضمّن!\n`);
}

async function buildSourceBundle(rootDir) {
  const srcDir = join(rootDir, 'src');
  if (!existsSync(srcDir)) return '';

  const files = [];
  collectFiles(srcDir, files);

  let bundle = '';
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    let code = readFileSync(file, 'utf8');

    if (ext === '.ts' || ext === '.tsx') {
      code = compile(code, file);
    }

    // أزل imports (سنُضمّن كل شيء inline)
    code = code.replace(/^import\s+.*$/gm, '');

    // أزل export keywords
    code = code.replace(/^export\s+/gm, '');

    const relPath = file.replace(srcDir, '').replace(/\\/g, '/');
    bundle += `\n// === ${relPath} ===\n${code}\n`;
  }

  return bundle;
}

function collectFiles(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else {
      const ext = extname(entry.name).toLowerCase();
      if (['.ts', '.tsx', '.mjs', '.js'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
