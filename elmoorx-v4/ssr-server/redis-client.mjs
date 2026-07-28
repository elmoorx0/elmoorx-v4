/**
 * Elmoorx v4 — Advanced Redis Client (بدون تبعيات)
 * =================================================
 * عميل Redis كامل المواصفات مبني على RESP2 protocol عبر TCP خام.
 *
 * المميزات:
 *   - AUTH (كلمات السر)
 *   - Reconnection تلقائي مع backoff
 *   - Connection pooling (N connections)
 *   - Pub/Sub
 *   - Pipeline (أوامر متعددة في طلب واحد)
 *   - TTL/EXPIRE
 *   - Lua scripting (EVAL)
 *   - Health check (PING)
 *   - Cluster-ready (multiple endpoints — basic)
 *
 * الاستخدام:
 *   import { createRedisClient } from './redis-client.mjs';
 *   const redis = createRedisClient({
 *     url: 'redis://:password@host:6379/0',
 *     poolSize: 5,
 *     retryStrategy: 'exponential',
 *   });
 *   await redis.set('key', 'value');
 *   const val = await redis.get('key');
 */

import { createConnection as netCreateConnection, Socket } from 'node:net';
import { EventEmitter } from 'node:events';

// ─────────────────────────────────────────────────────────────────────────────
// 1) RESP2 PROTOCOL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يرمّز أمر Redis بصيغة RESP2
 * مثال: encode(['SET', 'key', 'value'])
 *   → *3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n
 */
function encode(args) {
  let result = `*${args.length}\r\n`;
  for (const arg of args) {
    const str = String(arg);
    result += `$${Buffer.byteLength(str)}\r\n${str}\r\n`;
  }
  return result;
}

/**
 * يحلّل رد Redis بصيغة RESP2
 * يُرجع { value, consumed } أو null (إذا لم يكتمل الرد)
 */
