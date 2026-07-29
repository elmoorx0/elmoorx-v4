
const posts = [
  { id: 1, title: 'Welcome to Elmoorx v4', slug: 'welcome', content: 'Elmoorx v4 is a production-ready web framework...', excerpt: 'Introduction', author: 'admin', coverImage: '', publishedAt: '2026-07-20', tags: ['tutorial'] },
  { id: 2, title: 'SSR Best Practices', slug: 'ssr', content: 'SSR tips...', excerpt: 'SSR', author: 'admin', coverImage: '', publishedAt: '2026-07-21', tags: ['ssr'] },
  { id: 3, title: 'JWT Auth Guide', slug: 'jwt', content: 'JWT auth...', excerpt: 'Auth', author: 'admin', coverImage: '', publishedAt: '2026-07-22', tags: ['security'] },
];

export async function GET({ params }) {
  const post = posts.find(p => p.id === parseInt(params.id));
  if (!post) return { status: 404, body: { error: 'Post not found' } };
  return { status: 200, body: post };
}

export async function PUT({ params, body, user }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const post = posts.find(p => p.id === parseInt(params.id));
  if (!post) return { status: 404, body: { error: 'Post not found' } };
  Object.assign(post, body);
  return { status: 200, body: post };
}

export async function DELETE({ params, user }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const idx = posts.findIndex(p => p.id === parseInt(params.id));
  if (idx === -1) return { status: 404, body: { error: 'Post not found' } };
  posts.splice(idx, 1);
  return { status: 204, body: {} };
}
