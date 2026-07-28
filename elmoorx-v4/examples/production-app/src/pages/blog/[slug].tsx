
export default function BlogPost({ params }) {
  const slug = params?.slug || 'unknown';
  return {
    tag: 'article',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: {}, children: ['Blog Post: ' + slug] },
      { tag: 'p', props: { style: 'color:#64748b;' }, children: ['هذه صفحة ديناميكية تستخدم :slug parameter'] },
      { tag: 'a', props: { href: '/', style: 'color:#0ea5e9;' }, children: ['← العودة للرئيسية'] }
    ]
  };
}
