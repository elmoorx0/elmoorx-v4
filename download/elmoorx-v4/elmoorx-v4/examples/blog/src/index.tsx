/**
 * مثال: تطبيق Blog كامل مع routing + i18n + signals
 * يعرض كيفية بناء تطبيق حقيقي بـ Elmoorx v4
 */
import { h, $state, $effect, $computed } from '@elmoorx/runtime';
import { defineRoutes, Router, Link, navigate, setNotFound, setLayout } from '@elmoorx/router';
import { defineLocale, setLocale, t, T, LanguageSwitcher, isRTL } from '@elmoorx/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// 1) تعريف الترجمات
// ─────────────────────────────────────────────────────────────────────────────

defineLocale('ar', {
  'blog.title': 'مدونتي',
  'blog.subtitle': 'أفكار وتجارب في البرمجة والحياة',
  'blog.read_more': 'اقرأ المزيد',
  'blog.back': '← العودة للرئيسية',
  'blog.published': 'نُشر في',
  'blog.comments': '{count} تعليق',
  'blog.share': 'شارك',
  'blog.related': 'مقالات ذات صلة',
  'blog.search': 'ابحث في المقالات...',
  'blog.no_results': 'لا توجد نتائج',
  'blog.latest': 'أحدث المقالات',
  'blog.categories': 'التصنيفات',
});

