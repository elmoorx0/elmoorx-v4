/**
 * مثال شامل — تطبيق كامل يعرض كل ميزات Elmoorx v4
 */
import { h, $state, $store, $effect, $computed, island, sanitize } from '@elmoorx/runtime';

export default function App() {
  const route = $state(window.location.hash || '#/');

  window.addEventListener('hashchange', () => route.set(window.location.hash || '#/'));

  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('nav', { style: 'background:#1e293b;padding:1rem;display:flex;gap:1rem;justify-content:center;' },
      h('a', { href: '#/', style: route() === '#/' ? 'color:#0ea5e9;' : 'color:#94a3b8;' }, 'Counter'),
      h('a', { href: '#/todo', style: route() === '#/todo' ? 'color:#0ea5e9;' : 'color:#94a3b8;' }, 'Todo'),
      h('a', { href: '#/store', style: route() === '#/store' ? 'color:#0ea5e9;' : 'color:#94a3b8;' }, 'Store'),
      h('a', { href: '#/security', style: route() === '#/security' ? 'color:#0ea5e9;' : 'color:#94a3b8;' }, 'Security')
    ),
    h('main', { style: 'max-width:800px;margin:0 auto;padding:2rem;' },
      route() === '#/' && h(CounterApp),
      route() === '#/todo' && h(TodoApp),
      route() === '#/store' && h(StoreApp),
      route() === '#/security' && h(SecurityApp)
    )
  );
}

// ─── Counter ───
function CounterApp() {
  const count = $state(0);
  const doubled = $computed(() => count() * 2);

  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;' }, 'Counter'),
    h('p', { style: 'color:#94a3b8;' }, 'اضغط الأزرار لتغيير العدّاد. الـ computed يُحدّث تلقائياً.'),
    h('div', { style: 'display:flex;align-items:center;gap:1rem;margin:2rem 0;' },
      h('button', { onClick: () => count.set(c => c - 1), style: 'width:3rem;height:3rem;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.5rem;' }, '−'),
      h('div', { style: 'text-align:center;' },
        h('div', { style: 'font-size:3rem;color:#0ea5e9;font-weight:bold;' }, () => count()),
        h('div', { style: 'color:#94a3b8;' }, () => `ضعف: ${doubled()}`)
      ),
      h('button', { onClick: () => count.set(c => c + 1), style: 'width:3rem;height:3rem;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.5rem;' }, '+')
    ),
    h('button', { onClick: () => count.set(0), style: 'padding:0.5rem 1rem;background:#334155;color:white;border:none;border-radius:4px;cursor:pointer;' }, 'تصفير')
  );
}

// ─── Todo ───
function TodoApp() {
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

  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;' }, 'Todo List'),
    h('form', { onSubmit: add, style: 'display:flex;gap:0.5rem;margin-bottom:1rem;' },
      h('input', {
        value: newText(),
        onInput: e => newText.set(e.target.value),
        placeholder: 'مهمة جديدة...',
        style: 'flex:1;padding:0.75rem;background:#1e293b;border:1px solid #334155;border-radius:6px;color:white;'
      }),
      h('button', { type: 'submit', style: 'padding:0.75rem 1.5rem;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;' }, '+')
    ),
    h('div', { style: 'display:flex;gap:0.5rem;margin-bottom:1rem;' },
      ['all', 'active', 'done'].map(f =>
        h('button', {
          key: f,
          onClick: () => filter.set(f),
          style: filter() === f
            ? 'padding:0.25rem 1rem;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;'
            : 'padding:0.25rem 1rem;background:#1e293b;color:#94a3b8;border:none;border-radius:4px;cursor:pointer;'
        }, { all: 'الكل', active: 'النشطة', done: 'المكتملة' }[f])
      )
    ),
    h('ul', { style: 'list-style:none;padding:0;' },
      visible().map(todo =>
        h('li', {
          key: todo.id,
          style: 'display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:#1e293b;border-radius:6px;margin-bottom:0.5rem;'
        },
          h('input', {
            type: 'checkbox',
            checked: todo.done,
            onChange: () => {
              const t = todos.get();
              const i = t.findIndex(x => x.id === todo.id);
              t[i].done = !t[i].done;
            }
          }),
          h('span', {
            style: todo.done ? 'text-decoration:line-through;color:#64748b;flex:1;' : 'color:#e2e8f0;flex:1;'
          }, todo.text),
          h('button', {
            onClick: () => {
              const t = todos.get();
              const i = t.findIndex(x => x.id === todo.id);
              t.splice(i, 1);
            },
            style: 'background:#ef4444;color:white;border:none;width:1.75rem;height:1.75rem;border-radius:4px;cursor:pointer;'
          }, '×')
        )
      )
    ),
    h('div', { style: 'color:#94a3b8;margin-top:1rem;' },
      () => `${todos.get().filter(x => !x.done).length} مهام متبقية`
    )
  );
}