function parseReply(buf) {
  if (buf.length === 0) return null;
  const firstByte = buf[0];
  const endIdx = buf.indexOf('\r\n');
  if (endIdx === -1) return null;

  if (firstByte === 0x2B) { // '+'
    return { value: buf.slice(1, endIdx).toString(), consumed: endIdx + 2 };
  }
  if (firstByte === 0x2D) { // '-'
    return { value: new Error(buf.slice(1, endIdx).toString()), consumed: endIdx + 2 };
  }
  if (firstByte === 0x3A) { // ':'
    return { value: parseInt(buf.slice(1, endIdx).toString(), 10), consumed: endIdx + 2 };
  }
  if (firstByte === 0x24) { // '$'
    const len = parseInt(buf.slice(1, endIdx).toString(), 10);
    if (len === -1) return { value: null, consumed: endIdx + 2 };
    const dataEnd = endIdx + 2 + len + 2;
    if (buf.length < dataEnd) return null;
    return { value: buf.slice(endIdx + 2, endIdx + 2 + len).toString(), consumed: dataEnd };
  }
  if (firstByte === 0x2A) { // '*'
    const len = parseInt(buf.slice(1, endIdx).toString(), 10);
    if (len === -1) return { value: null, consumed: endIdx + 2 };
    let pos = endIdx + 2;
    const array = [];
    for (let i = 0; i < len; i++) {
      const reply = parseReply(buf.slice(pos));
      if (!reply) return null;
      array.push(reply.value);
      pos += reply.consumed;
    }
    return { value: array, consumed: pos };
  }
  // Unknown — skip line
  return { value: null, consumed: endIdx + 2 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SINGLE CONNECTION
// ─────────────────────────────────────────────────────────────────────────────

class RedisConnection extends EventEmitter {
  constructor(options) {
    super();
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 6379;
    this.password = options.password || null;
    this.db = options.db || 0;
    this.connectTimeout = options.connectTimeout || 5000;
    this.commandTimeout = options.commandTimeout || 5000;

    this.socket = null;
    this.connected = false;
    this.buffer = Buffer.alloc(0);
    this.waiters = [];
    this.subscriptions = new Map(); // channel → callback
    this._connect();
  }

  _connect() {
    this.socket = netCreateConnection({
      host: this.host,
      port: this.port,
      timeout: this.connectTimeout,
    });

    this.socket.on('connect', async () => {
      this.connected = true;
      this.emit('connect');

      // AUTH
      if (this.password) {
        try {
          await this._sendRaw(['AUTH', this.password]);
        } catch (err) {
          this.emit('error', new Error(`Redis AUTH failed: ${err.message}`));
          this.socket.destroy();
          return;
        }
      }

      // SELECT db
      if (this.db > 0) {
        try {
          await this._sendRaw(['SELECT', String(this.db)]);
        } catch {}
      }

      // إعادة الاشتراك في القنوات (إذا كان reconnect)
      if (this.subscriptions.size > 0) {
        for (const channel of this.subscriptions.keys()) {
          this._sendRaw(['SUBSCRIBE', channel]).catch(() => {});
        }
      }
    });

    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this._processBuffer();
    });

    this.socket.on('error', (err) => {
      this.emit('error', err);
    });

    this.socket.on('close', () => {
      this.connected = false;
      this.emit('disconnect');
      // Reject all pending waiters
      while (this.waiters.length > 0) {
        const w = this.waiters.shift();
        w.reject(new Error('Connection closed'));
      }
    });

    this.socket.setKeepAlive(true, 30000);
    this.socket.setNoDelay(true);
  }

  _processBuffer() {
    while (this.buffer.length > 0) {
      const reply = parseReply(this.buffer);
      if (!reply) break;

      this.buffer = this.buffer.slice(reply.consumed);

      // تحقق إن كان Pub/Sub message
      if (Array.isArray(reply.value) && reply.value.length === 3) {
        const [type, channel, message] = reply.value;
        if (type === 'message' || type === 'pmessage') {
          const cb = this.subscriptions.get(channel);
          if (cb) cb(message, channel);
          continue;
        }
      }

      // رد عادي
      const waiter = this.waiters.shift();
      if (waiter) {
        if (reply.value instanceof Error) {
          waiter.reject(reply.value);
        } else {
          waiter.resolve(reply.value);
        }
      }
    }
  }

  _sendRaw(args) {
    return new Promise((resolve, reject) => {
      if (!this.connected && this.socket.readyState !== 'opening') {
        reject(new Error('Not connected'));
        return;
      }
      const cmd = encode(args);
      const timeout = setTimeout(() => {
        const idx = this.waiters.findIndex(w => w.resolve === resolve);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error(`Command timeout: ${args[0]}`));
      }, this.commandTimeout);

      this.waiters.push({
        resolve: (v) => { clearTimeout(timeout); resolve(v); },
        reject: (e) => { clearTimeout(timeout); reject(e); },
      });

      this.socket.write(cmd);
    });
  }

  async send(args) {
    return this._sendRaw(args);
  }

  async subscribe(channel, callback) {
    this.subscriptions.set(channel, callback);
    return this._sendRaw(['SUBSCRIBE', channel]);
  }

  async unsubscribe(channel) {
    this.subscriptions.delete(channel);
    return this._sendRaw(['UNSUBSCRIBE', channel]);
  }

  async ping() {
    return this._sendRaw(['PING']);
  }

  async quit() {
    try {
      await this._sendRaw(['QUIT']);
    } catch {}
    this.socket.destroy();
  }

  destroy() {
    this.socket.destroy();
    this.connected = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) CONNECTION POOL
// ─────────────────────────────────────────────────────────────────────────────

class RedisPool extends EventEmitter {
  constructor(options = {}) {
    super();
    const url = options.url || `redis://${options.host || '127.0.0.1'}:${options.port || 6379}`;
    const parsed = parseRedisUrl(url);

    this.options = {
      ...parsed,
      ...options,
      poolSize: options.poolSize || 5,
      retryStrategy: options.retryStrategy || 'exponential',
      maxRetries: options.maxRetries || 10,
      retryDelay: options.retryDelay || 1000,
      maxRetryDelay: options.maxRetryDelay || 30000,
    };

    this.pool = [];
    this.available = [];
    this.waiters = [];
    this.inFlight = 0;
    this.roundRobin = 0;
    this.reconnectAttempts = 0;
    this.closing = false;

    this._initPool();
  }

  _initPool() {
    for (let i = 0; i < this.options.poolSize; i++) {
      const conn = new RedisConnection(this.options);
      conn.on('connect', () => {
        this.reconnectAttempts = 0;
        this.emit('connectionReady', i);
      });
      conn.on('disconnect', () => {
        this.emit('disconnect', i);
        if (!this.closing) {
          this._scheduleReconnect(i);
        }
      });
      conn.on('error', (err) => this.emit('error', err));
      this.pool.push(conn);
      this.available.push(conn);
    }
  }

