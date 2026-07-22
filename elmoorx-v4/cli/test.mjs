/**
 * elmoorx test — يُشغّل اختبارات المشروع
 */
import { readdirSync, readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, extname, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { compile } from '../compiler/index.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

export async function runTests(options = {}) {
  const { pattern = '**/*.{test,spec}.{ts,tsx,js,mjs}', watch = false } = options;
  const cwd = process.cwd();

  console.log('\n  ✦ Elmoorx v4 — Test Runner\n  ' + '═'.repeat(50));

  // ابحث عن ملفات الاختبار
  const testFiles = findTestFiles(join(cwd, 'tests'), pattern)
    .concat(findTestFiles(join(cwd, 'src'), pattern));

  if (testFiles.length === 0) {
    console.log('  لا توجد ملفات اختبار. أنشئ ملفات في tests/ تنتهي بـ .test.ts أو .spec.ts');
    return { passed: 0, failed: 0, total: 0 };
  }

  console.log(`  وُجد ${testFiles.length} ملف اختبار\n`);

  // حمّل كل ملف (يجمعه إذا لزم) في ملف مؤقت ثم يستورده
  const tmpDir = join(cwd, '.elmoorx-test-cache');
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  for (const file of testFiles) {
    try {
      await loadTestFile(file, tmpDir);
    } catch (err) {
      console.log(`  ✗ فشل تحميل: ${file}\n    ${err.message}`);
    }
  }

  // شغّل الاختبارات
  const testing = await import('../testing/index.mjs');
  const result = await testing.runTests();

  return result;
}

function findTestFiles(dir, pattern) {
  if (!existsSync(dir)) return [];
  const results = [];
  const walk = (d) => {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(d, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '.elmoorx') {
          walk(full);
        } else if (entry.isFile()) {
          if (/\.(test|spec)\.(ts|tsx|js|mjs)$/i.test(entry.name)) {
            results.push(full);
          }
        }
      }
    } catch {}
  };
  walk(dir);
  return results;
}

async function loadTestFile(filePath, tmpDir) {
  const ext = extname(filePath).toLowerCase();
  let code;
  if (ext === '.ts' || ext === '.tsx') {
    code = compile(readFileSync(filePath, 'utf8'), filePath);
  } else {
    code = readFileSync(filePath, 'utf8');
  }

  // عكس الـ rewrites التي قام بها الـ compiler أولاً
  // /.elmoorx/runtime/core.mjs → @elmoorx/runtime
  code = code.replace(/from\s+['"]\/\.elmoorx\/runtime\/core\.mjs['"]/g, "from '@elmoorx/runtime'");
  // /.elmoorx/<module>/index.mjs → @elmoorx/<module>
  code = code.replace(/from\s+['"]\/\.elmoorx\/(router|ssr|i18n|http|testing|adapters)\/index\.mjs['"]/g, "from '@elmoorx/$1'");
  // /.elmoorx/vendor/<name>.mjs → @elmoorx/<name>
  code = code.replace(/from\s+['"]\/\.elmoorx\/vendor\/(\w+)\.mjs['"]/g, "from '@elmoorx/$1'");
  // /runtime/core.mjs → @elmoorx/runtime
  code = code.replace(/from\s+['"]\/runtime\/core\.mjs['"]/g, "from '@elmoorx/runtime'");
  // /<module>/index.mjs → @elmoorx/<module>
  code = code.replace(/from\s+['"]\/(router|ssr|i18n|http|testing|adapters)\/index\.mjs['"]/g, "from '@elmoorx/$1'");
  // /vendor/<name>.mjs → @elmoorx/<name>
  code = code.replace(/from\s+['"]\/vendor\/(\w+)\.mjs['"]/g, "from '@elmoorx/$1'");

  // الآن أعد كتابة @elmoorx/* إلى file URLs مطلقة
  code = rewriteTestImports(code, filePath);

  // أعد كتابة imports نسبية (../foo, ./foo) إلى file URLs مطلقة
  const fileDir = dirname(filePath);
  code = code.replace(
    /from\s+['"](\.\.?\/[^'"]+)['"]/g,
    (match, relPath) => {
      const resolved = resolve(fileDir, relPath);
      // أضف امتداد إذا لزم
      let final = resolved;
      if (!existsSync(final)) {
        for (const ext of ['.mjs', '.ts', '.tsx', '.js']) {
          if (existsSync(final + ext)) { final = final + ext; break; }
        }
      }
      return `from '${pathToFileURL(final).href}'`;
    }
  );

  // اكتب في ملف مؤقت ثم استورده
  const tmpFile = join(tmpDir, filePath.replace(/[^a-z0-9]/gi, '_') + '.mjs');
  writeFileSync(tmpFile, code);
  await import(pathToFileURL(tmpFile).href);
}

function rewriteTestImports(code, filePath) {
  // استبدل @elmoorx/* بـ file URL للإطار
  const modules = {
    testing: 'testing/index.mjs',
    runtime: 'runtime/core.mjs',
    router: 'router/index.mjs',
    ssr: 'ssr/index.mjs',
    i18n: 'i18n/index.mjs',
    http: 'http/index.mjs',
  };
  for (const [pkg, path] of Object.entries(modules)) {
    const regex = new RegExp(`from\\s+['"]@elmoorx/${pkg}['"]`, 'g');
    code = code.replace(regex, `from '${pathToFileURL(join(FRAMEWORK_ROOT, path)).href}'`);
  }
  return code;
}

