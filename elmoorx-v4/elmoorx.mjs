#!/usr/bin/env node
/**
 * Elmoorx v4 — CLI مستقل عن npm/npx
 * =====================================
 * يُشغَّل مباشرة:  ./elmoorx dev
 * لا يحتاج تثبيت npm. كل التبعيات مدمجة.
 *
 * الأوامر:
 *   elmoorx create <name>          ينشئ مشروع جديد
 *   elmoorx dev [--port=3000]      يبدأ خادم التطوير مع HMR صفر-زمني
 *   elmoorx build [--target=...]   يبني للإنتاج (browser/cloudflare/vercel/deno/native)
 *   elmoorx generate <desc>        يولّد مكون من وصف نصي
 *   elmoorx visual                 يفتح Visual Builder في المتصفح
 *   elmoorx serve <dir>            يخدم ملفات ثابتة
 *   elmoorx doctor                 يفحص صحة المشروع
 *   elmoorx info                   يعرض معلومات البيئة
 *   elmoorx --version              يطبع الإصدار
 *   elmoorx --help                 يعرض المساعدة
 */

import { createServer } from './cli/dev.mjs';
import { createProject } from './cli/create.mjs';
import { initProject } from './cli/init.mjs';
import { buildProject } from './cli/build.mjs';
import { bundleProject } from './cli/bundle.mjs';
import { deployProject } from './cli/deploy.mjs';
import { generateComponent } from './cli/generate.mjs';
import { generateApp } from './cli/generate-app.mjs';
import { startVisualBuilder } from './cli/visual.mjs';
import { serveStatic } from './cli/serve.mjs';
import { runTests } from './cli/test.mjs';
import { addComponent } from './cli/add.mjs';
import { runBenchmarks } from './cli/bench.mjs';
import { startDocsServer } from './cli/docs.mjs';
import { upgradeFramework } from './cli/upgrade.mjs';
import { analyzeProject } from './cli/analyze.mjs';
import { cleanProject } from './cli/clean.mjs';
import { watchProject } from './cli/watch.mjs';
import { inspectFile } from './cli/inspect.mjs';
import { startRepl } from './cli/repl.mjs';
import { listItems } from './cli/list.mjs';
import { scanProject } from './cli/scan.mjs';
import { metricsProject } from './cli/metrics.mjs';
import { generateThemeCLI } from './cli/theme.mjs';
import { graphProject } from './cli/graph.mjs';
import { splitCodeProject } from './cli/split.mjs';
import { helpForCommand, bumpVersion, manageConfig } from './cli/help.mjs';
import { generateChangelog } from './cli/changelog.mjs';
import { createFromTemplate } from './cli/templates.mjs';
import { startProdServer } from './cli/serve-prod.mjs';
import { publishPackage } from './cli/publish.mjs';
import { doctor, info } from './cli/commands.mjs';

