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

---
Task ID: elmoorx-v4-production-middleware
Agent: main (Super Z)
Task: إضافة ميدلوير إنتاجية كاملة للنشر الفعلي

Work Log:
- إنشاء `ssr-server/middleware.mjs` جديد بـ 7 ميدلوير إنتاجية:
  1. **compressionMiddleware** — gzip/brotli/deflate فوري
     - يحترم Accept-Encoding
     - يتخطّى الاستجابات الصغيرة (< 1KB)
     - يتخطّى المحتوى المُضغوط مسبقاً
     - يلتفّ على res.write/end/writeHead لتأخير الإرسال حتى compression
  2. **securityHeadersMiddleware** — كل الرؤوس الأمنية:
     - Content-Security-Policy (قابل للتخصيص)
     - Strict-Transport-Security (HSTS) مع preload
     - X-Frame-Options: DENY
     - X-Content-Type-Options: nosniff
     - Referrer-Policy: strict-origin-when-cross-origin
     - Permissions-Policy (camera, microphone, geolocation, payment, usb)
     - X-XSS-Protection: 1; mode=block
     - Cross-Origin-Opener-Policy: same-origin
     - Cross-Origin-Embedder-Policy: require-corp
     - Cross-Origin-Resource-Policy: same-origin
     - إزالة X-Powered-By لكشف أقل
  3. **requestIdMiddleware** — UUID v4 لكل طلب:
     - يستخدم crypto.randomBytes
     - يحترم الـ header الوارد
     - يضعه في ctx.requestId و X-Request-ID header
  4. **loggerMiddleware** — structured JSON logging:
     - level, time, requestId, method, path, status, duration, ip, userAgent
     - يتخطّى paths المراقبة (/health, /metrics)
     - يدعم format: 'json' | 'text'
  5. **healthCheckMiddleware** — /health endpoint:
     - status: healthy/unhealthy
     - uptime, memory (rss, heapUsed, heapTotal, external)
     - version, hostname, pid, timestamp
     - يدعم custom checks (database, redis, ...)
     - markShuttingDown() لـ graceful shutdown
  6. **metricsMiddleware** — /metrics بصيغة Prometheus:
     - http_requests_total{method, path, status} (counter)
     - http_request_duration_seconds (histogram بـ 11 buckets)
     - http_response_size_bytes (histogram)
     - process_uptime_seconds (gauge)
     - process_memory_rss_bytes (gauge)
     - process_memory_heap_used_bytes (gauge)
     - nodejs_eventloop_lag_seconds (gauge)
  7. **setupGracefulShutdown** — SIGTERM/SIGINT handler:
     - يعلّم health check كـ unhealthy فوراً
     - يتوقف عن استقبال طلبات جديدة
     - ينتظر انتهاء الطلبات الجارية (حتى timeout)
     - يستدعي onShutdown callback لتنظيف resources
     - يلتقط uncaughtException و unhandledRejection

- دمج كل الميدلوير في `startSSRServer()` مع خيارات تخصيص:
  - كلها مُفعّلة افتراضياً (true)
  - ترتيب التنفيذ محسّن: requestId → logger → healthCheck → metrics → securityHeaders → cors → rateLimit → sessions → auth → compression

- إصلاح bugs في SSR server:
  - تحميل ملفات الـ routes بشكل صحيح (match.route.file → liveCompile → loadModuleDynamic)
  - API handler يدعم أسماء الدوال بأحرف كبيرة (GET) أو صغيرة (get)
  - تمرير uploadDir/maxUploadSize لـ handleAPIRoute

- إنشاء `examples/production-app.mjs` — تطبيق إنتاجي كامل يوضّح:
  - SSR مع صفحات ديناميكية ([slug])
  - API endpoints
  - كل الميدلوير مُفعّلة
  - Graceful shutdown

- إضافة 19 اختبار جديد في `tests/production-middleware.test.ts`:
  - Compression (4 اختبارات: gzip, small skip, encoded skip, no Accept-Encoding)
  - Security Headers (2: defaults + customization)
  - Request ID (2: unique generation + incoming header)
  - Logger (2: JSON capture + skip health paths)
  - Health Check (3: 200 healthy, skip non-health, custom checks + markShuttingDown)
  - Metrics (3: Prometheus format, counter collection, skip non-metrics)
  - Graceful Shutdown (2: function existence + onShutdown callback)

- إضافة `tests/e2e-server.mjs` — اختبار end-to-end يبدأ السيرفر فعلياً ويتحقق:
  - الصفحة الرئيسية تُرجع HTML
  - /health يُرجع 200 + JSON
  - /metrics يُرجع Prometheus format
  - Security headers موجودة
  - X-Request-ID فريد لكل طلب
  - Compression تعمل
  - 404 handling
  - CORS headers
  - (9 اختبارات، كلها تنجح)

- تحديث README.md:
  - تحديث badge عدد الاختبارات إلى 584
  - إضافة قسم "ميدلوير إنتاجية كاملة"
  - إضافة قسم "المراقبة والصحة"
  - إضافة أمثلة استخدام لكل ميدلوير
  - إضافة قسم Redis للبيئات الموزعة
  - إضافة قسم مثال تطبيق إنتاجي كامل

Stage Summary:
- 584 اختبار ناجح (565 + 19 جديد)، 0 فشل، في 1.91 ثانية
- 7 ميدلوير إنتاجية جديدة في ملف واحد منظّم
- مثال تطبيق إنتاجي كامل مع كل الميزات
- README محدّث بالكامل
- الإطار الآن جاهز للنشر الإنتاجي الفعلي على Kubernetes/Docker/Vercel/Cloudflare
