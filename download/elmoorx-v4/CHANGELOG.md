# Changelog

## [4.0.0] — 2026-07-23

### ✦ إعادة كتابة كاملة من الصفر

Elmoorx v4 هو إعادة بناء جيل رابع للإطار، مبني من الصفر ليكون **مستقلاً تماماً** عن أنظمة الحزم التقليدية.

### ✨ المميزات الجديدة

#### 🚫 استقلالية تامة عن npm/npx
- **لا `npm install`** — كل التبعيات مدمجة في `.elmoorx/` (146KB فقط)
- **لا `npx`** — الـ CLI يُشغَّل بـ `./elmoorx` مباشرة
- **لا `package-lock.json`** — لا توجد إصدارات متضاربة
- **لا `node_modules/`** — لا آلاف الملفات
- يعمل من GitHub وحده بدون أي نظام حزم

#### ⚡ HMR صفر-زمني
- WebSocket مباشر بدون Vite/Webpack/esbuild
- تحديث فوري عند حفظ الملف (< 1ms)
- حفظ الـ state عبر التحديثات
- عرض الأخطاء كـ overlay شفاف

#### 🌐 Edge + Native موحّد
- كود واحد يُجمَّع لـ 6 منصات:
  - Browser (PWA/SPA)
  - Cloudflare Workers
  - Vercel Edge Functions
  - Deno Deploy
  - Node.js
  - iOS/Android (WebView)
- API موحّد: `kv`, `fs`, `env`, `nativeBridge`
- اكتشاف تلقائي للمنصة

#### 🎨 Visual Builder مدمج
- محرر مرئي Drag-Drop في المتصفح
- لوحة مكونات (Palette) مع 20+ عنصر
- محرر خصائص (Inspector) مباشر
- تصدير كود `.tsx` جاهز
- حفظ مباشر في `src/`

#### 🔧 تجميع TypeScript + JSX داخلي
- **لا Babel** — مُجمّع TypeScript داخلي
- **لا esbuild** — مُجمّع JSX داخلي
- **لا tsx/tsc** — يستخدم Node 22+ `--experimental-strip-types`
- يدعم: interfaces, types, generics, enums, decorators, as casts
- سريع جداً: آلاف الأسطر في ميلي ثانية

### 🏗️ المعمارية الجديدة

```
elmoorx-v4/
├── elmoorx                  # مُشغّل shell (لا يحتاج npm)
├── elmoorx.mjs              # نقطة دخول CLI
├── runtime/
│   └── core.mjs             # signals, store, islands, security
├── compiler/
│   └── index.mjs            # TS stripper + JSX transformer
├── cli/
│   ├── create.mjs           # إنشاء مشروع
│   ├── dev.mjs              # خادم تطوير + HMR
│   ├── build.mjs            # بناء للإنتاج
│   ├── generate.mjs         # توليد مكونات
│   ├── visual.mjs           # Visual Builder
│   ├── commands.mjs         # doctor, info
│   └── serve.mjs            # خادم ثابت
├── adapters/
│   └── index.mjs            # Edge + Native adapters
├── vendor/
│   └── ws-shim.mjs          # WebSocket بدون تبعيات
├── examples/
│   ├── demo.tsx             # demo شامل
│   └── full-app.tsx         # تطبيق كامل
├── docs/
│   └── GUIDE.md             # دليل عربي شامل
└── README.md
```

### 📊 مقارنة مع v3

| الميزة | v3 | v4 |
|--------|----|----|
| تبعيات npm | 78 packages | **0** |
| `npm install` | مطلوب | **غير مطلوب** |
| `npx` | مطلوب | **غير مطلوب** |
| حجم المشروع | ~50MB | **146KB** |
| HMR | عبر Vite | **WebSocket مباشر (<1ms)** |
| Visual Builder | خارجي | **مدمج** |
| Edge targets | 4 | **6** |
| TypeScript compiler | tsx + Babel | **داخلي (0 deps)** |
| تجميع | npm workspaces | **ملف واحد مكتفٍ** |
| Runtime size | ~1.2KB | **~3KB (ميزات أكثر)** |

### 🧩 Core API

#### Signals
- `$state(initial)` — إشارة قابلة للكتابة
- `$computed(fn)` — إشارة مشتقة
- `$effect(fn)` — دالة جانبية
- `$batch(fn)` — تجميع تحديثات

#### Store
- `$store(initial)` — proxy تفاعلي عميق

#### Islands
- `island(name, component)` — تعريف جزيرة
- `renderIsland(name, props)` — SSR
- `hydrateIslands()` — client-side hydration

#### Security
- `sanitize(html)` — تنظيف XSS (1.98M ops/s)
- `$html(trusted)` — عرض HTML آمن
- `SECURITY_HEADERS` — CSP, HSTS, X-Frame-Options
- `generateCsrfToken()` — tokens آمنة

#### Lifecycle
- `onMount(fn)`, `onCleanup(fn)`, `onError(fn)`
- `withErrorBoundary(fn, fallback)`

#### HMR
- `initHMR(port)` — تفعيل HMR client
- `__elmoorx_hmr__.accept(id, handler)` — قبول التحديثات

### 🎯 أوامر CLI

```bash
./elmoorx create <name>              # ينشئ مشروع
./elmoorx dev [--port=3000]          # خادم تطوير + HMR
./elmoorx build [--target=browser]   # بناء للإنتاج
./elmoorx generate "<desc>"          # توليد مكون
./elmoorx visual [--port=8080]       # Visual Builder
./elmoorx static <dir>               # خادم ثابت
./elmoorx doctor                     # فحص صحة
./elmoorx info                       # معلومات بيئة
./elmoorx --version                  # الإصدار
```

### 🔄 الهجرة من v3

#### قبل (v3):
```bash
npx @elmoorx/cli create my-app
cd my-app
npm install
npm run dev
```

#### بعد (v4):
```bash
git clone https://github.com/elmoorx0/elmoorx-v4.git
cd elmoorx-v4
./elmoorx create my-app
cd my-app
./elmoorx dev
```

### 📦 ما يحتاجه المستخدم

- Node.js 22+ فقط
- لا npm، لا npx، لا أي مدير حزم
- لا اتصال بـ npm registry
- مجرد نسخ الـ repo والبدء

---

## [3.0.0-alpha.3] — 2026 (النسخة السابقة)

- 78 npm packages
- اعتماد كامل على npm/npx
- tsx + Babel للتجميع
- Vite للـ HMR
- ~50MB حجم المشروع

---

**v4 هو نقلة نوعية في استقلالية إطارات الويب.**
