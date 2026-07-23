/**
 * elmoorx docs — يبدأ موقع توثيق تفاعلي
 * يحتوي على:
 *   - شرح كل package
 *   - أمثلة حية
 *   - API reference
 *   - playground
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

export async function startDocsServer(port = 9000) {
  console.log(`\n  ✦ Elmoorx v4 — Documentation Server`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ: ${port}`);

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateDocsHTML());
      return;
    }

    // خدمة الـ runtime و modules
    if (url.pathname.startsWith('/.elmoorx/')) {
      const file = join(FRAMEWORK_ROOT, url.pathname.replace(/^\/\.elmoorx\//, ''));
      if (existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(readFileSync(file, 'utf8'));
        return;
      }
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`  │ جاهز ✓\n  ─────────────────────────────────────`);
    console.log(`\n  → http://localhost:${port}\n`);
  });
}

function generateDocsHTML() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elmoorx v4 — توثيق تفاعلي</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .container { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
    .sidebar {
      background: #1e293b;
      padding: 1.5rem;
      border-left: 1px solid #334155;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
    }
    .sidebar h1 { color: #0ea5e9; margin-bottom: 1rem; font-size: 1.5rem; }
    .sidebar a { color: #94a3b8; text-decoration: none; display: block; padding: 0.4rem 0.5rem; border-radius: 4px; font-size: 0.9rem; }
    .sidebar a:hover { background: #334155; color: #0ea5e9; }
    .sidebar a.active { background: #0ea5e9; color: white; }
    .sidebar h3 { color: #64748b; font-size: 0.75rem; text-transform: uppercase; margin: 1rem 0 0.5rem; letter-spacing: 1px; }
    .content { padding: 2rem 3rem; max-width: 900px; }
    .content h1 { color: #0ea5e9; margin-bottom: 0.5rem; font-size: 2rem; }
    .content h2 { color: #e2e8f0; margin: 1.5rem 0 0.5rem; font-size: 1.4rem; border-bottom: 1px solid #334155; padding-bottom: 0.3rem; }
    .content h3 { color: #94a3b8; margin: 1rem 0 0.3rem; font-size: 1.1rem; }
    .content p { color: #cbd5e1; margin-bottom: 0.8rem; }
    .content code { background: #1e293b; padding: 0.15rem 0.4rem; border-radius: 3px; color: #0ea5e9; font-family: 'Courier New', monospace; font-size: 0.9em; }
    .content pre { background: #1e293b; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0.8rem 0; border: 1px solid #334155; direction: ltr; text-align: left; }
    .content pre code { background: none; color: #a5f3fc; padding: 0; }
    .content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .content th, .content td { padding: 0.6rem; border: 1px solid #334155; text-align: right; }
    .content th { background: #1e293b; color: #0ea5e9; }
    .content ul { margin: 0.5rem 1.5rem; color: #cbd5e1; }
    .content li { margin: 0.3rem 0; }
    .badge { display: inline-block; padding: 0.2rem 0.6rem; background: #0ea5e9; color: white; border-radius: 4px; font-size: 0.75rem; margin-right: 0.3rem; }
    .feature { background: #1e293b; padding: 1rem; border-radius: 8px; margin: 1rem 0; border-right: 4px solid #0ea5e9; }
    .playground { background: #1e293b; border-radius: 8px; padding: 1rem; margin: 1rem 0; border: 1px solid #334155; }
    .playground textarea { width: 100%; height: 200px; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 4px; padding: 0.5rem; font-family: monospace; direction: ltr; }
    .playground button { padding: 0.5rem 1rem; background: #0ea5e9; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 0.5rem; }
    .playground iframe { width: 100%; height: 200px; background: white; border: none; border-radius: 4px; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <aside class="sidebar">
      <h1>✦ Elmoorx v4</h1>
      <a href="#intro" class="active">مقدمة</a>
      <a href="#quick-start">البدء السريع</a>
      <h3>Core</h3>
      <a href="#runtime">runtime</a>
      <a href="#compiler">compiler</a>
      <a href="#router">router</a>
      <a href="#ssr">ssr</a>
      <h3>State</h3>
      <a href="#store">store</a>
      <a href="#forms">forms</a>
      <h3>UI</h3>
      <a href="#ui">ui components</a>
      <a href="#animation">animation</a>
      <h3>Platform</h3>
      <a href="#i18n">i18n</a>
      <a href="#http">http</a>
      <a href="#database">database</a>
      <a href="#realtime">realtime</a>
      <a href="#pwa">pwa</a>
      <a href="#adapters">adapters</a>
      <h3>Tools</h3>
      <a href="#testing">testing</a>
      <a href="#cli">CLI</a>
      <a href="#playground">Playground</a>
    </aside>

    <main class="content">
      <h1>✦ Elmoorx v4 — توثيق تفاعلي</h1>
      <p>إطار عمل ويب مستقل تماماً عن npm/npx. 14 package مدمج، 0 تبعيات خارجية.</p>

      <section id="intro">
        <h2>المقدمة</h2>
        <p>Elmoorx v4 هو إطار عمل جيل رابع مبني من الصفر ليكون مستقلاً تماماً عن أنظمة الحزم التقليدية. لا يحتاج <code>npm install</code> أو <code>npx</code> — كل التبعيات مدمجة في الـ repo نفسه.</p>
        <div class="feature">
          <strong>لماذا الاستقلالية؟</strong>
          <ul>
            <li><strong>بساطة:</strong> 146KB فقط لمشروع كامل</li>
            <li><strong>سرعة:</strong> يبدأ في أقل من ثانية</li>
            <li><strong>أمان:</strong> لا تبعيات خارجية إطلاقاً</li>
            <li><strong>استقرار:</strong> كل شيء مُضمّن ومُختبر</li>
          </ul>
        </div>
      </section>

      <section id="quick-start">
        <h2>البدء السريع</h2>
        <pre><code>git clone https://github.com/elmoorx0/elmoorx-v4.git
cd elmoorx-v4
./elmoorx create my-app
cd my-app
./elmoorx dev</code></pre>
        <p>→ افتح http://localhost:3000</p>
      </section>

      <section id="runtime">
        <h2>runtime <span class="badge">core</span></h2>
        <p>النواة الأساسية: signals, store, islands, security.</p>

        <h3>Signals</h3>
        <pre><code>import { \\$state, \\$computed, \\$effect } from '@elmoorx/runtime';

const count = \\$state(0);
const doubled = \\$computed(() => count() * 2);

\\$effect(() => {
  console.log('count:', count());
});

count.set(c => c + 1);</code></pre>

        <h3>Store (reactive proxy)</h3>
        <pre><code>import { \\$store } from '@elmoorx/runtime';

const store = \\$store({
  user: { name: 'محمد', cart: [] }
});

store.user.cart.push(item);  // reactive!</code></pre>

        <h3>Islands (zero-hydration)</h3>
        <pre><code>import { island, h, \\$state } from '@elmoorx/runtime';

const Counter = island('Counter', () => {
  const count = \\$state(0);
  return h('button', { onClick: () => count.set(c => c + 1) },
    'العدد: ', () => count()
  );
});</code></pre>

        <h3>Security</h3>
        <pre><code>import { sanitize, \\$html } from '@elmoorx/runtime';

const clean = sanitize(userInput);  // 1.98M ops/s
h('div', null, \\$html(clean));</code></pre>
      </section>

      <section id="store">
        <h2>store <span class="badge">state</span></h2>
        <p>مخزن عالمي مع time-travel و devtools.</p>
        <pre><code>import { store } from '@elmoorx/store';

store.defineSlice('counter', { count: 0 }, {
  increment: (state) => ({ ...state, count: state.count + 1 }),
  decrement: (state) => ({ ...state, count: state.count - 1 }),
});

store.dispatch('counter', 'increment');
console.log(store.getState().counter.count);</code></pre>
      </section>

      <section id="ui">
        <h2>ui <span class="badge">components</span></h2>
        <p>25+ component جاهز للاستخدام.</p>
        <pre><code>import { Button, Card, Input, Modal, toast } from '@elmoorx/ui';

function App() {
  return h(Card, { title: 'مثال' },
    h(Input, { label: 'الاسم', placeholder: '...' }),
    h(Button, { variant: 'primary', onClick: () => toast.success('تم!') }, 'حفظ')
  );
}</code></pre>
      </section>

      <section id="forms">
        <h2>forms <span class="badge">state</span></h2>
        <p>نماذج تفاعلية مع validation.</p>
        <pre><code>import { createForm, validators } from '@elmoorx/forms';

const form = createForm({
  initialValues: { email: '', password: '' },
  validators: {
    email: validators.email(),
    password: validators.minLength(8),
  },
  onSubmit: async (values) => {
    console.log(values);
  },
});</code></pre>
      </section>

      <section id="router">
        <h2>router <span class="badge">core</span></h2>
        <pre><code>import { defineRoutes, Router, Link } from '@elmoorx/router';

defineRoutes([
  { path: '/', component: Home },
  { path: '/users/:id', component: UserDetail },
  { path: '*', component: NotFound },
]);</code></pre>
      </section>

      <section id="i18n">
        <h2>i18n <span class="badge">platform</span></h2>
        <pre><code>import { setLocale, t, LanguageSwitcher } from '@elmoorx/i18n';

setLocale('ar');
t('app.welcome', { name: 'محمد' });  // مرحباً بك، محمد!</code></pre>
      </section>

      <section id="database">
        <h2>database <span class="badge">platform</span></h2>
        <pre><code>import { createDatabase } from '@elmoorx/database';

const db = await createDatabase({
  type: 'sqlite',  // أو 'indexeddb' في المتصفح
  path: './app.db',
  stores: [{ name: 'users', keyPath: 'id' }],
});

await db.insert('users', { id: 1, name: 'محمد' });
const users = await db.query('users');</code></pre>
      </section>

      <section id="realtime">
        <h2>realtime <span class="badge">platform</span></h2>
        <pre><code>import { useRealtime } from '@elmoorx/realtime';

const rt = useRealtime();
rt.join('room-1');
rt.broadcastToRoom('room-1', 'message', { text: 'مرحباً' });
rt.on('message', (data) => console.log(data));</code></pre>
      </section>

      <section id="animation">
        <h2>animation <span class="badge">ui</span></h2>
        <pre><code>import { Transition, Animated, spring } from '@elmoorx/animation';

h(Transition, { show: isVisible, type: 'fade' }, children);

h(Animated, { animation: 'bounce', duration: '1s', iteration: 'infinite' }, '✦');</code></pre>
      </section>

      <section id="pwa">
        <h2>pwa <span class="badge">platform</span></h2>
        <pre><code>import { usePWA } from '@elmoorx/pwa';

const pwa = usePWA();
await pwa.promptInstall();
await pwa.showNotification('مرحباً!', { body: 'من Elmoorx' });</code></pre>
      </section>

      <section id="http">
        <h2>http <span class="badge">platform</span></h2>
        <pre><code>import { http, useAuth, useQuery } from '@elmoorx/http';

const { data } = await http.get('/api/users');
const { login } = useAuth();
const { data, loading } = useQuery('users', () => fetch('/api/users').then(r => r.json()));</code></pre>
      </section>

      <section id="testing">
        <h2>testing <span class="badge">tools</span></h2>
        <pre><code>import { describe, it, expect } from '@elmoorx/testing';

describe('math', () => {
  it('1+1=2', () => {
    expect(1 + 1).toBe(2);
  });
});</code></pre>
        <p>التشغيل: <code>./elmoorx test</code></p>
      </section>

      <section id="cli">
        <h2>CLI Commands <span class="badge">tools</span></h2>
        <table>
          <tr><th>الأمر</th><th>الوصف</th></tr>
          <tr><td><code>create</code></td><td>إنشاء مشروع جديد</td></tr>
          <tr><td><code>init</code></td><td>تحويل مشروع موجود</td></tr>
          <tr><td><code>dev</code></td><td>خادم تطوير + HMR</td></tr>
          <tr><td><code>build</code></td><td>بناء للإنتاج</td></tr>
          <tr><td><code>deploy</code></td><td>نشر على المنصة</td></tr>
          <tr><td><code>generate</code></td><td>توليد مكون</td></tr>
          <tr><td><code>add</code></td><td>إضافة مكون جاهز</td></tr>
          <tr><td><code>visual</code></td><td>Visual Builder</td></tr>
          <tr><td><code>test</code></td><td>تشغيل اختبارات</td></tr>
          <tr><td><code>bench</code></td><td>قياس أداء</td></tr>
          <tr><td><code>docs</code></td><td>توثيق تفاعلي</td></tr>
          <tr><td><code>doctor</code></td><td>فحص صحة المشروع</td></tr>
        </table>
      </section>

      <section id="playground">
        <h2>Playground</h2>
        <p>جرّب كود Elmoorx مباشرة:</p>
        <div class="playground">
          <textarea id="code">import { h, \\$state, mount } from '@elmoorx/runtime';

mount(() => {
  const count = \\$state(0);
  return h('button', {
    onClick: () => count.set(c => c + 1),
    style: 'padding:1rem 2rem;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.2rem;'
  }, 'العدد: ', () => count());
}, '#app');</textarea>
          <button onclick="runCode()">▶ تشغيل</button>
          <iframe id="result"></iframe>
        </div>
      </section>
    </main>
  </div>

  <script>
    function runCode() {
      const code = document.getElementById('code').value;
      const iframe = document.getElementById('result');
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(\`<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:1rem;}</style></head><body><div id="app"></div><script type="module">import { h, \\$state, mount } from 'http://localhost:9000/.elmoorx/runtime/core.mjs';
      \${code}
      <\\/script></body></html>\`);
      doc.close();
    }
  </script>
</body>
</html>`;
}

import { resolve } from 'node:path';
