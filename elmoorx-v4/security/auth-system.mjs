/**
 * Elmoorx v4 — Advanced Auth System (JWT Refresh + RBAC، بدون تبعيات)
 * =================================================================
 * نظام مصادقة كامل مع:
 *   - JWT access tokens (قصيرة المدة)
 *   - Refresh tokens (طويلة المدة، قابلة للإلغاء)
 *   - Role-Based Access Control (RBAC)
 *   - Permission-based authorization
 *   - Token blacklisting (للإلغاء الفوري)
 *   - Password hashing (PBKDF2)
 *   - Rate limiting للمحاولات الفاشلة
 *
 * الاستخدام:
 *   import { AuthSystem } from './auth-system.mjs';
 *   const auth = new AuthSystem({ jwtSecret: '...', refreshSecret: '...' });
 *
 *   // login
 *   const { accessToken, refreshToken } = await auth.login(username, password);
 *
 *   // verify middleware
 *   server.use(auth.middleware());
 *
 *   // RBAC
 *   server.use(auth.requireRole('admin'));
 *   server.use(auth.requirePermission('users:delete'));
 */

import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { EventEmitter } from 'node:events';

// ─────────────────────────────────────────────────────────────────────────────
// 1) JWT UTILITIES (مُحسّنة مع refresh tokens)
// ─────────────────────────────────────────────────────────────────────────────

function base64UrlEncode(s) {
  return Buffer.from(s).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64').toString('utf8');
}

function hmacSign(data, secret) {
  return createHmac('sha256', secret).update(data).digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signJWT(payload, secret, expiresIn = '15m') {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + parseExpiry(expiresIn) };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(body));
  const sig = hmacSign(`${headerB64}.${payloadB64}`, secret);
  return `${headerB64}.${payloadB64}.${sig}`;
}

function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [headerB64, payloadB64, sig] = parts;
  const expectedSig = hmacSign(`${headerB64}.${payloadB64}`, secret);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(base64UrlDecode(payloadB64));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

