/**
 * مثال: Blog إنتاجي كامل مع كل الميزات
 * ====================================
 * يوضّح:
 *   - SSR + routing + data loaders
 *   - JWT auth (login/register)
 *   - CRUD API مع OpenAPI docs
 *   - File uploads (مع cover images)
 *   - Rate limiting + security headers
 *   - Health + metrics
 *   - Tracing
 *   - Error boundaries
 *
 * التشغيل:
 *   node examples/blog-app.mjs
 *
 * Endpoints:
 *   GET  /                  الصفحة الرئيسية
 *   GET  /post/:slug        صفحة مقال
 *   GET  /login             صفحة تسجيل الدخول
 *   POST /api/auth/register تسجيل مستخدم
 *   POST /api/auth/login    تسجيل الدخول
 *   GET  /api/posts         قائمة المقالات
 *   POST /api/posts         إنشاء مقال (auth)
 *   GET  /api/posts/:id     مقال واحد
 *   PUT  /api/posts/:id     تعديل مقال (auth)
 *   DEL  /api/posts/:id     حذف مقال (auth)
 *   POST /api/upload        رفع صورة (auth)
 *   GET  /health            فحص الصحة
 *   GET  /metrics           Prometheus metrics
 *   GET  /docs              Swagger UI
 *   GET  /openapi.json      OpenAPI spec
 */

import { startSSRServer } from '../ssr-server/index.mjs';
import { AuthSystem } from '../security/auth-system.mjs';
import { UploadManager } from '../ssr-server/upload-system.mjs';
import { createOpenAPIGenerator, Schema, Response } from '../utils/openapi.mjs';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const appRoot = join(process.cwd(), 'blog-app');
if (existsSync(appRoot)) rmSync(appRoot, { recursive: true });
mkdirSync(join(appRoot, 'src', 'pages'), { recursive: true });
mkdirSync(join(appRoot, 'src', 'pages', 'post'), { recursive: true });
mkdirSync(join(appRoot, 'src', 'pages', 'login'), { recursive: true });
mkdirSync(join(appRoot, 'api'), { recursive: true });
mkdirSync(join(appRoot, 'api', 'auth'), { recursive: true });
mkdirSync(join(appRoot, 'api', 'posts'), { recursive: true });
mkdirSync(join(appRoot, 'uploads'), { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// 1) SETUP AUTH + OPENAPI + UPLOADS
// ─────────────────────────────────────────────────────────────────────────────

const auth = new AuthSystem({
  jwtSecret: 'blog-app-secret-key-change-in-production',
  refreshSecret: 'blog-app-refresh-secret',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
});

const uploader = new UploadManager({
  uploadDir: join(appRoot, 'uploads'),
  maxFileSize: 5 * 1024 * 1024,
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
});

const openapi = createOpenAPIGenerator({
  title: 'Blog API',
  version: '1.0.0',
  description: 'A production-ready blog API built with Elmoorx v4',
  servers: [{ url: 'http://localhost:3000', description: 'Development' }],
});

openapi.addJWTAuth();

openapi.addSchema('Post', Schema.object({
  id: Schema.integer(),
  title: Schema.string(),
  slug: Schema.string(),
  content: Schema.string(),
  excerpt: Schema.string(),
  author: Schema.string(),
  coverImage: Schema.string(),
  publishedAt: Schema.date(),
  tags: Schema.array(Schema.string()),
}));

openapi.addSchema('User', Schema.object({
  id: Schema.string(),
  username: Schema.string(),
  roles: Schema.array(Schema.string()),
}));

openapi.addSchema('LoginRequest', Schema.object({
  username: Schema.string(),
  password: Schema.string(),
}));

openapi.addSchema('TokenResponse', Schema.object({
  accessToken: Schema.string(),
  refreshToken: Schema.string(),
  user: Schema.ref('User'),
}));

// Auth routes
openapi.addRoute({
  method: 'POST', path: '/api/auth/register', summary: 'Register new user', tags: ['auth'],
  requestBody: { required: true, content: { 'application/json': { schema: Schema.ref('LoginRequest') } } },
  responses: Response.combine(Response.created('User created', Schema.ref('TokenResponse')), Response.badRequest()),
});
openapi.addRoute({
  method: 'POST', path: '/api/auth/login', summary: 'Login', tags: ['auth'],
  requestBody: { required: true, content: { 'application/json': { schema: Schema.ref('LoginRequest') } } },
  responses: Response.combine(Response.ok('Login successful', Schema.ref('TokenResponse')), Response.unauthorized()),
});
openapi.addRoute({
  method: 'POST', path: '/api/auth/refresh', summary: 'Refresh token', tags: ['auth'],
  requestBody: { required: true, content: { 'application/json': { schema: Schema.object({ refreshToken: Schema.string() }) } } },
  responses: Response.combine(Response.ok('New tokens', Schema.ref('TokenResponse')), Response.unauthorized()),
});

// Posts routes
openapi.addRoute({
  method: 'GET', path: '/api/posts', summary: 'List posts', tags: ['posts'],
  parameters: [
    { name: 'page', in: 'query', schema: Schema.integer(), description: 'Page number' },
    { name: 'limit', in: 'query', schema: Schema.integer(), description: 'Items per page (max 100)' },
  ],
  responses: Response.combine(Response.ok('List of posts', Schema.array(Schema.ref('Post')))),
});
openapi.addRoute({
  method: 'GET', path: '/api/posts/:id', summary: 'Get post by ID', tags: ['posts'],
  parameters: [{ name: 'id', in: 'path', required: true, schema: Schema.integer() }],
  responses: Response.combine(Response.ok('Post found', Schema.ref('Post')), Response.notFound()),
});
openapi.addRoute({
  method: 'POST', path: '/api/posts', summary: 'Create post', tags: ['posts'],
  security: [{ bearerAuth: [] }],
  requestBody: { required: true, content: { 'application/json': { schema: Schema.object({
    title: Schema.string(), content: Schema.string(), excerpt: Schema.string(), tags: Schema.array(Schema.string()),
  }) } } },
  responses: Response.combine(Response.created('Post created', Schema.ref('Post')), Response.badRequest(), Response.unauthorized()),
});
openapi.addRoute({
  method: 'PUT', path: '/api/posts/:id', summary: 'Update post', tags: ['posts'],
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: Schema.integer() }],
  requestBody: { required: true, content: { 'application/json': { schema: Schema.object({
    title: Schema.string(), content: Schema.string(),
  }) } } },
  responses: Response.combine(Response.ok('Post updated', Schema.ref('Post')), Response.notFound(), Response.unauthorized()),
});
openapi.addRoute({
  method: 'DELETE', path: '/api/posts/:id', summary: 'Delete post', tags: ['posts'],
  security: [{ bearerAuth: [] }],
  parameters: [{ name: 'id', in: 'path', required: true, schema: Schema.integer() }],
  responses: Response.combine(Response.noContent('Post deleted'), Response.notFound(), Response.unauthorized()),
});