const VERSION = '4.0.0';
const [cmd, ...args] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case 'create': {
      const name = args[0];
      if (!name) {
        console.error('الاستخدام: elmoorx create <اسم-المشروع>');
        process.exit(1);
      }
      await createProject(name, args[1] /* template */);
      break;
    }
    case 'init': {
      const force = args.includes('--force') || args.includes('-f');
      await initProject({ force });
      break;
    }
    case 'deploy': {
      const target = argValue(args, 'target', 'static');
      await deployProject(target, { out: argValue(args, 'out', 'dist'), host: argValue(args, 'host', null), ssh: argValue(args, 'ssh', null) });
      break;
    }
    case 'docs': {
      const port = parseInt(argValue(args, 'port', '9000'));
      await startDocsServer(port);
      break;
    }
    case 'playground': {
      const port = parseInt(argValue(args, 'port', '9200'));
      const { startPlayground } = await import('./playground.mjs');
      await startPlayground(port);
      break;
    }
    case 'upgrade': {
      const force = args.includes('--force') || args.includes('-f');
      const fromLocal = args.includes('--local');
      await upgradeFramework({ force, fromLocal });
      break;
    }
    case 'analyze':
    case 'analyse': {
      await analyzeProject();
      break;
    }
    case 'new': {
      const template = args[0];
      const name = args[1];
      if (!template || !name) {
        console.error('الاستخدام: elmoorx new <template> <name>');
        console.error('القوالب: blank, starter, blog, dashboard, ecommerce, saas, landing, docs, portfolio');
        process.exit(1);
      }
      await createFromTemplate(template, name);
      break;
    }
    case 'dev':
    case 'serve': {
      const port = parseInt(argValue(args, 'port', '3000'));
      const root = argValue(args, 'root', process.cwd());
      await createServer({ rootDir: root, port });
      break;
    }
    case 'build': {
      const target = argValue(args, 'target', 'browser');
      const out = argValue(args, 'out', 'dist');
      await buildProject(process.cwd(), { target, outDir: out });
      break;
    }
    case 'generate':
    case 'gen': {
      const description = args.filter(a => !a.startsWith('--')).join(' ');
      if (!description) {
        console.error('الاستخدام: elmoorx generate "<وصف المكون>"');
        console.error('مثال: elmoorx generate "login form"');
        process.exit(1);
      }
      await generateComponent({ description, outDir: process.cwd() + '/src' });
      break;
    }
    case 'generate-app': {
      const positional = args.filter(a => !a.startsWith('--'));
      const name = positional.pop();
      const description = positional.join(' ');
      if (!description || !name) {
        console.error('الاستخدام: elmoorx generate-app "<وصف>" <project-name>');
        console.error('مثال: elmoorx generate-app "todo app" my-todo');
        process.exit(1);
      }
      await generateApp(description, name);
      break;
    }
    case 'clean': {
      await cleanProject();
      break;
    }
    case 'watch': {
      const target = argValue(args, 'target', 'browser');
      const out = argValue(args, 'out', 'dist');
      await watchProject({ target, outDir: out });
      break;
    }
    case 'inspect': {
      const file = args.find(a => !a.startsWith('--'));
      if (!file) {
        console.error('الاستخدام: elmoorx inspect <file>');
        process.exit(1);
      }
      const showOutput = args.includes('--output') || args.includes('-o');
      await inspectFile(file, { showOutput });
      break;
    }
    case 'bundle': {
      await bundleProject(process.cwd(), {
        outDir: argValue(args, 'out', 'dist'),
      });
      break;
    }
    case 'repl':
    case 'shell': {
      await startRepl();
      break;
    }
    case 'list':
    case 'ls': {
      const category = args.find(a => !a.startsWith('--')) || 'all';
      await listItems(category);
      break;
    }
    case 'scan': {
      await scanProject({ ignoreErrors: args.includes('--no-exit') });
      break;
    }
    case 'metrics': {
      await metricsProject();
      break;
    }
    case 'theme': {
      await generateThemeCLI(args);
      break;
    }
    case 'graph': {
      await graphProject(args);
      break;
    }
    case 'split': {
      await splitCodeProject({ out: argValue(args, 'out', 'dist') });
      break;
    }
    case 'visual':
    case 'builder': {
      const port = parseInt(argValue(args, 'port', '8080'));
      await startVisualBuilder(port);
      break;
    }
    case 'doctor': {
      const fix = args.includes('--fix') || args.includes('-f');
      const result = await doctor(process.cwd(), { fix });
      console.log(result);
      break;
    }
    case 'help': {
      const command = args.find(a => !a.startsWith('--'));
      if (command) {
        helpForCommand(command);
      } else {
        printHelp();
      }
      break;
    }
    case 'version': {
      const bump = args.find(a => a.startsWith('--bump='));
      if (bump) {
        bumpVersion(bump.split('=')[1]);
      } else {
        console.log(`elmoorx/${VERSION}`);
        console.log(`node/${process.version}`);
        console.log(`platform/${process.platform} ${process.arch}`);
      }
      break;
    }
    case 'config': {
      manageConfig(args);
      break;
    }
    case 'changelog': {
      const output = argValue(args, 'output', 'CHANGELOG.md');
      const from = argValue(args, 'from', null);
      await generateChangelog({ output, from });
      break;
    }
    case 'serve-prod':
    case 'serve-prod-server': {
      const port = parseInt(argValue(args, 'port', '3000'));
      const ssr = args.includes('--ssr');
      const noSpa = args.includes('--no-spa');
      const apiDir = argValue(args, 'api', null);
      await startProdServer({ port, ssr, spa: !noSpa, apiDir });
      break;
    }
    case 'publish': {
      const dryRun = args.includes('--dry-run');
      const tag = argValue(args, 'tag', 'latest');
      const registry = argValue(args, 'registry', 'https://registry.npmjs.org');
      await publishPackage({ dryRun, tag, registry });
      break;
    }
    case 'test': {
      const watch = args.includes('--watch') || args.includes('-w');
      await runTests({ watch });
      break;
    }
    case 'add': {
      const name = args.find(a => !a.startsWith('--'));
      if (!name) {
        console.error('الاستخدام: elmoorx add <component>');
        console.error('مثال: elmoorx add navbar');
        process.exit(1);
      }
      await addComponent(name);
      break;
    }
    case 'bench':
    case 'benchmark': {
      await runBenchmarks();
      break;
    }
    case 'info': {
      const result = await info();
      console.log(result);
      break;
    }
    case 'static': {
      const dir = args[0] || '.';
      const port = parseInt(argValue(args, 'port', '3000'));
      await serveStatic(dir, port);
      break;
    }
    case '--version':
    case '-v':
      console.log(`elmoorx/${VERSION}`);
      console.log(`node/${process.version}`);
      console.log(`platform/${process.platform} ${process.arch}`);
      break;
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      console.error(`أمر غير معروف: ${cmd}`);
      printHelp();
      process.exit(1);
  }
}

