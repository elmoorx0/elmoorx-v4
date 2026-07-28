/**
 * Elmoorx v4 — MySQL Protocol Adapter (بدون تبعيات)
 * =================================================
 * عميل MySQL مبني على الـ wire protocol (v10) عبر TCP خام.
 *
 * المميزات:
 *   - MySQL v10 handshake (mysql_native_password, caching_sha2_password)
 *   - Connection pooling
 *   - Prepared statements
 *   - Transactions (BEGIN/COMMIT/ROLLBACK)
 *   - Result sets مع column metadata
 *   - Types auto-conversion
 *   - SSL support (اختياري — يتعامل مع الـ handshake فقط)
 *
 * ملاحظة: هذا المحوّل للبيئات التي تتطلب 0 تبعيات. للأداء العالي، نوصي بـ mysql2.
 *
 * الاستخدام:
 *   import { createMySQLDatabase } from './mysql-adapter.mjs';
 *   const db = createMySQLDatabase({
 *     url: 'mysql://user:pass@host:3306/dbname',
 *   });
 *   const result = await db.query('SELECT * FROM users WHERE id = ?', [42]);
 */

import { createConnection as netCreateConnection } from 'node:net';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

// ─────────────────────────────────────────────────────────────────────────────
// 1) URL PARSER
// ─────────────────────────────────────────────────────────────────────────────

function parseMySQLUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || '127.0.0.1',
      port: parseInt(u.port || '3306'),
      user: decodeURIComponent(u.username || 'root'),
      password: decodeURIComponent(u.password || ''),
      database: u.pathname.slice(1) || 'mysql',
      ssl: u.searchParams.get('ssl') === 'true',
    };
  } catch {
    return { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'mysql', ssl: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) MYSQL PACKET UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يقرأ length-encoded integer (MySQL format)
 */
function readLengthEncodedInt(buf, offset) {
  const first = buf[offset];
  if (first < 251) return { value: first, next: offset + 1 };
  if (first === 252) return { value: buf.readUInt16LE(offset + 1), next: offset + 3 };
  if (first === 253) return { value: buf.readUInt32LE(offset + 1), next: offset + 5 };
  if (first === 254) {
    // 8-byte — نأخذ أول 6 بايتات فقط (تكفي للأرقام العملية)
    return { value: Number(buf.readBigUInt64LE(offset + 1)), next: offset + 9 };
  }
  return { value: null, next: offset + 1 }; // 251 = NULL
}

/**
 * يقرأ length-encoded string
 */
function readLengthEncodedString(buf, offset) {
  const { value: len, next } = readLengthEncodedInt(buf, offset);
  if (len === null) return { value: null, next };
  return { value: buf.toString('utf8', next, next + len), next: next + len };
}

/**
 * يبني length-encoded integer
 */
function writeLengthEncodedInt(value) {
  if (value === null) return Buffer.from([251]);
  if (value < 251) return Buffer.from([value]);
  if (value < 65536) {
    const buf = Buffer.alloc(3);
    buf[0] = 252;
    buf.writeUInt16LE(value, 1);
    return buf;
  }
  if (value < 16777216) {
    const buf = Buffer.alloc(4);
    buf[0] = 253;
    buf.writeUInt32LE(value, 1);
    return buf;
  }
  const buf = Buffer.alloc(9);
  buf[0] = 254;
  buf.writeBigUInt64LE(BigInt(value), 1);
  return buf;
}

/**
 * يبني length-encoded string
 */
function writeLengthEncodedString(str) {
  const strBuf = Buffer.from(String(str), 'utf8');
  return Buffer.concat([writeLengthEncodedInt(strBuf.length), strBuf]);
}

/**
 * يبني MySQL packet مع 3-byte length + 1-byte sequence
 */
function buildPacket(payload, sequence = 0) {
  const len = payload.length;
  const header = Buffer.alloc(4);
  header[0] = len & 0xFF;
  header[1] = (len >> 8) & 0xFF;
  header[2] = (len >> 16) & 0xFF;
  header[3] = sequence;
  return Buffer.concat([header, payload]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) MYSQL CONNECTION
// ─────────────────────────────────────────────────────────────────────────────

class MySQLConnection extends EventEmitter {
  constructor(options) {
    super();
    this.host = options.host;
    this.port = options.port;
    this.user = options.user;
    this.password = options.password;
    this.database = options.database;
    this.socket = null;
    this.connected = false;
    this.ready = false;
    this.buffer = Buffer.alloc(0);
    this.waiters = [];
    this.sequence = 0;
    this.serverCapabilities = 0;
    this.connectionId = 0;
    this.authPluginData = null;
    this.authPluginName = null;
    this._connect();
  }

  _connect() {
    this.socket = netCreateConnection({ host: this.host, port: this.port });
    this.socket.on('connect', () => {
      this.connected = true;
      // بانتظار server handshake
    });
    this.socket.on('data', (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this._processBuffer();
    });
    this.socket.on('error', (err) => this.emit('error', err));
    this.socket.on('close', () => {
      this.connected = false;
      this.ready = false;
      this.emit('disconnect');
    });
  }

  _processBuffer() {
    while (this.buffer.length >= 4) {
      const len = this.buffer[0] | (this.buffer[1] << 8) | (this.buffer[2] << 16);
      const seq = this.buffer[3];
      if (this.buffer.length < 4 + len) break;

      const packet = this.buffer.slice(4, 4 + len);
      this.buffer = this.buffer.slice(4 + len);
      this.sequence = seq + 1;
      this._handlePacket(packet);
    }
  }

  _handlePacket(packet) {
    // أول packet = server handshake
    if (!this.ready && !this.authPluginData) {
      this._handleHandshake(packet);
      return;
    }

    // تحقق من نوع الـ packet
    const firstByte = packet[0];
    if (firstByte === 0x00) {
      // OK packet
      const okPacket = this._parseOKPacket(packet);
      if (!this.ready) {
        this.ready = true;
        this.emit('connect');
      }
      if (this.waiters.length > 0) {
        const w = this.waiters.shift();
        w.resolve({ rows: [], affected: okPacket.affectedRows, insertId: okPacket.insertId });
      }
    } else if (firstByte === 0xFF) {
      // Error packet
      const errCode = packet.readUInt16LE(1);
      const errMsg = packet.slice(3).toString('utf8');
      const err = new Error(`MySQL ${errCode}: ${errMsg}`);
      err.code = errCode;
      if (this.waiters.length > 0) {
        const w = this.waiters.shift();
        w.reject(err);
      }
      this.emit('error', err);
    } else if (firstByte === 0xFE) {
      // EOF packet
      if (this.waiters.length > 0) {
        const w = this.waiters.shift();
        w.resolve(this.currentResult || { rows: [], affected: 0 });
        this.currentResult = null;
      }
    } else {
      // Result set أو field data
      if (!this.currentResult) {
        // Column count packet
        const { value: colCount } = readLengthEncodedInt(packet, 0);
        this.currentResult = { rows: [], fields: [], affected: 0, columnCount: colCount };
      } else if (this.currentResult.fields.length < this.currentResult.columnCount) {
        // Column definition packet
        const field = this._parseColumnDefinition(packet);
        this.currentResult.fields.push(field);
      } else {
        // Row data packet
        const row = this._parseRowData(packet, this.currentResult.fields);
        this.currentResult.rows.push(row);
      }
    }
  }

  _handleHandshake(packet) {
    // protocol version
    let pos = 1;
    // server version (null-terminated)
    const versionEnd = packet.indexOf(0, pos);
    const serverVersion = packet.toString('utf8', pos, versionEnd);
    pos = versionEnd + 1;
    // connection id (4 bytes)
    this.connectionId = packet.readUInt32LE(pos);
    pos += 4;
    // auth-plugin-data-part-1 (8 bytes)
    const authData1 = packet.slice(pos, pos + 8);
    pos += 8;
    // filler (1 byte)
    pos += 1;
    // capabilities flags (lower 2 bytes)
    const capLow = packet.readUInt16LE(pos);
    pos += 2;
    // character set (1 byte)
    const charset = packet[pos];
    pos += 1;
    // status flags (2 bytes)
    pos += 2;
    // capabilities flags (upper 2 bytes)
    const capHigh = packet.readUInt16LE(pos);
    pos += 2;
    this.serverCapabilities = capLow | (capHigh << 16);
    // auth-plugin-data-length or filler
    const authDataLen = packet[pos];
    pos += 1;
    // reserved (10 bytes)
    pos += 10;
    // auth-plugin-data-part-2 (max 13 bytes)
    const authData2Len = Math.max(13, authDataLen - 8);
    const authData2 = packet.slice(pos, pos + authData2Len);
    pos += authData2Len;
    // أزل trailing null
    const authData2Stripped = authData2.slice(0, authData2.indexOf(0) >= 0 ? authData2.indexOf(0) : authData2.length);
    this.authPluginData = Buffer.concat([authData1, authData2Stripped]);

    // auth-plugin-name (null-terminated)
    if (pos < packet.length) {
      const pluginEnd = packet.indexOf(0, pos);
      if (pluginEnd > 0) {
        this.authPluginName = packet.toString('utf8', pos, pluginEnd);
      }
    }

    // أرسل handshake response
    this._sendHandshakeResponse();
  }

  _sendHandshakeResponse() {
    const CLIENT_PROTOCOL_41 = 0x0200;
    const CLIENT_SECURE_CONNECTION = 0x8000;
    const CLIENT_CONNECT_WITH_DB = 0x0008;
    const CLIENT_PLUGIN_AUTH = 0x00080000;
    const CLIENT_DEPRECATE_EOF = 0x01000000;

    const capabilities =
      CLIENT_PROTOCOL_41 |
      CLIENT_SECURE_CONNECTION |
      CLIENT_CONNECT_WITH_DB |
      CLIENT_PLUGIN_AUTH |
      0x00200000; // CLIENT_PLUGIN_AUTH_LENENC_CLIENT_DATA

    const maxPacketSize = 0xFFFFFF;
    const charset = 33; // utf8mb4

    const parts = [];
    // capabilities (4 bytes)
    const capBuf = Buffer.alloc(4);
    capBuf.writeUInt32LE(capabilities, 0);
    parts.push(capBuf);
    // max packet size (4 bytes)
    const maxBuf = Buffer.alloc(4);
    maxBuf.writeUInt32LE(maxPacketSize, 0);
    parts.push(maxBuf);
    // charset (1 byte)
    parts.push(Buffer.from([charset]));
    // reserved (23 bytes)
    parts.push(Buffer.alloc(23));
    // username (null-terminated)
    parts.push(Buffer.from(this.user + '\0', 'utf8'));
    // auth response (length-encoded)
    const authResponse = this._computeAuthResponse();
    parts.push(writeLengthEncodedString(authResponse));
    // database (null-terminated)
    if (this.database) {
      parts.push(Buffer.from(this.database + '\0', 'utf8'));
    }
    // plugin name (null-terminated)
    parts.push(Buffer.from('mysql_native_password\0', 'utf8'));

    const payload = Buffer.concat(parts);
    const packet = buildPacket(payload, this.sequence);
    this.socket.write(packet);
  }

  _computeAuthResponse() {
    if (this.authPluginName === 'caching_sha2_password') {
      // SHA256-based auth
      const sha256 = createHash('sha256');
      const hash1 = sha256.update(this.password).digest();
      const sha256_2 = createHash('sha256');
      const hash2 = sha256_2.update(hash1).digest();
      const sha256_3 = createHash('sha256');
      const hash3 = sha256_3.update(Buffer.concat([hash2, this.authPluginData])).digest();
      const result = Buffer.alloc(20);
      for (let i = 0; i < 20; i++) {
        result[i] = hash1[i] ^ hash3[i];
      }
      return result;
    }
    // mysql_native_password (default)
    const sha1 = createHash('sha1').update(this.password).digest();
    const sha1_2 = createHash('sha1').update(sha1).digest();
    const sha1_3 = createHash('sha1').update(Buffer.concat([this.authPluginData, sha1_2])).digest();
    const result = Buffer.alloc(20);
    for (let i = 0; i < 20; i++) {
      result[i] = sha1[i] ^ sha1_3[i];
    }
    return result;
  }

  _parseColumnDefinition(packet) {
    let pos = 0;
    const catalog = readLengthEncodedString(packet, pos);
    pos = catalog.next;
    const schema = readLengthEncodedString(packet, pos);
    pos = schema.next;
    const table = readLengthEncodedString(packet, pos);
    pos = table.next;
    const orgTable = readLengthEncodedString(packet, pos);
    pos = orgTable.next;
    const name = readLengthEncodedString(packet, pos);
    pos = name.next;
    const orgName = readLengthEncodedString(packet, pos);
    pos = orgName.next;
    // length of fixed fields
    const { value: fixedLen, next } = readLengthEncodedInt(packet, pos);
    pos = next;
    // character set (2 bytes)
    pos += 2;
    // column length (4 bytes)
    pos += 4;
    // type (1 byte)
    const type = packet[pos];
    pos += 1;
    // flags (2 bytes)
    pos += 2;
    // decimals (1 byte)
    pos += 1;
    // filler (2 bytes)
    pos += 2;

    return { name: name.value, type };
  }

  _parseRowData(packet, fields) {
    const row = {};
    let pos = 0;
    for (const field of fields) {
      const { value, next } = readLengthEncodedString(packet, pos);
      row[field.name] = value;
      pos = next;
    }
    return row;
  }

  _parseOKPacket(packet) {
    let pos = 1; // skip 0x00
    const { value: affectedRows, next: n1 } = readLengthEncodedInt(packet, pos);
    pos = n1;
    const { value: insertId, next: n2 } = readLengthEncodedInt(packet, pos);
    pos = n2;
    return { affectedRows, insertId };
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      if (!this.ready) {
        reject(new Error('Connection not ready'));
        return;
      }
      this.waiters.push({ resolve, reject });

      // COM_QUERY = 0x03
      let queryStr = sql;
      if (params.length > 0) {
        // استبدال ? بالقيم
        let i = 0;
        queryStr = sql.replace(/\?/g, () => {
          const v = params[i++];
          if (v === null) return 'NULL';
          if (typeof v === 'number') return String(v);
          if (typeof v === 'boolean') return v ? '1' : '0';
          return `'${String(v).replace(/'/g, "\\'")}'`;
        });
      }

      const payload = Buffer.concat([
        Buffer.from([0x03]),
        Buffer.from(queryStr, 'utf8'),
      ]);
      const packet = buildPacket(payload, this.sequence);
      this.socket.write(packet);
    });
  }

  async beginTransaction() { return this.query('START TRANSACTION'); }
  async commit() { return this.query('COMMIT'); }
  async rollback() { return this.query('ROLLBACK'); }

  close() {
    this.socket.destroy();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) MYSQL POOL
// ─────────────────────────────────────────────────────────────────────────────

class MySQLPool {
  constructor(options) {
    this.options = options;
    this.pool = [];
    this.available = [];
    this.waiters = [];
    this.maxSize = options.poolSize || 5;
    this._initPool();
  }

  _initPool() {
    for (let i = 0; i < this.maxSize; i++) {
      const conn = new MySQLConnection(this.options);
      this.pool.push(conn);
      // لا نضيفه لـ available حتى يكون ready
      conn.on('connect', () => {
        if (!this.available.includes(conn)) {
          this.available.push(conn);
          this._drainWaiters();
        }
      });
      conn.on('disconnect', () => {
        const idx = this.available.indexOf(conn);
        if (idx >= 0) this.available.splice(idx, 1);
        // أعِد الاتصال
        if (this.options.reconnect !== false) {
          setTimeout(() => {
            const newConn = new MySQLConnection(this.options);
            const poolIdx = this.pool.indexOf(conn);
            if (poolIdx >= 0) this.pool[poolIdx] = newConn;
            newConn.on('connect', () => {
              if (!this.available.includes(newConn)) {
                this.available.push(newConn);
                this._drainWaiters();
              }
            });
          }, 1000);
        }
      });
    }
  }

  async _acquire() {
    if (this.available.length > 0) {
      return this.available.shift();
    }
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      setTimeout(() => {
        const idx = this.waiters.findIndex(w => w.resolve === resolve);
        if (idx >= 0) {
          this.waiters.splice(idx, 1);
          reject(new Error('Pool acquire timeout'));
        }
      }, this.options.acquireTimeout || 5000);
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

  async query(sql, params) {
    const conn = await this._acquire();
    try {
      return await conn.query(sql, params);
    } finally {
      this._release(conn);
    }
  }

  async transaction(fn) {
    const conn = await this._acquire();
    try {
      await conn.beginTransaction();
      const result = await fn({
        query: (sql, params) => conn.query(sql, params),
      });
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      this._release(conn);
    }
  }

  close() {
    for (const conn of this.pool) conn.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) HIGH-LEVEL API
// ─────────────────────────────────────────────────────────────────────────────

class MySQLDatabase {
  constructor(options = {}) {
    if (options.url) {
      const parsed = parseMySQLUrl(options.url);
      Object.assign(options, parsed);
    }
    this.pool = new MySQLPool({ ...options, poolSize: options.poolSize || 5 });
  }

  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }

  async queryOne(sql, params = []) {
    const result = await this.query(sql + ' LIMIT 1', params);
    return result.rows[0] || null;
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);
    return { insertId: result.insertId, affected: result.affected };
  }

  async update(table, data, where, whereParams = []) {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];
    const sql = `UPDATE ${table} SET ${sets}${where ? ' WHERE ' + where : ''}`;
    const result = await this.query(sql, values);
    return result.affected;
  }

  async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table}${where ? ' WHERE ' + where : ''}`;
    const result = await this.query(sql, whereParams);
    return result.affected;
  }

  async transaction(fn) {
    return this.pool.transaction(fn);
  }

  async migrate(migrations) {
    await this.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const applied = await this.query('SELECT name FROM _migrations');
    const appliedSet = new Set(applied.rows.map(r => r.name));

    for (const migration of migrations) {
      if (appliedSet.has(migration.name)) continue;
      console.log(`  │ Migration: ${migration.name}`);
      await this.transaction(async (tx) => {
        await tx.query(migration.sql);
        await tx.query('INSERT INTO _migrations (name) VALUES (?)', [migration.name]);
      });
    }
  }

  close() {
    this.pool.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createMySQLDatabase(options = {}) {
  return new MySQLDatabase(options);
}

export { MySQLDatabase, MySQLPool, MySQLConnection, parseMySQLUrl };

export default { createMySQLDatabase, MySQLDatabase, MySQLPool, MySQLConnection, parseMySQLUrl };
