/**
 * elmoorx build — يبني المشروع للإنتاج
 * يدعم: browser | cloudflare | vercel | deno | native
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname, relative, basename } from 'node:path';
import { compile } from '../compiler/index.mjs';

const RUNTIME_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function buildProject(rootDir, options = {}) {
  const { target = 'browser', outDir = 'dist' } = options;
  const outPath = resolve(rootDir, outDir);
  console.log(`\n  ✦ Elmoorx v4 — Build`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ الهدف: ${target}`);
  console.log(`  │ الإخراج: ${outDir}`);

  if (existsSync(outPath)) {
    // clean
    console.log(`  │ تنظيف المخرجات السابقة...`);
  }
  mkdirSync(outPath, { recursive: true });

  // 1) نسخ runtime
  console.log(`  │ نسخ الـ runtime...`);
  copyDir(join(RUNTIME_DIR, 'runtime'), join(outPath, 'runtime'));

  // 2) نسخ vendor
  if (existsSync(join(RUNTIME_DIR, 'vendor'))) {
    copyDir(join(RUNTIME_DIR, 'vendor'), join(outPath, 'vendor'));
  }

  // 3) تجميع src/
  const srcDir = join(rootDir, 'src');
  if (existsSync(srcDir)) {
    console.log(`  │ تجميع src/...`);
    compileDir(srcDir, join(outPath, 'src'), {
      treeshake: target !== 'node', // لا تهز في node للتوافق
      minify: target !== 'node',    // لا تصغّر في node
    });
  }

  // 4) نسخ public/
  const publicDir = join(rootDir, 'public');
  if (existsSync(publicDir)) {
    copyDir(publicDir, outPath);
  }

  // 5) تجميع الـ index.html
  const indexHtml = join(rootDir, 'index.html');
  if (existsSync(indexHtml)) {
    let html = readFileSync(indexHtml, 'utf8');
    // في الإنتاج:
    // - استبدل /.elmoorx/ بـ /
    html = html.replace(/\/\.elmoorx\//g, '/');
    // - استبدل .tsx بـ .mjs (ملفات مُجمّعة)
    html = html.replace(/(\/src\/[^'"]+)\.tsx/g, '$1.mjs');
    html = html.replace(/(\/src\/[^'"]+)\.ts(?!\w)/g, '$1.mjs');
    // - أزل HMR client script tag
    html = html.replace(/<script[^>]*\/__hmr_client__\.mjs[^>]*><\/script>\s*/g, '');
    // - أزل initHMR من imports لكن أبقِ الباقي (mount, hydrateIslands)
    html = html.replace(/import\s*\{([^}]*)\}\s*from\s*['"]\/runtime\/core\.mjs['"];?/g, (m, imports) => {
      const kept = imports.split(',').map(s => s.trim()).filter(s => s && s !== 'initHMR');
      return kept.length > 0 ? `import { ${kept.join(', ')} } from '/runtime/core.mjs';` : '';
    });
    // - أزل استدعاء initHMR
    html = html.replace(/initHMR\([^)]*\);?\s*/g, '');
    writeFileSync(join(outPath, 'index.html'), html);
  }

  // 6) توليد ملفات خاصة بالهدف
  await generateTargetFiles(target, outPath, rootDir);

  // 7) توليد ملفات PWA
  console.log(`  │ توليد ملفات PWA...`);
  const { buildPWAFiles } = await import('../pwa/index.mjs');
  buildPWAFiles(outPath, {
    name: rootDir.split('/').pop() || 'Elmoorx App',
    startUrl: '/',
  });

  // 8) ضغط الملفات (Gzip + Brotli)
  if (target !== 'node') {
    console.log(`  │ ضغط الملفات (Gzip + Brotli)...`);
    try {
      const { compressDir, printCompressionStats } = await import('../compress/index.mjs');
      const results = compressDir(outPath);
      const stats = printCompressionStats(results);
      console.log(`  │ ✓ ملفات مضغوطة: ${stats.fileCount} ملف`);
      console.log(`  │ Gzip: ${stats.gzipSavings} توفير`);
      console.log(`  │ Brotli: ${stats.brotliSavings} توفير`);
    } catch (err) {
      console.log(`  │ ⚠ تخطي الضغط: ${err.message}`);
    }
  }

  // 9) CSS extraction — استخراج الأنماط من المكونات إلى ملف .css
  console.log(`  │ استخراج CSS...`);
  try {
    const cssContent = extractCSSFromBuild(outPath);
    if (cssContent) {
      writeFileSync(join(outPath, 'styles.css'), cssContent);
      // أضف <link> للـ CSS في index.html
      const indexPath = join(outPath, 'index.html');
      if (existsSync(indexPath)) {
        let html = readFileSync(indexPath, 'utf8');
        if (!html.includes('styles.css')) {
          html = html.replace('</head>', '<link rel="stylesheet" href="/styles.css"></head>');
          writeFileSync(indexPath, html);
        }
      }
      console.log(`  │ ✓ styles.css (${formatBytes(Buffer.byteLength(cssContent))})`);
    }
  } catch (err) {
    console.log(`  │ ⚠ CSS extraction: ${err.message}`);
  }

  // 10) إحصائيات
  const stats = computeStats(outPath);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل`);
  console.log(`  │ الحجم الكلي: ${formatBytes(stats.totalSize)}`);
  console.log(`  │ الملفات: ${stats.fileCount}`);
  console.log(`  │ مضغوط (~): ${formatBytes(stats.totalSize * 0.35)}\n`);

  console.log(`  للنشر:
    ${getDeployInstructions(target, outDir)}\n`);
}

async function compileDir(srcDir, outDir, options = {}) {
  if (!existsSync(srcDir)) return;
  mkdirSync(outDir, { recursive: true });
  const entries = readdirSync(srcDir, { withFileTypes: true });

  // حمّل minifier و treeshake مرة واحدة
  let minifyFn, shakeFn;
  try { ({ minify: minifyFn } = await import('../minifier/index.mjs')); } catch {}
  try { ({ shake: shakeFn } = await import('../treeshake/index.mjs')); } catch {}

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    const outPath = join(outDir, entry.name);
    if (entry.isDirectory()) {
      await compileDir(srcPath, outPath, options);
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ext === '.ts' || ext === '.tsx' || ext === '.mtsx') {
        let compiled = compile(readFileSync(srcPath, 'utf8'), srcPath);
        compiled = compiled.replace(/\/\.elmoorx\/runtime\//g, '/runtime/')
                           .replace(/\/\.elmoorx\/vendor\//g, '/vendor/');

        if (options.treeshake !== false && shakeFn) {
          try {
            const result = shakeFn(compiled);
            compiled = result.code;
          } catch {}
        }

        if (options.minify !== false && minifyFn) {
          try {
            const result = minifyFn(compiled);
            compiled = result.code;
          } catch {}
        }

        writeFileSync(outPath.replace(/\.\w+$/, '.mjs'), compiled);
      } else if (ext === '.mjs' || ext === '.js') {
        let compiled = compile(readFileSync(srcPath, 'utf8'), srcPath);
        compiled = compiled.replace(/\/\.elmoorx\/runtime\//g, '/runtime/')
                           .replace(/\/\.elmoorx\/vendor\//g, '/vendor/');

        if (options.minify !== false && minifyFn) {
          try {
            const result = minifyFn(compiled);
            compiled = result.code;
          } catch {}
        }

        writeFileSync(outPath, compiled);
      } else {
        writeFileSync(outPath, readFileSync(srcPath));
      }
    }
  }
}

function copyDir(src, dst) {
  if (!existsSync(src)) return;
  mkdirSync(dst, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const dstPath = join(dst, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, dstPath);
    else writeFileSync(dstPath, readFileSync(srcPath));
  }
}

async function generateTargetFiles(target, outPath, rootDir) {
  switch (target) {
    case 'browser':
      writeFileSync(join(outPath, 'vercel.json'), JSON.stringify({
        buildCommand: null,
        outputDirectory: '.',
        rewrites: [{ source: '/(.*)', destination: '/index.html' }],
      }, null, 2));
      break;

    case 'cloudflare':
      // Cloudflare Workers — نقطة دخول واحدة
      writeFileSync(join(outPath, 'worker.js'), generateCloudflareWorker());
      writeFileSync(join(outPath, 'wrangler.toml'), `name = "elmoorx-app"\nmain = "worker.js"\ncompatibility_date = "2024-01-01"\n`);
      break;

    case 'vercel':
      writeFileSync(join(outPath, 'vercel.json'), JSON.stringify({
        version: 2,
        buildCommand: null,
        outputDirectory: '.',
        routes: [{ src: '/(.*)', dest: '/index.html' }],
      }, null, 2));
      break;

    case 'deno':
      writeFileSync(join(outPath, 'deno.json'), JSON.stringify({
        tasks: { start: 'deno run --allow-net --allow-read server.ts' },
      }, null, 2));
      writeFileSync(join(outPath, 'server.ts'), generateDenoServer());
      break;

    case 'native':
      // iOS/Android عبر WebView + Capacitor-style
      mkdirSync(join(outPath, 'native', 'ios'), { recursive: true });
      mkdirSync(join(outPath, 'native', 'android'), { recursive: true });
      writeFileSync(join(outPath, 'native', 'capacitor.config.json'), JSON.stringify({
        appId: 'app.elmoorx',
        appName: 'ElmoorxApp',
        webDir: '..',
        bundledWebRuntime: false,
      }, null, 2));
      writeFileSync(join(outPath, 'native', 'README.md'),
        `# Native Build\n\nللبناء على iOS/Android:\n\n1. ثبّت Xcode (iOS) أو Android Studio\n2. استخدم WebView لتحميل ملفات dist/\n3. أو استخدم Capacitor/Cordova لتغليف التطبيق\n\nالميزة: نفس كود المتصفح يعمل على الـ native بدون تغيير.`);
      break;

    case 'node':
      writeFileSync(join(outPath, 'server.mjs'), generateNodeServer());
      break;
  }
}

