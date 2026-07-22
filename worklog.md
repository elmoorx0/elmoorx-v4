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
- بناء CLI كامل: create, dev, build, generate, visual, static, doctor, info
- بناء WebSocket shim (vendor/ws-shim.mjs) بدون تبعية `ws` package
- بناء HMR صفر-زمني عبر WebSocket مباشر
- بناء Edge+Native adapters: 6 منصات (browser/cloudflare/vercel/deno/node/native)
- بناء Visual Builder: محرر مرئي Drag-Drop يولّد كود Elmoorx
- إنشاء قوالب generate: 30+ مكون (login, todo, counter, dashboard, إلخ)
- كتابة README.md عربي شامل
- كتابة دليل عربي كامل (docs/GUIDE.md) — 14 قسم
- كتابة CHANGELOG.md
- اختبار كامل: create → dev → build → static serve
- إصلاح أخطاء: import rewriter, JSX parser for arrow functions, decorator stripper
- إنشاء demo شامل: signals, store, islands, security, HMR

Stage Summary:
- تم بناء Elmoorx v4 من الصفر — إطار جديد كلياً
- **0 تبعيات npm** — كل شيء مدمج في 146KB
- الـ CLI يعمل بـ `./elmoorx` بدون npx
- HMR صفر-زمني عبر WebSocket مباشر
- 6 منصات تجميع: browser, cloudflare, vercel, deno, node, native
- Visual Builder مدمج يولّد كود .tsx
- تجميع TypeScript + JSX داخلي بدون Babel/esbuild
- توثيق عربي شامل
- الموقع: /home/z/my-project/elmoorx-v4/
- جاهز للنشر على GitHub
