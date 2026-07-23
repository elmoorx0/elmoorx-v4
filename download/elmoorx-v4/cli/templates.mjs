/**
 * elmoorx new <template> <name> — ينشئ مشروع من قالب متقدم
 *
 * القوالب المتاحة:
 *   - blank        مشروع فارغ
 *   - starter      نقطة بداية مع counter + todo
 *   - blog         مدونة كاملة مع routing + i18n
 *   - dashboard    لوحة تحكم مع charts
 *   - ecommerce    متجر إلكتروني
 *   - saas         تطبيق SaaS مع auth
 *   - landing      صفحة هبوط
 *   - docs         موقع توثيق
 *   - portfolio    موقع شخصي
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createProject } from './create.mjs';

export async function createFromTemplate(templateName, projectName, options = {}) {
  console.log(`\n  ✦ Elmoorx v4 — New from template`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ القالب: ${templateName}`);
  console.log(`  │ المشروع: ${projectName}`);

  const templates = {
    blank: blankTemplate,
    starter: starterTemplate,
    blog: blogTemplate,
    dashboard: dashboardTemplate,
    ecommerce: ecommerceTemplate,
    saas: saasTemplate,
    landing: landingTemplate,
    docs: docsTemplate,
    portfolio: portfolioTemplate,
  };

  const template = templates[templateName];
  if (!template) {
    console.error(`  ✗ قالب غير معروف: ${templateName}`);
    console.error(`  القوالب المتاحة:`);
    for (const name of Object.keys(templates)) {
      console.error(`    • ${name}`);
    }
    process.exit(1);
  }

  // أنشئ المشروع الأساسي
  await createProject(projectName, 'default');

  // أضف ملفات القالب
  const target = resolve(process.cwd(), projectName);
  await template(target);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) BLANK — مشروع فارغ
// ─────────────────────────────────────────────────────────────────────────────

async function blankTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h } from '@elmoorx/runtime';

export default function App() {
  return h('div', { style: 'padding:2rem;' },
    h('h1', null, 'ابدأ من هنا')
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) STARTER — counter + todo
// ─────────────────────────────────────────────────────────────────────────────

async function starterTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state, $store } from '@elmoorx/runtime';
import { Button, Card, Input, Stack } from '@elmoorx/ui';

export default function App() {
  const count = $state(0);
  const todos = $store([
    { id: 1, text: 'تعلّم Elmoorx', done: true },
    { id: 2, text: 'بناء تطبيق', done: false },
  ]);
  const newText = $state('');

  const add = (e) => {
    e.preventDefault();
    if (!newText().trim()) return;
    todos.push({ id: Date.now(), text: newText(), done: false });
    newText.set('');
  };

  return h('div', { style: 'max-width:600px;margin:0 auto;padding:2rem;font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('h1', { style: 'color:#0ea5e9;text-align:center;' }, '✦ Starter App'),
    h(Card, { title: 'Counter' },
      h(Stack, { direction: 'horizontal', gap: 'sm', align: 'center' },
        h(Button, { variant: 'danger', onClick: () => count.set(c => c - 1) }, '−'),
        h('span', { style: 'font-size:2rem;color:#0ea5e9;min-width:3rem;text-align:center;' }, () => count()),
        h(Button, { variant: 'success', onClick: () => count.set(c => c + 1) }, '+'),
      )
    ),
    h(Card, { title: 'Todo', style: 'margin-top:1rem;' },
      h('form', { onSubmit: add, style: 'display:flex;gap:0.5rem;margin-bottom:1rem;' },
        h(Input, { value: newText(), onInput: e => newText.set(e.target.value), placeholder: 'مهمة جديدة...' }),
        h(Button, { type: 'submit' }, '+')
      ),
      h('ul', { style: 'list-style:none;padding:0;' },
        todos.get().map(todo =>
          h('li', { key: todo.id, style: 'padding:0.5rem;border-bottom:1px solid #334155;display:flex;gap:0.5rem;align-items:center;' },
            h('input', { type: 'checkbox', checked: todo.done, onChange: () => { const t = todos.get(); const i = t.findIndex(x => x.id === todo.id); t[i].done = !t[i].done; } }),
            h('span', { style: todo.done ? 'text-decoration:line-through;color:#64748b;flex:1;' : 'flex:1;' }, todo.text),
            h(Button, { variant: 'danger', size: 'sm', onClick: () => { const t = todos.get(); const i = t.findIndex(x => x.id === todo.id); t.splice(i, 1); } }, '×')
          )
        )
      )
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

async function dashboardTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state, $computed } from '@elmoorx/runtime';
import { Card, Badge, Table, Progress, Stack, Grid, Avatar } from '@elmoorx/ui';
import { BarChart, LineChart, PieChart } from '@elmoorx/charts';

const stats = [
  { label: 'المستخدمون', value: 1248, change: '+12%', color: '#0ea5e9' },
  { label: 'الإيراد', value: 45200, change: '+8%', color: '#10b981' },
  { label: 'الطلبات', value: 387, change: '+23%', color: '#f59e0b' },
  { label: 'التحويل', value: '3.2%', change: '+0.5%', color: '#8b5cf6' },
];

const monthlyData = [
  { label: 'يناير', value: 65 },
  { label: 'فبراير', value: 78 },
  { label: 'مارس', value: 92 },
  { label: 'أبريل', value: 85 },
  { label: 'مايو', value: 110 },
  { label: 'يونيو', value: 125 },
];

const usersData = [
  { label: 'نشط', value: 850 },
  { label: 'جديد', value: 250 },
  { label: 'غير نشط', value: 148 },
];

const recentUsers = [
  { name: 'محمد علي', email: 'mohammed@example.com', status: 'active' },
  { name: 'فاطمة حسن', email: 'fatima@example.com', status: 'active' },
  { name: 'أحمد خالد', email: 'ahmed@example.com', status: 'inactive' },
  { name: 'سارة أحمد', email: 'sara@example.com', status: 'active' },
];

export default function App() {
  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:2rem;' },
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1.5rem;' }, 'لوحة التحكم'),

    // Stats cards
    h(Grid, { cols: 4, gap: 'md' },
      stats.map(s => h(Card, { key: s.label },
        h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, s.label),
        h('div', { style: 'font-size:1.75rem;font-weight:bold;margin:0.25rem 0;' }, s.value),
        h(Badge, { variant: 'success' }, s.change)
      ))
    ),

    // Charts
    h(Grid, { cols: 2, gap: 'md', style: 'margin-top:1.5rem;' },
      h(Card, { title: 'المبيعات الشهرية' },
        h(BarChart, { data: monthlyData, color: '#0ea5e9' })
      ),
      h(Card, { title: 'توزيع المستخدمين' },
        h(PieChart, { data: usersData, donut: true, width: 300, height: 300 })
      )
    ),

    // Recent users
    h(Card, { title: 'أحدث المستخدمين', style: 'margin-top:1.5rem;' },
      h(Table, {
        columns: [
          { key: 'name', label: 'الاسم', render: (v) => h(Stack, { direction: 'horizontal', gap: 'sm', align: 'center' }, h(Avatar, { name: v, size: 32 }), v) },
          { key: 'email', label: 'البريد' },
          { key: 'status', label: 'الحالة', render: (v) => h(Badge, { variant: v === 'active' ? 'success' : 'default' }, v === 'active' ? 'نشط' : 'غير نشط') },
        ],
        data: recentUsers,
        hoverable: true,
      })
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) BLOG
// ─────────────────────────────────────────────────────────────────────────────

async function blogTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state, $computed } from '@elmoorx/runtime';
import { defineRoutes, Router, Link, setLayout } from '@elmoorx/router';
import { Card, Badge, Input, Button } from '@elmoorx/ui';

const posts = [
  { id: 1, slug: 'hello-elmoorx', title: 'مرحباً Elmoorx', excerpt: 'أول تدوينة', content: 'محتوى التدوينة الأولى هنا.', date: '2026-07-20', category: 'tech' },
  { id: 2, slug: 'hmr-zero', title: 'HMR صفر-زمني', excerpt: 'كيف يعمل', content: 'شرح HMR.', date: '2026-07-21', category: 'tech' },
  { id: 3, slug: 'edge-native', title: 'Edge + Native', excerpt: 'كود واحد، 6 منصات', content: 'شرح Edge + Native.', date: '2026-07-22', category: 'deep' },
];

function Layout(props) {
  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('header', { style: 'background:#1e293b;padding:1rem 2rem;border-bottom:1px solid #334155;' },
      h(Link, { to: '/', style: 'color:#0ea5e9;font-size:1.5rem;font-weight:bold;text-decoration:none;' }, '✦ مدونتي')
    ),
    h('main', { style: 'max-width:800px;margin:0 auto;padding:2rem;' }, props.children),
    h('footer', { style: 'background:#1e293b;padding:1rem;text-align:center;color:#64748b;' }, '© 2026 مدونتي')
  );
}

setLayout(Layout);

function Home() {
  const search = $state('');
  const filtered = $computed(() => {
    const q = search().toLowerCase();
    return q ? posts.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q)) : posts;
  });
  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'أحدث المقالات'),
    h(Input, { placeholder: 'بحث...', value: search(), onInput: e => search.set(e.target.value), style: 'margin-bottom:1rem;' }),
    filtered().map(post =>
      h(Card, { key: post.id, hover: true, onClick: () => navigate('/post/' + post.slug), style: 'margin-bottom:1rem;cursor:pointer;' },
        h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;' },
          h(Badge, { variant: 'primary' }, post.category),
          h('span', { style: 'color:#64748b;font-size:0.85rem;' }, post.date)
        ),
        h('h3', { style: 'color:#e2e8f0;margin:0.5rem 0;' }, post.title),
        h('p', { style: 'color:#94a3b8;' }, post.excerpt)
      )
    )
  );
}

function Post({ params }) {
  const post = posts.find(p => p.slug === params.slug);
  if (!post) return h('div', null, '404');
  return h('article', null,
    h(Link, { to: '/', style: 'color:#0ea5e9;' }, '← رجوع'),
    h('h1', { style: 'color:#e2e8f0;margin:1rem 0;' }, post.title),
    h('div', { style: 'color:#64748b;margin-bottom:1rem;' }, post.date + ' • ' + post.category),
    h('div', { style: 'color:#cbd5e1;line-height:1.8;' }, post.content)
  );
}

defineRoutes([
  { path: '/', component: Home },
  { path: '/post/:slug', component: Post },
]);

export default function App() { return h(Router, null); }
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) ECOMMERCE
// ─────────────────────────────────────────────────────────────────────────────

async function ecommerceTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $store, $computed } from '@elmoorx/runtime';
import { Card, Button, Badge, Grid, Stack, Avatar } from '@elmoorx/ui';

const products = [
  { id: 1, name: 'كتاب Elmoorx', price: 50, image: '📚' },
  { id: 2, name: 'T-shirt', price: 80, image: '👕' },
  { id: 3, name: 'حقيبة', price: 120, image: '🎒' },
  { id: 4, name: 'ساعة', price: 250, image: '⌚' },
];

export default function App() {
  const cart = $store([]);
  const total = $computed(() => cart.get().reduce((sum, item) => sum + item.price * item.qty, 0));

  const addToCart = (product) => {
    const existing = cart.get().find(i => i.id === product.id);
    if (existing) existing.qty++;
    else cart.push({ ...product, qty: 1 });
  };

  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('header', { style: 'background:#1e293b;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;' },
      h('h1', { style: 'color:#0ea5e9;' }, '✦ متجر'),
      h(Stack, { direction: 'horizontal', gap: 'sm', align: 'center' },
        h(Badge, { variant: 'warning', dot: true }, () => cart.get().length + ' منتجات'),
        h('span', { style: 'color:#10b981;font-weight:bold;' }, () => total() + ' ر.س')
      )
    ),
    h('main', { style: 'max-width:1200px;margin:0 auto;padding:2rem;' },
      h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'المنتجات'),
      h(Grid, { cols: 4, gap: 'md' },
        products.map(p =>
          h(Card, { key: p.id, hover: true },
            h('div', { style: 'text-align:center;font-size:4rem;margin:1rem 0;' }, p.image),
            h('h3', { style: 'color:#e2e8f0;' }, p.name),
            h('p', { style: 'color:#10b981;font-size:1.5rem;margin:0.5rem 0;' }, p.price + ' ر.س'),
            h(Button, { onClick: () => addToCart(p), style: 'width:100%;' }, 'أضف للسلة')
          )
        )
      ),
      cart.get().length > 0 && h(Card, { title: 'السلة', style: 'margin-top:2rem;' },
        cart.get().map(item =>
          h('div', { key: item.id, style: 'display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid #334155;' },
            h('span', null, item.name + ' × ' + item.qty),
            h('span', { style: 'color:#10b981;' }, (item.price * item.qty) + ' ر.س')
          )
        ),
        h('div', { style: 'display:flex;justify-content:space-between;font-weight:bold;margin-top:1rem;font-size:1.25rem;' },
          h('span', null, 'الإجمالي'),
          h('span', { style: 'color:#10b981;' }, () => total() + ' ر.س')
        ),
        h(Button, { variant: 'success', style: 'width:100%;margin-top:1rem;' }, 'إتمام الشراء')
      )
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) SAAS
// ─────────────────────────────────────────────────────────────────────────────

async function saasTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state } from '@elmoorx/runtime';
import { Card, Button, Input, Stack, Alert } from '@elmoorx/ui';
import { useAuth } from '@elmoorx/http';

export default function App() {
  const { user, login, logout, loading } = useAuth();
  const email = $state('');
  const password = $state('');
  const error = $state('');

  const handleLogin = async (e) => {
    e.preventDefault();
    error.set('');
    try {
      await login({ email: email(), password: password() });
    } catch (err) {
      error.set(err.message || 'فشل تسجيل الدخول');
    }
  };

  if (user()) {
    return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:2rem;' },
      h(Card, { title: 'مرحباً ' + user().name },
        h('p', { style: 'color:#94a3b8;' }, 'مرحباً بك في لوحة التحكم'),
        h(Button, { variant: 'danger', onClick: logout }, 'تسجيل الخروج')
      )
    );
  }

  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;' },
    h(Card, { title: 'تسجيل الدخول', style: 'max-width:400px;width:100%;' },
      error() && h(Alert, { variant: 'danger' }, error()),
      h('form', { onSubmit: handleLogin },
        h(Input, { label: 'البريد', type: 'email', value: email(), onInput: e => email.set(e.target.value), placeholder: 'you@example.com' }),
        h(Input, { label: 'كلمة المرور', type: 'password', value: password(), onInput: e => password.set(e.target.value), placeholder: '••••••••' }),
        h(Button, { type: 'submit', loading: loading(), style: 'width:100%;' }, 'دخول')
      )
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) LANDING
// ─────────────────────────────────────────────────────────────────────────────

async function landingTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h } from '@elmoorx/runtime';
import { Button, Card, Stack, Grid, Badge } from '@elmoorx/ui';

export default function App() {
  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;' },
    // Hero
    h('section', { style: 'text-align:center;padding:5rem 2rem;background:linear-gradient(135deg,#0f172a,#1e293b);' },
      h(Badge, { variant: 'primary', dot: true }, 'جديد! v4.0'),
      h('h1', { style: 'font-size:3rem;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;margin:1rem 0;' }, 'ابنِ تطبيقاتك بسرعة'),
      h('p', { style: 'color:#94a3b8;font-size:1.25rem;max-width:600px;margin:0 auto 2rem;' }, 'إطار عمل مستقل عن npm، سريع، آمن، ويعمل على أي منصة'),
      h(Stack, { direction: 'horizontal', gap: 'md', justify: 'center' },
        h(Button, { size: 'lg' }, 'ابدأ مجاناً'),
        h(Button, { variant: 'outline', size: 'lg' }, 'التوثيق')
      )
    ),
    // Features
    h('section', { style: 'padding:4rem 2rem;max-width:1200px;margin:0 auto;' },
      h('h2', { style: 'text-align:center;color:#0ea5e9;margin-bottom:2rem;' }, 'لماذا Elmoorx؟'),
      h(Grid, { cols: 3, gap: 'lg' },
        [
          { icon: '⚡', title: 'سريع', desc: 'HMR صفر-زمني عبر WebSocket مباشر' },
          { icon: '🔒', title: 'آمن', desc: 'حماية تلقائية من XSS و CSRF' },
          { icon: '🌐', title: 'موحّد', desc: 'كود واحد يعمل على 6 منصات' },
          { icon: '📦', title: 'مستقل', desc: 'بدون npm أو npx — كل شيء مدمج' },
          { icon: '🎨', title: 'مرن', desc: '25+ مكون UI جاهز للاستخدام' },
          { icon: '🧪', title: 'مُختبر', desc: '97 اختبار ناجح، 0 تبعيات' },
        ].map(f =>
          h(Card, { key: f.title, hover: true },
            h('div', { style: 'font-size:3rem;margin-bottom:1rem;' }, f.icon),
            h('h3', { style: 'color:#0ea5e9;margin-bottom:0.5rem;' }, f.title),
            h('p', { style: 'color:#94a3b8;' }, f.desc)
          )
        )
      )
    ),
    // CTA
    h('section', { style: 'text-align:center;padding:4rem 2rem;background:#1e293b;' },
      h('h2', { style: 'color:#e2e8f0;font-size:2rem;margin-bottom:1rem;' }, 'جاهز للبدء؟'),
      h(Button, { size: 'lg' }, 'إنشاء مشروع الآن')
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) DOCS
// ─────────────────────────────────────────────────────────────────────────────

async function docsTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state } from '@elmoorx/runtime';
import { Markdown } from '@elmoorx/markdown';

const docs = [
  { id: 'intro', title: 'مقدمة', content: '# مقدمة\\n\\nهذا توثيق تفاعلي.' },
  { id: 'install', title: 'التثبيت', content: '# التثبيت\\n\\n- انسخ الـ repo\\n- شغّل elmoorx dev' },
];

export default function App() {
  const current = $state('intro');
  const doc = docs.find(d => d.id === current());

  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;display:grid;grid-template-columns:250px 1fr;' },
    h('aside', { style: 'background:#1e293b;padding:1.5rem;border-left:1px solid #334155;' },
      h('h2', { style: 'color:#0ea5e9;' }, '✦ توثيق'),
      docs.map(d =>
        h('a', {
          key: d.id,
          href: '#' + d.id,
          onClick: (e) => { e.preventDefault(); current.set(d.id); },
          style: current() === d.id ? 'display:block;padding:0.5rem;color:#0ea5e9;' : 'display:block;padding:0.5rem;color:#94a3b8;text-decoration:none;'
        }, d.title)
      )
    ),
    h('main', { style: 'padding:2rem;max-width:800px;' },
      h(Markdown, { source: doc.content })
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────

async function portfolioTemplate(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h } from '@elmoorx/runtime';
import { Card, Button, Grid, Stack, Avatar, Badge } from '@elmoorx/ui';

export default function App() {
  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;' },
    // Header
    h('header', { style: 'padding:2rem;text-align:center;' },
      h(Avatar, { name: 'محمد علي', size: 100, style: 'margin:0 auto;display:block;' }),
      h('h1', { style: 'color:#0ea5e9;margin:1rem 0;' }, 'محمد علي'),
      h('p', { style: 'color:#94a3b8;' }, 'مطور Full-Stack'),
      h(Stack, { direction: 'horizontal', gap: 'sm', justify: 'center', style: 'margin-top:1rem;' },
        h(Badge, { variant: 'primary' }, 'React'),
        h(Badge, { variant: 'success' }, 'Node.js'),
        h(Badge, { variant: 'warning' }, 'TypeScript')
      )
    ),
    // Projects
    h('section', { style: 'max-width:1000px;margin:0 auto;padding:2rem;' },
      h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'المشاريع'),
      h(Grid, { cols: 3, gap: 'md' },
        [
          { name: 'مشروع 1', desc: 'وصف المشروع الأول' },
          { name: 'مشروع 2', desc: 'وصف المشروع الثاني' },
          { name: 'مشروع 3', desc: 'وصف المشروع الثالث' },
        ].map(p =>
          h(Card, { key: p.name, hover: true },
            h('h3', { style: 'color:#0ea5e9;' }, p.name),
            h('p', { style: 'color:#94a3b8;' }, p.desc),
            h(Button, { variant: 'outline', size: 'sm' }, 'تفاصيل')
          )
        )
      )
    ),
    // Contact
    h('section', { style: 'text-align:center;padding:3rem;' },
      h('h2', { style: 'color:#0ea5e9;' }, 'تواصل معي'),
      h(Stack, { direction: 'horizontal', gap: 'md', justify: 'center' },
        h(Button, { variant: 'outline' }, 'GitHub'),
        h(Button, { variant: 'outline' }, 'LinkedIn'),
        h(Button, null, 'Email')
      )
    )
  );
}
`);
}
