/**
 * elmoorx generate-readme — يولّد README.md من تحليل المشروع
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';

export async function generateReadme(options = {}) {
  const cwd = process.cwd();
  const { output = 'README.md', force = false } = options;

  console.log(`\n  ✦ Elmoorx v4 — Generate README`);
  console.log(`  ─────────────────────────────────────`);

  // تحقق من وجود README
  const readmePath = join(cwd, output);
  if (existsSync(readmePath) && !force) {
    console.error(`  ✗ ${output} موجود مسبقاً. استخدم --force للإضافة`);
    process.exit(1);
  }

  // اقرأ package.json
  let pkg = {};
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  }

  const name = pkg.name || basename(cwd);
  const version = pkg.version || '0.1.0';
  const description = pkg.description || 'تطبيق مبني على Elmoorx v4';

  // اجمع معلومات المشروع
  const stats = analyzeProject(cwd);
  console.log(`  │ المشروع: ${name}@${version}`);
  console.log(`  │ الملفات: ${stats.fileCount}`);
  console.log(`  │ السطور: ${stats.lineCount}`);

  // ابنِ README
  let md = '';

  // Title
  md += `# ${name}\n\n`;
  md += `> ${description}\n\n`;

  // Badges
  md += `[![Version](https://img.shields.io/badge/version-${version}-blue)]()\n`;
  md += `[![Elmoorx](https://img.shields.io/badge/Elmoorx-v4.0.0-success)]()\n`;
  md += `[![License](https://img.shields.io/badge/license-MIT-yellow)]()\n\n`;

  // Description
  md += `## الوصف\n\n`;
  md += `${description}.\n\n`;

  // Features (from analysis)
  if (stats.features.length > 0) {
    md += `## المميزات\n\n`;
    for (const f of stats.features) {
      md += `- ${f}\n`;
    }
    md += `\n`;
  }

  // Installation
  md += `## التثبيت\n\n`;
  md += `\`\`\`bash\n`;
  md += `git clone <repo-url>\n`;
  md += `cd ${name}\n`;
  md += `./elmoorx dev\n`;
  md += `\`\`\`\n\n`;

  // Usage
  md += `## الاستخدام\n\n`;
  md += `### التطوير\n\n`;
  md += `\`\`\`bash\n`;
  md += `./elmoorx dev --port=3000\n`;
  md += `\`\`\`\n\n`;
  md += `→ http://localhost:3000\n\n`;

  md += `### البناء\n\n`;
  md += `\`\`\`bash\n`;
  md += `./elmoorx build --target=browser\n`;
  md += `\`\`\`\n\n`;

  md += `### الاختبارات\n\n`;
  md += `\`\`\`bash\n`;
  md += `./elmoorx test\n`;
  md += `\`\`\`\n\n`;

  // Project structure
  md += `## هيكل المشروع\n\n`;
  md += `\`\`\`\n`;
  md += `${name}/\n`;
  for (const dir of stats.directories) {
    md += `├── ${dir}/\n`;
  }
  md += `├── src/\n`;
  md += `│   ├── index.tsx          # نقطة الدخول\n`;
  md += `│   ├── pages/             # الصفحات\n`;
  md += `│   └── components/        # المكونات\n`;
  md += `├── tests/                 # الاختبارات\n`;
  md += `├── public/                # ملفات ثابتة\n`;
  md += `├── index.html             # HTML الرئيسي\n`;
  md += `├── elmoorx                # مُشغّل CLI\n`;
  md += `├── elmoorx.config.mjs     # الإعدادات\n`;
  md += `└── package.json           # معلومات المشروع\n`;
  md += `\`\`\`\n\n`;

  // API endpoints (if any)
  if (stats.apiRoutes.length > 0) {
    md += `## API\n\n`;
    md += `| Method | Path | Description |\n`;
    md += `|--------|------|-------------|\n`;
    for (const route of stats.apiRoutes) {
      md += `| ${route.method} | \`${route.path}\` | ${route.description} |\n`;
    }
    md += `\n`;
  }

  // Dependencies
  md += `## التبعيات\n\n`;
  md += `هذا المشروع يستخدم **Elmoorx v4** — إطار عمل مستقل تماماً عن npm.\n\n`;
  md += `لا حاجة لـ \`npm install\` — كل التبعيات مدمجة في \`.elmoorx/\`.\n\n`;

  // Scripts
  if (pkg.scripts) {
    md += `## Scripts\n\n`;
    md += `| Script | Command | Description |\n`;
    md += `|--------|---------|-------------|\n`;
    for (const [key, cmd] of Object.entries(pkg.scripts)) {
      md += `| \`${key}\` | \`${cmd}\` | ${getScriptDescription(key)} |\n`;
    }
    md += `\n`;
  }

  // CLI Commands
  md += `## أوامر Elmoorx المتاحة\n\n`;
  md += `\`\`\`bash\n`;
  md += `./elmoorx dev                    # خادم تطوير + HMR\n`;
  md += `./elmoorx build --target=browser # بناء للإنتاج\n`;
  md += `./elmoorx test                   # تشغيل الاختبارات\n`;
  md += `./elmoorx bench                  # قياس الأداء\n`;
  md += `./elmoorx scan                   # فحص أمني\n`;
  md += `./elmoorx metrics                # تحليل الكود\n`;
  md += `./elmoorx doctor --fix           # فحص وإصلاح\n`;
  md += `./elmoorx --help                 # كل الأوامر\n`;
  md += `\`\`\`\n\n`;

  // Performance
  md += `## الأداء\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| الملفات | ${stats.fileCount} |\n`;
  md += `| السطور | ${stats.lineCount} |\n`;
  md += `| تبعيات npm | 0 |\n`;
  md += `| حجم .elmoorx/ | ${formatBytes(stats.frameworkSize)} |\n\n`;

  // License
  md += `## الترخيص\n\n`;
  md += `MIT © ${new Date().getFullYear()} ${pkg.author || name}\n`;

  writeFileSync(readmePath, md);

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ تم توليد ${output}`);
  console.log(`  │ الحجم: ${formatBytes(Buffer.byteLength(md))}`);
  console.log(`  ─────────────────────────────────────\n`);
}

function analyzeProject(rootDir) {
  const stats = {
    fileCount: 0,
    lineCount: 0,
    features: [],
    directories: [],
    apiRoutes: [],
    frameworkSize: 0,
  };

  const exclude = ['node_modules', '.git', '.elmoorx-test-cache', 'dist', '.cache'];

  // .elmoorx size
  const elmoorxDir = join(rootDir, '.elmoorx');
  if (existsSync(elmoorxDir)) {
    stats.frameworkSize = computeDirSize(elmoorxDir);
  }

  // analyze src/
  const walk = (dir, depth = 0) => {
    if (!existsSync(dir) || depth > 3) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (exclude.includes(entry.name)) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (depth === 1) stats.directories.push(entry.name);
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (['.ts', '.tsx', '.mjs', '.js', '.jsx'].includes(ext)) {
            stats.fileCount++;
            try {
              const content = readFileSync(fullPath, 'utf8');
              stats.lineCount += content.split('\n').length;
              // detect features
              if (content.includes('$state')) stats.features.push('Signals تفاعلية');
              if (content.includes('$store')) stats.features.push('Store عميق');
              if (content.includes('island(')) stats.features.push('Islands (zero-hydration)');
              if (content.includes('sanitize')) stats.features.push('حماية XSS تلقائية');
              if (content.includes('defineRoutes')) stats.features.push('Routing ديناميكي');
              if (content.includes('useAuth')) stats.features.push('مصادقة');
              if (content.includes('useRealtime')) stats.features.push('WebSocket realtime');
              if (content.includes('usePWA')) stats.features.push('PWA support');
            } catch {}
          }
          // detect API routes
          if (dir.includes('/api/') && ext === '.mjs') {
            try {
              const content = readFileSync(fullPath, 'utf8');
              const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
              for (const m of methods) {
                if (content.includes(`export function ${m.toLowerCase()}`) || content.includes(`export const ${m.toLowerCase()}`)) {
                  stats.apiRoutes.push({
                    method: m,
                    path: '/api/' + basename(entry.name, '.mjs'),
                    description: 'API endpoint',
                  });
                }
              }
            } catch {}
          }
        }
      }
    } catch {}
  };

  walk(join(rootDir, 'src'), 0);

  // deduplicate features
  stats.features = [...new Set(stats.features)];
  stats.directories = [...new Set(stats.directories)];

  return stats;
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
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getScriptDescription(key) {
  const descs = {
    dev: 'يبدأ خادم التطوير',
    build: 'يبني للإنتاج',
    serve: 'يخدم ملفات ثابتة',
    test: 'يشغّل الاختبارات',
    bench: 'يقيس الأداء',
    deploy: 'ينشر المشروع',
  };
  return descs[key] || 'script مخصص';
}
