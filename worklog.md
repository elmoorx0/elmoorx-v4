---
Task ID: elmoorx-v4
Agent: main (Super Z)
Task: سحب إطار Elmoorx من GitHub وتطويره ليكون مستقلاً عن npm/npx مع تكامل غير مسبوق

Work Log:
- استنساخ الـ repo الأصلي: github.com/elmoorx0/elmoorx0
- تحليل البنية: 78 حزمة TypeScript، 648 مكون UI، 14 خدمة خلفية
- تحديد المتطلبات بعد طرح أسئلة توضيحية: repo جديد كلياً، Node مباشر، Edge+Native+HMR+Visual Builder
- بناء runtime/core.mjs مستقل: signals ($state/$computed/$effect/$batch), store, islands, security, HMR client
- بناء compiler/index.mjs: TS type stripper + JSX transformer بدون Babel/esbuild
- بناء CLI كامل: create, dev, build, generate, visual, static, doctor, info, test
- بناء WebSocket shim (vendor/ws-shim.mjs) بدون تبعية `ws` package
- بناء HMR صفر-زمني عبر WebSocket مباشر + soft reload فعلي
- بناء Edge+Native adapters: 6 منصات (browser/cloudflare/vercel/deno/node/native)
- بناء Visual Builder: محرر مرئي Drag-Drop يولّد كود Elmoorx
- بناء router/index.mjs: file-based + programmatic routing مع dynamic segments + layouts
- بناء ssr/index.mjs: renderToString + renderToStream + Head management
- بناء i18n/index.mjs: ترجمات + RTL + pluralization + Intl formatting
- بناء http/index.mjs: fetch wrapper + auth + storage + useQuery
- بناء testing/index.mjs: describe/it/expect + mock/spy + colored output
- إنشاء قوالب generate: 30+ مكون (login, todo, counter, dashboard, إلخ)
- كتابة README.md عربي شامل (10 ميزات، API، أمثلة)
- كتابة دليل عربي كامل (docs/GUIDE.md) — 14 قسم
- كتابة CHANGELOG.md
- كتابة 47 اختبار ناجح في 3 ملفات (runtime, compiler, i18n)
- إنشاء examples/blog: مدونة كاملة (routing + i18n + signals)
- إنشاء examples/demo: demo شامل لكل الميزات
- إنشاء examples/full-app: تطبيق كامل (counter + todo + store + security)
- إصلاح أخطاء: import rewriter, JSX parser, decorator stripper, generic types
- تحسين compiler: معالجة strings داخل type stripper, pragma scope, async/await

Stage Summary:
- تم بناء Elmoorx v4 من الصفر — إطار جديد كلياً
- **0 تبعيات npm** — كل شيء مدمج
- الـ CLI يعمل بـ `./elmoorx` بدون npx
- HMR صفر-زمني عبر WebSocket مباشر + soft reload
- 6 منصات تجميع: browser, cloudflare, vercel, deno, node, native
- Visual Builder مدمج يولّد كود .tsx
- 8 packages مدمجة: runtime, compiler, router, ssr, i18n, http, testing, adapters
- 47 اختبار ناجح في 16ms
- 3 أمثلة شاملة (demo, full-app, blog)
- تجميع TypeScript + JSX داخلي بدون Babel/esbuild
- توثيق عربي شامل
- 25 ملف، ~7450 سطر كود
- الموقع: /home/z/my-project/elmoorx-v4/
- جاهز للنشر على GitHub
