
export default function Home() {
  return {
    tag: 'div',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: { style: 'color:#0ea5e9;' }, children: ['Elmoorx v4 Blog'] },
      { tag: 'p', props: {}, children: ['مثال blog إنتاجي كامل'] },
      { tag: 'ul', props: {}, children: [
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/post/welcome' }, children: ['Welcome to Elmoorx v4'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/post/ssr' }, children: ['SSR Best Practices'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/post/jwt' }, children: ['JWT Auth Guide'] }] },
      ]},
      { tag: 'hr', props: {}, children: [] },
      { tag: 'h3', props: {}, children: ['API'] },
      { tag: 'ul', props: {}, children: [
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/docs' }, children: ['Swagger UI'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/openapi.json' }, children: ['OpenAPI Spec'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/health' }, children: ['Health Check'] }] },
        { tag: 'li', props: {}, children: [{ tag: 'a', props: { href: '/metrics' }, children: ['Metrics'] }] },
      ]},
    ]
  };
}
