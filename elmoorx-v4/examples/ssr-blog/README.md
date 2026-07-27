# SSR Blog — مثال SSR متكامل

تطبيق blog كامل يعرض كل ميزات SSR في Elmoorx v4:

## المميزات المعروضة

- ✅ **Server-side routing** — file-based + programmatic
- ✅ **Data loaders** — `getServerSideProps` لكل صفحة
- ✅ **SSR rendering** — HTML يُرسم على الخادم
- ✅ **Hydration متزامن** — الصفحة تظهر فوراً
- ✅ **JWT auth** — login + protected routes
- ✅ **API routes** — CRUD للـ posts
- ✅ **i18n** — عربي/إنجليزي مع RTL
- ✅ **SEO** — meta tags + titles لكل صفحة

## التشغيل

```bash
# من جذر elmoorx-v4
cd examples/ssr-blog
../../elmoorx ssr --api=./api --auth-secret=mysecret --port=3100

# → http://localhost:3100
```

## المسارات

| المسار | الصفحة | Data Loader | محمي |
|--------|--------|-------------|------|
| `/` | الرئيسية | ✓ (posts + categories) | ✗ |
| `/post/:slug` | تفاصيل مقال | ✓ (post + related) | ✗ |
| `/categories` | التصنيفات | ✗ | ✗ |
| `/login` | تسجيل الدخول | ✗ | ✗ |
| `/dashboard` | لوحة التحكم | ✓ (user + stats) | ✓ JWT |

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/posts` | قائمة المقالات | ✗ |
| POST | `/api/posts` | إنشاء مقال | ✓ |
| POST | `/api/auth/login` | تسجيل الدخول | ✗ |

## تجربة Auth

```
البريد: admin@elmoorx.dev
كلمة المرور: admin123
```

## كيف يعمل SSR

1. المستخدم يزور `/post/welcome-to-elmoorx`
2. الخادم يحل المسار `→ PostPage`
3. يشغل `getServerSideProps_post({ params: { slug: 'welcome-to-elmoorx' } })`
4. يرسم `PostPage` بـ `renderToString()` → HTML كامل
5. يحقن `window.__ELMOORX_SSR_DATA__` للـ hydration
6. يرسل HTML للمتصفح
7. المتصفح يعرض HTML فوراً (لا صفحة فارغة!)
8. `hydrateIslands()` يربط الأحداث بالـ DOM الموجود
