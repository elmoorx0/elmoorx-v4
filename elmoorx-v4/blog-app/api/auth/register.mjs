
import { auth } from '../../lib/auth.mjs';
export async function POST({ body }) {
  const { username, password } = body;
  if (!username || !password) return { status: 400, body: { error: 'Missing credentials' } };
  if (password.length < 6) return { status: 400, body: { error: 'Password too short' } };
  try {
    const user = await auth.register(username, password, { roles: ['user'] });
    const login = await auth.login(username, password);
    return { status: 201, body: login };
  } catch (err) {
    return { status: 400, body: { error: err.message } };
  }
}