function generateCloudflareWorker() {
  return `// Cloudflare Workers adapter — Elmoorx v4
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // خدمة الملفات الثابتة من الـ bundle
    if (path === '/' || path === '/index.html') {
      return new Response(INDEX_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (path === '/runtime/core.mjs') {
      return new Response(RUNTIME_CORE, { headers: { 'Content-Type': 'application/javascript' } });
    }
    // TODO: serve more assets

    return new Response('Not Found', { status: 404 });
  },
};
`;
}

function generateDenoServer() {
  return `// Deno Deploy adapter — Elmoorx v4
import { serveDir } from "https://deno.land/std/http/file_server.ts";

Deno.serve((req: Request) => {
  return serveDir(req, {
    fsRoot: '.',
    showIndex: true,
  });
});
`;
}

function generateNodeServer() {
  return `// Node.js production server — Elmoorx v4
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const PORT = process.env.PORT || 3000;
const ROOT = import.meta.dirname;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  let path = new URL(req.url, 'http://x').pathname;
  if (path === '/') path = '/index.html';
  const file = join(ROOT, path);
  if (existsSync(file)) {
    const ext = extname(file);
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(PORT, () => {
  console.log(\`→ http://localhost:\${PORT}\`);
});
`;
}

function getDeployInstructions(target, outDir) {
  const instructions = {
    browser: `rsync -avz ${outDir}/ user@server:/var/www/html/`,
    cloudflare: `cd ${outDir} && npx wrangler deploy  (أو: wrangler deploy)`,
    vercel: `cd ${outDir} && vercel --prod  (أو: ارفع المجلد لـ Vercel)`,
    deno: `cd ${outDir} && deno deploy`,
    native: `افتح ${outDir}/native/ في Xcode أو Android Studio`,
    node: `node ${outDir}/server.mjs`,
  };
  return instructions[target] || instructions.browser;
}

