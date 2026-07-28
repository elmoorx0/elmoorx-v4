---
Task ID: elmoorx-v4
Agent: main (Super Z)
Task: سحب إطار Elmoorx من GitHub وتطويره ليكون مستقلاً عن npm/npx مع تكامل غير مسبوق

Work Log (الجولات 4-5):
- بناء graphql/index.mjs: GraphQL client + queries/mutations/subscriptions + cache + hooks
- بناء charts/index.mjs: BarChart, LineChart, AreaChart, PieChart, ScatterChart, Sparkline (SVG, بدون تبعيات)
- بناء utils/index.mjs: date, string, number, array, object, color, async, file, url, random (80+ دالة)
- بناء markdown/index.mjs: parser + inline + renderer + Markdown + MarkdownEditor
- بناء ui/advanced.mjs: FileUpload, DatePicker, ColorPicker, VirtualList, CommandPalette, Pagination, Breadcrumb, Stepper, Tooltip
- بناء cli/upgrade.mjs: تحديث الإطار من GitHub
- بناء cli/analyze.mjs: تحليل حجم المشروع
- بناء cli/clean.mjs: تنظيف ملفات البناء
- بناء cli/templates.mjs: 9 قوالب جاهزة (blank, starter, blog, dashboard, ecommerce, saas, landing, docs, portfolio)
- بناء cli/generate-app.mjs: 16 تطبيق جاهز (todo, chat, weather, calculator, notes, crm, ...)
- تحسين router: lazyRoute + lazy + prefetchRoute مع code splitting
- إضافة 20 اختبار جديد (advanced UI + router lazy)
- إصلاح bugs في date.format، string.camelCase، async.timeout
- إصلاح conflict في case 'new' (create vs templates)

Stage Summary (المجموع التراكمي الكامل):
- 52 ملف مصدر، ~16,583 سطر كود
- 19 package مدمجة + advanced UI components
- 19 CLI command (create, new, init, dev, build, deploy, generate, generate-app, add, visual, docs, static, test, bench, upgrade, analyze, clean, doctor, info)
- 190 اختبار ناجح في 1.56 ثانية
- 9 قوالب + 16 تطبيق جاهز
- 6 منصات deploy
- 0 تبعيات npm — مستقل تماماً
- أداء: 21M ops/s signal read
- الموقع: /home/z/my-project/elmoorx-v4/

---
Task ID: elmoorx-v4-production-fixes
Agent: main (Super Z)
Task: إصلاح 10 مشاكل إنتاجية محددة بدقة واحترافية

Work Log (الجولة الإنتاجية):
- إصلاح #1: Hydration الحقيقي — إضافة `hydrateIsland()` + `bindVnodeToDom()` اللذين يمشيان على DOM الموجود ويربطان event handlers دون تدمير innerHTML (zero-flicker hydration)
- إصلاح #2: CSS extraction محسّن في build pipeline — استخراج 5 مصادر:
  - CSS imports صريحة (`import './foo.css'`)
  - template literals (`css\`...\``, `styled\`...\``)
  - style objects (`style: { color: 'red' }` → utility class)
  - style strings (`style: 'padding:2rem'` → utility class)
  - @elmoorx/css directives
  - مع hash-based deduplication
- إصلاح #3: Session middleware مع 3 backends: memory (default), file (persist), redis (distributed)
  - عميل Redis بسيط مكتوب من الصفر (RESP2 protocol over TCP، بدون مكتبات)
  - يدعم GET, SET, SETEX, DEL, PING
  - TTL تلقائي للجلسات المنتهية
- إصلاح #4: Rate limit middleware مع نفس 3 backends للبيئات الموزعة
- إصلاح #5: استخدام `renderIsland()` و `renderIslandsSSR()` في SSR server للـ partial hydration
- إصلاح #6: `renderToStream()` API جديد للـ streaming SSR — يكتب head/body/tail على chunks
- إصلاح #7: DB transactions (كانت موجودة — تأكد من دعم BEGIN/COMMIT/ROLLBACK)
- إصلاح #8: Image optimization حقيقي:
  - `resizePNG()` — يقرأ PNG، يفك zlib، يطبّق كل 5 PNG filter types (None/Sub/Up/Average/Paeth)، يحجم بـ nearest-neighbor، يعيد بناء PNG صالح (CRC32 + zlib compress)
  - `minifySVG()` — ضغط whitespace والتعليقات في SVG
- إصلاح #9: Variable mangling scope-aware كامل في `minifier/mangler.mjs`:
  - Tokenizer بسيط (identifiers, strings, comments, regex, numbers, punctuation)
  - Scope analysis يحترم function bodies و block scopes
  - لا يمسّ top-level vars ولا properties (.x) ولا object literal keys
  - fallback آمن عند الفشل
- إصلاح #10: Link prefetch محسّن مع 3 استراتيجيات:
  - `'hover'` (default): عند mouseEnter/focus
  - `'visible'`: عند ظهور الرابط في viewport (IntersectionObserver مع rootMargin 200px)
  - `'mount'`: فوراً عند التحميل
  - deduplication عبر `prefetchCache`
- تحسين `renderToString` لإصلاح الكشف عن المكونات التفاعلية:
  - أضف `vdomHasEvents()` الذي يمشي على ناتج المكون لاكتشاف event handlers داخلية
  - الآن `<Button>` الذي يحتوي على `<button onClick>` داخلي يُلَفّ تلقائياً بـ island
- إضافة 20 اختبار جديد في `tests/production-fixes.test.ts` للتحقق من كل الإصلاحات
- تحديث اختبارين قديمين (SearchInput + ContextMenu) لتجاهل `data-props` المُشفّر

Stage Summary:
- 565 اختبار ناجح (545 سابق + 20 جديد)، 0 فشل، في 1.87 ثانية
- 10/10 إصلاحات مكتملة بدقة
- 0 تبعيات npm جديدة (Redis client مبني من الصفر بـ TCP خام)
- العميل الآن جاهز للإنتاج الفعلي مع:
  - hydration صحيح (zero-flicker)
  - CSS extraction كامل
  - Sessions/Rate-limit موزعة (Redis/.file/memory)
  - Streaming SSR
  - Partial hydration (islands)
  - DB transactions
  - PNG thumbnailing فعلي بدون Sharp/Jimp
  - Variable mangling بأمان (scope-aware)
  - Smart prefetch (visible/hover/mount)
