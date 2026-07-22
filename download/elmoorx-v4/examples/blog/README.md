# Blog — مثال تطبيق كامل بـ Elmoorx v4

تطبيق مدونة كامل يعرض:

- ✅ **Routing** — file-based + programmatic (5 مسارات)
- ✅ **i18n** — عربي/إنجليزي مع RTL تلقائي
- ✅ **Signals** — بحث تفاعلي + فلترة
- ✅ **Layout** — header/footer مشترك
- ✅ **Lazy loading** — كل صفحة منفصلة
- ✅ **404 page** — صفحة غير موجودة

## التشغيل

```bash
# من جذر elmoorx-v4
cd examples/blog
../../elmoorx dev --port=3550
```

→ http://localhost:3550

## المسارات

- `/` — الصفحة الرئيسية مع بحث
- `/post/:slug` — صفحة مقال
- `/categories` — كل التصنيفات
- `/category/:category` — مقالات تصنيف معين
- `*` — صفحة 404

## المميزات المعروضة

1. **Routing ديناميكي**: `/post/:slug` يعرض مقال بـ slug
2. **i18n تفاعلي**: مبدّل لغة في الـ header، RTL تلقائي
3. **Signals للبحث**: اكتب في صندوق البحث لفلترة المقالات فوراً
4. **Layout مشترك**: header/footer في كل الصفحات
5. **Navigation**: روابط داخلية بدون reload للصفحة
6. **404 handling**: صفحة غير موجودة احترافية
