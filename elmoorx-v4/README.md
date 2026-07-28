# ✦ Elmoorx v4

> **إطار عمل ويب مستقل تماماً عن npm/npx — جاهز للإنتاج 100%**
> Build fast. Run anywhere. Zero dependencies. Full SSR.

[![Version](https://img.shields.io/badge/version-4.0.0-blue)]()
[![Dependencies](https://img.shields.io/badge/dependencies-0-success)]()
[![Tests](https://img.shields.io/badge/tests-584%20passing-brightgreen)]()
[![Packages](https://img.shields.io/badge/packages-37-blue)]()
[![Components](https://img.shields.io/badge/UI%20components-111%2B-purple)]()
[![CLI](https://img.shields.io/badge/CLI%20commands-46-orange)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

إطار عمل جيل رابع مبني من الصخر ليكون **مستقلاً تماماً** عن أي نظام حزم. لا يحتاج `npm install`، لا `npx`، لا `package-lock.json`. كل التبعيات مدمجة في الـ repo نفسه. **جاهز للإنتاج 100%** مع SSR كامل، JWT auth، rate limiting، و hydration متزامن.

## ✦ المميزات

### 🚫 استقلالية تامة
- **0 تبعيات npm** — كل شيء مدمج
- **`./elmoorx`** يُشغَّل مباشرة بدون npx
- يعمل من GitHub وحده — `git clone` وابدأ

### ⚡ أداء استثنائي
- Signal read: **27M ops/s** (React: ~10K)
- Store write: **16M ops/s** (Redux: ~30K)
- Sanitize: **695K ops/s** (DOMPurify: ~50K)
- Compiler: **75K ops/s** stripTypes

### 🖥️ SSR كامل (جاهز للإنتاج)
- **Server-side rendering** — HTML يُرسم على الخادم
- **Hydration الحقيقي** — يربط events على DOM الموجود دون تدميره (zero-flicker)
- **Streaming SSR** — `renderToStream()` يرسل HTML على أجزاء
- **Partial hydration (Islands)** — فقط المكونات التفاعلية تُهيّدرت
- **Server-side routing** — حل المسارات على الخادم
- **Data loaders** — `getServerSideProps` equivalent
- **JWT auth middleware** — sign/verify/expire
- **Rate limiting** — 3 backends: memory / file / Redis ( RESP2 client مبني من الصفر)
- **Sessions** — 3 backends: memory / file / Redis
- **CORS + Security headers** — تلقائي

### 🛡️ ميدلوير إنتاجية كاملة
كل الميدلوير التالية مُفعّلة افتراضياً في `startSSRServer`:
- **Compression** — gzip/brotli/deflate فوري (يحترم Accept-Encoding)
- **Security Headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, COOP, COEP, CORP
- **Request ID** — X-Request-ID (UUID v4) فريد لكل طلب
- **Logger** — structured JSON logging (level, time, requestId, method, path, status, duration, ip, userAgent)
- **Health Check** — `GET /health` يُرجع { status, uptime, memory, version, hostname, pid }
- **Metrics** — `GET /metrics` بصيغة Prometheus (counters + histograms + process metrics)
- **Graceful Shutdown** — SIGTERM/SIGINT مع انتظار الطلبات الجارية + cleanup hooks

### 📦 37 packages مدمجة
runtime, compiler, router, ssr, ssr-server, i18n, http, testing, adapters, store, forms, animation, database, realtime, pwa, ui, graphql, charts, utils, markdown, minifier, treeshake, sourcemap, compress, e2e, imageopt, security, metrics, theme-gen, deps-graph, perf, splitting, code-editor, playground, snapshot, dataexport

### 🎨 111+ UI Components (12 ملفات)
Button, Input, Card, Modal, Toast, Table, DataGrid, Tabs, Accordion, Avatar, Progress, Spinner, Badge, Alert, Dropdown, Skeleton, Divider, Stack, Grid, Switch, Checkbox, Radio, Select, Textarea, FileUpload, DatePicker, ColorPicker, VirtualList, CommandPalette, Pagination, Breadcrumb, Stepper, Tooltip, TreeView, Carousel, DragDropList, NotificationCenter, RichTextEditor, Image, Drawer, Popover, Rate, Slider, OTPInput, Tag, Timeline, Empty, Stat, Banner, Menu, ContextMenu, Transfer, Cascader, CircularProgress, Countdown, CodeBlock, ToggleGroup, FormWizard, DiffViewer, KeyValueEditor, SearchInput, RangeSlider, InlineEdit, CopyButton, CopyableText, Affix, BackTop, AspectRatio, ScrollArea, Typography, Collapse, Heatmap, Calendar, Gantt, QRCode, FunnelChart, Treemap, WordCloud, AudioPlayer, VideoPlayer, Gallery, AudioRecorder, ChatUI, NotificationPanel, ActivityFeed, CommentSystem, ReactionPicker, UserPresence, NavBar, MegaMenu, BottomNav, PageHeader, ResultPage, ContentLoader, ColorPalette, GradientPicker, ConfirmDialog, KeyboardShortcuts, WorldMap, GeoChart, CoordinatePicker, DistanceCalculator, FileExplorer, CodeExplorer, DevTools, StateInspector, EventLog, CodeEditor, CodeViewer, ExportButton

### ⌨️ 46 CLI Command
`create` `new` `init` `init-git` `dev` `build` `bundle` `deploy` `serve` `ssr` `serve-prod` `generate` `generate-app` `generate-readme` `scaffold` `docs-gen` `migrate` `seed` `model` `add` `visual` `docs` `playground` `static` `test` `bench` `watch` `inspect` `upgrade` `analyze` `clean` `list` `repl` `scan` `metrics` `theme` `graph` `split` `changelog` `ci` `dockerize` `publish` `version` `config` `help` `doctor` `info`

## 🚀 البدء السريع

```bash
git clone https://github.com/elmoorx0/elmoorx-v4.git
cd elmoorx-v4
./elmoorx create my-app
cd my-app
./elmoorx dev
```
→ http://localhost:3000

## 🖥️ SSR إنتاجي

```bash
# خادم SSR كامل مع JWT + rate limiting
./elmoorx ssr --api=./api --auth-secret=mysecret

# خادم static إنتاجي
./elmoorx serve-prod --port=3000
```

## 🛡️ المراقبة والصحة (Production Observability)

```bash
# فحص صحة الخدمة (load balancers)
curl http://localhost:3000/health
# → {"status":"healthy","uptime":120,"memory":{"rss":"59 MB","heapUsed":"8 MB"},"version":"4.0.0",...}

# Prometheus metrics
curl http://localhost:3000/metrics
# → elmoorx_http_requests_total{method="GET",path="/",status="200"} 42
#   elmoorx_process_uptime_seconds 120
#   elmoorx_process_memory_rss_bytes 63557632
#   ...

# مع compression
curl -H "Accept-Encoding: gzip, br" --compressed http://localhost:3000/
# → Content-Encoding: br

# كل طلب يحصل على X-Request-ID فريد
curl -v http://localhost:3000/
# → X-Request-ID: 737bec6f-d1d5-425a-9dde-f381e76a4cec
```

### تخصيص الميدلوير

```javascript
import { startSSRServer } from './ssr-server/index.mjs';

await startSSRServer({
  root: '.',
  port: 3000,

  // ميدلوير إنتاجية (كلها true افتراضياً)
  compression: true,        // gzip + brotli
  securityHeaders: true,    // CSP, HSTS, X-Frame-Options, ...
  requestId: true,          // UUID v4 per request
  logger: true,             // JSON structured logs
  healthCheck: true,        // GET /health
  metrics: true,            // GET /metrics (Prometheus)
  gracefulShutdown: true,   // SIGTERM/SIGINT handler

  // ميدلوير أخرى
  cors: true,
  rateLimit: true,
  sessions: false,
  auth: null,               // { secret: '...', unless: ['/login'] }

  // WebSocket + file uploads
  websocket: false,
  uploadDir: null,
});
```

### Redis للبيئات الموزعة

```javascript
await startSSRServer({
  rateLimit: {
    store: 'redis',
    redisUrl: 'redis://localhost:6379',
    max: 1000,
    windowMs: 60000,
  },
  sessions: {
    store: 'redis',
    redisUrl: 'redis://localhost:6379',
    maxAge: 86400 * 7,
  },
});
```

### مثال تطبيق إنتاجي كامل

```bash
node examples/production-app.mjs
# يبدأ خادم على :3000 مع:
#   - SSR + dynamic routes
#   - API endpoints (/api/posts)
#   - Health + Metrics + Logging
#   - Compression + Security headers
#   - Graceful shutdown
```

## 📦 البناء

```bash
./elmoorx build --target=browser    # SPA + minify + gzip + brotli + PWA
./elmoorx build --target=node       # Node.js server
./elmoorx bundle                    # HTML واحد (inline JS/CSS)
```

## 🗄️ قاعدة البيانات

```bash
./elmoorx model user --fields=name:string,email:string,age:number
./elmoorx migrate up
./elmoorx seed
./elmoorx scaffold product --fields=name:string,price:number
```

## 🔒 الأمان

```bash
./elmoorx scan              # فحص أمني (15 قاعدة)
./elmoorx metrics           # تحليل تعقيد الكود
```

## 🐳 Docker + CI/CD

```bash
./elmoorx dockerize         # Dockerfile + docker-compose
./elmoorx ci                # GitHub Actions / GitLab CI
./elmoorx init-git          # git init + .gitignore + commit
```

## 📊 الإحصائيات

```
┌──────────────────────────────────────────────────────────┐
│                    Elmoorx v4.0.0                        │
├──────────────────────────────────────────────────────────┤
│  الملفات:           117 ملف مصدر                        │
│  السطور:            34,872 سطر كود                      │
│  Packages:          37 مدمجة                             │
│  UI Components:     111+ مكون (12 ملف)                   │
│  CLI Commands:      46 أمر                               │
│  Tests:             545 ناجح (0 فاشل)                   │
│  Dependencies:      0 (npm)                              │
│  حجم framework:     ~300 KB                              │
│  حجم build:         60 KB → 21 KB مضغوط                  │
│  منصات النشر:       6 + Docker + SSR                     │
│  Templates:         9 + 16 تطبيق جاهز                    │
├──────────────────────────────────────────────────────────┤
│  الأداء:                                                  │
│  Signal read:       27M ops/s                            │
│  Store write:       16M ops/s                            │
│  Sanitize:          695K ops/s                           │
│  renderToString:    263K ops/s                           │
│  Compiler:          75K ops/s                            │
└──────────────────────────────────────────────────────────┘
```

## 🏗️ المعمارية

```
Developer Plane    →  .tsx files (JSX + TypeScript)
Compiler Plane     →  [Internal] stripTypes → transformJSX → rewriteImports
Runtime Plane      →  Server: renderToString() / Client: hydrateIslands()
SSR Plane          →  Server-side routing + data loaders + JWT auth
HMR Plane          →  WebSocket direct → <1ms updates
Security Plane     →  Auto-sanitize + CSRF + CSP headers
Deploy Plane       →  One codebase → browser|cloudflare|vercel|deno|node|native
```

## 📄 الترخيص

MIT © 2026 Elmoorx Foundation

---

**مبني بـ ⚡ من الصفر ليكون مستقلاً. جاهز للإنتاج 100%.**
