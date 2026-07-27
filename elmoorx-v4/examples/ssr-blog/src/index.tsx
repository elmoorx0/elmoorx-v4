/**
 * مثال: تطبيق SSR Blog متكامل
 * يعرض:
 *   - Server-side routing (file-based)
 *   - Data loaders (getServerSideProps)
 *   - SSR rendering + hydration
 *   - JWT auth (login + protected routes)
 *   - API routes (CRUD)
 *   - i18n (عربي/إنجليزي)
 *   - SEO (meta tags per page)
 */

import { h, $state, $store, $effect, $computed } from '@elmoorx/runtime';
import { defineRoutes, Router, Link, setLayout } from '@elmoorx/router';
import { Card, Button, Input, Badge, Stack, Grid, Avatar, Tag, Spinner } from '@elmoorx/ui';
import { useAuth, http } from '@elmoorx/http';
import { t, setLocale, LanguageSwitcher } from '@elmoorx/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// 1) BLOG DATA (would be from database in production)
// ─────────────────────────────────────────────────────────────────────────────

const posts = [
  { id: 1, slug: 'welcome-to-elmoorx', title: 'مرحباً بك في Elmoorx v4', excerpt: 'تعرّف على إطار العمل المستقل عن npm', content: 'Elmoorx v4 هو إطار عمل ويب جيل رابع...', date: '2026-07-20', author: 'Elmoorx Team', category: 'tutorials', readingTime: 5, views: 1248 },
  { id: 2, slug: 'ssr-production-ready', title: 'SSR جاهز للإنتاج', excerpt: 'كيف يعمل SSR في Elmoorx', content: 'الـ SSR في Elmoorx v4 يعمل عبر...', date: '2026-07-21', author: 'Elmoorx Team', category: 'deep-dives', readingTime: 7, views: 892 },
  { id: 3, slug: 'jwt-auth-guide', title: 'دليل JWT Auth', excerpt: 'مصادقة كاملة مع JWT', content: 'JWT Auth في Elmoorx...', date: '2026-07-22', author: 'Elmoorx Team', category: 'tutorials', readingTime: 10, views: 567 },
  { id: 4, slug: 'zero-dependencies', title: '0 تبعيات npm', excerpt: 'كيف بنينا إطار بدون npm', content: 'بناء إطار بدون تبعيات...', date: '2026-07-23', author: 'Elmoorx Team', category: 'deep-dives', readingTime: 8, views: 1503 },
];

const users = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// 2) DATA LOADERS (getServerSideProps)
// ─────────────────────────────────────────────────────────────────────────────

// Home page — load all posts
export async function getServerSideProps_home({ query, ctx }) {
  const category = query.category;
  const filtered = category ? posts.filter(p => p.category === category) : posts;
  return {
    posts: filtered,
    categories: [...new Set(posts.map(p => p.category))],
    selectedCategory: category || 'all',
  };
}

// Post detail — load single post by slug
export async function getServerSideProps_post({ params, ctx }) {
  const post = posts.find(p => p.slug === params.slug);
  if (!post) return { notFound: true };
  const related = posts.filter(p => p.category === post.category && p.id !== post.id).slice(0, 3);
  return { post, related };
}

// Dashboard — protected route, requires auth
export async function getServerSideProps_dashboard({ ctx }) {
  if (!ctx.user) return { redirect: '/login' };
  return { user: ctx.user, stats: { posts: posts.length, views: posts.reduce((s, p) => s + p.views, 0) } };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) LAYOUT — يحيط بكل الصفحات
// ─────────────────────────────────────────────────────────────────────────────

function Layout(props) {
  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('header', { style: 'background:#1e293b;padding:1rem 2rem;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;' },
      h(Link, { to: '/', style: 'color:#0ea5e9;font-weight:bold;font-size:1.5rem;text-decoration:none;' }, '✦ SSR Blog'),
      h('nav', { style: 'display:flex;gap:1.5rem;align-items:center;' },
        h(Link, { to: '/', style: 'color:#94a3b8;text-decoration:none;' }, 'الرئيسية'),
        h(Link, { to: '/categories', style: 'color:#94a3b8;text-decoration:none;' }, 'التصنيفات'),
        h(Link, { to: '/dashboard', style: 'color:#94a3b8;text-decoration:none;' }, 'لوحة التحكم'),
        h(Link, { to: '/login', style: 'color:#94a3b8;text-decoration:none;' }, 'تسجيل الدخول'),
        h(LanguageSwitcher, { style: 'padding:0.25rem;' })
      )
    ),
    h('main', { style: 'max-width:900px;margin:0 auto;padding:2rem;' }, props.children),
    h('footer', { style: 'background:#1e293b;padding:1.5rem;text-align:center;color:#64748b;border-top:1px solid #334155;' },
      '© 2026 SSR Blog — مبني بـ Elmoorx v4 (SSR + JWT + i18n)'
    )
  );
}

