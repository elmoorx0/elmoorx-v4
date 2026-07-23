/**
 * elmoorx list — يعرض جميع المكونات/القوالب/الـ packages المتاحة
 */
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

export async function listItems(category, options = {}) {
  console.log(`\n  ✦ Elmoorx v4 — List`);
  console.log(`  ─────────────────────────────────────`);

  switch (category) {
    case 'components':
    case 'ui':
      return listComponents();
    case 'packages':
      return listPackages();
    case 'templates':
      return listTemplates();
    case 'apps':
      return listApps();
    case 'commands':
      return listCommands();
    case 'all':
    default:
      console.log(`\n  الفئات:`);
      console.log(`    • components  — مكونات UI`);
      console.log(`    • packages    — packages الإطار`);
      console.log(`    • templates   — قوالب المشاريع`);
      console.log(`    • apps        — تطبيقات جاهزة`);
      console.log(`    • commands    — أوامر CLI`);
      console.log(`\n  الاستخدام: elmoorx list <category>`);
  }
}

function listComponents() {
  console.log(`\n  📦 UI Components (45+)\n`);

  const components = [
    // Basic
    ['Button', 'زر متعدد الأنواع والأحجام'],
    ['Input', 'حقل إدخال مع label وerror'],
    ['Textarea', 'منطقة نص متعددة الأسطر'],
    ['Select', 'قائمة منسدلة'],
    ['Checkbox', 'مربع اختيار'],
    ['Radio', 'زر اختيار'],
    ['Switch', 'مفتاح تبديل'],
    ['Card', 'بطاقة مع title وfooter'],
    ['Badge', 'شارة صغيرة'],
    ['Alert', 'تنبيه مع variants'],
    ['Modal', 'نافذة منبثقة'],
    ['Toast', 'إشعار منبثق'],
    ['Spinner', 'مؤشر تحميل'],
    ['Progress', 'شريط تقدم'],
    ['Avatar', 'صورة مستخدم'],
    ['Table', 'جدول بيانات'],
    ['Tabs', 'تبويبات'],
    ['Accordion', 'أكورديون'],
    ['Dropdown', 'قائمة منسدلة'],
    ['Skeleton', 'هيكل تحميل'],
    ['Divider', 'فاصل'],
    ['Stack', 'تخطيط أفقي/عمودي'],
    ['Grid', 'شبكة'],
    // Advanced
    ['FileUpload', 'رفع ملفات drag-drop'],
    ['DatePicker', 'منتقي تاريخ'],
    ['ColorPicker', 'منتقي لون'],
    ['VirtualList', 'قائمة افتراضية للأداء'],
    ['CommandPalette', 'لوحة أوامر Cmd+K'],
    ['Pagination', 'ترقيم صفحات'],
    ['Breadcrumb', 'مسار تنقل'],
    ['Stepper', 'خطوات'],
    ['Tooltip', 'تلميح'],
    ['TreeView', 'شجرة قابلة للتوسيع'],
    ['Carousel', 'سلايدر صور'],
    ['DragDropList', 'قائمة بإعادة ترتيب'],
    ['NotificationCenter', 'مركز إشعارات'],
    ['RichTextEditor', 'محرر نصوص'],
    ['Image', 'صورة مع lazy load'],
    ['Drawer', 'لوحة جانبية'],
    ['Popover', 'نافذة منبثقة مرتبطة'],
    ['Rate', 'تقييم بالنجوم'],
    ['Slider', 'شريط تمرير القيمة'],
    ['OTPInput', 'إدخال OTP'],
    ['Tag', 'وسم صغير'],
    ['Timeline', 'خط زمني'],
    ['Empty', 'حالة فارغة'],
    ['Stat', 'بطاقة إحصائية'],
    ['Banner', 'شريط إعلان'],
  ];

  for (const [name, desc] of components) {
    console.log(`    ${name.padEnd(25)} ${desc}`);
  }
  console.log(`\n  المجموع: ${components.length} مكون`);
}

