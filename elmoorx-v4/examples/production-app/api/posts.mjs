
export async function GET({ query }) {
  const posts = [
    { id: 1, title: 'مرحباً بك في Elmoorx v4', slug: 'welcome' },
    { id: 2, title: 'SSR جاهز للإنتاج', slug: 'ssr' },
    { id: 3, title: 'JWT Auth Guide', slug: 'jwt' }
  ];
  return {
    status: 200,
    body: { posts, count: posts.length, query }
  };
}
