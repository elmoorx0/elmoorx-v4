
export async function POST({ req, user, ctx }) {
  if (!user) return { status: 401, body: { error: 'Unauthorized' } };
  const result = await ctx.uploader.handleRequest(req, null, ctx);
  if (result === null) return { status: 400, body: { error: 'Upload failed' } };
  return { status: 201, body: result };
}
