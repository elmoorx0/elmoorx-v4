/**
 * elmoorx watch — يراقب التغييرات ويعيد البناء تلقائياً
 */
import { watch, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { buildProject } from './build.mjs';

export async function watchProject(options = {}) {
  const cwd = process.cwd();
  const { target = 'browser', outDir = 'dist', debounce = 300 } = options;

  console.log(`\n  ✦ Elmoorx v4 — Watch Mode`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المجلد: ${cwd}`);
  console.log(`  │ الهدف: ${target}`);
  console.log(`  │ الإخراج: ${outDir}`);
  console.log(`  │ التأخير: ${debounce}ms`);

  let building = false;
  let pending = false;
  let timeoutId = null;

  const triggerBuild = async () => {
    if (building) {
      pending = true;
      return;
    }
    building = true;
    console.log(`\n  ${new Date().toLocaleTimeString('ar')} │ إعادة البناء...`);
    try {
      await buildProject(cwd, { target, outDir });
      console.log(`  ${new Date().toLocaleTimeString('ar')} │ ✓ اكتمل`);
    } catch (err) {
      console.error(`  ${new Date().toLocaleTimeString('ar')} │ ✗ خطأ: ${err.message}`);
    }
    building = false;
    if (pending) {
      pending = false;
      setTimeout(triggerBuild, 100);
    }
  };

  const handleChange = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(triggerBuild, debounce);
  };

  // راقب المجلدات
  const watchDirs = ['src', 'public', 'index.html'];
  for (const dir of watchDirs) {
    const fullPath = join(cwd, dir);
    if (existsSync(fullPath)) {
      watchDir(fullPath, handleChange);
      console.log(`  │ مراقبة: ${dir}/`);
    }
  }

  console.log(`  ─────────────────────────────────────`);
  console.log(`  ✓ وضع المراقبة نشط — اضغط Ctrl+C للإيقاف\n`);

  // بناء أولي
  await triggerBuild();
}

function watchDir(dir, callback) {
  if (!existsSync(dir)) return;
  try {
    watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      // تخطّي node_modules و .elmoorx
      if (filename.includes('node_modules') || filename.includes('.elmoorx')) return;
      // فقط ملفات معروفة
      const ext = extname(filename).toLowerCase();
      if (['.ts', '.tsx', '.mjs', '.js', '.css', '.html', '.json'].includes(ext)) {
        callback();
      }
    });
  } catch (err) {
    // recursive قد لا يعمل على بعض الأنظمة — راقب كل ملف
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          watchDir(join(dir, entry.name), callback);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (['.ts', '.tsx', '.mjs', '.js', '.css', '.html', '.json'].includes(ext)) {
            try {
              watch(join(dir, entry.name), { persistent: false }, callback);
            } catch {}
          }
        }
      }
    } catch {}
  }
}
