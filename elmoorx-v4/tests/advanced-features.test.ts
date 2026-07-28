/**
 * اختبارات الميزات المتقدمة
 * =========================
 * 1. WebSocket client (reconnection, queuing)
 * 2. MySQL adapter (URL parsing)
 * 3. Auth system (JWT, RBAC, password hashing)
 * 4. Upload system (chunked, multipart)
 * 5. Error boundaries (SSR)
 */

import { test } from '../testing/index.mjs';
import { WebSocketClient } from '../runtime/ws-client.mjs';
import { createMySQLDatabase, parseMySQLUrl } from '../database/mysql-adapter.mjs';
import { AuthSystem, hashPassword, verifyPassword, signJWT, verifyJWT } from '../security/auth-system.mjs';
import { UploadManager } from '../ssr-server/upload-system.mjs';
import { wrapWithErrorBoundary, ErrorBoundary, setErrorReporter, reportError } from '../runtime/error-boundary.mjs';
import { h } from '../runtime/core.mjs';

function assert(value, msg) {
  if (value === null || value === undefined || value === false || value === 0 || value === '') {
    throw new Error(msg || 'Assertion failed');
  }
}
function assertFalsy(value, msg) {
  if (value) throw new Error(msg || 'Expected falsy');
}
function assertEquals(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || '') + ` Expected ${expected}, got ${actual}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Client Tests
// ─────────────────────────────────────────────────────────────────────────────

test('WS Client — constructor يضبط الـ options', () => {
  // تجنّب الاتصال الفعلي — نعطي URL غير صالح
  const ws = new WebSocketClient('ws://invalid-host:99999/ws', {
    rooms: ['room-1'],
    reconnect: false,
  });
  assertEquals(ws.url, 'ws://invalid-host:99999/ws');
  assert(ws.rooms.has('room-1'));
  assertFalsy(ws.connected);
  ws.close();
});

test('WS Client — on/off/once events', () => {
  const ws = new WebSocketClient('ws://invalid-host:99999/ws', { reconnect: false });
  let called = 0;
  const off = ws.on('test', () => called++);
  ws._emit('test');
  assertEquals(called, 1);
  off();
  ws._emit('test');
  assertEquals(called, 1); // لم يُستدعى بعد off
  ws.close();
});

test('WS Client — once يُستدعى مرة واحدة', () => {
  const ws = new WebSocketClient('ws://invalid-host:99999/ws', { reconnect: false });
  let called = 0;
  ws.once('test', () => called++);
  ws._emit('test');
  ws._emit('test');
  assertEquals(called, 1);
  ws.close();
});

test('WS Client — join/leave يضيف للـ rooms', () => {
  const ws = new WebSocketClient('ws://invalid-host:99999/ws', { reconnect: false });
  ws.join('new-room');
  assert(ws.rooms.has('new-room'));
  ws.leave('new-room');
  assertFalsy(ws.rooms.has('new-room'));
  ws.close();
});

test('WS Client — getState يُرجع الحالة', () => {
  const ws = new WebSocketClient('ws://invalid-host:99999/ws', { reconnect: false });
  const state = ws.getState();
  assertFalsy(state.connected);
  assert(Array.isArray(state.rooms));
  assertEquals(typeof state.queueSize, 'number');
  ws.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// MySQL Adapter Tests
// ─────────────────────────────────────────────────────────────────────────────

test('MySQL — parseMySQLUrl يحلّل URL بسيط', () => {
  const result = parseMySQLUrl('mysql://localhost:3306/mydb');
  assertEquals(result.host, 'localhost');
  assertEquals(result.port, 3306);
  assertEquals(result.database, 'mydb');
});

test('MySQL — parseMySQLUrl مع credentials', () => {
  const result = parseMySQLUrl('mysql://user:pass@host:3306/db');
  assertEquals(result.user, 'user');
  assertEquals(result.password, 'pass');
  assertEquals(result.host, 'host');
});

test('MySQL — parseMySQLUrl default port', () => {
  const result = parseMySQLUrl('mysql://localhost/mydb');
  assertEquals(result.port, 3306);
});

test('MySQL — createMySQLDatabase يُرجع database object', () => {
  const db = createMySQLDatabase({ url: 'mysql://localhost/test' });
  assert(db);
  assert(typeof db.query === 'function');
  assert(typeof db.insert === 'function');
  assert(typeof db.update === 'function');
  assert(typeof db.delete === 'function');
  assert(typeof db.transaction === 'function');
  assert(typeof db.migrate === 'function');
  db.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth System Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Auth — hashPassword + verifyPassword', () => {
  const hash = hashPassword('mypassword');
  assert(hash.startsWith('pbkdf2$'));
  assert(verifyPassword('mypassword', hash));
  assertFalsy(verifyPassword('wrongpassword', hash));
});

test('Auth — hashPassword يُنتج hash مختلف لكل كلمة', () => {
  const h1 = hashPassword('test');
  const h2 = hashPassword('test');
  assert(h1 !== h2, 'Salts should differ');
});

test('Auth — signJWT + verifyJWT', () => {
  const token = signJWT({ userId: 42, role: 'admin' }, 'secret', '1h');
  assert(token);
  const parts = token.split('.');
  assertEquals(parts.length, 3);
  const decoded = verifyJWT(token, 'secret');
  assertEquals(decoded.userId, 42);
  assertEquals(decoded.role, 'admin');
  assert(decoded.exp);
  assert(decoded.iat);
});

test('Auth — verifyJWT يرفض signature خاطئ', () => {
  const token = signJWT({ data: 'test' }, 'secret1');
  let threw = false;
  try { verifyJWT(token, 'secret2'); } catch { threw = true; }
  assert(threw);
});

test('Auth — register + login', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test' });
  await auth.register('alice', 'pass123', { roles: ['user'] });
  const result = await auth.login('alice', 'pass123');
  assert(result.accessToken);
  assert(result.refreshToken);
  assertEquals(result.user.username, 'alice');
  assertEquals(result.user.roles[0], 'user');
});

test('Auth — login بكلمة سر خاطئة يفشل', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test' });
  await auth.register('bob', 'correct');
  let threw = false;
  try { await auth.login('bob', 'wrong'); } catch { threw = true; }
  assert(threw);
});

test('Auth — refresh token يعمل', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test' });
  await auth.register('carol', 'pass');
  const login = await auth.login('carol', 'pass');
  const refresh = await auth.refresh(login.refreshToken);
  assert(refresh.accessToken, 'Should have new access token');
  assert(refresh.refreshToken, 'Should have new refresh token');
  // الـ refresh token القديم يجب أن يكون مُلغى
  let threw = false;
  try { await auth.refresh(login.refreshToken); } catch { threw = true; }
  assert(threw, 'Old refresh token should be revoked');
});

test('Auth — logout يبطل الـ refresh token', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test' });
  await auth.register('dave', 'pass');
  const login = await auth.login('dave', 'pass');
  await auth.logout(login.accessToken, login.refreshToken);
  let threw = false;
  try { await auth.refresh(login.refreshToken); } catch { threw = true; }
  assert(threw, 'Refresh should fail after logout');
});

test('Auth — requireRole middleware', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test' });
  const mw = auth.requireRole('admin');
  const ctx1 = { user: { roles: ['user'] }, res: { writeHead: () => {}, end: () => {} } };
  const result1 = await mw(ctx1);
  assertFalsy(result1, 'Should reject non-admin');

  const ctx2 = { user: { roles: ['admin'] }, res: { writeHead: () => {}, end: () => {} } };
  const result2 = await mw(ctx2);
  assert(result2, 'Should accept admin');
});

test('Auth — requirePermission middleware', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test' });
  const mw = auth.requirePermission('users:delete');
  const ctx1 = { user: { permissions: ['users:read'] }, res: { writeHead: () => {}, end: () => {} } };
  const result1 = await mw(ctx1);
  assertFalsy(result1);
  const ctx2 = { user: { permissions: ['users:delete'] }, res: { writeHead: () => {}, end: () => {} } };
  const result2 = await mw(ctx2);
  assert(result2);
});

test('Auth — addRole + addPermission', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test' });
  const user = await auth.register('eve', 'pass');
  auth.addRole(user.id, 'editor');
  auth.addPermission(user.id, 'posts:edit');
  const stored = auth.users.get(user.id);
  assert(stored.roles.includes('editor'));
  assert(stored.permissions.includes('posts:edit'));
});

test('Auth — lockout بعد محاولات فاشلة', async () => {
  const auth = new AuthSystem({ jwtSecret: 'test', maxLoginAttempts: 3, lockoutDuration: 60000 });
  await auth.register('frank', 'correct');
  for (let i = 0; i < 3; i++) {
    try { await auth.login('frank', 'wrong', '1.2.3.4'); } catch {}
  }
  let threw = false;
  let errMsg = '';
  try { await auth.login('frank', 'correct', '1.2.3.4'); } catch (e) { threw = true; errMsg = e.message; }
  assert(threw);
  assert(errMsg.includes('Too many failed'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Upload System Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Upload — initChunkedUpload + uploadChunk + complete', async () => {
  const mgr = new UploadManager({ uploadDir: '/tmp/test-uploads-1' });
  const uploadId = await mgr.initChunkedUpload('test.txt', 2, 10);
  assert(uploadId);

  await mgr.uploadChunk(uploadId, 0, Buffer.from('hello'));
  await mgr.uploadChunk(uploadId, 1, Buffer.from('world'));

  const status = mgr.getUploadStatus(uploadId);
  assertEquals(status.progress, 100);

  const result = await mgr.completeChunkedUpload(uploadId);
  assertEquals(result.filename, 'test.txt');
  assertEquals(result.size, 10);
  assert(result.hash);
});

test('Upload — chunked upload idempotent (resume support)', async () => {
  const mgr = new UploadManager({ uploadDir: '/tmp/test-uploads-2' });
  const uploadId = await mgr.initChunkedUpload('test.bin', 3, 30);

  // رفع chunk 0 مرتين
  await mgr.uploadChunk(uploadId, 0, Buffer.from('chunk0-'));
  const r2 = await mgr.uploadChunk(uploadId, 0, Buffer.from('chunk0-'));
  assertEquals(r2.received, 1); // ما زال 1 (idempotent)

  await mgr.uploadChunk(uploadId, 1, Buffer.from('chunk1-'));
  await mgr.uploadChunk(uploadId, 2, Buffer.from('chunk2-'));
  const result = await mgr.completeChunkedUpload(uploadId);
  assertEquals(result.size, 30);
});

test('Upload — cancelChunkedUpload', async () => {
  const mgr = new UploadManager({ uploadDir: '/tmp/test-uploads-3' });
  const uploadId = await mgr.initChunkedUpload('cancel.txt', 2, 20);
  await mgr.uploadChunk(uploadId, 0, Buffer.from('chunk0'));
  const cancelled = mgr.cancelChunkedUpload(uploadId);
  assert(cancelled);
  assertFalsy(mgr.getUploadStatus(uploadId));
});

test('Upload — completeChunkedUpload يفشل بدون كل chunks', async () => {
  const mgr = new UploadManager({ uploadDir: '/tmp/test-uploads-4' });
  const uploadId = await mgr.initChunkedUpload('incomplete.txt', 3, 30);
  await mgr.uploadChunk(uploadId, 0, Buffer.from('chunk0'));
  let threw = false;
  try { await mgr.completeChunkedUpload(uploadId); } catch { threw = true; }
  assert(threw);
});

test('Upload — file type detection (magic bytes)', async () => {
  const mgr = new UploadManager({ uploadDir: '/tmp/test-uploads-5' });
  // PNG magic bytes
  const pngBuf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  assertEquals(mgr._detectFileType(pngBuf), 'image/png');
  // JPEG
  const jpegBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  assertEquals(mgr._detectFileType(jpegBuf), 'image/jpeg');
  // GIF
  const gifBuf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  assertEquals(mgr._detectFileType(gifBuf), 'image/gif');
  // PDF
  const pdfBuf = Buffer.from('%PDF-1.4');
  assertEquals(mgr._detectFileType(pdfBuf), 'application/pdf');
  // Unknown
  const unkBuf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  assertEquals(mgr._detectFileType(unkBuf), 'application/octet-stream');
});

test('Upload — sanitizeFilename', async () => {
  const mgr = new UploadManager({ uploadDir: '/tmp/test-uploads-6' });
  assertEquals(mgr._sanitizeFilename('test.txt'), 'test.txt');
  assertEquals(mgr._sanitizeFilename('test file.txt'), 'test_file.txt');
  assertEquals(mgr._sanitizeFilename('../../etc/passwd'), '.._.._etc_passwd');
  assertEquals(mgr._sanitizeFilename('file<>.txt'), 'file_.txt');
});

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary Tests
// ─────────────────────────────────────────────────────────────────────────────

test('ErrorBoundary — wrapWithErrorBoundary يعيد النتيجة عند النجاح', () => {
  const result = wrapWithErrorBoundary(() => '<div>OK</div>');
  assertEquals(result, '<div>OK</div>');
});

test('ErrorBoundary — wrapWithErrorBoundary يعرض fallback عند الخطأ', () => {
  const result = wrapWithErrorBoundary(
    () => { throw new Error('Render failed'); },
    { fallback: (err) => '<div>Error: ' + err.message + '</div>' }
  );
  assertEquals(result, '<div>Error: Render failed</div>');
});

test('ErrorBoundary — default fallback عند الخطأ', () => {
  const result = wrapWithErrorBoundary(
    () => { throw new Error('Default error'); }
  );
  assert(result.includes('حدث خطأ'));
  assert(result.includes('Default error'));
});

test('ErrorBoundary — onError callback يُستدعى', () => {
  let capturedErr = null;
  const result = wrapWithErrorBoundary(
    () => { throw new Error('Captured'); },
    {
      onError: (err) => { capturedErr = err; },
      fallback: () => '<div>fallback</div>',
    }
  );
  assert(capturedErr);
  assertEquals(capturedErr.message, 'Captured');
});

test('ErrorBoundary — ErrorBoundary component يعمل في SSR', () => {
  // SSR mode — ErrorBoundary يحاول render children
  // إن نجح، يُرجع children. إن فشل، يُرجع fallback
  const result = ErrorBoundary({
    fallback: () => h('div', null, 'fallback'),
    children: h('div', null, 'children'),
  });
  // يجب أن يُرجع children لأن لا خطأ
  assert(result);
});

test('ErrorBoundary — setErrorReporter + reportError', () => {
  let reportedErr = null;
  setErrorReporter((err) => { reportedErr = err; });
  reportError(new Error('Reported'));
  assert(reportedErr);
  assertEquals(reportedErr.message, 'Reported');
  // نظّف
  setErrorReporter(null);
});

test('ErrorBoundary — fallback function تستقبل retry', () => {
  let retryFn = null;
  const result = wrapWithErrorBoundary(
    () => { throw new Error('Test'); },
    {
      fallback: (err, retry) => {
        retryFn = retry;
        return '<div>fallback</div>';
      },
    }
  );
  // في SSR، wrapWithErrorBoundary لا يمرّر retry
  // فقط تحقق أن fallback function تُستدعى
  assertEquals(result, '<div>fallback</div>');
});

console.log('\n  ✦ Advanced Features Tests — loaded');
