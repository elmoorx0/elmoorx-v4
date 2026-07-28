/**
 * مثال: تطبيق إنتاجي كامل مع كل الميدلوير الجديدة
 * =================================================
 * يوضّح:
 *   - Compression (gzip/brotli)
 *   - Security headers (CSP, HSTS, X-Frame-Options, ...)
 *   - Request ID (X-Request-ID per request)
 *   - Structured JSON logging
 *   - Health check (/health)
 *   - Prometheus metrics (/metrics)
 *   - Graceful shutdown
 *   - SSR + islands + hydration
 *
 * التشغيل:
 *   node examples/production-app.mjs
 *
 * الاختبار:
 *   curl -v http://localhost:3000/health
 *   curl -v http://localhost:3000/metrics
 *   curl -v -H "Accept-Encoding: gzip, br" http://localhost:3000/
 */

import { startSSRServer } from '../ssr-server/index.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// إنشاء بنية المشروع
const appRoot = join(__dirname, 'production-app');
if (existsSync(appRoot)) rmSync(appRoot, { recursive: true });
mkdirSync(join(appRoot, 'src', 'pages'), { recursive: true });
mkdirSync(join(appRoot, 'src', 'pages', 'blog'), { recursive: true });
mkdirSync(join(appRoot, 'api'), { recursive: true });
mkdirSync(join(appRoot, 'public'), { recursive: true });

// الصفحة الرئيسية
writeFileSync(join(appRoot, 'src', 'pages', 'index.tsx'), `
export default function Home() {
  return {
    tag: 'div',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: { style: 'color:#0ea5e9;' }, children: ['Elmoorx v4 — Production Ready'] },
      { tag: 'p', props: { style: 'color:#475569;font-size:1.1rem;' }, children: ['تطبيق إنتاجي كامل مع كل الميدلوير'] },
      { tag: 'div', props: { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-top:2rem;' }, children: [
        { tag: 'div', props: { style: 'background:#f0f9ff;padding:1.5rem;border-radius:8px;border-left:4px solid #0ea5e9;' }, children: [
          { tag: 'h3', props: {}, children: ['Compression'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['gzip + brotli فوري'] }
        ]},
        { tag: 'div', props: { style: 'background:#f0fdf4;padding:1.5rem;border-radius:8px;border-left:4px solid #10b981;' }, children: [
          { tag: 'h3', props: {}, children: ['Security'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['CSP, HSTS, X-Frame-Options'] }
        ]},
        { tag: 'div', props: { style: 'background:#fef3c7;padding:1.5rem;border-radius:8px;border-left:4px solid #f59e0b;' }, children: [
          { tag: 'h3', props: {}, children: ['Observability'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['Health + Metrics + Logs'] }
        ]},
        { tag: 'div', props: { style: 'background:#fce7f3;padding:1.5rem;border-radius:8px;border-left:4px solid #ec4899;' }, children: [
          { tag: 'h3', props: {}, children: ['Reliability'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['Graceful shutdown'] }
        ]}
      ]},
      { tag: 'h2', props: { style: 'margin-top:3rem;' }, children: ['Endpoints'] },
      { tag: 'ul', props: { style: 'line-height:2;' }, children: [
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /'] }, ' — هذه الصفحة (SSR)'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /health'] }, ' — فحص الصحة'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /metrics'] }, ' — Prometheus metrics'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /api/posts'] }, ' — API endpoint'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /blog/:slug'] }, ' — صفحة ديناميكية'] }
      ]}
    ]
  };
}
`);

// صفحة blog ديناميكية
writeFileSync(join(appRoot, 'src', 'pages', 'blog', '[slug].tsx'), `
export default function BlogPost({ params }) {
  const slug = params?.slug || 'unknown';
  return {
    tag: 'article',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: {}, children: ['Blog Post: ' + slug] },
      { tag: 'p', props: { style: 'color:#64748b;' }, children: ['هذه صفحة ديناميكية تستخدم :slug parameter'] },
      { tag: 'a', props: { href: '/', style: 'color:#0ea5e9;' }, children: ['← العودة للرئيسية'] }
    ]
  };
}
`);

// API endpoint
writeFileSync(join(appRoot, 'api', 'posts.mjs'), `
export async function GET({ query }) {
  const posts = [
    { id: 1, title: 'مرحباً بك في Elmoorx v4', slug: 'welcome' },
    { id: 2, title: 'SSR جاهز للإنتاج', slug: 'ssr' },
    { id: 3, title: 'JWT Auth Guide', slug: 'jwt' }
  ];
  return {
    status: 200,
    body: { posts, count: posts.length, query }
  };
}
`);

// ملف public ثابت
writeFileSync(join(appRoot, 'public', 'robots.txt'), `User-agent: *
Allow: /
`);

// package.json
writeFileSync(join(appRoot, 'package.json'), JSON.stringify({
  name: 'production-app',
  version: '1.0.0',
  private: true,
  type: 'module',
  scripts: {
    start: 'node ../../elmoorx.mjs serve-prod --root=. --port=3000',
  },
}, null, 2));

// ابدأ السيرفر
console.log('\n  🚀 Production App Example');
console.log('  ════════════════════════════════\n');

const server = await startSSRServer({
  root: appRoot,
  port: 3000,
  apiDir: join(appRoot, 'api'),
  // كل الميدلوير مُفعّلة افتراضياً
  // compression: true (default)
  // securityHeaders: true (default)
  // requestId: true (default)
  // logger: true (default)
  // healthCheck: true (default)
  // metrics: true (default)
  // gracefulShutdown: true (default)
});

export { server };
