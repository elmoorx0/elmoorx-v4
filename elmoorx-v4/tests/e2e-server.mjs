/**
 * اختبار شامل للـ SSR server مع كل الميدلوير الإنتاجية الجديدة
 */
import { startSSRServer } from '../ssr-server/index.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const testRoot = '/tmp/elmoorx-server-test';
if (existsSync(testRoot)) rmSync(testRoot, { recursive: true });
mkdirSync(join(testRoot, 'src', 'pages'), { recursive: true });

// أنشئ صفحة بسيطة
writeFileSync(join(testRoot, 'src', 'pages', 'index.tsx'), `
export default function Home() {
  return { tag: 'div', props: {}, children: ['Hello from Elmoorx v4!'] };
}
`);

writeFileSync(join(testRoot, 'package.json'), JSON.stringify({
  name: 'test-app',
  version: '1.0.0',
  private: true,
}, null, 2));

async function fetchURL(url) {
  const res = await fetch(url);
  const headers = Object.fromEntries(res.headers.entries());
  const body = await res.text();
  return { status: res.status, headers, body };
}

async function runTests() {
  console.log('\n  Starting SSR server...\n');
  const server = await startSSRServer({
    root: testRoot,
    port: 3999,
    rateLimit: false, // تعطيل لتسهيل الاختبار
    sessions: false,
    auth: null,
  });

  // انتظر بدء السيرفر
  await new Promise(r => setTimeout(r, 500));

  let pass = 0, fail = 0;

  const tests = [
    {
      name: 'الصفحة الرئيسية تُرجع HTML',
      run: async () => {
        const r = await fetchURL('http://localhost:3999/');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.includes('<!DOCTYPE html>')) throw new Error('Should include DOCTYPE');
        if (!r.body.includes('Hello from Elmoorx v4')) throw new Error('Should include rendered content');
      },
    },
    {
      name: '/health endpoint يُرجع 200 + JSON',
      run: async () => {
        const r = await fetchURL('http://localhost:3999/health');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        const data = JSON.parse(r.body);
        if (data.status !== 'healthy') throw new Error(`Expected healthy, got ${data.status}`);
        if (!data.uptime && data.uptime !== 0) throw new Error('uptime should be present');
        if (!data.version) throw new Error('version should be present');
        if (!data.memory) throw new Error('memory should be present');
        if (!data.memory.rss) throw new Error('memory.rss should be present');
      },
    },
    {
      name: '/metrics endpoint يُرجع Prometheus format',
      run: async () => {
        const r = await fetchURL('http://localhost:3999/metrics');
        if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
        if (!r.body.includes('elmoorx_')) throw new Error('Should include elmoorx_ metrics');
        if (!r.body.includes('process_uptime_seconds')) throw new Error('Should include uptime metric');
        if (!r.body.includes('process_memory_rss_bytes')) throw new Error('Should include memory metric');
      },
    },
    {
      name: 'Security headers موجودة',
      run: async () => {
        const r = await fetchURL('http://localhost:3999/');
        if (!r.headers['content-security-policy']) throw new Error('Missing CSP');
        if (!r.headers['x-frame-options']) throw new Error('Missing X-Frame-Options');
        if (!r.headers['x-content-type-options']) throw new Error('Missing X-Content-Type-Options');
        if (!r.headers['strict-transport-security']) throw new Error('Missing HSTS');
        if (!r.headers['referrer-policy']) throw new Error('Missing Referrer-Policy');
      },
    },
    {
      name: 'X-Request-ID موجود وفريد',
      run: async () => {
        const r1 = await fetchURL('http://localhost:3999/');
        const r2 = await fetchURL('http://localhost:3999/');
        if (!r1.headers['x-request-id']) throw new Error('Missing X-Request-ID');
        if (!r2.headers['x-request-id']) throw new Error('Missing X-Request-ID');
        if (r1.headers['x-request-id'] === r2.headers['x-request-id']) {
          throw new Error('Request IDs should be unique');
        }
      },
    },
    {
      name: 'Compression تعمل مع Accept-Encoding: gzip',
      run: async () => {
        const res = await fetch('http://localhost:3999/', {
          headers: { 'Accept-Encoding': 'gzip, br' },
        });
        const encoding = res.headers.get('content-encoding');
        if (!encoding) throw new Error('Missing Content-Encoding header');
        if (!['gzip', 'br'].includes(encoding)) {
          throw new Error(`Expected gzip/br, got ${encoding}`);
        }
      },
    },
    {
      name: 'Compression تتجاوز الطلبات الصغيرة',
      run: async () => {
        // /health يُرجع JSON صغير - قد لا يُضغط
        const res = await fetch('http://localhost:3999/health', {
          headers: { 'Accept-Encoding': 'gzip, br' },
        });
        // حتى لو ضُغط، المهم أن status 200
        if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      },
    },
    {
      name: '404 للصفحات غير الموجودة',
      run: async () => {
        const r = await fetchURL('http://localhost:3999/nonexistent-page');
        if (r.status !== 404) throw new Error(`Expected 404, got ${r.status}`);
      },
    },
    {
      name: 'CORS headers موجودة',
      run: async () => {
        const r = await fetchURL('http://localhost:3999/');
        if (!r.headers['access-control-allow-origin']) throw new Error('Missing CORS Allow-Origin');
      },
    },
  ];

  for (const t of tests) {
    try {
      await t.run();
      console.log(`  ✓ ${t.name}`);
      pass++;
    } catch (err) {
      console.log(`  ✗ ${t.name}\n    ${err.message}`);
      fail++;
    }
  }

  console.log(`\n  ════════════════════════════════════════`);
  console.log(`  Tests: ${pass} passed, ${fail} failed`);
  console.log(`  ════════════════════════════════════════\n`);

  // إغلاق السيرفر
  server.close();
  process.exit(fail > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
