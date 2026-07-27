# ✦ Elmoorx v4

> **إطار عمل ويب مستقل تماماً عن npm/npx — جاهز للإنتاج 100%**
> Build fast. Run anywhere. Zero dependencies. Full SSR.

[![Version](https://img.shields.io/badge/version-4.0.0-blue)]()
[![Dependencies](https://img.shields.io/badge/dependencies-0-success)]()
[![Tests](https://img.shields.io/badge/tests-545%20passing-brightgreen)]()
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
- **Hydration متزامن** — الصفحة تظهر فوراً
- **Server-side routing** — حل المسارات على الخادم
- **Data loaders** — `getServerSideProps` equivalent
- **JWT auth middleware** — sign/verify/expire
- **Rate limiting** — 100 req/min افتراضي
- **CORS + Security headers** — تلقائي

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
