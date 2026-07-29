
export default function LoginPage() {
  return {
    tag: 'div',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:400px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: {}, children: ['Login'] },
      { tag: 'form', props: { method: 'POST', action: '/api/auth/login' }, children: [
        { tag: 'input', props: { type: 'text', name: 'username', placeholder: 'Username' }, children: [] },
        { tag: 'br', props: {}, children: [] },
        { tag: 'input', props: { type: 'password', name: 'password', placeholder: 'Password' }, children: [] },
        { tag: 'br', props: {}, children: [] },
        { tag: 'button', props: { type: 'submit' }, children: ['Login'] },
      ]},
    ]
  };
}
