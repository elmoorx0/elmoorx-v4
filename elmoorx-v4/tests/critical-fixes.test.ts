/**
 * اختبارات الإصلاحات الحرجة الأربعة
 * ================================
 * 1. TS Compiler (object literals, ternaries)
 * 2. Redis client (URL parsing, RESP encoding)
 * 3. WebSocket (frame encoding, rooms)
 * 4. SQL adapter (URL parsing, query builder)
 */

import { test } from '../testing/index.mjs';
import { compile, stripTypes } from '../compiler/index.mjs';
import { createRedisClient, parseRedisUrl, encode, parseReply } from '../ssr-server/redis-client.mjs';
import { WebSocketServer, WebSocketClient, encodeFrame, decodeFrame } from '../ssr-server/ws-server.mjs';
import { createSQLDatabase, parseSQLUrl, SQLDatabase } from '../database/sql-adapter.mjs';

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
// TS Compiler Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Compiler — object literal { x: null } لا يُفسد', () => {
  const code = 'const obj = { x: null, y: "hello" };';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const obj = { x: null, y: "hello" };');
});

test('Compiler — ternary مع function call لا يُفسد', () => {
  const code = 'const buf = isBuf ? chunk : Buffer.from(chunk);';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const buf = isBuf ? chunk : Buffer.from(chunk);');
});

test('Compiler — object literal مع nested objects', () => {
  const code = 'const obj = { a: { b: { c: 1 } } };';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const obj = { a: { b: { c: 1 } } };');
});

test('Compiler — object literal مع method', () => {
  const code = 'const obj = { fn(x) { return x; } };';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const obj = { fn(x) { return x; } };');
});

test('Compiler — object literal مع arrow function value', () => {
  const code = 'const obj = { handler: () => true };';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const obj = { handler: () => true };');
});

test('Compiler — object literal مع array value', () => {
  const code = 'const obj = { items: [1, 2, 3] };';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const obj = { items: [1, 2, 3] };');
});

test('Compiler — type annotations تُزال من variable declarations', () => {
  const code = 'const x: number = 42;';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const x = 42;');
});

test('Compiler — type annotations تُزال من function parameters', () => {
  const code = 'function fn(a: string, b: number): void {}';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'function fn(a, b) {}');
});

test('Compiler — return type يُزال قبل =>', () => {
  const code = 'const fn = (x: number): string => x.toString();';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const fn = (x) => x.toString();');
});

test('Compiler — generic type annotations', () => {
  const code = 'const arr: Array<number> = [1, 2, 3];';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const arr = [1, 2, 3];');
});

test('Compiler — interface يُزال بالكامل', () => {
  const code = 'interface Foo { x: number; bar(): void; }';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, '');
});

test('Compiler — type alias يُزال', () => {
  const code = 'type UserID = string;';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, '');
});

test('Compiler — as cast يُزال', () => {
  const code = 'const x = obj as MyType;';
  const result = compile(code, 'test.ts').trim();
  assert(result.includes('const x = obj'));
  assertFalsy(result.includes('as MyType'));
});

test('Compiler — ternary مع type-like value لا يُفسد', () => {
  const code = 'const result = cond ? value1 : value2;';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const result = cond ? value1 : value2;');
});

test('Compiler — new Buffer() لا يُفسد', () => {
  const code = 'const buf = arr ? arr : new Buffer();';
  const result = compile(code, 'test.ts').trim();
  assertEquals(result, 'const buf = arr ? arr : new Buffer();');
});

// ─────────────────────────────────────────────────────────────────────────────
// Redis Client Tests
// ─────────────────────────────────────────────────────────────────────────────

test('Redis — parseRedisUrl يحلّل URL بسيط', () => {
  const result = parseRedisUrl('redis://localhost:6379');
  assertEquals(result.host, 'localhost');
  assertEquals(result.port, 6379);
  assertFalsy(result.password);
  assertEquals(result.db, 0);
});

test('Redis — parseRedisUrl يحلّل URL مع password', () => {
  const result = parseRedisUrl('redis://:secret@localhost:6379');
  assertEquals(result.host, 'localhost');
  assertEquals(result.port, 6379);
  assertEquals(result.password, 'secret');
});

test('Redis — parseRedisUrl يحلّل URL مع db', () => {
  const result = parseRedisUrl('redis://localhost:6379/3');
  assertEquals(result.db, 3);
});

