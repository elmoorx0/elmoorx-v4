
const posts = [
  { id: 1, title: 'Welcome to Elmoorx v4', slug: 'welcome', content: 'Elmoorx v4 is a production-ready web framework...', excerpt: 'Introduction', author: 'admin', coverImage: '', publishedAt: '2026-07-20', tags: ['tutorial'] },
  { id: 2, title: 'SSR Best Practices', slug: 'ssr', content: 'SSR tips...', excerpt: 'SSR', author: 'admin', coverImage: '', publishedAt: '2026-07-21', tags: ['ssr'] },
  { id: 3, title: 'JWT Auth Guide', slug: 'jwt', content: 'JWT auth...', excerpt: 'Auth', author: 'admin', coverImage: '', publishedAt: '2026-07-22', tags: ['security'] },
];

export async function GET({ query }) {
  const page = parseInt(query.page || '1');
  const limit = Math.min(parseInt(query.limit || '10'), 100);
  const start = (page - 1) * limit;
  return {
    status: 200,
    body: {
      posts: posts.slice(start, start + limit),
      total: posts.length,
      page,
      limit,
    },
  };
}

export async function POST({ body, ctx, user }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const { title, content, excerpt, tags } = body;
  if (!title || !content) return { status: 400, body: { error: 'Missing title or content' } };
  const post = {
    id: posts.length + 1,
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    content,
    excerpt: excerpt || content.slice(0, 100),
    author: user.username,
    coverImage: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    tags: tags || [],
  };
  posts.push(post);
  return { status: 201, body: post };
}
