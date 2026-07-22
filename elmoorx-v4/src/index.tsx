/**
 * Elmoorx v4 — Demo شامل
 * يعرض كل الميزات: signals, store, islands, HMR, security
 */
import { h, $state, $store, $effect, $computed, island, sanitize, $html } from '@elmoorx/runtime';

export default function Demo() {
  const tab = $state('signals');

  return h('div', { style: 'max-width:900px;margin:0 auto;padding:2rem;font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('header', { style: 'text-align:center;margin-bottom:2rem;' },
      h('h1', { style: 'font-size:2.5rem;background:linear-gradient(135deg,#0ea5e9,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;margin-bottom:0.5rem;' }, '✦ Elmoorx v4'),
      h('p', { style: 'color:#94a3b8;' }, 'إطار عمل مستقل عن npm — تجربة حية للمميزات')
    ),

    // تبويبات
    h('nav', { style: 'display:flex;gap:0.5rem;justify-content:center;margin-bottom:2rem;flex-wrap:wrap;' },
      ['signals', 'store', 'islands', 'security', 'hmr'].map(t =>
        h('button', {
          key: t,
          onClick: () => tab.set(t),
          style: tab() === t
            ? 'padding:0.5rem 1rem;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;'
            : 'padding:0.5rem 1rem;background:#1e293b;color:#94a3b8;border:none;border-radius:6px;cursor:pointer;'
        }, t)
      )
    ),

    // محتوى التبويب
    h('section', { style: 'background:#1e293b;padding:1.5rem;border-radius:8px;' },
      tab() === 'signals' && h(SignalsDemo),
      tab() === 'store' && h(StoreDemo),
      tab() === 'islands' && h(IslandsDemo),
      tab() === 'security' && h(SecurityDemo),
      tab() === 'hmr' && h(HMRDemo)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signals Demo
// ─────────────────────────────────────────────────────────────────────────────
function SignalsDemo() {
  const count = $state(0);
  const doubled = $computed(() => count() * 2);
  const squared = $computed(() => count() * count());

  return h('div', null,
    h('h2', { style: 'color:#0ea5e9;' }, 'Signals — تفاعل دقيق'),
    h('p', { style: 'color:#94a3b8;margin-bottom:1rem;' }, 'تعديل العدّاد يحدّث فقط القيم المعتمدة عليه، بدون إعادة عرض الصفحة'),
    h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;text-align:center;' },
      h('div', { style: 'background:#0f172a;padding:1.5rem;border-radius:8px;' },
        h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'count'),
        h('div', { style: 'font-size:2rem;color:#0ea5e9;' }, () => count())
      ),
      h('div', { style: 'background:#0f172a;padding:1.5rem;border-radius:8px;' },
        h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'doubled'),
        h('div', { style: 'font-size:2rem;color:#10b981;' }, () => doubled())
      ),
      h('div', { style: 'background:#0f172a;padding:1.5rem;border-radius:8px;' },
        h('div', { style: 'color:#94a3b8;font-size:0.85rem;' }, 'squared'),
        h('div', { style: 'font-size:2rem;color:#8b5cf6;' }, () => squared())
      )
    ),
    h('div', { style: 'display:flex;gap:0.5rem;justify-content:center;margin-top:1.5rem;' },
      h('button', { onClick: () => count.set(c => c - 1), style: 'width:2.5rem;height:2.5rem;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;font-size:1.2rem;' }, '−'),
      h('button', { onClick: () => count.set(0), style: 'padding:0 1rem;height:2.5rem;background:#64748b;color:white;border:none;border-radius:6px;cursor:pointer;' }, 'تصفير'),
      h('button', { onClick: () => count.set(c => c + 1), style: 'width:2.5rem;height:2.5rem;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer;font-size:1.2rem;' }, '+')
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Demo
// ─────────────────────────────────────────────────────────────────────────────
function StoreDemo() {
  const store = $store({
    user: { name: 'محمد', age: 30 },
    cart: [
      { id: 1, name: 'كتاب', price: 50 },
      { id: 2, name: 'قلم', price: 10 },
    ],
    theme: 'dark'
  });

  const total = $computed(() => store.cart.reduce((s, i) => s + i.price, 0));

  return h('div', null,
    h('h2', { style: 'color:#0ea5e9;' }, 'Store — proxy تفاعلي عميق'),
    h('p', { style: 'color:#94a3b8;margin-bottom:1rem;' }, 'تعديل أي عمق في الكائن يُحدّث الواجهة تلقائياً'),
    h('div', { style: 'background:#0f172a;padding:1rem;border-radius:8px;margin-bottom:1rem;' },
      h('h3', { style: 'color:#e2e8f0;' }, 'المستخدم'),
      h('p', { style: 'color:#94a3b8;' }, () => `الاسم: ${store.user.name}, العمر: ${store.user.age}`),
      h('button', { onClick: () => store.user.age++, style: 'padding:0.25rem 0.75rem;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;' }, 'زيادة العمر')
    ),
    h('div', { style: 'background:#0f172a;padding:1rem;border-radius:8px;margin-bottom:1rem;' },
      h('h3', { style: 'color:#e2e8f0;' }, 'السلة'),
      store.cart.map(item =>
        h('div', { key: item.id, style: 'display:flex;justify-content:space-between;padding:0.5rem 0;color:#94a3b8;' },
          h('span', null, item.name),
          h('span', null, item.price + ' ر.س')
        )
      ),
      h('div', { style: 'border-top:1px solid #334155;padding-top:0.5rem;display:flex;justify-content:space-between;color:#10b981;font-weight:bold;' },
        h('span', null, 'الإجمالي'),
        h('span', null, () => total() + ' ر.س')
      ),
      h('button', {
        onClick: () => store.cart.push({ id: Date.now(), name: 'منتج جديد', price: Math.floor(Math.random() * 100) }),
        style: 'margin-top:0.5rem;padding:0.5rem 1rem;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;'
      }, '+ إضافة منتج')
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Islands Demo
// ─────────────────────────────────────────────────────────────────────────────
function IslandsDemo() {
  return h('div', null,
    h('h2', { style: 'color:#0ea5e9;' }, 'Islands — zero-hydration'),
    h('p', { style: 'color:#94a3b8;margin-bottom:1rem;' }, 'كل جزيرة تُهيدرات فقط عند الحاجة — باقي الصفحة تبقى HTML ثابت'),
    h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:1rem;' },
      h(Island1),
      h(Island2)
    )
  );
}

const Island1 = island('Island1', () => {
  const count = $state(0);
  return h('div', { 'data-elmoorx-island': 'Island1', style: 'background:#0f172a;padding:1.5rem;border-radius:8px;text-align:center;' },
    h('h3', { style: 'color:#e2e8f0;' }, '🏝️ جزيرة 1'),
    h('p', { style: 'color:#94a3b8;' }, 'هذه الجزيرة تُشغّل JS فقط هنا'),
    h('button', { onClick: () => count.set(c => c + 1), style: 'padding:0.5rem 1rem;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;' }, 'العدد: ', () => count())
  );
});

const Island2 = island('Island2', () => {
  const time = $state(new Date().toLocaleTimeString('ar'));
  $effect(() => {
    const id = setInterval(() => time.set(new Date().toLocaleTimeString('ar')), 1000);
    return () => clearInterval(id);
  });
  return h('div', { 'data-elmoorx-island': 'Island2', style: 'background:#0f172a;padding:1.5rem;border-radius:8px;text-align:center;' },
    h('h3', { style: 'color:#e2e8f0;' }, '🕰️ جزيرة 2'),
    h('p', { style: 'color:#94a3b8;' }, 'ساعة حية — JS يُشغّل فقط هنا'),
    h('div', { style: 'font-size:2rem;color:#10b981;font-family:monospace;' }, () => time())
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Security Demo
// ─────────────────────────────────────────────────────────────────────────────
function SecurityDemo() {
  const input = $state('<script>alert("xss")</script><b>نص آمن</b>');
  const cleaned = $computed(() => sanitize(input()));

  return h('div', null,
    h('h2', { style: 'color:#0ea5e9;' }, 'Security — حماية تلقائية'),
    h('p', { style: 'color:#94a3b8;margin-bottom:1rem;' }, 'كل إدخال يُنظَّف تلقائياً من XSS — جرّب إدخال <script>'),
    h('textarea', {
      value: input(),
      onInput: e => input.set(e.target.value),
      style: 'width:100%;padding:0.75rem;background:#0f172a;border:1px solid #334155;border-radius:6px;color:white;font-family:monospace;min-height:80px;direction:ltr;'
    }),
    h('div', { style: 'margin-top:1rem;' },
      h('h3', { style: 'color:#94a3b8;font-size:0.9rem;' }, 'الإدخال (خطر):'),
      h('pre', { style: 'background:#7f1d1d;padding:0.75rem;border-radius:6px;overflow-x:auto;direction:ltr;color:#fecaca;' }, input())
    ),
    h('div', { style: 'margin-top:1rem;' },
      h('h3', { style: 'color:#94a3b8;font-size:0.9rem;' }, 'بعد التنظيف (آمن):'),
      h('pre', { style: 'background:#064e3b;padding:0.75rem;border-radius:6px;overflow-x:auto;direction:ltr;color:#a7f3d0;' }, cleaned())
    ),
    h('div', { style: 'margin-top:1rem;padding:0.75rem;background:#0f172a;border-radius:6px;' },
      h('span', { style: 'color:#94a3b8;' }, 'المعروض: '),
      $html(cleaned())
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HMR Demo
// ─────────────────────────────────────────────────────────────────────────────
function HMRDemo() {
  return h('div', null,
    h('h2', { style: 'color:#0ea5e9;' }, 'HMR — صفر-زمني'),
    h('p', { style: 'color:#94a3b8;margin-bottom:1rem;' }, 'عدّل أي ملف .tsx وراقب التحديث الفوري عبر WebSocket'),
    h('div', { style: 'background:#0f172a;padding:1.5rem;border-radius:8px;' },
      h('ol', { style: 'color:#94a3b8;line-height:2;padding-right:1.5rem;' },
        h('li', null, 'افتح ', h('code', { style: 'background:#334155;padding:0.25rem 0.5rem;border-radius:4px;color:#0ea5e9;' }, 'src/index.tsx'), ' في محرر'),
        h('li', null, 'غيّر أي نص أو قيمة'),
        h('li', null, 'احفظ الملف'),
        h('li', null, 'شاهد التغيير يظهر فوراً بدون refresh'),
        h('li', null, 'الـ state محفوظ! لا ت فقدان بيانات')
      )
    ),
    h('div', { style: 'margin-top:1rem;background:#064e3b;padding:0.75rem;border-radius:6px;color:#a7f3d0;' },
      '✓ الـ HMR يعمل عبر WebSocket مباشر — لا Vite، لا Webpack، لا esbuild'
    )
  );
}