setLayout(Layout);

// ─────────────────────────────────────────────────────────────────────────────
// 4) PAGES
// ─────────────────────────────────────────────────────────────────────────────

// Home page
function HomePage({ loaderData }) {
  const { posts: pagePosts, categories, selectedCategory } = loaderData || {};
  const data = pagePosts || posts;
  const cats = categories || [...new Set(posts.map(p => p.category))];

  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'أحدث المقالات'),
    h('p', { style: 'color:#94a3b8;margin-bottom:2rem;' }, `${data.length} مقال`),
    // Category filter
    h(Stack, { direction: 'horizontal', gap: 'sm', style: 'margin-bottom:2rem;flex-wrap:wrap;' },
      h(Link, { to: '/', style: selectedCategory === 'all' ? 'color:#0ea5e9;' : 'color:#94a3b8;text-decoration:none;' }, 'الكل'),
      cats.map(cat =>
        h(Link, { key: cat, to: '/?category=' + cat, style: selectedCategory === cat ? 'color:#0ea5e9;' : 'color:#94a3b8;text-decoration:none;' }, cat)
      )
    ),
    // Posts
    Grid({ cols: 2, gap: 'md' },
      data.map(post => h(PostCard, { key: post.id, post }))
    )
  );
}

// Post detail page
function PostPage({ loaderData, params }) {
  const { post, related, notFound } = loaderData || {};

  if (notFound) {
    return h('div', { style: 'text-align:center;padding:4rem;' },
      h('h1', { style: 'color:#ef4444;font-size:3rem;' }, '404'),
      h('p', { style: 'color:#94a3b8;' }, 'المقال غير موجود'),
      h(Link, { to: '/', style: 'color:#0ea5e9;' }, 'العودة للرئيسية')
    );
  }

  if (!post) return h(Spinner, { size: 40 });

  return h('article', null,
    h(Link, { to: '/', style: 'color:#0ea5e9;text-decoration:none;display:inline-block;margin-bottom:1rem;' }, '← رجوع'),
    h(Badge, { variant: 'primary' }, post.category),
    h('h1', { style: 'color:#e2e8f0;font-size:2rem;margin:0.5rem 0;' }, post.title),
    h('div', { style: 'color:#64748b;font-size:0.9rem;margin-bottom:2rem;' },
      `${post.date} • ${post.author} • ${post.readingTime} دقائق قراءة • ${post.views} مشاهدة`
    ),
    h('div', { style: 'color:#cbd5e1;line-height:1.8;font-size:1.1rem;' }, post.content),
    // Related
    related && related.length > 0 && h('div', { style: 'margin-top:3rem;' },
      h('h3', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'مقالات ذات صلة'),
      h(Grid, { cols: 3, gap: 'sm' },
        related.map(p => h(PostCard, { key: p.id, post: p }))
      )
    )
  );
}

// Login page
function LoginPage() {
  const { login, loading } = useAuth();
  const email = $state('');
  const password = $state('');
  const error = $state('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    error.set('');
    try {
      await login({ email: email(), password: password() });
      // redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      error.set(err.message || 'فشل تسجيل الدخول');
    }
  };

  return h('div', { style: 'max-width:400px;margin:2rem auto;' },
    h(Card, { title: 'تسجيل الدخول' },
      error() && h('div', { style: 'color:#ef4444;margin-bottom:1rem;padding:0.5rem;background:#fef2f2;border-radius:6px;' }, error()),
      h('form', { onSubmit: handleSubmit },
        h(Input, { label: 'البريد الإلكتروني', type: 'email', value: email(), onInput: e => email.set(e.target.value), placeholder: 'you@example.com' }),
        h(Input, { label: 'كلمة المرور', type: 'password', value: password(), onInput: e => password.set(e.target.value), placeholder: '••••••••' }),
        h(Button, { type: 'submit', loading: loading(), style: 'width:100%;' }, 'تسجيل الدخول')
      ),
      h('p', { style: 'color:#64748b;font-size:0.85rem;text-align:center;margin-top:1rem;' },
        'جرّب: admin@elmoorx.dev / admin123'
      )
    )
  );
}

