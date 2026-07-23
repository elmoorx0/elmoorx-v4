/**
 * elmoorx deploy --target=<platform>
 * ينشر المشروع على المنصة المحددة
 *
 * المنصات المدعومة:
 *   - cloudflare (Workers)
 *   - vercel
 *   - netlify
 *   - deno (Deno Deploy)
 *   - node (أي VPS)
 *   - static (GitHub Pages, أي استضافة ثابتة)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { buildProject } from './build.mjs';

export async function deployProject(target, options = {}) {
  const cwd = process.cwd();
  const projectName = basename(cwd);

  console.log(`\n  ✦ Elmoorx v4 — Deploy`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ الهدف: ${target}`);
  console.log(`  │ المشروع: ${projectName}`);

  // 1) build أولاً
  console.log(`  │ بناء المشروع...`);
  const outDir = options.out || 'dist';
  await buildProject(cwd, { target, outDir });

  const distPath = join(cwd, outDir);
  if (!existsSync(distPath)) {
    console.error(`  ✗ فشل البناء — مجلد ${outDir} غير موجود`);
    process.exit(1);
  }

  // 2) deploy حسب المنصة
  console.log(`  │ النشر على ${target}...`);

  switch (target) {
    case 'cloudflare':
      return deployCloudflare(distPath, projectName, options);
    case 'vercel':
      return deployVercel(distPath, projectName, options);
    case 'netlify':
      return deployNetlify(distPath, projectName, options);
    case 'deno':
      return deployDeno(distPath, projectName, options);
    case 'node':
      return deployNode(distPath, projectName, options);
    case 'static':
    case 'pages':
      return deployStatic(distPath, projectName, options);
    default:
      console.error(`  ✗ هدف غير معروف: ${target}`);
      console.error(`  الأهداف المدعومة: cloudflare, vercel, netlify, deno, node, static`);
      process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLOUDFLARE WORKERS
// ─────────────────────────────────────────────────────────────────────────────

async function deployCloudflare(distPath, projectName, options) {
  // تحقق من wrangler
  const hasWrangler = checkCommand('wrangler') || checkCommand('npx');

  if (!hasWrangler) {
    console.log(`  ⚠ wrangler غير مُثبّت`);
    console.log(`  للتثبيت: curl -fsSL https://get.cloudflare.com/wrangler | sh`);
    console.log(`  أو نزّله من: https://github.com/cloudflare/workers-sdk/releases`);
    console.log(`\n  بعد التثبيت، شغّل:`);
    console.log(`    cd ${distPath}`);
    console.log(`    wrangler deploy\n`);
    return;
  }

  // أنشئ wrangler.toml إذا لم يوجد
  const tomlPath = join(distPath, 'wrangler.toml');
  if (!existsSync(tomlPath)) {
    writeFileSync(tomlPath, `name = "${projectName}"\nmain = "worker.js"\ncompatibility_date = "2024-01-01"\n`);
  }

  // شغّل wrangler deploy
  try {
    if (checkCommand('wrangler')) {
      execSync('wrangler deploy', { cwd: distPath, stdio: 'inherit' });
    } else {
      execSync('npx wrangler deploy', { cwd: distPath, stdio: 'inherit' });
    }
    console.log(`\n  ✓ تم النشر على Cloudflare Workers!\n`);
  } catch (err) {
    console.error(`  ✗ فشل النشر: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VERCEL
// ─────────────────────────────────────────────────────────────────────────────

async function deployVercel(distPath, projectName, options) {
  // تحقق من vercel CLI
  if (!checkCommand('vercel')) {
    console.log(`  ⚠ vercel CLI غير مُثبّت`);
    console.log(`  للتثبيت: curl -fsSL https://vercel.com/install | bash`);
    console.log(`\n  بعد التثبيت، شغّل:`);
    console.log(`    cd ${distPath}`);
    console.log(`    vercel --prod\n`);
    return;
  }

  try {
    execSync('vercel --prod --yes', { cwd: distPath, stdio: 'inherit' });
    console.log(`\n  ✓ تم النشر على Vercel!\n`);
  } catch (err) {
    console.error(`  ✗ فشل النشر: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NETLIFY
// ─────────────────────────────────────────────────────────────────────────────

async function deployNetlify(distPath, projectName, options) {
  if (!checkCommand('netlify')) {
    console.log(`  ⚠ netlify CLI غير مُثبّت`);
    console.log(`  للتثبيت: curl -fsSL https://www.netlify.com/install | bash`);
    console.log(`\n  بعد التثبيت، شغّل:`);
    console.log(`    cd ${distPath}`);
    console.log(`    netlify deploy --prod --dir=.\n`);
    return;
  }

  try {
    execSync('netlify deploy --prod --dir=.', { cwd: distPath, stdio: 'inherit' });
    console.log(`\n  ✓ تم النشر على Netlify!\n`);
  } catch (err) {
    console.error(`  ✗ فشل النشر: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DENO DEPLOY
// ─────────────────────────────────────────────────────────────────────────────

async function deployDeno(distPath, projectName, options) {
  if (!checkCommand('deno')) {
    console.log(`  ⚠ deno غير مُثبّت`);
    console.log(`  للتثبيت: curl -fsSL https://deno.land/install.sh | sh`);
    console.log(`\n  بعد التثبيت، شغّل:`);
    console.log(`    cd ${distPath}`);
    console.log(`    deno deploy\n`);
    return;
  }

  try {
    execSync('deno deploy', { cwd: distPath, stdio: 'inherit' });
    console.log(`\n  ✓ تم النشر على Deno Deploy!\n`);
  } catch (err) {
    console.error(`  ✗ فشل النشر: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NODE (VPS)
// ─────────────────────────────────────────────────────────────────────────────

async function deployNode(distPath, projectName, options) {
  const host = options.host || options.ssh;
  if (!host) {
    console.log(`  ⚠ يحتاج --host أو --ssh=user@ip`);
    console.log(`  مثال: elmoorx deploy --target=node --ssh=root@example.com\n`);
    return;
  }

  console.log(`  │ النشر على ${host}...`);

  // rsync
  const cmd = `rsync -avz --delete ${distPath}/ ${host}:/var/www/${projectName}/`;
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`\n  ✓ تم النشر على ${host}!`);
    console.log(`  ابدأ الخادم: ssh ${host} "cd /var/www/${projectName} && node server.mjs"\n`);
  } catch (err) {
    console.error(`  ✗ فشل النشر: ${err.message}`);
    console.log(`  يمكنك النشر يدوياً: ${cmd}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC (GitHub Pages, أي استضافة ثابتة)
// ─────────────────────────────────────────────────────────────────────────────

async function deployStatic(distPath, projectName, options) {
  console.log(`  ✓ الملفات جاهزة في: ${distPath}`);
  console.log(`\n  خيارات النشر:`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  • GitHub Pages:`);
  console.log(`    gh-pages -d ${distPath}`);
  console.log(`    أو: ارفع مجلد ${distPath} إلى فرع gh-pages`);
  console.log(`\n  • أي FTP/SFTP:`);
  console.log(`    ارفع كل ملفات ${distPath} إلى public_html/`);
  console.log(`\n  • AWS S3:`);
  console.log(`    aws s3 sync ${distPath} s3://your-bucket/ --acl public-read`);
  console.log(`\n  • Netlify Drop:`);
  console.log(`    اسحب مجلد ${distPath} إلى https://app.netlify.com/drop\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function checkCommand(cmd) {
  try {
    execSync(`which ${cmd} 2>/dev/null`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
