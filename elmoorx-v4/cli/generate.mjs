/**
 * elmoorx generate "<description>" — يولّد مكون من وصف نصي
 * بديل ذكي عن AI APIs — مكتبة قوالب + مطابقة ذكية
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const COMPONENT_TEMPLATES = {
  // Form components
  'login form': generateLoginForm,
  'signup form': generateSignupForm,
  'contact form': generateContactForm,
  'search bar': generateSearchBar,

  // Data components
  'todo list': generateTodoList,
  'data table': generateDataTable,
  'kanban board': generateKanban,
  'list': generateList,

  // Layout
  'navbar': generateNavbar,
  'sidebar': generateSidebar,
  'footer': generateFooter,
  'card': generateCard,

  // Feedback
  'modal': generateModal,
  'alert': generateAlert,
  'toast': generateToast,
  'loading spinner': generateSpinner,

  // Inputs
  'button': generateButton,
  'input': generateInput,
  'dropdown': generateDropdown,
  'checkbox': generateCheckbox,
  'tabs': generateTabs,
  'accordion': generateAccordion,

  // Display
  'chart': generateChart,
  'progress bar': generateProgress,
  'badge': generateBadge,
  'avatar': generateAvatar,

  // Special
  'counter': generateCounter,
  'timer': generateTimer,
  'calculator': generateCalculator,
};

export async function generateComponent({ description, outDir }) {
  const key = findTemplate(description);
  console.log(`\n  ✦ Elmoorx Generate`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ الوصف: "${description}"`);

  if (!key) {
    console.log(`  │ ✗ لم أعثر على قالب مطابق`);
    console.log(`  │ القوالب المتاحة:`);
    for (const k of Object.keys(COMPONENT_TEMPLATES)) {
      console.log(`  │   - ${k}`);
    }
    console.log(`\n  جرّب: elmoorx generate "login form"\n`);
    return;
  }

  console.log(`  │ القالب: ${key}`);

  const generator = COMPONENT_TEMPLATES[key];
  const code = generator();
  const fileName = key.replace(/\s+/g, '-').replace(/[^a-z0-9-]/gi, '') + '.tsx';
  const className = key.split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1)).join('');

  mkdirSync(outDir, { recursive: true });
  const filePath = join(outDir, fileName);
  writeFileSync(filePath, code);

  console.log(`  │ ✓ تم إنشاء: ${filePath}`);
  console.log(`  ─────────────────────────────────────\n`);
}

function findTemplate(description) {
  const desc = description.toLowerCase().trim();

  // direct match
  if (COMPONENT_TEMPLATES[desc]) return desc;

  // fuzzy — find best match
  let bestKey = null;
  let bestScore = 0;
  for (const key of Object.keys(COMPONENT_TEMPLATES)) {
    const score = similarity(desc, key);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestScore > 0.3 ? bestKey : null;
}

function similarity(a, b) {
  // بسيط — عدد الكلمات المشتركة
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.includes(w)) common++;
  }
  return common / Math.max(wordsA.length, wordsB.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// قوالب المكونات
// ─────────────────────────────────────────────────────────────────────────────

function generateLoginForm() {
  return `import { h, $state, $effect } from '@elmoorx/runtime';

export function LoginForm() {
  const email = $state('');
  const password = $state('');
  const error = $state('');
  const loading = $state(false);

  const submit = async (e) => {
    e.preventDefault();
    error.set('');
    if (!email() || !password()) {
      error.set('يرجى ملء جميع الحقول');
      return;
    }
    if (!email().includes('@')) {
      error.set('بريد إلكتروني غير صالح');
      return;
    }
    loading.set(true);
    // TODO: استبدل بـ API الفعلي
    await new Promise(r => setTimeout(r, 1000));
    loading.set(false);
    alert('تم تسجيل الدخول بنجاح!');
  };

  return h('form', {
    onSubmit: submit,
    style: 'max-width:400px;margin:2rem auto;padding:2rem;background:#1e293b;border-radius:12px;'
  },
    error() && h('div', { style: 'color:#ef4444;margin-bottom:1rem;padding:0.5rem;background:#fef2f2;border-radius:6px;' }, error()),
    h('div', { style: 'margin-bottom:1rem;' },
      h('label', { style: 'display:block;color:#94a3b8;margin-bottom:0.5rem;' }, 'البريد الإلكتروني'),
      h('input', {
        type: 'email',
        value: email(),
        onInput: e => email.set(e.target.value),
        placeholder: 'you@example.com',
        style: 'width:100%;padding:0.75rem;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;'
      })
    ),
    h('div', { style: 'margin-bottom:1.5rem;' },
      h('label', { style: 'display:block;color:#94a3b8;margin-bottom:0.5rem;' }, 'كلمة المرور'),
      h('input', {
        type: 'password',
        value: password(),
        onInput: e => password.set(e.target.value),
        placeholder: '••••••••',
        style: 'width:100%;padding:0.75rem;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0;'
      })
    ),
    h('button', {
      type: 'submit',
      disabled: loading(),
      style: 'width:100%;padding:0.75rem;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;font-size:1rem;'
    }, loading() ? 'جاري التحقق...' : 'تسجيل الدخول')
  );
}
`;
}

function generateSignupForm() {
  return `import { h, $state } from '@elmoorx/runtime';

export function SignupForm() {
  const form = $state({ name: '', email: '', password: '', confirm: '' });
  const errors = $state({});

  const validate = () => {
    const e = {};
    if (!form().name) e.name = 'الاسم مطلوب';
    if (!form().email.includes('@')) e.email = 'بريد غير صالح';
    if (form().password.length < 8) e.password = '8 أحرف على الأقل';
    if (form().password !== form().confirm) e.confirm = 'كلمتا المرور غير متطابقتين';
    errors.set(e);
    return Object.keys(e).length === 0;
  };

  return h('form', {
    onSubmit: (ev) => { ev.preventDefault(); if (validate()) alert('تم إنشاء الحساب!'); },
    style: 'max-width:400px;margin:2rem auto;padding:2rem;background:#1e293b;border-radius:12px;'
  },
    ['name', 'email', 'password', 'confirm'].map(field =>
      h('div', { style: 'margin-bottom:1rem;' },
        h('label', { style: 'color:#94a3b8;' }, { name: 'الاسم', email: 'البريد', password: 'كلمة المرور', confirm: 'تأكيد كلمة المرور' }[field]),
        h('input', {
          type: field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text',
          value: form()[field],
          onInput: e => form.set(f => ({ ...f, [field]: e.target.value })),
          style: 'width:100%;padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:4px;color:white;'
        }),
        errors()[field] && h('span', { style: 'color:#ef4444;font-size:0.85rem;' }, errors()[field])
      )
    ),
    h('button', { type: 'submit', style: 'padding:0.75rem;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer;' }, 'إنشاء الحساب')
  );
}
`;
}

function generateContactForm() {
  return `import { h, $state } from '@elmoorx/runtime';
export function ContactForm() {
  const name = $state(''); const email = $state(''); const message = $state('');
  const sent = $state(false);
  return h('form', {
    onSubmit: e => { e.preventDefault(); sent.set(true); },
    style: 'max-width:500px;margin:2rem auto;padding:2rem;background:#1e293b;border-radius:12px;'
  },
    sent() ? h('div', { style: 'color:#10b981;text-align:center;padding:2rem;' }, '✓ تم إرسال رسالتك!') : [
      h('input', { placeholder: 'الاسم', value: name(), onInput: e => name.set(e.target.value), style: 'width:100%;padding:0.75rem;margin-bottom:1rem;background:#0f172a;border:1px solid #334155;border-radius:6px;color:white;' }),
      h('input', { type: 'email', placeholder: 'البريد', value: email(), onInput: e => email.set(e.target.value), style: 'width:100%;padding:0.75rem;margin-bottom:1rem;background:#0f172a;border:1px solid #334155;border-radius:6px;color:white;' }),
      h('textarea', { placeholder: 'رسالتك', value: message(), onInput: e => message.set(e.target.value), style: 'width:100%;padding:0.75rem;margin-bottom:1rem;background:#0f172a;border:1px solid #334155;border-radius:6px;color:white;min-height:120px;' }),
      h('button', { type: 'submit', style: 'padding:0.75rem 2rem;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;' }, 'إرسال')
    ]
  );
}
`;
}

function generateSearchBar() {
  return `import { h, $state, $effect } from '@elmoorx/runtime';
export function SearchBar({ onSearch }) {
  const query = $state('');
  $effect(() => {
    const t = setTimeout(() => onSearch && onSearch(query()), 300);
    return () => clearTimeout(t);
  });
  return h('div', { style: 'position:relative;max-width:400px;' },
    h('input', {
      type: 'search',
      value: query(),
      onInput: e => query.set(e.target.value),
      placeholder: 'بحث...',
      style: 'width:100%;padding:0.75rem 2.5rem;background:#1e293b;border:1px solid #334155;border-radius:8px;color:white;'
    }),
    h('span', { style: 'position:absolute;right:0.75rem;top:50%;transform:translateY(-50%);color:#64748b;' }, '🔍')
  );
}
`;
}

function generateTodoList() {
  return `import { h, $state, $store } from '@elmoorx/runtime';
export function TodoList() {
  const todos = $store([
    { id: 1, text: 'تعلّم Elmoorx', done: true },
    { id: 2, text: 'بناء تطبيق', done: false },
  ]);
  const newText = $state('');
  const filter = $state('all');

  const add = (e) => {
    e.preventDefault();
    if (!newText().trim()) return;
    todos.push({ id: Date.now(), text: newText(), done: false });
    newText.set('');
  };

  const visible = () => {
    const t = todos.get();
    if (filter() === 'active') return t.filter(x => !x.done);
    if (filter() === 'done') return t.filter(x => x.done);
    return t;
  };

  return h('div', { style: 'max-width:500px;margin:2rem auto;' },
    h('h2', { style: 'color:#0ea5e9;margin-bottom:1rem;' }, 'مهامي'),
    h('form', { onSubmit: add, style: 'display:flex;gap:0.5rem;margin-bottom:1rem;' },
      h('input', { value: newText(), onInput: e => newText.set(e.target.value), placeholder: 'مهمة جديدة...', style: 'flex:1;padding:0.5rem;background:#1e293b;border:1px solid #334155;border-radius:4px;color:white;' }),
      h('button', { type: 'submit', style: 'padding:0.5rem 1rem;background:#0ea5e9;color:white;border:none;border-radius:4px;' }, '+')
    ),
    h('div', { style: 'display:flex;gap:0.5rem;margin-bottom:1rem;' },
      ['all', 'active', 'done'].map(f =>
        h('button', { onClick: () => filter.set(f), style: filter() === f ? 'padding:0.25rem 0.75rem;background:#0ea5e9;color:white;border:none;border-radius:4px;' : 'padding:0.25rem 0.75rem;background:#1e293b;color:#94a3b8;border:none;border-radius:4px;' }, { all: 'الكل', active: 'النشطة', done: 'المكتملة' }[f])
      )
    ),
    h('ul', { style: 'list-style:none;padding:0;' },
      visible().map(todo =>
        h('li', { key: todo.id, style: 'display:flex;align-items:center;gap:0.5rem;padding:0.5rem;background:#1e293b;border-radius:4px;margin-bottom:0.5rem;' },
          h('input', { type: 'checkbox', checked: todo.done, onChange: () => { const t = todos.get(); const i = t.findIndex(x => x.id === todo.id); t[i].done = !t[i].done; } }),
          h('span', { style: todo.done ? 'text-decoration:line-through;color:#64748b;' : 'color:#e2e8f0;' }, todo.text),
          h('button', { onClick: () => { const t = todos.get(); const i = t.findIndex(x => x.id === todo.id); t.splice(i, 1); }, style: 'margin-right:auto;background:#ef4444;color:white;border:none;padding:0.25rem 0.5rem;border-radius:4px;cursor:pointer;' }, '×')
        )
      )
    )
  );
}
`;
}

function generateDataTable() {
  return `import { h, $state, $store } from '@elmoorx/runtime';
export function DataTable({ data = [], columns = [] }) {
  const sortKey = $state(null);
  const sortDir = $state('asc');
  const search = $state('');

  const sorted = () => {
    let d = [...data];
    if (search()) d = d.filter(row => Object.values(row).some(v => String(v).includes(search())));
    if (sortKey()) {
      d.sort((a, b) => {
        const r = a[sortKey()] > b[sortKey()] ? 1 : -1;
        return sortDir() === 'asc' ? r : -r;
      });
    }
    return d;
  };

  return h('div', { style: 'background:#1e293b;border-radius:8px;overflow:hidden;' },
    h('input', { placeholder: 'بحث...', value: search(), onInput: e => search.set(e.target.value), style: 'width:100%;padding:0.75rem;background:#0f172a;border:none;color:white;' }),
    h('table', { style: 'width:100%;border-collapse:collapse;' },
      h('thead', null,
        h('tr', null, columns.map(col =>
          h('th', { onClick: () => { if (sortKey() === col.key) sortDir.set(d => d === 'asc' ? 'desc' : 'asc'); else { sortKey.set(col.key); sortDir.set('asc'); } }, style: 'padding:0.75rem;text-align:right;cursor:pointer;background:#0f172a;color:#94a3b8;' }, col.label, sortKey() === col.key ? (sortDir() === 'asc' ? ' ↑' : ' ↓') : '')
        ))
      ),
      h('tbody', null, sorted().map(row =>
        h('tr', { key: row.id }, columns.map(col =>
          h('td', { style: 'padding:0.75rem;border-top:1px solid #334155;color:#e2e8f0;' }, row[col.key])
        ))
      ))
    )
  );
}
`;
}

function generateKanban() {
  return `import { h, $store } from '@elmoorx/runtime';
export function Kanban() {
  const columns = $store({
    todo: [{ id: 1, text: 'تصميم' }, { id: 2, text: 'برمجة' }],
    doing: [{ id: 3, text: 'اختبار' }],
    done: [{ id: 4, text: 'نشر' }],
  });
  return h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;' },
    Object.entries(columns.get()).map(([col, items]) =>
      h('div', { key: col, style: 'background:#1e293b;padding:1rem;border-radius:8px;' },
        h('h3', { style: 'color:#94a3b8;margin-bottom:0.5rem;text-transform:capitalize;' }, col),
        items.map(item =>
          h('div', { key: item.id, style: 'background:#0f172a;padding:0.75rem;border-radius:4px;margin-bottom:0.5rem;color:#e2e8f0;' }, item.text)
        )
      )
    )
  );
}
`;
}

function generateList() {
  return `import { h, $state } from '@elmoorx/runtime';
export function List({ items = [] }) {
  return h('ul', { style: 'list-style:none;padding:0;' },
    items.map((item, i) => h('li', { key: i, style: 'padding:0.5rem 0;border-bottom:1px solid #334155;color:#e2e8f0;' }, item))
  );
}
`;
}

function generateNavbar() {
  return `import { h, $state } from '@elmoorx/runtime';
export function Navbar() {
  const open = $state(false);
  const links = [{ label: 'الرئيسية', href: '/' }, { label: 'المنتجات', href: '/products' }, { label: 'من نحن', href: '/about' }];
  return h('nav', { style: 'background:#0f172a;padding:1rem 2rem;display:flex;align-items:center;justify-content:between;' },
    h('div', { style: 'color:#0ea5e9;font-weight:bold;font-size:1.25rem;' }, '✦ Logo'),
    h('button', { onClick: () => open.set(!open()), style: 'display:none;' }, '☰'),
    h('ul', { style: 'display:flex;gap:1.5rem;list-style:none;margin-right:auto;' },
      links.map(l => h('li', { key: l.href }, h('a', { href: l.href, style: 'color:#94a3b8;text-decoration:none;' }, l.label)))
    )
  );
}
`;
}

function generateSidebar() {
  return `import { h } from '@elmoorx/runtime';
export function Sidebar({ items = [], active = '' }) {
  return h('aside', { style: 'width:250px;background:#1e293b;padding:1rem;min-height:100vh;' },
    h('ul', { style: 'list-style:none;padding:0;' },
      items.map(item => h('li', { key: item.href, style: 'margin-bottom:0.25rem;' },
        h('a', { href: item.href, style: active === item.href ? 'display:block;padding:0.75rem;background:#0ea5e9;color:white;border-radius:4px;text-decoration:none;' : 'display:block;padding:0.75rem;color:#94a3b8;text-decoration:none;' }, item.label)
      ))
    )
  );
}
`;
}

function generateFooter() {
  return `import { h } from '@elmoorx/runtime';
export function Footer() {
  return h('footer', { style: 'background:#0f172a;padding:2rem;color:#64748b;text-align:center;margin-top:auto;' },
    h('p', null, '© 2026 — مبني بـ Elmoorx v4')
  );
}
`;
}

function generateCard() {
  return `import { h } from '@elmoorx/runtime';
export function Card({ title = '', children }) {
  return h('div', { style: 'background:#1e293b;border-radius:8px;padding:1.5rem;box-shadow:0 4px 6px rgba(0,0,0,0.3);' },
    title && h('h3', { style: 'color:#0ea5e9;margin-bottom:0.5rem;' }, title),
    h('div', { style: 'color:#e2e8f0;' }, children)
  );
}
`;
}

function generateModal() {
  return `import { h, $state } from '@elmoorx/runtime';
export function Modal({ open, onClose, title = '', children }) {
  if (!open) return null;
  return h('div', { onClick: onClose, style: 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:50;' },
    h('div', { onClick: e => e.stopPropagation(), style: 'background:#1e293b;border-radius:8px;padding:1.5rem;max-width:500px;width:90%;' },
      h('div', { style: 'display:flex;justify-content:between;align-items:center;margin-bottom:1rem;' },
        h('h3', { style: 'color:#e2e8f0;' }, title),
        h('button', { onClick: onClose, style: 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.5rem;' }, '×')
      ),
      h('div', null, children)
    )
  );
}
`;
}

function generateAlert() {
  return `import { h } from '@elmoorx/runtime';
export function Alert({ type = 'info', children }) {
  const styles = {
    info: 'background:#0ea5e9;color:white;',
    success: 'background:#10b981;color:white;',
    warning: 'background:#f59e0b;color:white;',
    error: 'background:#ef4444;color:white;',
  };
  return h('div', { style: styles[type] + 'padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;' }, children);
}
`;
}

function generateToast() {
  return `import { h, $state, $effect } from '@elmoorx/runtime';
export function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const visible = $state(true);
  $effect(() => {
    const t = setTimeout(() => { visible.set(false); onClose && onClose(); }, duration);
    return () => clearTimeout(t);
  });
  if (!visible()) return null;
  const colors = { info: '#0ea5e9', success: '#10b981', error: '#ef4444', warning: '#f59e0b' };
  return h('div', { style: \`position:fixed;bottom:1rem;right:1rem;background:\${colors[type]};color:white;padding:1rem;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);\` }, message);
}
`;
}

function generateSpinner() {
  return `import { h } from '@elmoorx/runtime';
export function Spinner({ size = 24 }) {
  return h('div', { style: \`width:\${size}px;height:\${size}px;border:3px solid #334155;border-top-color:#0ea5e9;border-radius:50%;animation:elmoorx-spin 0.8s linear infinite;\` });
}
`;
}

function generateButton() {
  return `import { h } from '@elmoorx/runtime';
export function Button({ variant = 'primary', size = 'md', children, ...props }) {
  const variants = { primary: '#0ea5e9', secondary: '#1e293b', success: '#10b981', danger: '#ef4444' };
  const sizes = { sm: '0.5rem 1rem', md: '0.75rem 1.5rem', lg: '1rem 2rem' };
  return h('button', { ...props, style: \`background:\${variants[variant]};color:white;border:none;padding:\${sizes[size]};border-radius:6px;cursor:pointer;font-size:1rem;\` }, children);
}
`;
}

function generateInput() {
  return `import { h } from '@elmoorx/runtime';
export function Input({ label, error, ...props }) {
  return h('div', null,
    label && h('label', { style: 'display:block;color:#94a3b8;margin-bottom:0.25rem;' }, label),
    h('input', { ...props, style: 'width:100%;padding:0.5rem;background:#1e293b;border:1px solid #334155;border-radius:4px;color:white;' }),
    error && h('span', { style: 'color:#ef4444;font-size:0.85rem;' }, error)
  );
}
`;
}

function generateDropdown() {
  return `import { h, $state } from '@elmoorx/runtime';
export function Dropdown({ options = [], value, onChange }) {
  const open = $state(false);
  return h('div', { style: 'position:relative;' },
    h('button', { onClick: () => open.set(!open()), style: 'padding:0.5rem 1rem;background:#1e293b;color:white;border:1px solid #334155;border-radius:4px;cursor:pointer;' }, value || 'اختر...'),
    open() && h('ul', { style: 'position:absolute;top:100%;right:0;background:#1e293b;border:1px solid #334155;border-radius:4px;list-style:none;padding:0;margin:0.25rem 0;min-width:100%;z-index:10;' },
      options.map(opt => h('li', { key: opt.value, onClick: () => { onChange && onChange(opt.value); open.set(false); }, style: 'padding:0.5rem 1rem;cursor:pointer;color:#e2e8f0;' }, opt.label))
    )
  );
}
`;
}

function generateCheckbox() {
  return `import { h } from '@elmoorx/runtime';
export function Checkbox({ checked, onChange, label }) {
  return h('label', { style: 'display:flex;align-items:center;gap:0.5rem;cursor:pointer;color:#e2e8f0;' },
    h('input', { type: 'checkbox', checked, onChange: e => onChange && onChange(e.target.checked) }),
    label
  );
}
`;
}

function generateTabs() {
  return `import { h, $state } from '@elmoorx/runtime';
export function Tabs({ tabs = [], defaultTab = 0 }) {
  const active = $state(defaultTab);
  return h('div', null,
    h('div', { style: 'border-bottom:1px solid #334155;display:flex;gap:0;' },
      tabs.map((tab, i) => h('button', { key: i, onClick: () => active.set(i), style: active() === i ? 'padding:0.75rem 1rem;background:#0ea5e9;color:white;border:none;cursor:pointer;' : 'padding:0.75rem 1rem;background:none;color:#94a3b8;border:none;cursor:pointer;' }, tab.label))
    ),
    h('div', { style: 'padding:1rem;' }, tabs[active()] && tabs[active()].content)
  );
}
`;
}

function generateAccordion() {
  return `import { h, $state } from '@elmoorx/runtime';
export function Accordion({ items = [] }) {
  const open = $state(null);
  return h('div', null, items.map((item, i) =>
    h('div', { key: i, style: 'border:1px solid #334155;border-radius:4px;margin-bottom:0.5rem;' },
      h('button', { onClick: () => open.set(open() === i ? null : i), style: 'width:100%;padding:0.75rem;background:#1e293b;color:#e2e8f0;border:none;text-align:right;cursor:pointer;' }, item.title),
      open() === i && h('div', { style: 'padding:0.75rem;color:#94a3b8;' }, item.content)
    )
  ));
}
`;
}

function generateChart() {
  return `import { h } from '@elmoorx/runtime';
export function Chart({ data = [], type = 'bar' }) {
  if (type === 'bar') {
    const max = Math.max(...data.map(d => d.value), 1);
    return h('div', { style: 'display:flex;align-items:flex-end;gap:0.5rem;height:200px;padding:1rem;background:#1e293b;border-radius:8px;' },
      data.map((d, i) => h('div', { key: i, style: \`flex:1;background:linear-gradient(to top,#0ea5e9,#0284c7);border-radius:4px 4px 0 0;height:\${(d.value / max) * 100}%;position:relative;\` },
        h('span', { style: 'position:absolute;bottom:-1.5rem;left:0;right:0;text-align:center;color:#94a3b8;font-size:0.75rem;' }, d.label)
      ))
    );
  }
  return h('div', null, 'Chart type: ' + type);
}
`;
}

function generateProgress() {
  return `import { h } from '@elmoorx/runtime';
export function Progress({ value = 0, max = 100, color = '#0ea5e9' }) {
  const pct = Math.min(100, (value / max) * 100);
  return h('div', { style: 'width:100%;height:8px;background:#1e293b;border-radius:4px;overflow:hidden;' },
    h('div', { style: \`width:\${pct}%;height:100%;background:\${color};transition:width 0.3s;\` })
  );
}
`;
}

function generateBadge() {
  return `import { h } from '@elmoorx/runtime';
export function Badge({ variant = 'default', children }) {
  const variants = { default: '#1e293b', success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#0ea5e9' };
  return h('span', { style: \`display:inline-block;padding:0.25rem 0.5rem;background:\${variants[variant]};color:white;border-radius:4px;font-size:0.75rem;\` }, children);
}
`;
}

function generateAvatar() {
  return `import { h } from '@elmoorx/runtime';
export function Avatar({ src, name = '', size = 40 }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return h('div', { style: \`width:\${size}px;height:\${size}px;border-radius:50%;background:#0ea5e9;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;overflow:hidden;\` },
    src ? h('img', { src, alt: name, style: 'width:100%;height:100%;object-fit:cover;' }) : initials
  );
}
`;
}

function generateCounter() {
  return `import { h, $state } from '@elmoorx/runtime';
export function Counter({ initial = 0, step = 1 }) {
  const count = $state(initial);
  return h('div', { style: 'display:flex;align-items:center;gap:1rem;' },
    h('button', { onClick: () => count.set(c => c - step), style: 'width:2rem;height:2rem;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;' }, '−'),
    h('span', { style: 'font-size:1.5rem;color:#e2e8f0;min-width:3rem;text-align:center;' }, () => count()),
    h('button', { onClick: () => count.set(c => c + step), style: 'width:2rem;height:2rem;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;' }, '+')
  );
}
`;
}

function generateTimer() {
  return `import { h, $state, $effect, onCleanup } from '@elmoorx/runtime';
export function Timer() {
  const seconds = $state(0);
  const running = $state(true);
  $effect(() => {
    if (!running()) return;
    const id = setInterval(() => seconds.set(s => s + 1), 1000);
    onCleanup(() => clearInterval(id));
  });
  const fmt = (s) => \`\${Math.floor(s/60)}:\${String(s%60).padStart(2,'0')}\`;
  return h('div', { style: 'text-align:center;' },
    h('div', { style: 'font-size:3rem;color:#0ea5e9;font-family:monospace;' }, () => fmt(seconds())),
    h('button', { onClick: () => running.set(!running()), style: 'padding:0.5rem 1rem;background:#1e293b;color:white;border:none;border-radius:4px;cursor:pointer;' }, () => running() ? 'إيقاف' : 'استئناف'),
    h('button', { onClick: () => seconds.set(0), style: 'padding:0.5rem 1rem;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;margin-right:0.5rem;' }, 'تصفير')
  );
}
`;
}

function generateCalculator() {
  return `import { h, $state } from '@elmoorx/runtime';
export function Calculator() {
  const display = $state('0');
  const calc = (op) => { /* TODO: implement */ };
  return h('div', { style: 'max-width:300px;margin:2rem auto;background:#1e293b;border-radius:12px;padding:1rem;' },
    h('div', { style: 'background:#0f172a;padding:1rem;border-radius:6px;text-align:left;color:#e2e8f0;font-size:2rem;margin-bottom:1rem;font-family:monospace;' }, display()),
    h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;' },
      ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(b =>
        h('button', { key: b, onClick: () => display.set(d => d === '0' ? b : d + b), style: b === '=' ? 'padding:1rem;background:#0ea5e9;color:white;border:none;border-radius:4px;font-size:1.25rem;cursor:pointer;' : 'padding:1rem;background:#334155;color:white;border:none;border-radius:4px;font-size:1.25rem;cursor:pointer;' }, b)
      )
    )
  );
}
`;
}
