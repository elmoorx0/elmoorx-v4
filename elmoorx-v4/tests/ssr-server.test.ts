/**
 * اختبارات SSR Server + JWT + Middleware
 */
import { describe, it, expect } from '@elmoorx/testing';
import { signJWT, verifyJWT } from '../ssr-server/index.mjs';

describe('SSR Server — JWT', () => {
  const secret = 'test-secret-key';

  it('should sign and verify JWT', () => {
    const token = signJWT({ userId: 123, name: 'محمد' }, secret);
    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3);

    const payload = verifyJWT(token, secret);
    expect(payload.userId).toBe(123);
    expect(payload.name).toBe('محمد');
    expect(payload.iat).toBeTruthy();
    expect(payload.exp).toBeTruthy();
  });

  it('should reject invalid token', () => {
    let error = null;
    try { verifyJWT('invalid.token.here', secret); }
    catch (e) { error = e; }
    expect(error).not.toBe(null);
  });

  it('should reject expired token', async () => {
    const token = signJWT({ userId: 1 }, secret, { expiresIn: '1s' });
    // wait 1.5s for expiry
    await new Promise(r => setTimeout(r, 1500));
    let error = null;
    try { verifyJWT(token, secret); }
    catch (e) { error = e; }
    expect(error).not.toBe(null);
    expect(error.message).toContain('expired');
  });

  it('should reject wrong secret', () => {
    const token = signJWT({ userId: 1 }, secret);
    let error = null;
    try { verifyJWT(token, 'wrong-secret'); }
    catch (e) { error = e; }
    expect(error).not.toBe(null);
    expect(error.message).toContain('signature');
  });

  it('should support different expiry formats', () => {
    const token1 = signJWT({ a: 1 }, secret, { expiresIn: '1h' });
    const token2 = signJWT({ a: 1 }, secret, { expiresIn: '30m' });
    const token3 = signJWT({ a: 1 }, secret, { expiresIn: 3600 });

    const p1 = verifyJWT(token1, secret);
    const p2 = verifyJWT(token2, secret);
    const p3 = verifyJWT(token3, secret);

    expect(p1.exp - p1.iat).toBe(3600);
    expect(p2.exp - p2.iat).toBe(1800);
    expect(p3.exp - p3.iat).toBe(3600);
  });
});

describe('SSR Server — exports', () => {
  it('should export startSSRServer function', async () => {
    const { startSSRServer } = await import('../ssr-server/index.mjs');
    expect(typeof startSSRServer).toBe('function');
  });

  it('should export signJWT', () => {
    expect(typeof signJWT).toBe('function');
  });

  it('should export verifyJWT', () => {
    expect(typeof verifyJWT).toBe('function');
  });
});

describe('SSR Server — JWT with auth middleware', () => {
  it('should create token with user data', () => {
    const token = signJWT({ userId: 42, role: 'admin', name: 'أحمد' }, 'secret');
    const payload = verifyJWT(token, 'secret');
    expect(payload.userId).toBe(42);
    expect(payload.role).toBe('admin');
    expect(payload.name).toBe('أحمد');
  });

  it('should handle special characters in payload', () => {
    const token = signJWT({ name: 'محمد علي', email: 'm@example.com' }, 'secret');
    const payload = verifyJWT(token, 'secret');
    expect(payload.name).toBe('محمد علي');
    expect(payload.email).toBe('m@example.com');
  });
});