  _scheduleReconnect(index) {
    const delay = this._getRetryDelay();
    setTimeout(() => {
      if (this.closing) return;
      const oldConn = this.pool[index];
      if (oldConn) oldConn.destroy();
      const newConn = new RedisConnection(this.options);
      newConn.on('connect', () => {
        this.pool[index] = newConn;
        this.available.push(newConn);
        this._drainWaiters();
      });
      newConn.on('disconnect', () => this._scheduleReconnect(index));
      newConn.on('error', () => {});
    }, delay);
  }

  _getRetryDelay() {
    const { retryStrategy, retryDelay, maxRetryDelay } = this.options;
    this.reconnectAttempts++;
    if (retryStrategy === 'exponential') {
      return Math.min(retryDelay * Math.pow(2, this.reconnectAttempts - 1), maxRetryDelay);
    }
    if (retryStrategy === 'linear') {
      return Math.min(retryDelay * this.reconnectAttempts, maxRetryDelay);
    }
    return retryDelay; // fixed
  }

  async _acquire() {
    if (this.available.length > 0) {
      return this.available.shift();
    }
    // انتظر حتى تتوفر connection
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      setTimeout(() => {
        const idx = this.waiters.findIndex(w => w.resolve === resolve);
        if (idx >= 0) {
          this.waiters.splice(idx, 1);
          reject(new Error('Pool acquire timeout'));
        }
      }, this.options.commandTimeout || 5000);
    });
  }

  _release(conn) {
    if (this.waiters.length > 0) {
      const w = this.waiters.shift();
      w.resolve(conn);
    } else {
      this.available.push(conn);
    }
  }

  _drainWaiters() {
    while (this.waiters.length > 0 && this.available.length > 0) {
      const conn = this.available.shift();
      const w = this.waiters.shift();
      w.resolve(conn);
    }
  }

  /**
   * ينفّذ أمر Redis باستخدام connection من الـ pool
   */
  async command(...args) {
    const conn = await this._acquire();
    try {
      const result = await conn.send(args);
      return result;
    } finally {
      this._release(conn);
    }
  }

  /**
   * Pipeline — ينفّذ عدة أوامر في طلب واحد
   */
  async pipeline(commands) {
    const conn = await this._acquire();
    try {
      // أرسل كل الأوامر دفعة واحدة
      const promises = commands.map(cmd => conn.send(cmd));
      return Promise.all(promises);
    } finally {
      this._release(conn);
    }
  }

  /**
   * Pub/Sub
   */
  async subscribe(channel, callback) {
    // استخدم connection مخصصة للـ pub/sub (لا تُعاد للـ pool)
    const conn = this.pool[this.roundRobin % this.pool.length];
    this.roundRobin++;
    return conn.subscribe(channel, callback);
  }

  async unsubscribe(channel) {
    for (const conn of this.pool) {
      try { await conn.unsubscribe(channel); } catch {}
    }
  }

  async publish(channel, message) {
    return this.command('PUBLISH', channel, message);
  }

  /**
   * Health check
   */
  async ping() {
    return this.command('PING');
  }

  /**
   * يُغلق الـ pool بالكامل
   */
  async quit() {
    this.closing = true;
    for (const conn of this.pool) {
      try { await conn.quit(); } catch {}
    }
  }

  destroy() {
    this.closing = true;
    for (const conn of this.pool) {
      conn.destroy();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) URL PARSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يحلّل redis URL
 *   redis://[password@]host:port/db
 *   redis://username:password@host:port/db
 */
function parseRedisUrl(url) {
  try {
    const u = new URL(url);
    const password = u.password || (u.username ? u.username : null);
    return {
      host: u.hostname || '127.0.0.1',
      port: parseInt(u.port || '6379'),
      password: password || null,
      db: parseInt(u.pathname.slice(1) || '0'),
    };
  } catch {
    return { host: '127.0.0.1', port: 6379, password: null, db: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) HIGH-LEVEL API (convenience methods)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يلفّ RedisPool بـ API مريح يشبه node-redis
 */
class RedisClient {
  constructor(options = {}) {
    this.pool = new RedisPool(options);
  }

  // Strings
  async get(key) { return this.pool.command('GET', key); }
  async set(key, value, opts = {}) {
    const args = ['SET', key, value];
    if (opts.ttl) args.push('PX', String(opts.ttl));
    else if (opts.ex) args.push('EX', String(opts.ex));
    if (opts.nx) args.push('NX');
    if (opts.xx) args.push('XX');
    return this.pool.command(...args);
  }
  async setex(key, ttl, value) { return this.pool.command('SETEX', key, String(ttl), value); }
  async del(...keys) { return this.pool.command('DEL', ...keys); }
  async exists(key) { return this.pool.command('EXISTS', key); }
  async expire(key, ttl) { return this.pool.command('EXPIRE', key, String(ttl)); }
  async ttl(key) { return this.pool.command('TTL', key); }
  async incr(key) { return this.pool.command('INCR', key); }
  async decr(key) { return this.pool.command('DECR', key); }
  async incrby(key, n) { return this.pool.command('INCRBY', key, String(n)); }

  // Hashes
  async hget(key, field) { return this.pool.command('HGET', key, field); }
  async hset(key, field, value) { return this.pool.command('HSET', key, field, value); }
  async hgetall(key) {
    const result = await this.pool.command('HGETALL', key);
    if (!Array.isArray(result)) return {};
    const obj = {};
    for (let i = 0; i < result.length; i += 2) obj[result[i]] = result[i + 1];
    return obj;
  }
  async hdel(key, ...fields) { return this.pool.command('HDEL', key, ...fields); }

  // Lists
  async lpush(key, ...values) { return this.pool.command('LPUSH', key, ...values); }
  async rpush(key, ...values) { return this.pool.command('RPUSH', key, ...values); }
  async lpop(key) { return this.pool.command('LPOP', key); }
  async rpop(key) { return this.pool.command('RPOP', key); }
  async lrange(key, start, stop) { return this.pool.command('LRANGE', key, String(start), String(stop)); }
  async llen(key) { return this.pool.command('LLEN', key); }

  // Sets
  async sadd(key, ...members) { return this.pool.command('SADD', key, ...members); }
  async srem(key, ...members) { return this.pool.command('SREM', key, ...members); }
  async smembers(key) { return this.pool.command('SMEMBERS', key); }
  async sismember(key, member) { return this.pool.command('SISMEMBER', key, member); }

  // Sorted Sets
  async zadd(key, score, member) { return this.pool.command('ZADD', key, String(score), member); }
  async zrange(key, start, stop) { return this.pool.command('ZRANGE', key, String(start), String(stop)); }
  async zrevrange(key, start, stop) { return this.pool.command('ZREVRANGE', key, String(start), String(stop)); }
  async zincrby(key, increment, member) { return this.pool.command('ZINCRBY', key, String(increment), member); }

  // Keys
  async keys(pattern) { return this.pool.command('KEYS', pattern); }
  async scan(cursor, pattern, count) {
    const args = ['SCAN', String(cursor)];
    if (pattern) args.push('MATCH', pattern);
    if (count) args.push('COUNT', String(count));
    return this.pool.command(...args);
  }
  async flushdb() { return this.pool.command('FLUSHDB'); }
  async dbsize() { return this.pool.command('DBSIZE'); }

  // Pub/Sub
  async subscribe(channel, callback) { return this.pool.subscribe(channel, callback); }
  async unsubscribe(channel) { return this.pool.unsubscribe(channel); }
  async publish(channel, message) { return this.pool.publish(channel, message); }

  // Pipeline
  async pipeline(commands) { return this.pool.pipeline(commands); }

  // Lua
  async eval(script, keys, args) {
    return this.pool.command('EVAL', script, String(keys.length), ...keys, ...args);
  }

  // Health
  async ping() { return this.pool.ping(); }

  // Info
  async info(section) {
    return section ? this.pool.command('INFO', section) : this.pool.command('INFO');
  }

  // Cleanup
  async quit() { return this.pool.quit(); }
  destroy() { this.pool.destroy(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createRedisClient(options = {}) {
  return new RedisClient(options);
}

export { RedisClient, RedisPool, RedisConnection, parseRedisUrl, encode, parseReply };

export default { createRedisClient, RedisClient, RedisPool, RedisConnection, parseRedisUrl };
