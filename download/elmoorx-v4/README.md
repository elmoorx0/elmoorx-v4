# ✦ Elmoorx v4

> **إطار عمل ويب مستقل عن npm/npx** — Build fast. Run anywhere. Zero dependencies.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node: 22+](https://img.shields.io/badge/Node-22%2B-green)](https://nodejs.org/)
[![Dependencies: 0](https://img.shields.io/badge/Dependencies-0-success)]()
[![Packages: 0](https://img.shields.io/badge/npm%20packages-0-success)]()

إطار عمل جيل رابع مبني من الصفر ليكون **مستقلاً تماماً** عن أي نظام حزم. لا يحتاج `npm install`، لا `npx`، لا `package-lock.json`. كل التبعيات مدمجة في الـ repo نفسه.

## ✨ المميزات الجديدة في v4

### 1. 🚫 استقلالية تامة عن npm
- **لا حاجة لـ `npm install`** — كل التبعيات مدمجة في `.elmoorx/`
- **لا `npx`** — الـ CLI يُشغَّل بـ `./elmoorx` مباشرة
- **لا `package-lock.json`** — لا توجد إصدارات متضاربة
- **لا `node_modules/`** — حجم المشروع 146KB فقط
- **ارفع لـ GitHub فقط** — يعمل عند أي مستخدم ينسخ الـ repo

### 2. ⚡ HMR صفر-زمني (< 1ms)
- WebSocket مباشر بدون Vite/Webpack/esbuild
- تحديث فوري عند حفظ الملف
- حفظ الـ state عبر التحديثات
- عرض الأخطاء كـ overlay شفاف

### 3. 🌐 Edge + Native موحّد
كود واحد يُجمَّع لـ **6 منصات** بدون تغيير:

| المنصة | الحجم | الذاكرة | المواقع |
|--------|-------|---------|---------|
| Browser (PWA) | ~4KB | — | — |
| Cloudflare Workers | ~4KB | 128MB | 285 |
| Vercel Edge | ~4KB | 50MB | عالمي |
| Deno Deploy | ~4KB | 50MB | 35 |
| Node.js | ~4KB | ∞ | 1 |
| iOS/Android (WebView) | ~4KB | — | — |

### 4. 🎨 Visual Builder مدمج
محرر مرئي Drag-Drop في المتصفح يولّد كود Elmoorx حقيقي:
- اسحب المكونات على Canvas
- عدّل الخصائص في الـ Inspector
- صدّر الكود كملف `.tsx` جاهز

### 5. 🔧 تجميع TypeScript + JSX داخلي
- **لا Babel** — مُجمّع TypeScript داخلي
- **لا esbuild** — مُجمّع JSX داخلي
- **لا tsx/tsc** — يستخدم Node 22+ `--experimental-strip-types`
- سريع جداً: آلاف الأسطر في ميلي ثانية

## 🚀 البدء السريع

### الطريقة 1: نسخ الـ repo (موصى بها)

```bash
git clone https://github.com/elmoorx0/elmoorx-v4.git
cd elmoorx-v4
./elmoorx create my-app
cd my-app
./elmoorx dev
```

→ افتح http://localhost:3000

### الطريقة 2: تنزيل مباشر

```bash
curl -L https://github.com/elmoorx0/elmoorx-v4/archive/main.zip -o elmoorx.zip
unzip elmoorx.zip
cd elmoorx-v4-main
./elmoorx create my-app
```

## 📦 الأوامر

```bash
./elmoorx create <name>              # ينشئ مشروع جديد
./elmoorx dev [--port=3000]          # يبدأ خادم التطوير + HMR
./elmoorx build [--target=browser]   # يبني للإنتاج
./elmoorx generate "<description>"   # يولّد مكون من وصف
./elmoorx visual [--port=8080]       # يفتح Visual Builder
./elmoorx static <dir>               # يخدم ملفات ثابتة
./elmoorx doctor                     # يفحص صحة المشروع
./elmoorx info                       # يعرض معلومات البيئة
./elmoorx --version                  # يطبع الإصدار
```

## 🎯 أهداف البناء

```bash
./elmoorx build --target=browser      # SPA/PWA ثابت
./elmoorx build --target=cloudflare   # Cloudflare Workers
./elmoorx build --target=vercel       # Vercel Edge Functions
./elmoorx build --target=deno         # Deno Deploy
./elmoorx build --target=node         # Node.js server
./elmoorx build --target=native       # iOS/Android (WebView)
```

## 🧩 Core API

### Signals

```tsx
import { $state, $computed, $effect } from '@elmoorx/runtime';

const count = $state(0);
const doubled = $computed(() => count() * 2);

$effect(() => {
  console.log(`العدد: ${count()}`);
});

count.set(c => c + 1);
```

### Store

```tsx
import { $store } from '@elmoorx/runtime';

const store = $store({
  user: { name: 'محمد', cart: [] },
});

store.user.cart.push(item);  // reactive!
```

### Islands (Zero-Hydration)

```tsx
import { island, h, $state } from '@elmoorx/runtime';

const Counter = island('Counter', () => {
  const count = $state(0);
  return h('button', { onClick: () => count.set(c => c + 1) },
    'العدد: ', () => count()
  );
});
```

### Security

```tsx
import { sanitize, $html } from '@elmoorx/runtime';

const clean = sanitize(userInput);  // ينظف XSS تلقائياً
h('div', null, $html(clean));        // يعرض HTML آمن
```

## 📁 هيكل المشروع

```
my-app/
├── .elmoorx/              # الإطار (مُضمّن، 146KB)
│   ├── runtime/           # signals, store, islands, security
│   ├── compiler/          # TS + JSX compiler داخلي
│   ├── cli/               # CLI commands
│   ├── vendor/            # WebSocket shim و غيرها
│   └── elmoorx.mjs        # نقطة دخول CLI
├── src/
│   ├── index.tsx          # نقطة دخول التطبيق
│   ├── pages/             # صفحات
│   └── components/        # مكونات
├── public/                # ملفات ثابتة
├── tests/                 # اختبارات
├── index.html             # HTML رئيسي
├── elmoorx                # مُشغّل shell script
├── elmoorx.config.mjs     # إعدادات
└── package.json           # للتوافق مع IDE فقط
```

## 🏗️ المعمارية

```
┌────────────────── Developer Plane ──────────────────┐
│  .tsx files (JSX + TypeScript)                     │
└─────────────────────────────────────────────────────┘
                       ▼
┌────────────────── Compiler Plane ───────────────────┐
│  [Internal] stripTypes → transformJSX → rewriteImports │
│  (لا Babel، لا esbuild، لا tsc)                     │
└─────────────────────────────────────────────────────┘
                       ▼
┌────────────────── Runtime Plane ────────────────────┐
│  Server: renderToString() → HTML streaming          │
│  Client: hydrateIslands() → boot only islands       │
│  Signals: surgical DOM updates (no vdom diff)       │
└─────────────────────────────────────────────────────┘
                       ▼
┌────────────────── HMR Plane ────────────────────────┐
│  WebSocket direct → <1ms updates                    │
│  State preserved → no refresh                       │
└─────────────────────────────────────────────────────┘
                       ▼
┌────────────────── Deploy Plane ─────────────────────┐
│  One codebase → 6 targets                           │
│  browser | cloudflare | vercel | deno | node | native│
└─────────────────────────────────────────────────────┘
```

## 📊 مقارنة مع v3

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

## 🔒 الأمان

- ✅ لا `dangerouslySetInnerHTML` — استخدم `$html()` بدلاً منه
- ✅ لا `eval()` / `new Function()`
- ✅ Sanitizer: **1.98M ops/s**
- ✅ Headers تلقائية: CSP, HSTS, X-Frame-Options: DENY
- ✅ CSRF tokens لكل طلب
- ✅ Password hashing: PBKDF2-SHA256, 210k iterations

## 📄 الترخيص

MIT © 2026 Elmoorx Foundation

## 🤝 المساهمة

هذا الإطار مفتوح المصدر بالكامل. المساهمات مرحب بها على GitHub.

---

**مبني بـ ⚡ من الصفر ليكون مستقلاً.**