defineLocale('en', {
  'blog.title': 'My Blog',
  'blog.subtitle': 'Thoughts on programming and life',
  'blog.read_more': 'Read more',
  'blog.back': '← Back to home',
  'blog.published': 'Published on',
  'blog.comments': '{count} comments',
  'blog.share': 'Share',
  'blog.related': 'Related posts',
  'blog.search': 'Search articles...',
  'blog.no_results': 'No results',
  'blog.latest': 'Latest posts',
  'blog.categories': 'Categories',
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) بيانات المقالات (mock)
// ─────────────────────────────────────────────────────────────────────────────

const posts = [
  {
    id: 1,
    slug: 'welcome-to-elmoorx',
    title: { ar: 'مرحباً بك في Elmoorx v4', en: 'Welcome to Elmoorx v4' },
    excerpt: { ar: 'تعرّف على إطار العمل المستقل عن npm/npx...', en: 'Discover the npm-independent framework...' },
    content: { ar: 'Elmoorx v4 هو إطار عمل جيل رابع مبني من الصفر ليكون مستقلاً تماماً عن أنظمة الحزم التقليدية. لا يحتاج npm install أو npx — كل التبعيات مدمجة في الـ repo نفسه. هذا يعني أنك تنسخ الـ repo وتبدأ فوراً.', en: 'Elmoorx v4 is a fourth-generation framework built from scratch to be completely independent of traditional package managers.' },
    date: '2026-07-20',
    author: 'Elmoorx Team',
    category: 'tutorials',
    readingTime: 5,
  },
  {
    id: 2,
    slug: 'hmr-zero-latency',
    title: { ar: 'HMR صفر-زمني: كيف يعمل', en: 'Zero-latency HMR: How it works' },
    excerpt: { ar: 'WebSocket مباشر بدون Vite أو Webpack...', en: 'Direct WebSocket without Vite or Webpack...' },
    content: { ar: 'HMR (Hot Module Replacement) في Elmoorx v4 يعمل عبر WebSocket مباشر بين خادم التطوير والمتصفح. لا حاجة لأدوات وسيطة مثل Vite أو Webpack. عند تعديل ملف، يُعيد الخادم تجميعه ويُرسل الكود الجديد فوراً عبر WebSocket.', en: 'HMR in Elmoorx v4 works via direct WebSocket between dev server and browser.' },
    date: '2026-07-21',
    author: 'Elmoorx Team',
    category: 'deep-dives',
    readingTime: 7,
  },
  {
    id: 3,
    slug: 'edge-native-unified',
    title: { ar: 'Edge + Native: كود واحد، 6 منصات', en: 'Edge + Native: One code, 6 platforms' },
    excerpt: { ar: 'كيف تجمّع نفس الكود لـ browser/cloudflare/vercel/deno/node/native...', en: 'How to compile the same code to browser/cloudflare/vercel/deno/node/native...' },
    content: { ar: 'Elmoorx v4 يوفر API موحّد يعمل على 6 منصات: Browser, Cloudflare Workers, Vercel Edge, Deno Deploy, Node.js, و iOS/Android عبر WebView. نفس الكود يُجمَّع لكل منصة بدون تغيير.', en: 'Elmoorx v4 provides a unified API that works on 6 platforms.' },
    date: '2026-07-22',
    author: 'Elmoorx Team',
    category: 'deep-dives',
    readingTime: 10,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3) LAYOUT — يحيط بكل الصفحات
// ─────────────────────────────────────────────────────────────────────────────

function Layout(props) {
  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('header', { style: 'background:#1e293b;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155;' },
      h('div', { onClick: () => navigate('/'), style: 'cursor:pointer;' },
        h('span', { style: 'color:#0ea5e9;font-weight:bold;font-size:1.5rem;' }, '✦ ', h(T, { k: 'blog.title' }))
      ),
      h('nav', { style: 'display:flex;gap:1.5rem;align-items:center;' },
        h(Link, { to: '/', style: 'color:#94a3b8;text-decoration:none;' }, h(T, { k: 'blog.latest' })),
        h(Link, { to: '/categories', style: 'color:#94a3b8;text-decoration:none;' }, h(T, { k: 'blog.categories' })),
        h(LanguageSwitcher, { style: 'padding:0.25rem;' })
      )
    ),
    h('main', { style: 'max-width:800px;margin:0 auto;padding:2rem;' }, props.children),
    h('footer', { style: 'background:#1e293b;padding:1.5rem;text-align:center;color:#64748b;border-top:1px solid #334155;' },
      '© 2026 — مبني بـ Elmoorx v4'
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) PAGES
// ─────────────────────────────────────────────────────────────────────────────

function HomePage() {
  const search = $state('');
  const locale = $state('ar');

  const filteredPosts = $computed(() => {
    const q = search().toLowerCase();
    if (!q) return posts;
    return posts.filter(p => p.title[locale()].toLowerCase().includes(q));
  });

  return h('div', null,
    h('div', { style: 'text-align:center;margin-bottom:2rem;' },
      h('h1', { style: 'font-size:2.5rem;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:0.5rem;' }, h(T, { k: 'blog.title' })),
      h('p', { style: 'color:#94a3b8;' }, h(T, { k: 'blog.subtitle' }))
    ),
    // search
    h('input', {
      type: 'search',
      placeholder: t('blog.search'),
      value: search(),
      onInput: e => search.set(e.target.value),
      style: 'width:100%;padding:0.75rem;background:#1e293b;border:1px solid #334155;border-radius:8px;color:white;margin-bottom:2rem;'
    }),
    // posts
    filteredPosts().length === 0
      ? h('p', { style: 'color:#64748b;text-align:center;padding:2rem;' }, h(T, { k: 'blog.no_results' }))
      : h('div', null, filteredPosts().map(post => h(PostCard, { key: post.id, post, locale: locale() })))
  );
}

function PostCard({ post, locale }) {
  return h('article', {
    onClick: () => navigate(`/post/${post.slug}`),
    style: 'background:#1e293b;padding:1.5rem;border-radius:8px;margin-bottom:1rem;cursor:pointer;transition:border-color 0.2s;border:1px solid transparent;'
  },
    h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;' },
      h('span', { style: 'color:#0ea5e9;font-size:0.85rem;text-transform:uppercase;' }, post.category),
      h('span', { style: 'color:#64748b;font-size:0.85rem;' }, post.date)
    ),
    h('h2', { style: 'color:#e2e8f0;margin-bottom:0.5rem;' }, post.title[locale]),
    h('p', { style: 'color:#94a3b8;margin-bottom:1rem;' }, post.excerpt[locale]),
    h('div', { style: 'display:flex;justify-content:space-between;align-items:center;' },
      h('span', { style: 'color:#64748b;font-size:0.85rem;' }, `${post.author} • ${post.readingTime} دقائق قراءة`),
      h('span', { style: 'color:#0ea5e9;font-size:0.85rem;' }, h(T, { k: 'blog.read_more' }), ' →')
    )
  );
}

function PostPage({ params }) {
  const post = posts.find(p => p.slug === params.slug);
  if (!post) return h('div', null, '404 — المقال غير موجود');

  const locale = 'ar';
  const related = posts.filter(p => p.category === post.category && p.id !== post.id).slice(0, 2);

  return h('article', null,
    h(Link, { to: '/', style: 'color:#0ea5e9;text-decoration:none;display:inline-block;margin-bottom:1rem;' }, h(T, { k: 'blog.back' })),
    h('h1', { style: 'color:#e2e8f0;font-size:2rem;margin-bottom:0.5rem;' }, post.title[locale]),
    h('div', { style: 'color:#64748b;font-size:0.9rem;margin-bottom:2rem;' },
      `${t('blog.published')} ${post.date} • ${post.author} • ${post.readingTime} دقائق`
    ),
    h('div', { style: 'color:#cbd5e1;line-height:1.8;margin-bottom:2rem;' }, post.content[locale]),
    h('div', { style: 'background:#1e293b;padding:1rem;border-radius:8px;margin-bottom:2rem;' },
      h('strong', { style: 'color:#0ea5e9;' }, h(T, { k: 'blog.share' }), ': '),
      h('button', { onClick: () => alert('مشاركة على تويتر'), style: 'margin-left:0.5rem;padding:0.25rem 0.75rem;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;' }, 'Twitter'),
      h('button', { onClick: () => alert('مشاركة على فيسبوك'), style: 'margin-left:0.5rem;padding:0.25rem 0.75rem;background:#1e293b;color:white;border:1px solid #334155;border-radius:4px;cursor:pointer;' }, 'Facebook')
    ),
    related.length > 0 && h('div', null,
      h('h3', { style: 'color:#94a3b8;margin-bottom:1rem;' }, h(T, { k: 'blog.related' })),
      related.map(p => h(PostCard, { key: p.id, post: p, locale }))
    )
  );
}

function CategoriesPage() {
  const categories = [...new Set(posts.map(p => p.category))];
  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, h(T, { k: 'blog.categories' })),
    h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;' },
      categories.map(cat => {
        const count = posts.filter(p => p.category === cat).length;
        return h('div', {
          key: cat,
          onClick: () => navigate(`/category/${cat}`),
          style: 'background:#1e293b;padding:1.5rem;border-radius:8px;cursor:pointer;text-align:center;'
        },
          h('h3', { style: 'color:#0ea5e9;text-transform:capitalize;' }, cat),
          h('p', { style: 'color:#64748b;' }, `${count} مقالات`)
        );
      })
    )
  );
}

