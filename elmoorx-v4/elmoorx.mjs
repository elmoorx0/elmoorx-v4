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
import { buildProject } from './cli/build.mjs';
import { generateComponent } from './cli/generate.mjs';
import { startVisualBuilder } from './cli/visual.mjs';
import { serveStatic } from './cli/serve.mjs';
import { runTests } from './cli/test.mjs';
import { addComponent } from './cli/add.mjs';
import { runBenchmarks } from './cli/bench.mjs';
import { doctor, info } from './cli/commands.mjs';

const VERSION = '4.0.0';
const [cmd, ...args] = process.argv.slice(2);

async function main() {
  switch (cmd) {
    case 'create':
    case 'new': {
      const name = args[0];
      if (!name) {
        console.error('الاستخدام: elmoorx create <اسم-المشروع>');
        process.exit(1);
      }
      await createProject(name, args[1] /* template */);
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
    case 'visual':
    case 'builder': {
      const port = parseInt(argValue(args, 'port', '8080'));
      await startVisualBuilder(port);
      break;
    }
    case 'doctor': {
      const result = await doctor(process.cwd());
      console.log(result);
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
    elmoorx dev [--port=3000]          يبدأ خادم التطوير + HMR صفر-زمني
    elmoorx build [--target=browser]   يبني للإنتاج
                                        الأهداف: browser|cloudflare|vercel|deno|native
    elmoorx generate "<description>"   يولّد مكون من وصف نصي
    elmoorx visual [--port=8080]       يفتح Visual Builder في المتصفح
    elmoorx static <dir> [--port=3000] يخدم ملفات ثابتة
    elmoorx doctor                     يفحص صحة المشروع
    elmoorx test                       يشغّل اختبارات المشروع
    elmoorx add <component>            يضيف مكون جاهز للمشروع
    elmoorx bench                      يقيس أداء الإطار
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
