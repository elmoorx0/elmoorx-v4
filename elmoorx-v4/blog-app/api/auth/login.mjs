
export async function POST({ body, ctx }) {
  const { username, password } = body;
  if (!username || !password) return { status: 400, body: { error: 'Missing credentials' } };
  try {
    const result = await ctx.auth.login(username, password, ctx.req.socket.remoteAddress);
    return { status: 200, body: result };
  } catch (err) {
    return { status: 401, body: { error: err.message } };
  }
}