function CategoryPage({ params }) {
  const filtered = posts.filter(p => p.category === params.category);
  return h('div', null,
    h(Link, { to: '/', style: 'color:#0ea5e9;text-decoration:none;display:inline-block;margin-bottom:1rem;' }, h(T, { k: 'blog.back' })),
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;text-transform:capitalize;' }, params.category),
    filtered.map(post => h(PostCard, { key: post.id, post, locale: 'ar' }))
  );
}

function NotFound() {
  return h('div', { style: 'text-align:center;padding:4rem;' },
    h('h1', { style: 'font-size:4rem;color:#ef4444;' }, '404'),
    h('p', { style: 'color:#94a3b8;margin-bottom:1rem;' }, 'الصفحة غير موجودة'),
    h(Link, { to: '/', style: 'color:#0ea5e9;' }, h(T, { k: 'blog.back' }))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) SETUP ROUTER + LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

setLayout(Layout);
setNotFound(NotFound);

defineRoutes([
  { path: '/', component: HomePage },
  { path: '/post/:slug', component: PostPage },
  { path: '/categories', component: CategoriesPage },
  { path: '/category/:category', component: CategoryPage },
  { path: '*', component: NotFound },
]);

// ─────────────────────────────────────────────────────────────────────────────
// 6) EXPORT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return h(Router, null);
}
