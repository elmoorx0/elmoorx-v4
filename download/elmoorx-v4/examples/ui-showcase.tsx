/**
 * مثال: تطبيق UI Showcase — يعرض كل مكونات Elmoorx UI
 */
import { h, $state, $computed } from '@elmoorx/runtime';
import {
  Button, Input, Textarea, Select, Checkbox, Radio, Switch,
  Card, Badge, Alert, Modal, toast, ToastContainer,
  Spinner, Progress, Avatar, Table, Tabs, Accordion, Dropdown,
  Skeleton, Divider, Stack, Grid,
} from '@elmoorx/ui';

export default function App() {
  const section = $state('buttons');
  const modalOpen = $state(false);

  return h('div', { style: 'font-family:system-ui;background:#0f172a;color:#e2e8f0;min-height:100vh;' },
    h('header', { style: 'background:#1e293b;padding:1.5rem 2rem;border-bottom:1px solid #334155;' },
      h('h1', { style: 'color:#0ea5e9;margin:0;font-size:1.5rem;' }, '✦ Elmoorx UI Components'),
      h('p', { style: 'color:#94a3b8;margin:0.25rem 0 0;font-size:0.9rem;' }, '25+ مكون جاهز للاستخدام بدون تبعيات')
    ),

    h('nav', { style: 'display:flex;gap:0.5rem;padding:1rem 2rem;background:#1e293b;border-bottom:1px solid #334155;flex-wrap:wrap;' },
      [
        ['buttons', 'أزرار'], ['inputs', 'حقول'], ['feedback', 'تنبيهات'],
        ['data', 'بيانات'], ['layout', 'تخطيط'], ['overlay', 'نوافذ'],
      ].map(([key, label]) =>
        h('button', {
          key,
          onClick: () => section.set(key),
          style: section() === key
            ? 'padding:0.4rem 0.8rem;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;'
            : 'padding:0.4rem 0.8rem;background:#0f172a;color:#94a3b8;border:1px solid #334155;border-radius:4px;cursor:pointer;',
        }, label)
      )
    ),

    h('main', { style: 'max-width:1000px;margin:0 auto;padding:2rem;' },
      section() === 'buttons' && h(ButtonsSection),
      section() === 'inputs' && h(InputsSection),
      section() === 'feedback' && h(FeedbackSection),
      section() === 'data' && h(DataSection),
      section() === 'layout' && h(LayoutSection),
      section() === 'overlay' && h(OverlaySection, { modalOpen }),
    ),

    h(ToastContainer)
  );
}

function ButtonsSection() {
  return h('div', null,
    h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'Buttons'),
    h(Card, { title: 'Variants' },
      h(Stack, { direction: 'horizontal', gap: 'sm', wrap: 'wrap' },
        h(Button, { variant: 'primary' }, 'Primary'),
        h(Button, { variant: 'secondary' }, 'Secondary'),
        h(Button, { variant: 'success' }, 'Success'),
        h(Button, { variant: 'warning' }, 'Warning'),
        h(Button, { variant: 'danger' }, 'Danger'),
        h(Button, { variant: 'ghost' }, 'Ghost'),
        h(Button, { variant: 'outline' }, 'Outline'),
      )
    ),
    h(Card, { title: 'Sizes', style: 'margin-top:1rem;' },
      h(Stack, { direction: 'horizontal', gap: 'sm', align: 'center' },
        h(Button, { size: 'sm' }, 'Small'),
        h(Button, { size: 'md' }, 'Medium'),
        h(Button, { size: 'lg' }, 'Large'),
      )
    ),
    h(Card, { title: 'States', style: 'margin-top:1rem;' },
      h(Stack, { direction: 'horizontal', gap: 'sm' },
        h(Button, { loading: true }, 'Loading'),
        h(Button, { disabled: true }, 'Disabled'),
        h(Button, { icon: '✓' }, 'With Icon'),
      )
    ),
  );
}