function argValue(args, key, def) {
  const found = args.find(a => a.startsWith(`--${key}=`));
  return found ? found.split('=')[1] : def;
}

function printHelp() {
  console.log(`
  ╔══════════════════════════════════════════════════════════════════╗
  ║                    Elmoorx v4.0.0 — CLI مستقل                    ║
  ║             Build fast. Run anywhere. Zero dependencies.         ║
  ╚══════════════════════════════════════════════════════════════════╝

  الأوامر:
    elmoorx create <name>              ينشئ مشروع جديد
    elmoorx new <template> <name>      ينشئ من قالب (blank, starter, blog, dashboard, saas, ...)
    elmoorx init                       يحوّل مشروع موجود إلى Elmoorx
    elmoorx dev [--port=3000]          يبدأ خادم التطوير + HMR صفر-زمني
    elmoorx build [--target=browser]   يبني للإنتاج (مع minify + gzip + brotli)
                                        الأهداف: browser|cloudflare|vercel|deno|native
    elmoorx bundle                     يدمج كل شيء في HTML واحد
    elmoorx deploy [--target=static]   ينشر على المنصة
                                        الأهداف: cloudflare|vercel|netlify|deno|node|static
    elmoorx generate "<description>"   يولّد مكون من وصف نصي
    elmoorx generate-app "<desc>" <name> يولّد تطبيق كامل (todo, chat, weather, ...)
    elmoorx add <component>            يضيف مكون جاهز للمشروع
    elmoorx visual [--port=8080]       يفتح Visual Builder في المتصفح
    elmoorx docs [--port=9000]         يفتح موقع التوثيق التفاعلي
    elmoorx playground [--port=9200]   يفتح code playground تفاعلي
    elmoorx static <dir> [--port=3000] يخدم ملفات ثابتة
    elmoorx test                       يشغّل اختبارات المشروع
    elmoorx bench                      يقيس أداء الإطار
    elmoorx watch [--target=browser]   يراقب التغييرات ويعيد البناء
    elmoorx inspect <file>             يفحص ملف ويظهر معلوماته
    elmoorx upgrade [--local]          يحدّث الإطار لأحدث إصدار
    elmoorx analyze                    يحلل حجم المشروع والإطار
    elmoorx clean                      ينظف ملفات البناء والمؤقتة
    elmoorx list [category]            يعرض المكونات/القوالب/الـ packages
    elmoorx repl                       interactive shell للتجربة
    elmoorx scan                       فحص أمني للكود
    elmoorx metrics                    تحليل تعقيد وجودة الكود
    elmoorx theme                      يولّد ثيمات مخصصة
    elmoorx graph                      رسم بياني للتبعيات
    elmoorx split                      تقسيم الكود تلقائياً
    elmoorx changelog                  يولّد CHANGELOG من git
    elmoorx serve-prod [--ssr]         خادم إنتاج مع compression + API
    elmoorx publish [--dry-run]        ينشر package على npm
    elmoorx version [--bump=X]         يعرض/يزيد الإصدار
    elmoorx config                     عرض/تعديل الإعدادات
    elmoorx help [command]             مساعدة تفصيلية لأمر
    elmoorx doctor                     يفحص صحة المشروع
    elmoorx info                       يعرض معلومات البيئة
    elmoorx --version                  يطبع الإصدار
    elmoorx --help                     يعرض هذه المساعدة

  أمثلة:
    elmoorx create my-app
    cd my-app
    elmoorx dev                         # → http://localhost:3000

    elmoorx generate "login form"
    elmoorx generate "todo list"
    elmoorx visual                      # → http://localhost:8080

  المميزات:
    ✦ مستقل عن npm/npx — كل التبعيات مدمجة
    ✦ HMR صفر-زمني عبر WebSocket مباشر (<1ms)
    ✦ تجميع TypeScript + JSX داخلي بدون Babel/esbuild
    ✦ Edge+Native — كود واحد يعمل على 5 منصات
    ✦ Visual Builder — محرر مرئي يولّد كود Elmoorx
`);
}

main().catch(err => {
  console.error('✗ خطأ:', err.message);
  if (process.env.ELMOORX_DEBUG) console.error(err.stack);
  process.exit(1);
});
