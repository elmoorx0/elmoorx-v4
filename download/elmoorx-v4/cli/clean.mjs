/**
 * elmoorx clean — ينظف ملفات البناء والمؤقتة
 */
import { existsSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function cleanProject(options = {}) {
  const cwd = process.cwd();
  const targets = [
    { name: 'dist/', path: join(cwd, 'dist'), size: 0 },
    { name: '.cache/', path: join(cwd, '.cache'), size: 0 },
    { name: '.elmoorx-test-cache/', path: join(cwd, '.elmoorx-test-cache'), size: 0 },
    { name: 'node_modules/.cache/', path: join(cwd, 'node_modules', '.cache'), size: 0 },
    { name: '*.log', path: join(cwd, '*.log'), size: 0, glob: true },
  ];

  console.log(`\n  ✦ Elmoorx v4 — Clean`);
  console.log(`  ─────────────────────────────────────`);

  let totalFreed = 0;
  let removed = 0;

  for (const target of targets) {
    if (target.glob) {
      // ابحث عن ملفات *.log
      const dir = target.path.replace(/\/[^/]+$/, '');
      const pattern = target.path.split('/').pop();
      if (existsSync(dir)) {
        const files = readdirSync(dir);
        for (const f of files) {
          if (f.endsWith('.log')) {
            const file = join(dir, f);
            const size = statSync(file).size;
            rmSync(file);
            totalFreed += size;
            removed++;
            console.log(`  ✓ حذف ${file} (${formatBytes(size)})`);
          }
        }
      }
    } else if (existsSync(target.path)) {
      const size = computeDirSize(target.path);
      rmSync(target.path, { recursive: true, force: true });
      totalFreed += size;
      removed++;
      console.log(`  ✓ حذف ${target.name} (${formatBytes(size)})`);
    }
  }

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ تم حذف ${removed} عناصر`);
  console.log(`  │ تم تحرير ${formatBytes(totalFreed)} من المساحة\n`);
}

function computeDirSize(dir) {
  let total = 0;
  const walk = (d) => {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const p = join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else total += statSync(p).size;
      }
    } catch {}
  };
  walk(dir);
  return total;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
