/**
 * Elmoorx v4 — Code Splitting (بدون تبعيات)
 * ===========================================
 * يقسم الكود تلقائياً:
 *   - تحليل imports
 *   - إنشاء chunks منفصلة
 *   - dynamic imports للمسارات
 *   - shared chunks (vendor)
 *   - lazy loading
 *   - preload hints
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, dirname, relative, resolve as resolvePath } from 'node:path';
import { compile } from '../compiler/index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) CHUNK ANALYZER
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeChunks(rootDir, options = {}) {
  const {
    exclude = ['node_modules', '.elmoorx', 'dist', '.git', '.elmoorx-test-cache', 'framework-source'],
    extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx'],
  } = options;

  const modules = new Map(); // file → { imports, size, isEntry }
  const entryPoints = [];

  // اجمع كل الملفات
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          const content = readFileSync(fullPath, 'utf8');
          const imports = extractImports(content, fullPath);
          const isEntry = fullPath.endsWith('index.tsx') || fullPath.endsWith('index.mjs') || fullPath.endsWith('App.tsx');
          modules.set(fullPath, {
            file: fullPath,
            imports,
            size: content.length,
            isEntry,
            type: categorizeModule(fullPath),
          });
          if (isEntry) entryPoints.push(fullPath);
        }
      }
    }
  };

  walk(rootDir);

  return { modules, entryPoints };
}

function extractImports(code, filePath) {
  const imports = [];
  const patterns = [
    /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const resolved = resolveImportPath(importPath, filePath);
        if (resolved) imports.push({ raw: importPath, resolved, dynamic: pattern.source.includes('\\(') });
      }
    }
  }

  return imports;
}

function resolveImportPath(importPath, fromFile) {
  const fromDir = dirname(fromFile);
  const resolved = resolvePath(fromDir, importPath);
  const extensions = ['', '.mjs', '.js', '.ts', '.tsx', '.jsx', '/index.mjs', '/index.js', '/index.ts'];
  for (const ext of extensions) {
    if (existsSync(resolved + ext)) return resolved + ext;
  }
  return null;
}

function categorizeModule(file) {
  if (file.includes('/runtime/') || file.includes('/runtime.')) return 'runtime';
  if (file.includes('/router/')) return 'router';
  if (file.includes('/store/')) return 'store';
  if (file.includes('/ui/')) return 'ui';
  if (file.includes('/vendor/')) return 'vendor';
  if (file.includes('/utils/')) return 'utils';
  if (file.includes('/i18n/')) return 'i18n';
  if (file.includes('/http/')) return 'http';
  if (file.includes('/pages/')) return 'pages';
  if (file.includes('/components/')) return 'components';
  return 'app';
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) CHUNK BUILDER — يحدد كيفية التقسيم
// ─────────────────────────────────────────────────────────────────────────────

export function planChunks(analysis) {
  const { modules, entryPoints } = analysis;
  const chunks = new Map(); // chunkName → { files, type }

  // استراتيجية: قسم حسب الفئة
  const categories = new Map();

  for (const [file, module] of modules) {
    const cat = module.type;
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat).push(file);
  }

  // أنشئ chunks
  for (const [cat, files] of categories) {
    const chunkName = cat === 'app' ? 'main' : cat;
    chunks.set(chunkName, {
      name: chunkName,
      files,
      type: cat,
      size: files.reduce((s, f) => s + (modules.get(f)?.size || 0), 0),
    });
  }

  // حدد shared chunks (ملفات تُستخدم من عدة entry points)
  const sharedFiles = new Set();
  for (const [file, module] of modules) {
    if (!module.isEntry) {
      // تحقق إذا كان مستخدم من عدة entry points
      let importers = 0;
      for (const [, m] of modules) {
        if (m.imports.some(i => i.resolved === file)) importers++;
      }
      if (importers > 1) sharedFiles.add(file);
    }
  }

  if (sharedFiles.size > 0) {
    chunks.set('shared', {
      name: 'shared',
      files: Array.from(sharedFiles),
      type: 'shared',
      size: Array.from(sharedFiles).reduce((s, f) => s + (modules.get(f)?.size || 0), 0),
    });
  }

  return {
    chunks: Array.from(chunks.values()),
    entryPoints,
    sharedFiles: Array.from(sharedFiles),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) GENERATE CHUNKS — يكتب الـ chunks الفعلية
// ─────────────────────────────────────────────────────────────────────────────

export function generateChunks(plan, outDir) {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const chunksDir = join(outDir, 'chunks');
  if (!existsSync(chunksDir)) mkdirSync(chunksDir, { recursive: true });

  const manifest = {
    chunks: [],
    entryPoints: plan.entryPoints.map(f => relative(process.cwd(), f)),
  };

  for (const chunk of plan.chunks) {
    const chunkPath = join(chunksDir, `${chunk.name}.mjs`);
    let content = `// Chunk: ${chunk.name} (${chunk.type})\n// Files: ${chunk.files.length}\n\n`;

    for (const file of chunk.files) {
      const ext = extname(file).toLowerCase();
      let code = readFileSync(file, 'utf8');
      if (ext === '.ts' || ext === '.tsx') {
        try { code = compile(code, file); } catch {}
      }
      // أزل imports (ستُحل في الـ runtime)
      code = code.replace(/^import\s+.*$/gm, '');
      code = code.replace(/^export\s+/gm, '');

      const relPath = relative(process.cwd(), file);
      content += `// === ${relPath} ===\n${code}\n\n`;
    }

    writeFileSync(chunkPath, content);

    manifest.chunks.push({
      name: chunk.name,
      file: relative(outDir, chunkPath),
      size: content.length,
      files: chunk.files.length,
      type: chunk.type,
    });
  }

  // اكتب manifest
  writeFileSync(join(outDir, 'chunks-manifest.json'), JSON.stringify(manifest, null, 2));

  return manifest;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) GENERATE LAZY LOADER — يولّد كود التحميل الكسول
// ─────────────────────────────────────────────────────────────────────────────

export function generateLazyLoader(manifest, outDir) {
  const loaderCode = `// Elmoorx v4 — Lazy Chunk Loader (مُولّد تلقائياً)
const chunkCache = new Map();

export async function loadChunk(name) {
  if (chunkCache.has(name)) return chunkCache.get(name);

  const chunk = ${JSON.stringify(manifest.chunks, null, 2)}.find(c => c.name === name);
  if (!chunk) {
    console.warn('[split] chunk not found:', name);
    return null;
  }

  try {
    const module = await import('/' + chunk.file);
    chunkCache.set(name, module);
    return module;
  } catch (err) {
    console.error('[split] failed to load chunk:', name, err);
    throw err;
  }
}

export function preloadChunk(name) {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = '/chunks/' + name + '.mjs';
  document.head.appendChild(link);
}

export function getManifest() {
  return ${JSON.stringify(manifest, null, 2)};
}
`;

  const loaderPath = join(outDir, 'chunks-loader.mjs');
  writeFileSync(loaderPath, loaderCode);

  return loaderPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) SPLIT PROJECT — الواجهة الرئيسية
// ─────────────────────────────────────────────────────────────────────────────

export function splitProject(rootDir, options = {}) {
  const { outDir = 'dist' } = options;
  const distPath = join(rootDir, outDir);

  console.log(`\n  ✦ Elmoorx v4 — Code Splitting`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ تحليل المشروع...`);

  const analysis = analyzeChunks(rootDir, options);
  console.log(`  │ الملفات: ${analysis.modules.size}`);
  console.log(`  │ Entry points: ${analysis.entryPoints.length}`);

  console.log(`  │ تخطيط الـ chunks...`);
  const plan = planChunks(analysis);
  console.log(`  │ Chunks: ${plan.chunks.length}`);
  console.log(`  │ Shared files: ${plan.sharedFiles.length}`);

  for (const chunk of plan.chunks) {
    const sizeKB = (chunk.size / 1024).toFixed(1);
    console.log(`  │   ${chunk.name.padEnd(15)} ${sizeKB}KB (${chunk.files.length} ملفات)`);
  }

  console.log(`  │ توليد الـ chunks...`);
  const manifest = generateChunks(plan, distPath);

  console.log(`  │ توليد lazy loader...`);
  const loaderPath = generateLazyLoader(manifest, distPath);

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل`);
  console.log(`  │ Manifest: ${join(outDir, 'chunks-manifest.json')}`);
  console.log(`  │ Loader: ${relative(rootDir, loaderPath)}`);
  console.log(`  ─────────────────────────────────────\n`);

  return { manifest, loaderPath };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  analyzeChunks,
  planChunks,
  generateChunks,
  generateLazyLoader,
  splitProject,
};
