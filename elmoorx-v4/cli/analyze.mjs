/**
 * elmoorx analyze — يحلل حجم المشروع والإطار
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

export async function analyzeProject(options = {}) {
  const cwd = process.cwd();
  console.log(`\n  ✦ Elmoorx v4 — Analyze`);
  console.log(`  ─────────────────────────────────────`);

  // 1) حلل الـ src/
  const srcDir = join(cwd, 'src');
  if (existsSync(srcDir)) {
    console.log(`\n  │ 📁 src/`);
    const srcStats = analyzeDir(srcDir);
    printStats(srcStats);
  }

  // 2) حلل .elmoorx/
  const elmoorxDir = join(cwd, '.elmoorx');
  if (existsSync(elmoorxDir)) {
    console.log(`\n  │ 📁 .elmoorx/ (framework)`);
    const fwStats = analyzeDir(elmoorxDir);
    printStats(fwStats);
  }

  // 3) حلل dist/ إن وُجد
  const distDir = join(cwd, 'dist');
  if (existsSync(distDir)) {
    console.log(`\n  │ 📁 dist/ (build output)`);
    const distStats = analyzeDir(distDir);
    printStats(distStats);
  }

  // 4) حلل كل حزمة في الإطار
  console.log(`\n  │ 📦 packages breakdown`);
  if (existsSync(elmoorxDir)) {
    const packages = readdirSync(elmoorxDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const pkg of packages) {
      const pkgPath = join(elmoorxDir, pkg);
      const stats = analyzeDir(pkgPath);
      console.log(`  │   ${pkg.padEnd(15)} ${formatBytes(stats.totalSize).padStart(12)}  (${stats.fileCount} files)`);
    }
  }

  // 5) توزيع حسب النوع
  console.log(`\n  │ 📊 by file type`);
  const allFiles = [];
  if (existsSync(srcDir)) allFiles.push(...collectFiles(srcDir));
  if (existsSync(elmoorxDir)) allFiles.push(...collectFiles(elmoorxDir));
  const byType = {};
  for (const f of allFiles) {
    const ext = extname(f).toLowerCase() || 'no-ext';
    if (!byType[ext]) byType[ext] = { count: 0, size: 0 };
    byType[ext].count++;
    byType[ext].size += statSync(f).size;
  }
  for (const [ext, info] of Object.entries(byType).sort((a, b) => b[1].size - a[1].size)) {
    console.log(`  │   ${ext.padEnd(10)} ${formatBytes(info.size).padStart(12)}  (${info.count} files)`);
  }

  // 6) ملخص
  console.log(`\n  │ ملخص`);
  const totalSize = allFiles.reduce((sum, f) => sum + statSync(f).size, 0);
  const totalGzipped = Math.round(totalSize * 0.3); // تقديري
  console.log(`  │   الحجم الكلي:      ${formatBytes(totalSize).padStart(12)}`);
  console.log(`  │   مضغوط (~):        ${formatBytes(totalGzipped).padStart(12)}`);
  console.log(`  │   عدد الملفات:      ${String(allFiles.length).padStart(12)}`);
  console.log(`  ─────────────────────────────────────\n`);
}

function analyzeDir(dir) {
  const stats = { totalSize: 0, fileCount: 0, byType: {} };
  const walk = (d) => {
    const entries = readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else {
        const size = statSync(fullPath).size;
        stats.totalSize += size;
        stats.fileCount++;
        const ext = extname(entry.name).toLowerCase();
        if (!stats.byType[ext]) stats.byType[ext] = 0;
        stats.byType[ext] += size;
      }
    }
  };
  walk(dir);
  return stats;
}

function collectFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function printStats(stats) {
  console.log(`  │   الحجم: ${formatBytes(stats.totalSize)}`);
  console.log(`  │   الملفات: ${stats.fileCount}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