function computeStats(dir) {
  let totalSize = 0;
  let fileCount = 0;
  const walk = (d) => {
    const entries = readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { totalSize += statSync(p).size; fileCount++; }
    }
  };
  walk(dir);
  return { totalSize, fileCount };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// استخراج CSS من ملفات JS المبنية
function extractCSSFromBuild(distPath) {
  const collectedCSS = [];
  const classRegistry = new Map(); // hash → class name
  let classCounter = 0;

  const walk = (dir) => {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')) {
          const content = readFileSync(fullPath, 'utf8');

          // 1) استخراج CSS imports صريحة
          const cssImportMatch = content.match(/import\s+['"]\.\/[^'"]*\.css['"]/g);
          if (cssImportMatch) {
            for (const imp of cssImportMatch) {
              const cssPath = imp.match(/['"]([^'"]+)['"]/)[1];
              const resolvedPath = join(dirname(fullPath), cssPath);
              if (existsSync(resolvedPath)) {
                collectedCSS.push(readFileSync(resolvedPath, 'utf8'));
              }
            }
          }

          // 2) استخراج <style> blocks داخل tagged templates أو strings
          // pattern: css`...` أو styled`...` أو `<style>...</style>`
          const templateLiteralCSS = content.matchAll(/(?:css|styled|styles?)\s*`([^`]+)`/g);
          for (const m of templateLiteralCSS) {
            const cssContent = m[1].trim();
            if (cssContent && cssContent.includes('{') && cssContent.includes('}')) {
              collectedCSS.push(cssContent);
            }
          }

          // 3) استخراج inline styles من كائنات style: { ... }
          // حوّلها إلى utility classes تلقائياً
          const styleObjPattern = /style\s*:\s*\{([^}]+)\}/g;
          let styleMatch;
          while ((styleMatch = styleObjPattern.exec(content)) !== null) {
            const styleBody = styleMatch[1];
            // تجاهل الكائنات الديناميكية (تحتوي على متغيرات)
            if (/\$\{|\bvar\b|\bfn\b|\bfunc\b/.test(styleBody)) continue;
            const hash = hashString(styleBody);
            if (classRegistry.has(hash)) continue;
            const className = `ex${(classCounter++).toString(36)}_${hash.slice(0, 6)}`;
            classRegistry.set(hash, className);
            // حوّل camelCase إلى kebab-case وأضف وحدة px إذا لزم
            const cssRules = styleBody
              .split(',')
              .map(rule => {
                const [k, v] = rule.split(':').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
                if (!k || !v) return null;
                const prop = k.replace(/([A-Z])/g, '-$1').toLowerCase();
                // إذا كانت القيمة رقمية، أضف px (إلا لخصائص معينة)
                const isUnitless = /^(opacity|zIndex|fontWeight|flexGrow|flexShrink|lineHeight|order|animationIterationCount)$/.test(prop);
                const value = /^\d+$/.test(v) && !isUnitless ? v + 'px' : v;
                return `${prop}:${value}`;
              })
              .filter(Boolean)
              .join(';');
            if (cssRules) {
              collectedCSS.push(`.${className}{${cssRules}}`);
            }
          }

          // 4) استخراج style strings من style: "..." — حوّلها إلى classes
          const styleStrPattern = /style\s*:\s*['"`]([^'"`]+)['"`]/g;
          let strMatch;
          while ((strMatch = styleStrPattern.exec(content)) !== null) {
            const styleStr = strMatch[1].trim();
            if (!styleStr || styleStr.length < 3) continue;
            const hash = hashString(styleStr);
            if (classRegistry.has(hash)) continue;
            const className = `ex${(classCounter++).toString(36)}_${hash.slice(0, 6)}`;
            classRegistry.set(hash, className);
            collectedCSS.push(`.${className}{${styleStr.replace(/;$/, '')}}`);
          }

          // 5) استخراج @elmoorx/css directives إن وجدت
          const directivePattern = /\/\*\s*@elmoorx\/css\s*\*\/\s*['"`]([^'"`]+)['"`]/g;
          let dirMatch;
          while ((dirMatch = directivePattern.exec(content)) !== null) {
            collectedCSS.push(dirMatch[1]);
          }
        } else if (entry.name.endsWith('.css')) {
          collectedCSS.push(readFileSync(fullPath, 'utf8'));
        }
      }
    } catch {}
  };

  walk(distPath);

  if (collectedCSS.length === 0) return null;

  // إزالة التكرار والتنظيف
  const uniqueCSS = [...new Set(collectedCSS)].join('\n');
  // أضف CSS الافتراضي للـ theme
  const themeCSS = `/* Elmoorx v4 — Extracted CSS */
:root{--color-primary:#0ea5e9;--color-success:#10b981;--color-warning:#f59e0b;--color-danger:#ef4444;--color-bg:#0f172a;--color-surface:#1e293b;--color-text:#e2e8f0;--color-muted:#94a3b8;--color-border:#334155;--radius-sm:4px;--radius-md:8px;--radius-lg:12px;--shadow-sm:0 1px 2px rgba(0,0,0,0.05);--shadow-md:0 4px 6px rgba(0,0,0,0.1)}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.5}
#app{min-height:100vh}
img{max-width:100%;height:auto}
a{color:var(--color-primary);text-decoration:none}
a:hover{text-decoration:underline}
button{cursor:pointer;font-family:inherit}
input,textarea,select{font-family:inherit;font-size:inherit}
`;

  return themeCSS + uniqueCSS + '\n';
}

function hashString(s) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

import { fileURLToPath } from 'node:url';
