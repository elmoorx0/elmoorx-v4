import { h, $state, $effect } from '@elmoorx/runtime';

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