function parseExpiry(s) {
  if (typeof s === 'number') return s;
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 900; // 15 min default
  return parseInt(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2]];
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) PASSWORD HASHING (PBKDF2)
// ─────────────────────────────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function hashPassword(password) {
  const salt = randomBytes(32);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1]);
  const salt = Buffer.from(parts[2], 'hex');
  const storedHash = Buffer.from(parts[3], 'hex');
  const hash = pbkdf2Sync(password, salt, iterations, storedHash.length, PBKDF2_DIGEST);
  return timingSafeEqual(hash, storedHash);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) AUTH SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export class AuthSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    this.jwtSecret = options.jwtSecret || randomBytes(32).toString('hex');
    this.refreshSecret = options.refreshSecret || randomBytes(32).toString('hex');
    this.accessTokenExpiry = options.accessTokenExpiry || '15m'; // 15 minutes
    this.refreshTokenExpiry = options.refreshTokenExpiry || '7d';  // 7 days
    this.maxLoginAttempts = options.maxLoginAttempts || 5;
    this.lockoutDuration = options.lockoutDuration || 15 * 60 * 1000; // 15 min

    // تخزين الـ refresh tokens (في الإنتاج: استخدم Redis)
    this.refreshTokens = new Map(); // tokenHash → { userId, expires, revoked }
    // تخزين الـ blacklisted access tokens
    this.blacklist = new Set();
    // تتبّع محاولات الدخول الفاشلة
    this.loginAttempts = new Map(); // ip → { count, lockedUntil }
    // المستخدمون (في الإنتاج: استخدم DB)
    this.users = new Map(); // userId → { id, username, passwordHash, roles, permissions }
  }

  /**
   * يسجّل مستخدم جديد
   */
  async register(username, password, options = {}) {
    if (this._findUserByUsername(username)) {
      throw new Error('Username already exists');
    }
    const userId = randomBytes(16).toString('hex');
    const user = {
      id: userId,
      username,
      passwordHash: hashPassword(password),
      roles: options.roles || ['user'],
      permissions: options.permissions || [],
      createdAt: Date.now(),
    };
    this.users.set(userId, user);
    this.emit('register', user);
    return { id: userId, username, roles: user.roles };
  }

  /**
   * تسجيل الدخول
   */
  async login(username, password, ip = 'unknown') {
    // تحقق من lockout
    if (this._isLocked(ip)) {
      const remaining = this._lockoutRemaining(ip);
      throw new Error(`Too many failed attempts. Try again in ${Math.ceil(remaining / 1000)}s`);
    }

    const user = this._findUserByUsername(username);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      this._recordFailedAttempt(ip);
      this.emit('login_failed', { username, ip });
      throw new Error('Invalid credentials');
    }

    // أعد تعيين محاولات الفشل
    this.loginAttempts.delete(ip);

    // أنشئ tokens
    const accessToken = this._createAccessToken(user);
    const refreshToken = this._createRefreshToken(user);

    this.emit('login', { user, ip });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, roles: user.roles, permissions: user.permissions },
    };
  }

  /**
   * تجديد الـ access token باستخدام refresh token
   */
  async refresh(refreshToken) {
    const tokenHash = this._hashToken(refreshToken);
    const stored = this.refreshTokens.get(tokenHash);

    if (!stored || stored.revoked || stored.expires < Date.now()) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = this.users.get(stored.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // ألغِ الـ refresh token القديم (rotation)
    this.refreshTokens.delete(tokenHash);

    // أنشئ tokens جديدة
    const newAccessToken = this._createAccessToken(user);
    const newRefreshToken = this._createRefreshToken(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user.id, username: user.username, roles: user.roles, permissions: user.permissions },
    };
  }

  /**
   * تسجيل الخروج (إلغاء refresh token + blacklist access token)
   */
  async logout(accessToken, refreshToken = null) {
    // أضف access token للـ blacklist
    try {
      const payload = verifyJWT(accessToken, this.jwtSecret);
      this.blacklist.add(accessToken);
      // نظّف الـ blacklist من الـ tokens المنتهية
      if (Math.random() < 0.1) this._cleanupBlacklist();
    } catch {}

    // ألغِ refresh token
    if (refreshToken) {
      const tokenHash = this._hashToken(refreshToken);
      this.refreshTokens.delete(tokenHash);
    }

    this.emit('logout');
  }

  /**
   * إلغاء كل refresh tokens لمستخدم (إجباري إعادة الدخول)
   */
  async revokeAllTokens(userId) {
    for (const [tokenHash, stored] of this.refreshTokens) {
      if (stored.userId === userId) {
        this.refreshTokens.delete(tokenHash);
      }
    }
  }

  /**
   * ميدلوير للتحقق من الـ access token
   */
  middleware(options = {}) {
    const { unless = [] } = options;
    return async (ctx) => {
      const path = ctx.url.pathname;
      if (unless.some(p => path.startsWith(p) || path === p)) return true;

      const authHeader = ctx.req.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        if (path.startsWith('/api/')) {
          ctx.res.writeHead(401, { 'Content-Type': 'application/json' });
          ctx.res.end(JSON.stringify({ error: 'Missing token' }));
          return false;
        }
        return true;
      }

      const token = authHeader.slice(7);
      try {
        // تحقق من blacklist
        if (this.blacklist.has(token)) {
          throw new Error('Token revoked');
        }
        const payload = verifyJWT(token, this.jwtSecret);
        ctx.user = payload;
        ctx.state.user = payload;
        return true;
      } catch (err) {
        if (path.startsWith('/api/')) {
          ctx.res.writeHead(401, { 'Content-Type': 'application/json' });
          ctx.res.end(JSON.stringify({ error: 'Invalid token', message: err.message }));
          return false;
        }
        return true;
      }
    };
  }

  /**
   * ميدلوير يتطلب role محدّد
   */
  requireRole(...roles) {
    return async (ctx) => {
      if (!ctx.user) {
        ctx.res.writeHead(401, { 'Content-Type': 'application/json' });
        ctx.res.end(JSON.stringify({ error: 'Unauthorized' }));
        return false;
      }
      const userRoles = ctx.user.roles || [];
      const hasRole = roles.some(r => userRoles.includes(r));
      if (!hasRole) {
        ctx.res.writeHead(403, { 'Content-Type': 'application/json' });
        ctx.res.end(JSON.stringify({ error: 'Insufficient role', required: roles }));
        return false;
      }
      return true;
    };
  }

  /**
   * ميدلوير يتطلب permission محدّد
   */
  requirePermission(...permissions) {
    return async (ctx) => {
      if (!ctx.user) {
        ctx.res.writeHead(401, { 'Content-Type': 'application/json' });
        ctx.res.end(JSON.stringify({ error: 'Unauthorized' }));
        return false;
      }
      const userPerms = ctx.user.permissions || [];
      const hasPerm = permissions.some(p => userPerms.includes(p));
      if (!hasPerm) {
        ctx.res.writeHead(403, { 'Content-Type': 'application/json' });
        ctx.res.end(JSON.stringify({ error: 'Insufficient permissions', required: permissions }));
        return false;
      }
      return true;
    };
  }

  /**
   * يتحقق من role للمستخدم الحالي
   */
  hasRole(ctx, role) {
    return ctx.user?.roles?.includes(role) || false;
  }

  /**
   * يتحقق من permission للمستخدم الحالي
   */
  hasPermission(ctx, permission) {
    return ctx.user?.permissions?.includes(permission) || false;
  }

  /**
   * يضيف role لمستخدم
   */
  addRole(userId, role) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    if (!user.roles.includes(role)) {
      user.roles.push(role);
      this.emit('role_added', { userId, role });
    }
  }

  /**
   * يضيف permission لمستخدم
   */
  addPermission(userId, permission) {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    if (!user.permissions.includes(permission)) {
      user.permissions.push(permission);
      this.emit('permission_added', { userId, permission });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private methods
  // ─────────────────────────────────────────────────────────────────────────

  _createAccessToken(user) {
    return signJWT({
      userId: user.id,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
      type: 'access',
    }, this.jwtSecret, this.accessTokenExpiry);
  }

  _createRefreshToken(user) {
    // أضف random nonce لجعل كل refresh token فريداً (حتى لو نُشئ في نفس الثانية)
    const token = signJWT({
      userId: user.id,
      type: 'refresh',
      jti: randomBytes(16).toString('hex'), // unique ID
    }, this.refreshSecret, this.refreshTokenExpiry);

    // خزّن hash فقط (للأمان)
    const tokenHash = this._hashToken(token);
    this.refreshTokens.set(tokenHash, {
      userId: user.id,
      expires: Date.now() + parseExpiry(this.refreshTokenExpiry) * 1000,
      revoked: false,
    });

    return token;
  }

  _hashToken(token) {
    return createHmac('sha256', this.refreshSecret).update(token).digest('hex');
  }

  _findUserByUsername(username) {
    for (const user of this.users.values()) {
      if (user.username === username) return user;
    }
    return null;
  }

  _isLocked(ip) {
    const attempts = this.loginAttempts.get(ip);
    if (!attempts) return false;
    if (attempts.count < this.maxLoginAttempts) return false;
    return Date.now() < attempts.lockedUntil;
  }

  _lockoutRemaining(ip) {
    const attempts = this.loginAttempts.get(ip);
    if (!attempts) return 0;
    return Math.max(0, attempts.lockedUntil - Date.now());
  }

  _recordFailedAttempt(ip) {
    const attempts = this.loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
    attempts.count++;
    if (attempts.count >= this.maxLoginAttempts) {
      attempts.lockedUntil = Date.now() + this.lockoutDuration;
    }
    this.loginAttempts.set(ip, attempts);
  }

  _cleanupBlacklist() {
    // أزل الـ tokens المنتهية من الـ blacklist
    for (const token of this.blacklist) {
      try {
        const payload = verifyJWT(token, this.jwtSecret);
        // إذا لم يرمِ خطأ، فالـ token لم ينتهِ بعد
      } catch {
        this.blacklist.delete(token);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createAuthSystem(options = {}) {
  return new AuthSystem(options);
}

export { signJWT, verifyJWT, hashPassword, verifyPassword, parseExpiry };

export default { AuthSystem, createAuthSystem, signJWT, verifyJWT, hashPassword, verifyPassword };
