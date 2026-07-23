/**
 * elmoorx generate-app <description> — يولّد تطبيق كامل من وصف نصي
 * يستخدم قوالب ذكية لإنشاء تطبيق كامل بصفحات متعددة
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createProject } from './create.mjs';

const APP_TEMPLATES = {
  // تطبيقات إنتاجية
  'todo app': generateTodoApp,
  'task manager': generateTaskManager,
  'notes app': generateNotesApp,
  'calculator': generateCalculatorApp,

  // تطبيقات اجتماعية
  'chat app': generateChatApp,
  'social feed': generateSocialFeed,
  'blog': generateBlogApp,

  // تطبيقات أعمال
  'crm': generateCRMApp,
  'inventory': generateInventoryApp,
  'invoice': generateInvoiceApp,

  // تطبيقات محتوى
  'image gallery': generateGalleryApp,
  'video player': generateVideoApp,
  'music player': generateMusicApp,

  // تطبيقات أدوات
  'weather': generateWeatherApp,
  'currency converter': generateCurrencyApp,
  'qr generator': generateQRApp,
  'password generator': generatePasswordApp,
};

export async function generateApp(description, projectName, options = {}) {
  console.log(`\n  ✦ Elmoorx v4 — Generate App`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ الوصف: "${description}"`);
  console.log(`  │ المشروع: ${projectName}`);

  // ابحث عن قالب مطابق
  const key = findTemplate(description);
  if (!key) {
    console.log(`  ✗ لم أعثر على قالب مطابق`);
    console.log(`  القوالب المتاحة:`);
    for (const k of Object.keys(APP_TEMPLATES)) {
      console.log(`    • ${k}`);
    }
    return;
  }

  console.log(`  │ القالب: ${key}`);

  // أنشئ المشروع الأساسي
  await createProject(projectName, 'default');
  const target = resolve(process.cwd(), projectName);

  // اكتب ملفات التطبيق
  await APP_TEMPLATES[key](target);

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ تم إنشاء التطبيق!\n`);
  console.log(`  الخطوات التالية:
    cd ${projectName}
    ./elmoorx dev

  → http://localhost:3000\n`);
}

function findTemplate(description) {
  const desc = description.toLowerCase().trim();
  if (APP_TEMPLATES[desc]) return desc;
  for (const key of Object.keys(APP_TEMPLATES)) {
    if (desc.includes(key) || key.includes(desc)) return key;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) TODO APP
// ─────────────────────────────────────────────────────────────────────────────

async function generateTodoApp(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $store, $state, $computed } from '@elmoorx/runtime';
import { Button, Input, Card, Checkbox, Badge, Stack } from '@elmoorx/ui';

export default function App() {
  const todos = $store([
    { id: 1, text: 'تعلّم Elmoorx', done: true, priority: 'high' },
    { id: 2, text: 'بناء تطبيق', done: false, priority: 'medium' },
    { id: 3, text: 'نشر المشروع', done: false, priority: 'low' },
  ]);
  const newText = $state('');
  const newPriority = $state('medium');
  const filter = $state('all');

  const visible = $computed(() => {
    const t = todos.get();
    if (filter() === 'active') return t.filter(x => !x.done);
    if (filter() === 'done') return t.filter(x => x.done);
    return t;
  });

  const stats = $computed(() => {
    const t = todos.get();
    return {
      total: t.length,
      done: t.filter(x => x.done).length,
      active: t.filter(x => !x.done).length,
    };
  });

  const add = (e) => {
    e.preventDefault();
    if (!newText().trim()) return;
    todos.push({ id: Date.now(), text: newText(), done: false, priority: newPriority() });
    newText.set('');
  };

  const toggle = (id) => {
    const t = todos.get();
    const todo = t.find(x => x.id === id);
    if (todo) todo.done = !todo.done;
  };

  const remove = (id) => {
    const t = todos.get();
    const i = t.findIndex(x => x.id === id);
    if (i >= 0) t.splice(i, 1);
  };

  const priorityColors = { high: 'danger', medium: 'warning', low: 'success' };

  return h('div', { style: 'max-width:600px;margin:0 auto;padding:2rem;font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('h1', { style: 'color:#0ea5e9;text-align:center;margin-bottom:1rem;' }, '✦ Todo App'),
    // Stats
    h(Card, null,
      h(Stack, { direction: 'horizontal', gap: 'md', justify: 'around' },
        h('div', { style: 'text-align:center;' }, h('div', { style: 'font-size:2rem;color:#0ea5e9;' }, () => stats().total), h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'الكل')),
        h('div', { style: 'text-align:center;' }, h('div', { style: 'font-size:2rem;color:#10b981;' }, () => stats().done), h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'مكتمل')),
        h('div', { style: 'text-align:center;' }, h('div', { style: 'font-size:2rem;color:#f59e0b;' }, () => stats().active), h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'نشط'))
      )
    ),
    // Add form
    h(Card, { style: 'margin-top:1rem;' },
      h('form', { onSubmit: add, style: 'display:flex;gap:0.5rem;' },
        h(Input, { value: newText(), onInput: e => newText.set(e.target.value), placeholder: 'مهمة جديدة...', style: 'flex:1;margin:0;' }),
        h('select', {
          value: newPriority(),
          onChange: e => newPriority.set(e.target.value),
          style: 'padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:4px;color:white;',
        },
          h('option', { value: 'high' }, 'عالية'),
          h('option', { value: 'medium' }, 'متوسطة'),
          h('option', { value: 'low' }, 'منخفضة')
        ),
        h(Button, { type: 'submit' }, '+')
      )
    ),
    // Filter
    h(Stack, { direction: 'horizontal', gap: 'sm', justify: 'center', style: 'margin:1rem 0;' },
      ['all', 'active', 'done'].map(f =>
        h(Button, {
          key: f,
          variant: filter() === f ? 'primary' : 'secondary',
          size: 'sm',
          onClick: () => filter.set(f),
        }, { all: 'الكل', active: 'النشطة', done: 'المكتملة' }[f])
      )
    ),
    // Todo list
    h('div', null,
      visible().map(todo =>
        h(Card, { key: todo.id, style: 'margin-bottom:0.5rem;padding:0.75rem;' },
          h(Stack, { direction: 'horizontal', gap: 'sm', align: 'center' },
            h(Checkbox, { checked: todo.done, onChange: () => toggle(todo.id) }),
            h('div', { style: 'flex:1;' },
              h('div', { style: todo.done ? 'text-decoration:line-through;color:#64748b;' : 'color:#e2e8f0;' }, todo.text),
              h(Badge, { variant: priorityColors[todo.priority], size: 'sm' }, todo.priority)
            ),
            h(Button, { variant: 'danger', size: 'sm', onClick: () => remove(todo.id) }, '×')
          )
        )
      )
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

async function generateCalculatorApp(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state, $computed } from '@elmoorx/runtime';

export default function App() {
  const display = $state('0');
  const history = $state([]);

  const press = (key) => {
    const d = display();
    if (key === 'C') { display.set('0'); return; }
    if (key === '⌫') { display.set(d.length > 1 ? d.slice(0, -1) : '0'); return; }
    if (key === '=') {
      try {
        const expr = d.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        const result = Function('return ' + expr)();
        history.set(h => [{ expr: d, result: String(result) }, ...h].slice(0, 10));
        display.set(String(result));
      } catch { display.set('Error'); }
      return;
    }
    if (d === '0' && !['+', '−', '×', '÷'].includes(key)) {
      display.set(key);
    } else {
      display.set(d + key);
    }
  };

  const buttons = [
    ['C', '⌫', '÷', '×'],
    ['7', '8', '9', '−'],
    ['4', '5', '6', '+'],
    ['1', '2', '3', '='],
    ['0', '.', '00', '']
  ];

  return h('div', { style: 'max-width:320px;margin:2rem auto;font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:1.5rem;border-radius:12px;' },
    h('h1', { style: 'color:#0ea5e9;text-align:center;margin-bottom:1rem;' }, '✦ Calculator'),
    h('div', {
      style: 'background:#1e293b;padding:1rem;border-radius:8px;text-align:left;color:#e2e8f0;font-size:2rem;font-family:monospace;margin-bottom:1rem;min-height:60px;overflow-x:auto;direction:ltr;',
    }, display()),
    h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;' },
      buttons.flat().map((b, i) =>
        b ? h('button', {
          key: i,
          onClick: () => press(b),
          style: 'padding:1rem;background:' + (
            b === '=' ? '#0ea5e9' :
            b === 'C' || b === '⌫' ? '#ef4444' :
            ['+', '−', '×', '÷'].includes(b) ? '#f59e0b' : '#334155'
          ) + ';color:white;border:none;border-radius:6px;cursor:pointer;font-size:1.25rem;'
        }, b) : h('div', { key: i })
      )
    ),
    h('div', { style: 'margin-top:1rem;' },
      h('h3', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'السجل'),
      history().map((h, i) =>
        h('div', { key: i, style: 'padding:0.5rem;border-bottom:1px solid #334155;font-family:monospace;color:#94a3b8;font-size:0.9rem;direction:ltr;' },
          h('span', null, h.expr + ' = '),
          h('span', { style: 'color:#10b981;' }, h.result)
        )
      )
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) WEATHER APP
// ─────────────────────────────────────────────────────────────────────────────

async function generateWeatherApp(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state, $effect } from '@elmoorx/runtime';
import { Input, Card, Button, Spinner } from '@elmoorx/ui';

const mockWeather = {
  'الرياض': { temp: 35, condition: 'مشمس', icon: '☀️', humidity: 30, wind: 15 },
  'جدة': { temp: 32, condition: 'حار', icon: '🌤', humidity: 60, wind: 10 },
  'الدمام': { temp: 30, condition: 'غائم جزئياً', icon: '⛅', humidity: 50, wind: 20 },
};

export default function App() {
  const city = $state('الرياض');
  const weather = $state(null);
  const loading = $state(false);
  const error = $state('');

  const fetchWeather = () => {
    loading.set(true);
    error.set('');
    setTimeout(() => {
      const w = mockWeather[city()];
      if (w) weather.set(w);
      else error.set('المدينة غير موجودة');
      loading.set(false);
    }, 500);
  };

  $effect(() => { fetchWeather(); });

  return h('div', { style: 'max-width:500px;margin:0 auto;padding:2rem;font-family:system-ui;background:linear-gradient(135deg,#0f172a,#1e293b);color:#e2e8f0;min-height:100vh;' },
    h('h1', { style: 'color:#0ea5e9;text-align:center;margin-bottom:1.5rem;' }, '✦ Weather App'),
    h(Card, null,
      h('div', { style: 'display:flex;gap:0.5rem;' },
        h(Input, { value: city(), onInput: e => city.set(e.target.value), placeholder: 'اسم المدينة', style: 'flex:1;margin:0;' }),
        h(Button, { onClick: fetchWeather }, 'بحث')
      )
    ),
    loading() ? h('div', { style: 'text-align:center;padding:2rem;' }, h(Spinner, { size: 40 })) :
    error() ? h(Card, { style: 'margin-top:1rem;text-align:center;color:#ef4444;' }, error()) :
    weather() && h(Card, { style: 'margin-top:1rem;text-align:center;' },
      h('div', { style: 'font-size:5rem;' }, weather().icon),
      h('h2', { style: 'color:#e2e8f0;margin:0.5rem 0;' }, city()),
      h('div', { style: 'font-size:3rem;font-weight:bold;color:#0ea5e9;' }, weather().temp + '°C'),
      h('p', { style: 'color:#94a3b8;' }, weather().condition),
      h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;' },
        h('div', { style: 'background:#0f172a;padding:0.75rem;border-radius:6px;' },
          h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'الرطوبة'),
          h('div', { style: 'color:#0ea5e9;font-size:1.5rem;' }, weather().humidity + '%')
        ),
        h('div', { style: 'background:#0f172a;padding:0.75rem;border-radius:6px;' },
          h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'الرياح'),
          h('div', { style: 'color:#0ea5e9;font-size:1.5rem;' }, weather().wind + ' km/h')
        )
      )
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) CHAT APP
// ─────────────────────────────────────────────────────────────────────────────

async function generateChatApp(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $state, $store, $effect, onCleanup } from '@elmoorx/runtime';
import { Input, Button, Avatar } from '@elmoorx/ui';

export default function App() {
  const messages = $store([
    { id: 1, user: 'bot', text: 'مرحباً! كيف يمكنني مساعدتك؟', time: '10:00' },
    { id: 2, user: 'me', text: 'مرحباً، أنا بخير', time: '10:01' },
  ]);
  const newMessage = $state('');

  const send = (e) => {
    e.preventDefault();
    if (!newMessage().trim()) return;
    const time = new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    messages.push({ id: Date.now(), user: 'me', text: newMessage(), time });
    newMessage.set('');
    // رد تلقائي
    setTimeout(() => {
      messages.push({ id: Date.now() + 1, user: 'bot', text: 'تم استلام رسالتك!', time: new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) });
    }, 1000);
  };

  return h('div', { style: 'max-width:600px;margin:0 auto;font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;flex-direction:column;' },
    h('header', { style: 'background:#1e293b;padding:1rem;display:flex;align-items:center;gap:0.75rem;border-bottom:1px solid #334155;' },
      h(Avatar, { name: 'Bot', size: 40 }),
      h('div', null,
        h('div', { style: 'color:#e2e8f0;font-weight:600;' }, 'مساعد Elmoorx'),
        h('div', { style: 'color:#10b981;font-size:0.85rem;' }, '● متصل')
      )
    ),
    h('div', { style: 'flex:1;padding:1rem;overflow-y:auto;' },
      messages.get().map(msg =>
        h('div', {
          key: msg.id,
          style: 'display:flex;gap:0.5rem;margin-bottom:1rem;' + (msg.user === 'me' ? ';flex-direction:row-reverse;' : ''),
        },
          h(Avatar, { name: msg.user === 'me' ? 'أنا' : 'Bot', size: 32 }),
          h('div', {
            style: 'max-width:70%;padding:0.75rem 1rem;border-radius:8px;' + (msg.user === 'me' ? 'background:#0ea5e9;color:white;' : 'background:#1e293b;color:#e2e8f0;')
          },
            h('div', null, msg.text),
            h('div', { style: 'font-size:0.7rem;opacity:0.7;margin-top:0.25rem;' }, msg.time)
          )
        )
      )
    ),
    h('form', { onSubmit: send, style: 'padding:1rem;background:#1e293b;border-top:1px solid #334155;display:flex;gap:0.5rem;' },
      h(Input, { value: newMessage(), onInput: e => newMessage.set(e.target.value), placeholder: 'اكتب رسالة...', style: 'flex:1;margin:0;' }),
      h(Button, { type: 'submit' }, '→')
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) NOTES APP
// ─────────────────────────────────────────────────────────────────────────────

async function generateNotesApp(target) {
  writeFileSync(join(target, 'src', 'index.tsx'), `import { h, $store, $state, $computed } from '@elmoorx/runtime';
import { Button, Input, Card, Stack } from '@elmoorx/ui';

export default function App() {
  const notes = $store([
    { id: 1, title: 'تدوينة 1', body: 'محتوى التدوينة الأولى', color: '#0ea5e9', pinned: true },
    { id: 2, title: 'تدوينة 2', body: 'محتوى التدوينة الثانية', color: '#10b981', pinned: false },
  ]);
  const selected = $state(null);
  const newTitle = $state('');
  const newBody = $state('');

  const add = () => {
    if (!newTitle().trim()) return;
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    notes.push({
      id: Date.now(),
      title: newTitle(),
      body: newBody(),
      color: colors[Math.floor(Math.random() * colors.length)],
      pinned: false,
    });
    newTitle.set('');
    newBody.set('');
  };

  const remove = (id) => {
    const t = notes.get();
    const i = t.findIndex(x => x.id === id);
    if (i >= 0) t.splice(i, 1);
  };

  const togglePin = (id) => {
    const t = notes.get();
    const note = t.find(x => x.id === id);
    if (note) note.pinned = !note.pinned;
  };

  const sorted = $computed(() => {
    const t = [...notes.get()];
    return t.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  });

  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;padding:2rem;' },
    h('h1', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, '✦ Notes App'),
    // Add note
    h(Card, { title: 'إضافة تدوينة', style: 'margin-bottom:1.5rem;' },
      h(Input, { value: newTitle(), onInput: e => newTitle.set(e.target.value), placeholder: 'العنوان' }),
      h(Input, { value: newBody(), onInput: e => newBody.set(e.target.value), placeholder: 'المحتوى' }),
      h(Button, { onClick: add }, 'إضافة')
    ),
    // Notes grid
    h('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;' },
      sorted().map(note =>
        h(Card, {
          key: note.id,
          style: 'border-top:4px solid ' + note.color + ';position:relative;',
        },
          note.pinned && h('div', { style: 'position:absolute;top:0.5rem;left:0.5rem;' }, '📌'),
          h('h3', { style: 'color:' + note.color + ';margin:0 0 0.5rem;' }, note.title),
          h('p', { style: 'color:#94a3b8;font-size:0.9rem;margin:0;' }, note.body),
          h(Stack, { direction: 'horizontal', gap: 'sm', style: 'margin-top:0.75rem;' },
            h(Button, { size: 'sm', variant: 'ghost', onClick: () => togglePin(note.id) }, note.pinned ? 'إلغاء التثبيت' : 'تثبيت'),
            h(Button, { size: 'sm', variant: 'danger', onClick: () => remove(note.id) }, 'حذف')
          )
        )
      )
    )
  );
}
`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) GENERIC — للقوالب غير المُخصصة
// ─────────────────────────────────────────────────────────────────────────────

async function generateTaskManager(target) { await generateTodoApp(target); }
async function generateBlogApp(target) { await generateNotesApp(target); }
async function generateSocialFeed(target) { await generateNotesApp(target); }
async function generateCRMApp(target) { await generateTodoApp(target); }
async function generateInventoryApp(target) { await generateTodoApp(target); }
async function generateInvoiceApp(target) { await generateTodoApp(target); }
async function generateGalleryApp(target) { await generateNotesApp(target); }
async function generateVideoApp(target) { await generateNotesApp(target); }
async function generateMusicApp(target) { await generateNotesApp(target); }
async function generateCurrencyApp(target) { await generateCalculatorApp(target); }
async function generateQRApp(target) { await generateCalculatorApp(target); }
async function generatePasswordApp(target) { await generateCalculatorApp(target); }