// ─── Store Demo ───
function StoreApp() {
  const user = $store({
    name: 'محمد',
    email: 'mohammed@example.com',
    preferences: { theme: 'dark', lang: 'ar' }
  });

  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;' }, 'Store Demo'),
    h('p', { style: 'color:#94a3b8;' }, 'تعديل أي حقل يُحدّث العرض فوراً'),
    h('div', { style: 'background:#1e293b;padding:1.5rem;border-radius:8px;margin-bottom:1rem;' },
      h('label', { style: 'display:block;color:#94a3b8;margin-bottom:0.25rem;' }, 'الاسم'),
      h('input', {
        value: user.name,
        onInput: e => user.name = e.target.value,
        style: 'width:100%;padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:4px;color:white;margin-bottom:1rem;'
      }),
      h('label', { style: 'display:block;color:#94a3b8;margin-bottom:0.25rem;' }, 'البريد'),
      h('input', {
        value: user.email,
        onInput: e => user.email = e.target.value,
        style: 'width:100%;padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:4px;color:white;margin-bottom:1rem;'
      }),
      h('label', { style: 'display:block;color:#94a3b8;margin-bottom:0.25rem;' }, 'الثيم'),
      h('select', {
        value: user.preferences.theme,
        onChange: e => user.preferences.theme = e.target.value,
        style: 'width:100%;padding:0.5rem;background:#0f172a;border:1px solid #334155;border-radius:4px;color:white;'
      },
        h('option', { value: 'dark' }, 'داكن'),
        h('option', { value: 'light' }, 'فاتح')
      )
    ),
    h('div', { style: 'background:#0f172a;padding:1rem;border-radius:8px;' },
      h('h3', { style: 'color:#94a3b8;' }, 'JSON المباشر'),
      h('pre', { style: 'color:#10b981;font-family:monospace;direction:ltr;' },
        () => JSON.stringify(user.get(), null, 2)
      )
    )
  );
}

// ─── Security ───
function SecurityApp() {
  const input = $state('<script>alert("xss")</script><b>نص آمن</b><img src=x onerror=alert(1)>');
  const cleaned = $computed(() => sanitize(input()));

  return h('div', null,
    h('h1', { style: 'color:#0ea5e9;' }, 'Security Demo'),
    h('p', { style: 'color:#94a3b8;' }, 'اكتب HTML — سنُنظّفه تلقائياً من XSS'),
    h('textarea', {
      value: input(),
      onInput: e => input.set(e.target.value),
      style: 'width:100%;padding:0.75rem;background:#1e293b;border:1px solid #334155;border-radius:6px;color:white;font-family:monospace;min-height:80px;direction:ltr;margin-bottom:1rem;'
    }),
    h('div', { style: 'background:#7f1d1d;padding:0.75rem;border-radius:6px;margin-bottom:0.5rem;' },
      h('strong', { style: 'color:#fecaca;' }, 'الإدخال (خطر):'),
      h('pre', { style: 'color:#fecaca;direction:ltr;margin-top:0.5rem;' }, input())
    ),
    h('div', { style: 'background:#064e3b;padding:0.75rem;border-radius:6px;' },
      h('strong', { style: 'color:#a7f3d0;' }, 'بعد التنظيف (آمن):'),
      h('pre', { style: 'color:#a7f3d0;direction:ltr;margin-top:0.5rem;' }, cleaned())
    )
  );
}
