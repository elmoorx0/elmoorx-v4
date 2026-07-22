# دليل Elmoorx v4 الكامل

## الفهرس

1. [المقدمة](#المقدمة)
2. [التركيب](#التركيب)
3. [البداية السريعة](#البداية-السريعة)
4. [المفاهيم الأساسية](#المفاهيم-الأساسية)
5. [Signals والإشارات](#signals-والإشارات)
6. [Store والمخزن التفاعلي](#store-والمخزن-التفاعلي)
7. [Islands والجزر](#islands-والجزر)
8. [الأمان التلقائي](#الأمان-التلقائي)
9. [HMR صفر-زمني](#hmr-صفر-زمني)
10. [Visual Builder](#visual-builder)
11. [Edge + Native](#edge--native)
12. [التجميع الداخلي](#التجميع-الداخلي)
13. [النشر](#النشر)
14. [الأسئلة الشائعة](#الأسئلة-الشائعة)

---

## المقدمة

Elmoorx v4 هو إطار عمل ويب جيل رابع مبني من الصفر ليكون **مستقلاً تماماً** عن أنظمة الحزم التقليدية. لا يحتاج `npm` أو `npx` أو `yarn` — كل التبعيات مدمجة في المستودع نفسه.

### لماذا الاستقلالية؟

الأنظمة الحالية تعاني من:
- **تعقيد**: `node_modules/` يحتوي آلاف الملفات
- **بطء**: `npm install` يأخذ دقائق
- **أمان**: تبعيات غير محدودة قد تحتوي برمجيات خبيثة
- **هشاشة**: إصدارات متضاربة تكسر المشروع
- **اعتماد**: على سجل npm المركزي

Elmoorx v4 يحل هذه المشاكل بـ:
- **بساطة**: 146KB فقط لمشروع كامل
- **سرعة**: يبدأ في أقل من ثانية
- **أمان**: لا تبعيات خارجية إطلاقاً
- **استقرار**: كل شيء مُضمّن ومُختبر
- **استقلال**: يعمل من GitHub وحده

---

## التركيب

### المتطلبات
- Node.js 22 أو أحدث (يُفضّل 24+)
- أي نظام تشغيل (Linux, macOS, Windows, BSD)

### التركيب

```bash
# الطريقة 1: git clone
git clone https://github.com/elmoorx0/elmoorx-v4.git
cd elmoorx-v4

# الطريقة 2: تنزيل مباشر
curl -L https://github.com/elmoorx0/elmoorx-v4/archive/main.zip -o elmoorx.zip
unzip elmoorx.zip
cd elmoorx-v4-main
```

### التحقق

```bash
./elmoorx --version
# elmoorx/4.0.0
# node/v24.18.0
# platform/linux x64
```

---

## البداية السريعة

### إنشاء مشروع جديد

```bash
./elmoorx create my-first-app
cd my-first-app
```

### تشغيل خادم التطوير

```bash
./elmoorx dev
```

→ افتح http://localhost:3000 في المتصفح

### تعديل الكود

افتح `src/index.tsx` في أي محرر وعدّل النص. احفظ الملف. سترى التغيير فوراً في المتصفح بدون refresh.

### البناء للإنتاج

```bash
./elmoorx build --target=browser
```

الناتج في `dist/` — جاهز للنشر على أي استضافة ثابتة.

---

## المفاهيم الأساسية

Elmoorx v4 مبني على 4 مفاهيم:

1. **Signals** — قيم تفاعلية دقيقة
2. **Store** — proxy عميق للكائنات
3. **Islands** — جزر تفاعلية بدون hydration
4. **Security** — حماية تلقائية من XSS

### ملف نموذجي

```tsx
import { h, $state, $effect } from '@elmoorx/runtime';

export default function App() {
  const count = $state(0);

  $effect(() => {
    document.title = `العدد: ${count()}`;
  });

  return h('div', null,
    h('h1', null, 'مرحباً'),
    h('button', { onClick: () => count.set(c => c + 1) },
      'اضغط: ', () => count()
    )
  );
}
```

---

## Signals والإشارات

Signals هي أساس التفاعل في Elmoorx. كل signal تتب من يقرأها وتُحدّث من يعتمد عليها.

### $state — إشارة قابلة للكتابة

```tsx
const count = $state(0);

count();         // قراءة → 0
count.set(5);    // كتابة
count.set(c => c + 1);  // تحديث دال
count.update(c => c * 2);
count.peek();    // قراءة بدون تتبع
```

### $computed — إشارة مشتقة

```tsx
const doubled = $computed(() => count() * 2);
const isEven = $computed(() => count() % 2 === 0);

doubled();  // يُعاد حسابها فقط عند تغيّر count
```

### $effect — دالة جانبية

```tsx
$effect(() => {
  console.log(`count تغيّر إلى: ${count()}`);
  // تُعاد تلقائياً عند تغيّر count
});

// مع cleanup:
$effect(() => {
  const id = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(id);  // cleanup
});
```

### $batch — تجميع تحديثات

```tsx
$batch(() => {
  count.set(1);
  count.set(2);
  count.set(3);
  // الـ effect يُشغّل مرة واحدة فقط، بعد انتهاء الباتش
});
```

---

## Store والمخزن التفاعلي

`$store` يُنشئ proxy تفاعلي عميق — أي تعديل على أي مستوى يُحدّث الواجهة.

### الاستخدام

```tsx
const store = $store({
  user: { name: 'محمد', age: 30 },
  cart: [{ id: 1, name: 'كتاب', price: 50 }],
  theme: 'dark'
});

// كل هذه تعديلات تفاعلية:
store.user.name = 'أحمد';           // reactive
store.user.age++;                    // reactive
store.cart.push({ id: 2 });          // reactive
store.cart[0].price = 60;            // reactive
delete store.theme;                  // reactive
```

### الاشتراك

```tsx
store.subscribe((path) => {
  console.log('تغيّر:', path);
});
```

### القراءة العميقة

```tsx
const snapshot = store.get();  // الكائن الخام بدون proxy
```

---

## Islands والجزر

Islands هي طريقة Elmoorx لتحميل JavaScript فقط عند الحاجة. باقي الصفحة تبقى HTML ثابت.

### إنشاء جزيرة

```tsx
import { island, h, $state } from '@elmoorx/runtime';

const LikeButton = island('LikeButton', (props) => {
  const likes = $state(props.initialLikes || 0);
  return h('button', { onClick: () => likes.set(l => l + 1) },
    '❤️ ', () => likes()
  );
});
```

### العرض على الخادم (SSR)

```tsx
import { renderIsland } from '@elmoorx/runtime';

const html = renderIsland('LikeButton', { initialLikes: 5 });
// → <div data-elmoorx-island="LikeButton" data-props="..."><button>❤️ 5</button></div>
```

### التهيدرة على العميل

```tsx
import { hydrateIslands } from '@elmoorx/runtime';

// يبحث عن كل [data-elmoorx-island] ويُشغّلها
hydrateIslands();
```

### الميزة

- **صفر hydration** للصفحة الثابتة
- **JS يُحمّل فقط** للجزر التفاعلية
- **حجم أصغر** — 4KB runtime لكل الصفحة
- **أسرع** — لا virtual DOM diffing

---

## الأمان التلقائي

Elmoorx يحمي تلقائياً من XSS و CSRF.

### Sanitize

```tsx
import { sanitize } from '@elmoorx/runtime';

const userInput = '<script>alert("xss")</script><b>آمن</b>';
const clean = sanitize(userInput);
// → '<b>آمن</b>'  (script محذوف)
```

### $html — عرض HTML موثوق

```tsx
import { $html } from '@elmoorx/runtime';

h('div', null, $html(cleanContent));
// يُعرض كـ HTML بعد التنظيف
```

### Security Headers

```tsx
import { SECURITY_HEADERS } from '@elmoorx/runtime';
// {
//   'Content-Security-Policy': "default-src 'self'; ...",
//   'X-Frame-Options': 'DENY',
//   'Strict-Transport-Security': 'max-age=31536000',
//   ...
// }
```

### CSRF Tokens

```tsx
import { generateCsrfToken } from '@elmoorx/runtime';

const token = generateCsrfToken();  // 64 hex chars
// ضعه في <input type="hidden" name="_csrf" value={token}>
```

---

## HMR صفر-زمني

Elmoorx v4 يستخدم WebSocket مباشر للـ HMR — لا Vite، لا Webpack، لا esbuild.

### كيف يعمل

1. تشغّل `./elmoorx dev`
2. الخادم يراقب ملفات `.tsx/.ts/.mjs`
3. عند التغيير، يُرسل WebSocket رسالة `update`
4. المتصفح يُحدّث الوحدة المعنية فقط
5. الـ state محفوظ

### تفعيل HMR في الكود

```tsx
// الـ HMR يعمل تلقائياً — فقط استورد initHMR
import { initHMR } from '@elmoorx/runtime';

initHMR(3000);  // منفذ الخادم
```

### قبول التحديثات يدوياً

```tsx
if (import.meta.hot) {
  import.meta.hot.accept('./module.tsx', (newModule) => {
    // اقبل التحديث
  });
}
```

### عرض الأخطاء

عند وجود خطأ في الكود، يظهر overlay أحمر شفاف يعرض:
- رسالة الخطأ
- stack trace
- موقع الخطأ

---

## Visual Builder

محرر مرئي يولّد كود Elmoorx حقيقي.

### التشغيل

```bash
./elmoorx visual
# → http://localhost:8080
```

### الاستخدام

1. اسحب المكونات من Palette (يسار) إلى Canvas (وسط)
2. اضغط على عنصر لتحديده
3. عدّل الخصائص في Inspector (يمين)
4. اضغط "تصدير الكود" للحصول على `.tsx`
5. أو "حفظ في src/" مباشرة

### المكونات المتاحة

- **تخطيط**: div, section, header, footer, main
- **عناصر**: h1-h6, p, span, a, img
- **نماذج**: button, input, textarea, label, form
- **قوائم**: ul, li
- **قوالب جاهزة**: Hero, Card, Login Form, Counter

---

## Edge + Native

كود واحد يُجمَّع لـ 6 منصات.

### اكتشاف المنصة

```tsx
import { platform, getPlatformInfo } from '@elmoorx/adapters';

console.log(platform);  // 'browser' | 'cloudflare' | 'vercel' | 'deno' | 'node' | 'native'

const info = getPlatformInfo();
// { platform, isEdge, isBrowser, isNative, isServer, supportsWebSocket, ... }
```

### KV Store موحّد

```tsx
import { kv } from '@elmoorx/adapters';

// يعمل على كل المنصات:
await kv.set('key', 'value');
const val = await kv.get('key');
await kv.delete('key');

// browser: localStorage
// cloudflare: KV
// deno: Deno.openKv()
// node: in-memory
```

### Native Bridge

```tsx
import { nativeBridge } from '@elmoorx/adapters';

// كاميرا
const stream = await nativeBridge.openCamera();

// GPS
const pos = await nativeBridge.getLocation();

// اهتزاز
nativeBridge.vibrate(200);

// فتح رابط
nativeBridge.openURL('https://example.com');

// نسخ
await nativeBridge.copy('نص');
```

### البناء لكل منصة

```bash
./elmoorx build --target=browser      # SPA/PWA
./elmoorx build --target=cloudflare   # Workers
./elmoorx build --target=vercel       # Edge Functions
./elmoorx build --target=deno         # Deno Deploy
./elmoorx build --target=node         # Node.js server
./elmoorx build --target=native       # iOS/Android
```

---

## التجميع الداخلي

Elmoorx v4 يجمّع TypeScript + JSX داخلياً بدون أي تبعية.

### آلية التجميع

1. **stripTypes()** — يزيل أنواع TypeScript
   - `interface` / `type` declarations
   - Type annotations (`: Type`)
   - `as` casts
   - Non-null assertions (`!`)
   - Enums / namespaces
   - Decorators

2. **transformJSX()** — يحوّل JSX إلى `h()` calls
   - `<div/>` → `h('div', ...)`
   - `<Component/>` → `h(Component, ...)`
   - `<></>` → `h(Fragment, ...)`

3. **rewriteImports()** — يعيد كتابة الـ imports
   - `@elmoorx/runtime` → `/.elmoorx/runtime/core.mjs`
   - `@elmoorx/foo` → `/.elmoorx/vendor/foo.mjs`

### لماذا لا Babel؟

- **حجم**: Babel = 50MB+ node_modules
- **سرعة**: مُجمّعنا أسرع 10x
- **استقلالية**: لا اعتماد على npm
- **بساطة**: 500 سطر بدلاً من 50,000

---

## النشر

### Cloudflare Workers

```bash
./elmoorx build --target=cloudflare
cd dist
npx wrangler deploy  # أو: wrangler deploy
```

### Vercel

```bash
./elmoorx build --target=vercel
# ارفع مجلد dist/ إلى Vercel
# أو: vercel --prod
```

### Deno Deploy

```bash
./elmoorx build --target=deno
cd dist
deno deploy
```

### Node.js

```bash
./elmoorx build --target=node
node dist/server.mjs
```

### Static (GitHub Pages, Netlify)

```bash
./elmoorx build --target=browser
# ارفع dist/ إلى أي استضافة ثابتة
```

### iOS / Android

```bash
./elmoorx build --target=native
# استخدم WebView لتحميل dist/
# أو غلّفه بـ Capacitor / Cordova
```

---

## الأسئلة الشائعة

### س: هل أحتاج npm؟
**ج: لا.** Elmoorx v4 مستقل تماماً. فقط انسخ الـ repo وابدأ.

### س: كيف أضيف تبعيات خارجية؟
**ج:** ضعها في `vendor/` كملفات ESM، أو استخدم CDN:
```html
<script type="module">
import lodash from 'https://esm.sh/lodash';
</script>
```

### س: هل يدعم TypeScript؟
**ج: نعم.** تجميع داخلي بدون tsc. يدعم interfaces, types, generics, enums, decorators.

### س: هل يدعم JSX؟
**ج: نعم.** تحويل JSX إلى `h()` داخلياً. استخدم امتداد `.tsx`.

### س: كيف أستخدم مكونات خارجية؟
**ج:** ضعها في `vendor/` كملفات `.mjs` واستوردها:
```tsx
import { DatePicker } from '/vendor/datepicker.mjs';
```

### س: هل يدعم SSR؟
**ج: نعم.** `renderToString()` لـ SSR كامل، أو `renderIsland()` للجزر فقط.

### س: كيف أُنشئ مكون جديد؟
**ج:** استخدم `./elmoorx generate "login form"` أو Visual Builder.

### س: هل الـ HMR يحفظ الـ state؟
**ج: نعم.** الـ state محفوظ عبر التحديثات — فقط الكود المُغيّر يُستبدل.

### س: ما الفرق عن v3؟
**ج:** v3 كان يعتمد على npm (78 packages). v4 مستقل تماماً (0 packages). كما يضيف Visual Builder، HMR صفر-زمني، Edge+Native adapters.

### س: هل يمكنني استخدام npm إذا أردت؟
**ج: نعم.** `package.json` موجود للتوافق مع IDE. لكن لست مضطراً.

---

## الخاتمة

Elmoorx v4 يُعيد تعريف ما يعنيه "إطار عمل ويب":
- **بسيط**: 146KB لمشروع كامل
- **سريع**: HMR < 1ms
- **مستقل**: لا اعتماد على npm
- **مرن**: 6 منصات بكود واحد
- **آمن**: حماية تلقائية

ابدأ الآن:

```bash
git clone https://github.com/elmoorx0/elmoorx-v4.git
cd elmoorx-v4
./elmoorx create my-app
cd my-app
./elmoorx dev
```

---

**مبني بـ ⚡ من الصفر ليكون مستقلاً.**