test('Redis — parseRedisUrl يحلّل URL مع user:pass', () => {
  const result = parseRedisUrl('redis://user:pass@host:6380/2');
  assertEquals(result.host, 'host');
  assertEquals(result.port, 6380);
  assertEquals(result.password, 'pass');
  assertEquals(result.db, 2);
});

test('Redis — encode يبني RESP2 صحيح', () => {
  const result = encode(['SET', 'key', 'value']);
  assertEquals(result, '*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n');
});

test('Redis — encode مع special chars', () => {
  const result = encode(['SET', 'key', 'hello world']);
  assertEquals(result, '*3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$11\r\nhello world\r\n');
});

test('Redis — parseReply يحلّل +OK', () => {
  const buf = Buffer.from('+OK\r\n');
  const result = parseReply(buf);
  assertEquals(result.value, 'OK');
  assertEquals(result.consumed, 5);
});

test('Redis — parseReply يحلّل :42', () => {
  const buf = Buffer.from(':42\r\n');
  const result = parseReply(buf);
  assertEquals(result.value, 42);
});

test('Redis — parseReply يحلّل $-1 (null)', () => {
  const buf = Buffer.from('$-1\r\n');
  const result = parseReply(buf);
  assertFalsy(result.value);
});

test('Redis — parseReply يحلّل bulk string', () => {
  const buf = Buffer.from('$5\r\nhello\r\n');
  const result = parseReply(buf);
  assertEquals(result.value, 'hello');
});

test('Redis — parseReply يحلّل array', () => {
  const buf = Buffer.from('*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n');
  const result = parseReply(buf);
  assert(Array.isArray(result.value));
  assertEquals(result.value[0], 'foo');
  assertEquals(result.value[1], 'bar');
});

test('Redis — createRedisClient يُرجع RedisClient', () => {
  const client = createRedisClient({ url: 'redis://localhost:6379' });
  assert(client);
  assert(typeof client.get === 'function');
  assert(typeof client.set === 'function');
  assert(typeof client.ping === 'function');
  assert(typeof client.quit === 'function');
  client.destroy();
});