function InputsSection() {
  return h('div', null,
    h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'Form Inputs'),
    h(Card, null,
      h(Input, { label: 'الاسم', placeholder: 'اكتب اسمك' }),
      h(Input, { label: 'بريد إلكتروني', type: 'email', icon: '✉', hint: 'لن نشاركه مع أحد' }),
      h(Input, { label: 'بخطأ', error: 'هذا الحقل مطلوب' }),
      h(Textarea, { label: 'رسالتك', placeholder: 'اكتب رسالتك هنا...' }),
      h(Select, {
        label: 'البلد',
        placeholder: 'اختر بلدك',
        options: [
          { value: 'sa', label: 'السعودية' },
          { value: 'eg', label: 'مصر' },
          { value: 'ae', label: 'الإمارات' },
        ],
      }),
      h(Stack, { direction: 'horizontal', gap: 'md' },
        h(Checkbox, { label: 'أوافق على الشروط' }),
        h(Switch, { label: 'تفعيل الإشعارات' }),
      ),
      h(Stack, { direction: 'horizontal', gap: 'md' },
        h(Radio, { name: 'gender', value: 'male', label: 'ذكر' }),
        h(Radio, { name: 'gender', value: 'female', label: 'أنثى' }),
      ),
    ),
  );
}

function FeedbackSection() {
  return h('div', null,
    h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'Feedback'),
    h(Card, { title: 'Alerts' },
      h(Alert, { variant: 'info', title: 'معلومة', onClose: () => {} }, 'هذا تنبيه معلوماتي.' ),
      h(Alert, { variant: 'success' }, 'تم الحفظ بنجاح!'),
      h(Alert, { variant: 'warning', title: 'تحذير' }, 'تحقق من البيانات.'),
      h(Alert, { variant: 'danger' }, 'حدث خطأ ما.'),
    ),
    h(Card, { title: 'Badges', style: 'margin-top:1rem;' },
      h(Stack, { direction: 'horizontal', gap: 'sm' },
        h(Badge, { variant: 'default' }, 'Default'),
        h(Badge, { variant: 'primary' }, 'Primary'),
        h(Badge, { variant: 'success', dot: true }, 'Online'),
        h(Badge, { variant: 'warning' }, 'Pending'),
        h(Badge, { variant: 'danger' }, 'Error'),
      )
    ),
    h(Card, { title: 'Toast & Progress', style: 'margin-top:1rem;' },
      h(Stack, { direction: 'horizontal', gap: 'sm' },
        h(Button, { onClick: () => toast.success('نجاح!') }, 'Toast Success'),
        h(Button, { variant: 'danger', onClick: () => toast.error('خطأ!') }, 'Toast Error'),
        h(Button, { variant: 'warning', onClick: () => toast.warning('تحذير!') }, 'Toast Warning'),
      ),
      h(Progress, { value: 75, showLabel: true, style: 'margin-top:1rem;' }),
      h(Progress, { value: 40, variant: 'success', style: 'margin-top:0.5rem;' }),
      h(Stack, { direction: 'horizontal', gap: 'md', align: 'center', style: 'margin-top:1rem;' },
        h(Spinner, { size: 24 }),
        h(Spinner, { size: 32, color: '#10b981' }),
        h(Spinner, { size: 40, color: '#f59e0b' }),
      ),
    ),
  );
}

