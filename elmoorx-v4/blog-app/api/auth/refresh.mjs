
export async function POST({ body, ctx }) {
  const { refreshToken } = body;
  if (!refreshToken) return { status: 400, body: { error: 'Missing refresh token' } };
  try {
    const result = await ctx.auth.refresh(refreshToken);
    return { status: 200, body: result };
  } catch (err) {
    return { status: 401, body: { error: err.message } };
  }
}