test('Redis — RedisClient له كل الـ methods', () => {
  const client = createRedisClient({ url: 'redis://localhost:6379' });
  // Strings
  assert(typeof client.get === 'function');
  assert(typeof client.set === 'function');
  assert(typeof client.del === 'function');
  assert(typeof client.incr === 'function');
  // Hashes
  assert(typeof client.hget === 'function');
  assert(typeof client.hset === 'function');
  assert(typeof client.hgetall === 'function');
  // Lists
  assert(typeof client.lpush === 'function');
  assert(typeof client.rpush === 'function');
  // Sets
  assert(typeof client.sadd === 'function');
  // Sorted Sets
  assert(typeof client.zadd === 'function');
  // Pub/Sub
  assert(typeof client.subscribe === 'function');
  assert(typeof client.publish === 'function');
  // Pipeline
  assert(typeof client.pipeline === 'function');
  // Lua
  assert(typeof client.eval === 'function');
  client.destroy();
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket Tests
// ─────────────────────────────────────────────────────────────────────────────

test('WebSocket — encodeFrame يبني frame صحيح (text, unmasked)', () => {
  const frame = encodeFrame('hi', { opcode: 0x1, masked: false });
  // fin=1, opcode=1 → 0x81
  // len=2 → 0x02
  assertEquals(frame[0], 0x81);
  assertEquals(frame[1], 0x02);
  assertEquals(frame.slice(2).toString('utf8'), 'hi');
});

test('WebSocket — encodeFrame مع masking', () => {
  const frame = encodeFrame('test', { opcode: 0x1, masked: true });
  // fin=1, opcode=1, masked=1 → 0x81, 0x80 | 4
  assertEquals(frame[0], 0x81);
  assertEquals(frame[1] & 0x80, 0x80); // masked bit
  assertEquals(frame[1] & 0x7F, 4); // length
  // 4 bytes mask + 4 bytes masked payload
  assertEquals(frame.length, 2 + 4 + 4);
});

test('WebSocket — decodeFrame يحلّل text frame', () => {
  const frame = encodeFrame('hello', { opcode: 0x1, masked: false });
  const result = decodeFrame(frame);
  assert(result);
  assertEquals(result.frame.opcode, 0x1);
  assert(result.frame.fin);
  assertEquals(result.frame.payload.toString('utf8'), 'hello');
});

test('WebSocket — decodeFrame يحلّل masked frame', () => {
  const original = 'test message';
  const frame = encodeFrame(original, { opcode: 0x1, masked: true });
  const result = decodeFrame(frame);
  assert(result);
  assertEquals(result.frame.payload.toString('utf8'), original);
});

test('WebSocket — decodeFrame يحلّل binary frame', () => {
  const data = Buffer.from([0x01, 0x02, 0x03, 0xFF]);
  const frame = encodeFrame(data, { opcode: 0x2, masked: false });
  const result = decodeFrame(frame);
  assertEquals(result.frame.opcode, 0x2);
  assertEquals(result.frame.payload[0], 0x01);
  assertEquals(result.frame.payload[3], 0xFF);
});

test('WebSocket — decodeFrame يحلّل close frame', () => {
  const payload = Buffer.alloc(2);
  payload.writeUInt16BE(1000, 0);
  const frame = encodeFrame(payload, { opcode: 0x8, masked: false });
  const result = decodeFrame(frame);
  assertEquals(result.frame.opcode, 0x8);
});

test('WebSocket — decodeFrame يحلّل ping frame', () => {
  const frame = encodeFrame('ping', { opcode: 0x9, masked: false });
  const result = decodeFrame(frame);
  assertEquals(result.frame.opcode, 0x9);
});

test('WebSocket — WebSocketServer يُنشأ', () => {
  const wss = new WebSocketServer({ path: '/ws' });
  assert(wss);
  assertEquals(wss.path, '/ws');
  assert(typeof wss.broadcast === 'function');
  assert(typeof wss.broadcastAll === 'function');
  assert(typeof wss.joinRoom === 'function');
  assert(typeof wss.getStats === 'function');
});

test('WebSocket — WebSocketServer rooms management', () => {
  const wss = new WebSocketServer({ path: '/ws' });
  // محاكاة client
  const fakeClient = { id: 'abc', rooms: new Set(), join(r) { this.rooms.add(r); }, leave(r) { this.rooms.delete(r); } };
  wss.joinRoom('room-1', fakeClient);
  assert(wss.rooms.has('room-1'));
  assertEquals(wss.getClientsInRoom('room-1').length, 1);
  wss.leaveRoom('room-1', fakeClient);
  assertFalsy(wss.rooms.has('room-1'));
});

// ─────────────────────────────────────────────────────────────────────────────
// SQL Adapter Tests
// ─────────────────────────────────────────────────────────────────────────────

test('SQL — parseSQLUrl يحلّل postgres URL', () => {
  const result = parseSQLUrl('postgres://user:pass@localhost:5432/mydb');
  assertEquals(result.host, 'localhost');
  assertEquals(result.port, 5432);
  assertEquals(result.user, 'user');
  assertEquals(result.password, 'pass');
  assertEquals(result.database, 'mydb');
});

test('SQL — parseSQLUrl default port', () => {
  const result = parseSQLUrl('postgres://localhost/mydb');
  assertEquals(result.port, 5432);
});

test('SQL — parseSQLUrl مع SSL param', () => {
  const result = parseSQLUrl('postgres://localhost/mydb?ssl=true');
  assert(result.ssl);
});

test('SQL — createSQLDatabase يُرجع SQLDatabase', () => {
  const db = createSQLDatabase({
    type: 'postgres',
    url: 'postgres://user:pass@localhost:5432/test',
  });
  assert(db);
  assert(typeof db.query === 'function');
  assert(typeof db.queryOne === 'function');
  assert(typeof db.insert === 'function');
  assert(typeof db.update === 'function');
  assert(typeof db.delete === 'function');
  assert(typeof db.transaction === 'function');
  assert(typeof db.migrate === 'function');
  db.close();
});

test('SQL — SQLDatabase methods موجودة', () => {
  const db = createSQLDatabase({
    type: 'postgres',
    url: 'postgres://localhost:5432/test',
  });
  // التحقق من existence فقط (بدون اتصال فعلي)
  assert(typeof db.query === 'function');
  assert(typeof db.queryOne === 'function');
  assert(typeof db.insert === 'function');
  assert(typeof db.update === 'function');
  assert(typeof db.delete === 'function');
  assert(typeof db.transaction === 'function');
  assert(typeof db.migrate === 'function');
  db.close();
});

console.log('\n  ✦ Critical Fixes Tests — loaded');