function listPackages() {
  console.log(`\n  📦 Packages المدمجة\n`);

  const packages = [
    ['runtime', 'signals, store, islands, security'],
    ['compiler', 'TS + JSX بدون Babel'],
    ['router', 'file-based + dynamic routing'],
    ['ssr', 'renderToString + streaming'],
    ['i18n', 'ترجمات + RTL + Intl'],
    ['http', 'fetch + auth + useQuery'],
    ['testing', 'describe/it/expect + mock'],
    ['adapters', 'Edge + Native (6 منصات)'],
    ['store', 'global + devtools + time-travel'],
    ['forms', 'validation + reactive forms'],
    ['animation', 'transitions + spring + keyframes'],
    ['database', 'SQLite + IndexedDB'],
    ['realtime', 'WebSocket server + client'],
    ['pwa', 'service worker + manifest'],
    ['ui', '45+ components جاهزة'],
    ['graphql', 'queries + mutations + subscriptions'],
    ['charts', 'Bar, Line, Pie, Scatter (SVG)'],
    ['utils', 'date, string, number, array (80+ دالة)'],
    ['markdown', 'parser + renderer + editor'],
    ['minifier', 'تصغير JavaScript'],
    ['treeshake', 'إزالة الكود غير المستخدم'],
    ['sourcemap', 'VLQ encoding + source maps'],
    ['compress', 'Gzip + Brotli'],
  ];

  for (const [name, desc] of packages) {
    console.log(`    @elmoorx/${name.padEnd(15)} ${desc}`);
  }
  console.log(`\n  المجموع: ${packages.length} package`);
}

function listTemplates() {
  console.log(`\n  📁 قوالب المشاريع\n`);

  const templates = [
    ['blank', 'مشروع فارغ'],
    ['starter', 'counter + todo'],
    ['blog', 'مدونة مع routing + i18n'],
    ['dashboard', 'لوحة تحكم مع charts'],
    ['ecommerce', 'متجر إلكتروني'],
    ['saas', 'تطبيق SaaS مع auth'],
    ['landing', 'صفحة هبوط'],
    ['docs', 'موقع توثيق'],
    ['portfolio', 'موقع شخصي'],
  ];

  for (const [name, desc] of templates) {
    console.log(`    ${name.padEnd(15)} ${desc}`);
  }
  console.log(`\n  المجموع: ${templates.length} قالب`);
  console.log(`  الاستخدام: elmoorx new <template> <name>`);
}

function listApps() {
  console.log(`\n  📱 تطبيقات جاهزة (generate-app)\n`);

  const apps = [
    ['todo app', 'تطبيق مهام'],
    ['task manager', 'مدير مهام'],
    ['notes app', 'تطبيق ملاحظات'],
    ['calculator', 'آلة حاسبة'],
    ['chat app', 'تطبيق محادثة'],
    ['social feed', 'تغذية اجتماعية'],
    ['blog', 'مدونة'],
    ['crm', 'إدارة علاقات العملاء'],
    ['inventory', 'إدارة مخزون'],
    ['invoice', 'فواتير'],
    ['image gallery', 'معرض صور'],
    ['video player', 'مشغل فيديو'],
    ['music player', 'مشغل موسيقى'],
    ['weather', 'تطبيق طقس'],
    ['currency converter', 'محول عملات'],
    ['qr generator', 'مولد QR'],
  ];

  for (const [name, desc] of apps) {
    console.log(`    "${name}".padEnd(25) ${desc}`);
  }
  console.log(`\n  المجموع: ${apps.length} تطبيق`);
  console.log(`  الاستخدام: elmoorx generate-app "<name>" <project>`);
}

function listCommands() {
  console.log(`\n  ⌨️  أوامر CLI\n`);

  const commands = [
    ['create <name>', 'ينشئ مشروع جديد'],
    ['new <template> <name>', 'ينشئ من قالب'],
    ['init', 'يحوّل مشروع موجود'],
    ['dev', 'خادم تطوير + HMR'],
    ['build', 'بناء للإنتاج'],
    ['bundle', 'حزمة واحدة HTML'],
    ['deploy', 'نشر على المنصة'],
    ['generate', 'توليد مكون'],
    ['generate-app', 'توليد تطبيق كامل'],
    ['add <component>', 'إضافة مكون جاهز'],
    ['visual', 'Visual Builder'],
    ['docs', 'موقع توثيق تفاعلي'],
    ['static', 'خادم ملفات ثابتة'],
    ['test', 'تشغيل اختبارات'],
    ['bench', 'قياس أداء'],
    ['watch', 'مراقبة + بناء تلقائي'],
    ['inspect <file>', 'فحص ملف'],
    ['upgrade', 'تحديث الإطار'],
    ['analyze', 'تحليل حجم'],
    ['clean', 'تنظيف'],
    ['list', 'عرض القوائم'],
    ['repl', 'interactive shell'],
    ['doctor', 'فحص صحة'],
    ['info', 'معلومات بيئة'],
  ];

  for (const [name, desc] of commands) {
    console.log(`    elmoorx ${name.padEnd(25)} ${desc}`);
  }
  console.log(`\n  المجموع: ${commands.length} أمر`);
}
