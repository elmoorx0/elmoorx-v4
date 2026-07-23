/**
 * elmoorx upgrade — يحدّث الإطار لأحدث إصدار
 * يدعم:
 *   - تحديث من GitHub مباشرة
 *   - تحقق من الإصدار الحالي
 *   - تحديث انتقائي للحزم
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

export async function upgradeFramework(options = {}) {
  const cwd = process.cwd();
  const elmoorxDir = join(cwd, '.elmoorx');

  console.log(`\n  ✦ Elmoorx v4 — Upgrade`);
  console.log(`  ─────────────────────────────────────`);

  if (!existsSync(elmoorxDir)) {
    console.error(`  ✗ المشروع لا يحتوي على .elmoorx/`);
    console.error(`  شغّل: elmoorx init أولاً`);
    process.exit(1);
  }

  // 1) اقرأ الإصدار الحالي
  const currentVersion = readCurrentVersion(elmoorxDir);
  console.log(`  │ الإصدار الحالي: ${currentVersion}`);

  // 2) تحقق من أحدث إصدار
  const latestVersion = options.version || await fetchLatestVersion();
  console.log(`  │ أحدث إصدار: ${latestVersion}`);

  if (currentVersion === latestVersion && !options.force) {
    console.log(`  ✓ أنت على أحدث إصدار`);
    return;
  }

  // 3) حمّل الإصدار الجديد
  console.log(`  │ تحديث الإطار...`);

  if (options.fromLocal) {
    // نسخ من elmoorx-v4 محلي (للتطوير)
    console.log(`  │ النسخ من المصدر المحلي...`);
    copyFrameworkFiles(FRAMEWORK_ROOT, elmoorxDir);
  } else {
    // حمّل من GitHub
    try {
      const tmpDir = join(cwd, '.elmoorx-upgrade-tmp');
      if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });

      console.log(`  │ تنزيل ${latestVersion} من GitHub...`);
      execSync(`git clone --depth 1 --branch ${latestVersion} https://github.com/elmoorx0/elmoorx-v4.git ${tmpDir}`, {
        stdio: 'inherit',
      });

      copyFrameworkFiles(tmpDir, elmoorxDir);
      rmSync(tmpDir, { recursive: true });
    } catch (err) {
      console.error(`  ✗ فشل التنزيل: ${err.message}`);
      console.log(`  يمكنك التحديث يدوياً:`);
      console.log(`    git clone https://github.com/elmoorx0/elmoorx-v4.git`);
      console.log(`    cp -r elmoorx-v4/* .elmoorx/`);
      process.exit(1);
    }
  }

  // 4) حدّث package.json
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.elmoorx) pkg.elmoorx.version = latestVersion;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  console.log(`  ✓ تم التحديث إلى ${latestVersion}`);
  console.log(`  ─────────────────────────────────────\n`);
}

function readCurrentVersion(elmoorxDir) {
  // اقرأ من package.json أو من الـ cli
  const pkgPath = join(elmoorxDir, '..', 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (pkg.elmoorx?.version) return pkg.elmoorx.version;
  }
  return '4.0.0';
}

async function fetchLatestVersion() {
  // في الإنتاج: استخدم GitHub API
  // هنا نُرجع إصدار ثابت للـ demo
  try {
    const result = execSync('curl -s https://api.github.com/repos/elmoorx0/elmoorx-v4/releases/latest', {
      encoding: 'utf8',
      timeout: 5000,
    });
    const data = JSON.parse(result);
    return data.tag_name || '4.0.0';
  } catch {
    return '4.0.0';
  }
}

function copyFrameworkFiles(src, dst) {
  const packagesToCopy = [
    'runtime', 'compiler', 'cli', 'vendor',
    'router', 'ssr', 'i18n', 'http', 'testing', 'adapters',
    'store', 'forms', 'animation', 'database', 'realtime', 'pwa', 'ui',
    'graphql', 'charts', 'utils', 'markdown',
  ];
  for (const pkg of packagesToCopy) {
    const srcPath = join(src, pkg);
    const dstPath = join(dst, pkg);
    if (existsSync(srcPath)) {
      if (existsSync(dstPath)) rmSync(dstPath, { recursive: true });
      copyDirSync(srcPath, dstPath);
    }
  }
  // انسخ elmoorx.mjs
  copyFileSync(join(src, 'elmoorx.mjs'), join(dst, 'elmoorx.mjs'));
}

function copyDirSync(src, dst) {
  mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(srcPath, dstPath);
    else copyFileSync(srcPath, dstPath);
  }
}