function DataSection() {
  const columns = [
    { key: 'name', label: 'الاسم' },
    { key: 'age', label: 'العمر' },
    { key: 'city', label: 'المدينة' },
  ];
  const data = [
    { name: 'محمد', age: 30, city: 'الرياض' },
    { name: 'فاطمة', age: 25, city: 'جدة' },
    { name: 'أحمد', age: 35, city: 'الدمام' },
  ];

  return h('div', null,
    h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'Data Display'),
    h(Card, { title: 'Table' }, h(Table, { columns, data, striped: true, hoverable: true })),
    h(Card, { title: 'Tabs', style: 'margin-top:1rem;' },
      h(Tabs, {
        tabs: [
          { label: 'الأول', content: h('p', { style: 'color:#94a3b8;' }, 'محتوى التبويب الأول') },
          { label: 'الثاني', content: h('p', { style: 'color:#94a3b8;' }, 'محتوى التبويب الثاني') },
          { label: 'الثالث', content: h('p', { style: 'color:#94a3b8;' }, 'محتوى التبويب الثالث') },
        ],
      })
    ),
    h(Card, { title: 'Accordion', style: 'margin-top:1rem;' },
      h(Accordion, {
        items: [
          { title: 'ما هو Elmoorx؟', content: 'إطار عمل ويب مستقل عن npm.' },
          { title: 'كيف أبدأ؟', content: 'انسخ الـ repo وشغّل ./elmoorx dev' },
          { title: 'هل يدعم RTL؟', content: 'نعم، بشكل أصلي.' },
        ],
      })
    ),
    h(Card, { title: 'Avatars', style: 'margin-top:1rem;' },
      h(Stack, { direction: 'horizontal', gap: 'md', align: 'center' },
        h(Avatar, { name: 'محمد علي', size: 40 }),
        h(Avatar, { name: 'فاطمة', size: 48, variant: 'rounded' }),
        h(Avatar, { name: 'A B', size: 56, variant: 'square' }),
      )
    ),
  );
}

function LayoutSection() {
  return h('div', null,
    h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'Layout'),
    h(Card, { title: 'Grid' },
      h(Grid, { cols: 3, gap: 'md' },
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:4px;text-align:center;' }, '1'),
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:4px;text-align:center;' }, '2'),
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:4px;text-align:center;' }, '3'),
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:4px;text-align:center;' }, '4'),
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:4px;text-align:center;' }, '5'),
        h('div', { style: 'background:#0f172a;padding:1rem;border-radius:4px;text-align:center;' }, '6'),
      )
    ),
    h(Card, { title: 'Divider', style: 'margin-top:1rem;' },
      h('p', { style: 'color:#94a3b8;' }, 'محتوى علوي'),
      h(Divider, { label: 'أو' }),
      h('p', { style: 'color:#94a3b8;' }, 'محتوى سفلي'),
    ),
    h(Card, { title: 'Skeleton', style: 'margin-top:1rem;' },
      h(Skeleton, { width: '60%', height: '1.5rem' }),
      h(Skeleton, { width: '100%', height: '1rem', style: 'margin-top:0.5rem;' }),
      h(Skeleton, { width: '80%', height: '1rem', style: 'margin-top:0.5rem;' }),
    ),
  );
}

function OverlaySection({ modalOpen }) {
  return h('div', null,
    h('h2', { style: 'color:#e2e8f0;margin-bottom:1rem;' }, 'Overlays'),
    h(Card, { title: 'Modal' },
      h(Button, { onClick: () => modalOpen.set(true) }, 'افتح Modal'),
      h(Modal, {
        open: modalOpen(),
        onClose: () => modalOpen.set(false),
        title: 'عنوان النافذة',
        footer: [
          h(Button, { variant: 'secondary', onClick: () => modalOpen.set(false) }, 'إغلاق'),
          h(Button, { onClick: () => { toast.success('تم الحفظ!'); modalOpen.set(false); } }, 'حفظ'),
        ],
      },
        h('p', { style: 'color:#94a3b8;' }, 'هذه نافذة منبثقة. يمكن وضع أي محتوى هنا.'),
        h(Input, { label: 'اسم', placeholder: '...' })
      )
    ),
    h(Card, { title: 'Dropdown', style: 'margin-top:1rem;' },
      h(Dropdown, {
        trigger: h(Button, { variant: 'secondary' }, 'القائمة ▼'),
        items: [
          { label: 'تعديل', icon: '✎', onClick: () => toast.info('تعديل') },
          { label: 'نسخ', icon: '⎘', onClick: () => toast.info('نسخ') },
          { label: 'حذف', icon: '🗑', danger: true, onClick: () => toast.error('حذف') },
        ],
      })
    ),
  );
}
