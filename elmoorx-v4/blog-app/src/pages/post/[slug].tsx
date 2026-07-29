
export default function PostPage({ params }) {
  return {
    tag: 'article',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: {}, children: ['Post: ' + (params?.slug || 'unknown')] },
      { tag: 'p', props: {}, children: ['This is a dynamic post page'] },
      { tag: 'a', props: { href: '/' }, children: ['← Back'] },
    ]
  };
}
