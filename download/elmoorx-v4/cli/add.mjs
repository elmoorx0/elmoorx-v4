/**
 * elmoorx add <component> — يضيف مكون جاهز للمشروع
 * مثال: elmoorx add navbar
 *       elmoorx add chart
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateComponent } from './generate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

const COMPONENT_LIBRARY = {
  // Layout
  navbar: { name: 'Navbar', desc: 'شريط تنقل علوي مع responsive menu' },
  sidebar: { name: 'Sidebar', desc: 'شريط جانبي مع collapse' },
  footer: { name: 'Footer', desc: 'تذييل الصفحة' },
  header: { name: 'Header', desc: 'رأس الصفحة' },

  // Forms
  'login-form': { name: 'LoginForm', desc: 'نموذج تسجيل دخول كامل' },
  'signup-form': { name: 'SignupForm', desc: 'نموذج إنشاء حساب' },
  'contact-form': { name: 'ContactForm', desc: 'نموذج اتصال' },
  'search-bar': { name: 'SearchBar', desc: 'شريط بحث مع debounce' },

  // Data
  'data-table': { name: 'DataTable', desc: 'جدول بيانات مع sort + search' },
  'todo-list': { name: 'TodoList', desc: 'قائمة مهام مع filters' },
  'kanban-board': { name: 'KanbanBoard', desc: 'لوحة كانبان' },

  // Feedback
  modal: { name: 'Modal', desc: 'نافذة منبثقة' },
  toast: { name: 'Toast', desc: 'إشعار منبثق' },
  alert: { name: 'Alert', desc: 'تنبيه' },
  'loading-spinner': { name: 'Spinner', desc: 'مؤشر تحميل' },

  // Display
  card: { name: 'Card', desc: 'بطاقة' },
  badge: { name: 'Badge', desc: 'شارة' },
  avatar: { name: 'Avatar', desc: 'صورة مستخدم' },
  'progress-bar': { name: 'ProgressBar', desc: 'شريط تقدم' },
  chart: { name: 'Chart', desc: 'رسم بياني (bar/line)' },
  tabs: { name: 'Tabs', desc: 'تبويبات' },
  accordion: { name: 'Accordion', desc: 'أكورديون' },

  // Interactive
  counter: { name: 'Counter', desc: 'عدّاد' },
  timer: { name: 'Timer', desc: 'مؤقت' },
  calculator: { name: 'Calculator', desc: 'آلة حاسبة' },

  // Templates
  'dashboard-layout': { name: 'DashboardLayout', desc: 'تخطيط لوحة تحكم كامل' },
  'auth-page': { name: 'AuthPage', desc: 'صفحة مصادقة كاملة' },
  'landing-page': { name: 'LandingPage', desc: 'صفحة هبوط' },
};

export async function addComponent(componentName, options = {}) {
  const { outDir = process.cwd() + '/src/components' } = options;

  console.log(`\n  ✦ Elmoorx Add`);
  console.log(`  ─────────────────────────────────────`);

  // ابحث عن المكون
  const key = findComponent(componentName);
  if (!key) {
    console.log(`  ✗ المكون "${componentName}" غير موجود`);
    console.log(`  المكونات المتاحة:`);
    for (const [k, v] of Object.entries(COMPONENT_LIBRARY)) {
      console.log(`    • ${k.padEnd(20)} ${v.desc}`);
    }
    return;
  }

  const info = COMPONENT_LIBRARY[key];
  console.log(`  │ المكون: ${info.name}`);
  console.log(`  │ الوصف:  ${info.desc}`);

  // استخدم generate لإنتاج الكود
  mkdirSync(outDir, { recursive: true });
  await generateComponent({
    description: key,
    outDir,
  });

  console.log(`  ─────────────────────────────────────\n`);
}

function findComponent(query) {
  const q = query.toLowerCase().trim();
  if (COMPONENT_LIBRARY[q]) return q;
  // fuzzy
  for (const key of Object.keys(COMPONENT_LIBRARY)) {
    if (key.includes(q) || q.includes(key)) return key;
  }
  return null;
}

export { COMPONENT_LIBRARY };