// Dashboard — protected
function DashboardPage({ loaderData }) {
  const { user, stats } = loaderData || {};
  const { logout } = useAuth();

  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'لوحة التحكم'),
    h(Card, null,
      h('p', { style: 'color:#94a3b8;' }, 'مرحباً، '),
      h('h2', { style: 'color:#e2e8f0;' }, user?.name || 'مستخدم'),
      h(Stack, { direction: 'horizontal', gap: 'md', style: 'margin-top:1rem;' },
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:8px;flex:1;text-align:center;' },
          h('div', { style: 'font-size:2rem;color:#0ea5e9;font-weight:bold;' }, stats?.posts || 0),
          h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'مقالات')
        ),
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:8px;flex:1;text-align:center;' },
          h('div', { style: 'font-size:2rem;color:#10b981;font-weight:bold;' }, stats?.views || 0),
          h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'مشاهدات')
        )
      ),
      h(Button, { variant: 'danger', onClick: () => { logout(); window.location.href = '/'; }, style: 'margin-top:1rem;' }, 'تسجيل الخروج')
    )
  );
}

// Categories page
function CategoriesPage({ loaderData }) {
  const categories = [...new Set(posts.map(p => p.category))];
  const counts = categories.map(cat => ({ cat, count: posts.filter(p => p.category === cat).length }));

  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'التصنيفات'),
    h(Grid, { cols: 2, gap: 'md' },
      counts.map(c =>
        h(Card, { key: c.cat, hover: true },
          h('h3', { style: 'color:#0ea5e9;text-transform:capitalize;' }, c.cat),
          h('p', { style: 'color:#94a3b8;' }, c.count + ' مقالات'),
          h(Link, { to: '/?category=' + c.cat, style: 'color:#0ea5e9;text-decoration:none;' }, 'تصفح →')
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) POST CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function PostCard({ post }) {
  return h(Card, {
    hover: true,
    onClick: () => { if (typeof window !== 'undefined') window.location.href = '/post/' + post.slug; },
    style: 'cursor:pointer;',
  },
    h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;' },
      h(Badge, { variant: 'primary', size: 'sm' }, post.category),
      h('span', { style: 'color:#64748b;font-size:0.75rem;' }, post.date)
    ),
    h('h3', { style: 'color:#e2e8f0;margin:0.5rem 0;' }, post.title),
    h('p', { style: 'color:#94a3b8;' }, post.excerpt),
    h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:0.75rem;' },
      h(Stack, { direction: 'horizontal', gap: 'xs', align: 'center' },
        h(Avatar, { name: post.author, size: 24 }),
        h('span', { style: 'color:#64748b;font-size:0.8rem;' }, post.author)
      ),
      h('span', { style: 'color:#0ea5e9;font-size:0.85rem;' }, post.readingTime + ' د • ' + post.views + ' مشاهدة')
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) ROUTES — مع data loaders
// ─────────────────────────────────────────────────────────────────────────────

defineRoutes([
  { path: '/', component: HomePage, loader: getServerSideProps_home },
  { path: '/post/:slug', component: PostPage, loader: getServerSideProps_post },
  { path: '/categories', component: CategoriesPage },
  { path: '/login', component: LoginPage },
  { path: '/dashboard', component: DashboardPage, loader: getServerSideProps_dashboard },
  { path: '*', component: () => h('div', { style: 'text-align:center;padding:4rem;' }, h('h1', { style: 'color:#ef4444;' }, '404')) },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return h(Router, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) API ROUTES (api/posts/index.mjs)
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // GET /api/posts — list all
  async GET({ query, ctx }) {
    const category = query.category;
    const filtered = category ? posts.filter(p => p.category === category) : posts;
    return { status: 200, body: { data: filtered, total: filtered.length } };
  },

  // POST /api/posts — create (requires auth)
  async POST({ body, ctx }) {
    if (!ctx.user) return { status: 401, body: { error: 'Unauthorized' } };
    const post = { id: Date.now(), ...body, date: new Date().toISOString().slice(0, 10), author: ctx.user.name, views: 0 };
    posts.push(post);
    return { status: 201, body: post };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 9) AUTH API (api/auth/login.mjs)
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  async POST({ body }) {
    const { email, password } = body;
    // Demo: accept admin@elmoorx.dev / admin123
    if (email === 'admin@elmoorx.dev' && password === 'admin123') {
      const { signJWT } = await import('@elmoorx/ssr-server');
      const token = signJWT({ userId: 1, name: 'Admin', email, role: 'admin' }, process.env.JWT_SECRET || 'demo-secret', { expiresIn: '24h' });
      return { status: 200, body: { token, user: { id: 1, name: 'Admin', email, role: 'admin' } } };
    }
    return { status: 401, body: { error: 'بيانات غير صحيحة' } };
  },
};