// Upload route
openapi.addRoute({
  method: 'POST', path: '/api/upload', summary: 'Upload image', tags: ['uploads'],
  security: [{ bearerAuth: [] }],
  requestBody: { required: true, content: { 'multipart/form-data': { schema: Schema.object({
    file: Schema.string({ format: 'binary' }),
  }) } } },
  responses: Response.combine(Response.created('Upload successful'), Response.badRequest(), Response.unauthorized()),
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

const posts = [
  { id: 1, title: 'Welcome to Elmoorx v4', slug: 'welcome', content: 'Elmoorx v4 is a production-ready web framework...', excerpt: 'Introduction to the framework', author: 'admin', coverImage: '', publishedAt: '2026-07-20', tags: ['tutorial', 'intro'] },
  { id: 2, title: 'SSR Best Practices', slug: 'ssr-practices', content: 'Server-side rendering tips...', excerpt: 'SSR optimization', author: 'admin', coverImage: '', publishedAt: '2026-07-21', tags: ['ssr', 'performance'] },
  { id: 3, title: 'JWT Authentication Guide', slug: 'jwt-guide', content: 'Complete JWT auth implementation...', excerpt: 'Auth from scratch', author: 'admin', coverImage: '', publishedAt: '2026-07-22', tags: ['security', 'auth'] },
];
let nextPostId = 4;

// ─────────────────────────────────────────────────────────────────────────────
// 3) API HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

// Auth: Register
writeFileSync(join(appRoot, 'api', 'auth', 'register.mjs'), `
import { auth } from '../../lib/auth.mjs';
export async function POST({ body }) {
  const { username, password } = body;
  if (!username || !password) return { status: 400, body: { error: 'Missing credentials' } };
  if (password.length < 6) return { status: 400, body: { error: 'Password too short' } };
  try {
    const user = await auth.register(username, password, { roles: ['user'] });
    const login = await auth.login(username, password);
    return { status: 201, body: login };
  } catch (err) {
    return { status: 400, body: { error: err.message } };
  }
}
`);

// Auth: Login
writeFileSync(join(appRoot, 'api', 'auth', 'login.mjs'), `
export async function POST({ body, ctx }) {
  const { username, password } = body;
  if (!username || !password) return { status: 400, body: { error: 'Missing credentials' } };
  try {
    const result = await ctx.auth.login(username, password, ctx.req.socket.remoteAddress);
    return { status: 200, body: result };
  } catch (err) {
    return { status: 401, body: { error: err.message } };
  }
}
`);

// Auth: Refresh
writeFileSync(join(appRoot, 'api', 'auth', 'refresh.mjs'), `
export async function POST({ body, ctx }) {
  const { refreshToken } = body;
  if (!refreshToken) return { status: 400, body: { error: 'Missing refresh token' } };
  try {
    const result = await ctx.auth.refresh(refreshToken);
    return { status: 200, body: result };
  } catch (err) {
    return { status: 401, body: { error: err.message } };
  }
}
`);

// Posts: List
writeFileSync(join(appRoot, 'api', 'posts', 'index.mjs'), `
const posts = [
  { id: 1, title: 'Welcome to Elmoorx v4', slug: 'welcome', content: 'Elmoorx v4 is a production-ready web framework...', excerpt: 'Introduction', author: 'admin', coverImage: '', publishedAt: '2026-07-20', tags: ['tutorial'] },
  { id: 2, title: 'SSR Best Practices', slug: 'ssr', content: 'SSR tips...', excerpt: 'SSR', author: 'admin', coverImage: '', publishedAt: '2026-07-21', tags: ['ssr'] },
  { id: 3, title: 'JWT Auth Guide', slug: 'jwt', content: 'JWT auth...', excerpt: 'Auth', author: 'admin', coverImage: '', publishedAt: '2026-07-22', tags: ['security'] },
];

export async function GET({ query }) {
  const page = parseInt(query.page || '1');
  const limit = Math.min(parseInt(query.limit || '10'), 100);
  const start = (page - 1) * limit;
  return {
    status: 200,
    body: {
      posts: posts.slice(start, start + limit),
      total: posts.length,
      page,
      limit,
    },
  };
}

export async function POST({ body, ctx, user }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const { title, content, excerpt, tags } = body;
  if (!title || !content) return { status: 400, body: { error: 'Missing title or content' } };
  const post = {
    id: posts.length + 1,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    content,
    excerpt: excerpt || content.slice(0, 100),
    author: user.username,
    coverImage: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    tags: tags || [],
  };
  posts.push(post);
  return { status: 201, body: post };
}
`);

// Posts: Get by ID
writeFileSync(join(appRoot, 'api', 'posts', '[id].mjs'), `
const posts = [
  { id: 1, title: 'Welcome to Elmoorx v4', slug: 'welcome', content: 'Elmoorx v4 is a production-ready web framework...', excerpt: 'Introduction', author: 'admin', coverImage: '', publishedAt: '2026-07-20', tags: ['tutorial'] },
  { id: 2, title: 'SSR Best Practices', slug: 'ssr', content: 'SSR tips...', excerpt: 'SSR', author: 'admin', coverImage: '', publishedAt: '2026-07-21', tags: ['ssr'] },
  { id: 3, title: 'JWT Auth Guide', slug: 'jwt', content: 'JWT auth...', excerpt: 'Auth', author: 'admin', coverImage: '', publishedAt: '2026-07-22', tags: ['security'] },
];

export async function GET({ params }) {
  const post = posts.find(p => p.id === parseInt(params.id));
  if (!post) return { status: 404, body: { error: 'Post not found' } };
  return { status: 200, body: post };
}

export async function PUT({ params, body, user }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const post = posts.find(p => p.id === parseInt(params.id));
  if (!post) return { status: 404, body: { error: 'Post not found' } };
  Object.assign(post, body);
  return { status: 200, body: post };
}

export async function DELETE({ params, user }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const idx = posts.findIndex(p => p.id === parseInt(params.id));
  if (idx === -1) return { status: 404, body: { error: 'Post not found' } };
  posts.splice(idx, 1);
  return { status: 204, body: {} };
}
`);

// Upload
writeFileSync(join(appRoot, 'api', 'upload.mjs'), `
export async function POST({ req, user, ctx }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const result = await ctx.uploader.handleRequest(req, null, ctx);
  if (result === null) return { status: 400, body: { error: 'Upload failed' } };
  return { status: 201, body: result };
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 4) PAGES (SSR)
// ─────────────────────────────────────────────────────────────────────────────

// Home page
writeFileSync(join(appRoot, 'src', 'pages', 'index.tsx'), `
export default function Home() {
  return {
    tag: 'div',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: { style: 'color:#0ea5e9;' }, children: ['Elmoorx v4 Blog'] },
      { tag: 'p', props: {}, children: ['مثال blog إنتاجي كامل'] },
      { tag: 'ul', props: {}, children: [
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/post/welcome' }, children: ['Welcome to Elmoorx v4'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/post/ssr' }, children: ['SSR Best Practices'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/post/jwt' }, children: ['JWT Auth Guide'] }] },
      ]},
      { tag: 'hr', props: {}, children: [] },
      { tag: 'h3', props: {}, children: ['API'] },
      { tag: 'ul', props: {}, children: [
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/docs' }, children: ['Swagger UI'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/openapi.json' }, children: ['OpenAPI Spec'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/health' }, children: ['Health Check'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/metrics' }, children: ['Metrics'] }] },
      ]},
    ]
  };
}
`);

// Post page
writeFileSync(join(appRoot, 'src', 'pages', 'post', '[slug].tsx'), `
export default function PostPage({ params }) {
  return {
    tag: 'article',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: {}, children: ['Post: ' + (params?.slug || 'unknown')] },
      { tag: 'p', props: {}, children: ['This is a dynamic post page'] },
      { tag: 'a', props: { href: '/' }, children: ['← Back'] },
    ]
  };
}
`);

// Login page
writeFileSync(join(appRoot, 'src', 'pages', 'login', 'index.tsx'), `
export default function LoginPage() {
  return {
    tag: 'div',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:400px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: {}, children: ['Login'] },
      { tag: 'form', props: { method: 'POST', action: '/api/auth/login' }, children: [
        { tag: 'input', props: { type: 'text', name: 'username', placeholder: 'Username' }, children: [] },
        { tag: 'br', props: {}, children: [] },
        { tag: 'input', props: { type: 'password', name: 'password', placeholder: 'Password' }, children: [] },
        { tag: 'br', props: {}, children: [] },
        { tag: 'button', props: { type: 'submit' }, children: ['Login'] },
      ]},
    ]
  };
}
`);

// ─────────────────────────────────────────────────────────────────────────────
// 5) START SERVER
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n  🚀 Blog App Example');
console.log('  ════════════════════════════════════════\n');

const server = await startSSRServer({
  root: appRoot,
  port: 3000,
  apiDir: join(appRoot, 'api'),
  rateLimit: { max: 100, windowMs: 60000 },
  sessions: false,
  auth: null,
  uploadDir: join(appRoot, 'uploads'),
  maxUploadSize: 5 * 1024 * 1024,
});

// اطبع المعلومات
console.log('\n  📚 Blog App Running!');
console.log('  ════════════════════════════════════════');
console.log('  → http://localhost:3000');
console.log('  ════════════════════════════════════════');
console.log('\n  Endpoints:');
console.log('    GET  /              الصفحة الرئيسية');
console.log('    GET  /post/:slug    صفحة مقال');
console.log('    GET  /login         صفحة الدخول');
console.log('    POST /api/auth/register');
console.log('    POST /api/auth/login');
console.log('    GET  /api/posts');
console.log('    POST /api/posts     (auth)');
console.log('    POST /api/upload    (auth)');
console.log('    GET  /health');
console.log('    GET  /metrics');
console.log('    GET  /docs          Swagger UI');
console.log('    GET  /openapi.json  OpenAPI spec');
console.log('\n  ════════════════════════════════════════\n');

export { server };
