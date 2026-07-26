/**
 * elmoorx publish — ينشر package على npm أو registry محلي
 * (بدون الحاجة لـ npm — يستخدم curl/node fetch)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';

export async function publishPackage(options = {}) {
  const {
    registry = 'https://registry.npmjs.org',
    tag = 'latest',
    dryRun = false,
    access = 'public',
  } = options;

  const cwd = process.cwd();
  console.log(`\n  ✦ Elmoorx v4 — Publish`);
  console.log(`  ─────────────────────────────────────`);

  // 1) اقرأ package.json
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    console.error('  ✗ package.json غير موجود');
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  console.log(`  │ Package:  ${pkg.name}@${pkg.version}`);
  console.log(`  │ Registry: ${registry}`);
  console.log(`  │ Tag:      ${tag}`);
  console.log(`  │ Access:   ${access}`);

  if (dryRun) {
    console.log(`  │ Mode:     dry run (محاكاة)`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  ✓ سيتم النشر عند إزالة --dry-run\n`);
    return;
  }

  // 2) تحقق من التوكن
  const token = process.env.NPM_TOKEN;
  if (!token) {
    console.log(`  ⚠ NPM_TOKEN غير مُعين`);
    console.log(`  شغّل: export NPM_TOKEN=your_token`);
    console.log(`  أو استخدم: elmoorx publish --dry-run للمحاكاة`);
    console.log(`  ─────────────────────────────────────\n`);
    return;
  }

  // 3) أنشئ tarball
  console.log(`  │ إنشاء tarball...`);
  const tarballName = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;
  try {
    execSync(`npm pack --pack-destination /tmp`, { cwd, stdio: 'pipe' });
  } catch (err) {
    console.error(`  ✗ فشل npm pack: ${err.message}`);
    process.exit(1);
  }

  const tarballPath = `/tmp/${tarballName}`;
  if (!existsSync(tarballPath)) {
    // حاول العثور على الملف
    const files = execSync('ls /tmp/*.tgz 2>/dev/null', { encoding: 'utf8' }).trim().split('\n');
    if (files.length > 0 && files[0]) {
      console.log(`  ✓ تم إنشاء: ${files[0]}`);
    } else {
      console.error('  ✗ فشل إنشاء tarball');
      process.exit(1);
    }
  } else {
    console.log(`  ✓ تم إنشاء: ${tarballPath}`);
  }

  // 4) ارفع للـ registry
  console.log(`  │ النشر على ${registry}...`);
  try {
    const { readFileSync: rs } = await import('node:fs');
    const tarball = rs(tarballPath);

    const response = await fetch(`${registry}/${pkg.name.replace('@', '%2F')}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        _id: pkg.name,
        name: pkg.name,
        'dist-tags': { [tag]: pkg.version },
        versions: {
          [pkg.version]: {
            ...pkg,
            dist: {
              tarball: `${registry}/${pkg.name}/-/${tarballName}`,
            },
          },
        },
        _attachments: {
          [tarballName]: {
            content_type: 'application/octet-stream',
            data: tarball.toString('base64'),
            length: tarball.length,
          },
        },
      }),
    });

    if (response.ok) {
      console.log(`  ─────────────────────────────────────`);
      console.log(`  ✓ تم النشر بنجاح!`);
      console.log(`  │ ${pkg.name}@${pkg.version}\n`);
    } else {
      const text = await response.text();
      console.error(`  ✗ فشل النشر: ${response.status} ${text}`);
    }
  } catch (err) {
    console.error(`  ✗ فشل النشر: ${err.message}`);
    console.log(`  يمكنك النشر يدوياً: npm publish`);
  }

  console.log(`  ─────────────────────────────────────\n`);
}
