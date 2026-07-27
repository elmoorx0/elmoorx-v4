/**
 * Elmoorx v4 — Database Adapter (SQLite + IndexedDB)
 * ====================================================
 * قاعدة بيانات موحّدة:
 *   - Node.js: SQLite (node:sqlite مدمج في Node 22+)
 *   - Browser: IndexedDB
 *   - API موحّد للبيئتين
 *   - Schema definition + migrations
 *   - Query builder بسيط
 *   - Reactive queries (signals)
 */

import { $state, $effect, $computed } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) DETECT PLATFORM
// ─────────────────────────────────────────────────────────────────────────────

const isNode = typeof process !== 'undefined' && process.versions?.node;
const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

// ─────────────────────────────────────────────────────────────────────────────
// 2) SQLITE BACKEND (Node.js)
// ─────────────────────────────────────────────────────────────────────────────

class SQLiteBackend {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
  }

  async connect() {
    if (!isNode) throw new Error('SQLite متاح فقط في Node.js');
    // استخدم node:sqlite (Node 22+)
    const { DatabaseSync } = await import('node:sqlite');
    this.db = new DatabaseSync(this.dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    console.log(`%c✦ SQLite: ${this.dbPath}`, 'color:#10b981;');
  }

  exec(sql, params = []) {
    if (!this.db) throw new Error('DB غير متصل');
    // استخدم exec مباشرة لكل SQL (يعمل مع CREATE, INSERT, UPDATE, DELETE, BEGIN, COMMIT, ROLLBACK)
    if (params.length === 0) {
      this.db.exec(sql);
      return {};
    }
    // مع params استخدم prepare + run
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  query(sql, params = []) {
    if (!this.db) throw new Error('DB غير متصل');
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  queryOne(sql, params = []) {
    if (!this.db) throw new Error('DB غير متصل');
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  close() {
    if (this.db) this.db.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) INDEXEDDB BACKEND (Browser)
// ─────────────────────────────────────────────────────────────────────────────

class IndexedDBBackend {
  constructor(dbName, version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.stores = new Map(); // store name → schema
  }

  async connect() {
    if (!isBrowser) throw new Error('IndexedDB متاح فقط في المتصفح');
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        for (const [name, schema] of this.stores) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: schema.keyPath || 'id' });
            for (const index of schema.indexes || []) {
              store.createIndex(index.name, index.keyPath, index.options || {});
            }
          }
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        console.log(`%c✦ IndexedDB: ${this.dbName}`, 'color:#10b981;');
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  defineStore(name, schema) {
    this.stores.set(name, schema);
  }

  async exec(storeName, action, data) {
    if (!this.db) throw new Error('DB غير متصل');
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      let req;
      switch (action) {
        case 'put': req = store.put(data); break;
        case 'delete': req = store.delete(data); break;
        case 'clear': req = store.clear(); break;
        default: reject(new Error(`Unknown action: ${action}`)); return;
      }
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async query(storeName, predicate) {
    if (!this.db) throw new Error('DB غير متصل');
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        let results = req.result;
        if (predicate) results = results.filter(predicate);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async queryOne(storeName, key) {
    if (!this.db) throw new Error('DB غير متصل');
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  close() {
    if (this.db) this.db.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) DATABASE FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export async function createDatabase(options = {}) {
  const { type, path, name, version = 1, stores = [] } = options;

  let backend;
  if (type === 'sqlite' || (isNode && !type)) {
    backend = new SQLiteBackend(path || ':memory:');
    await backend.connect();
    // أنشئ الجداول
    for (const store of stores) {
      if (store.sql) backend.exec(store.sql);
    }
  } else {
    backend = new IndexedDBBackend(name || 'elmoorx', version);
    for (const store of stores) {
      backend.defineStore(store.name, store);
    }
    await backend.connect();
  }

  return new Database(backend, type || (isNode ? 'sqlite' : 'indexeddb'));
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) DATABASE WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

class Database {
  constructor(backend, type) {
    this.backend = backend;
    this.type = type;
    this.queryCache = new Map(); // queryKey → signal
  }

  /**
   * ينفّذ SQL (SQLite) أو action (IndexedDB)
   */
  async exec(...args) {
    if (this.type === 'sqlite') return this.backend.exec(...args);
    return this.backend.exec(...args);
  }

  /**
   * Transaction — يبدأ transaction صريح
   */
  async transaction(fn) {
    if (this.type === 'sqlite') {
      this.backend.exec('BEGIN TRANSACTION');
      try {
        const result = await fn(this);
        this.backend.exec('COMMIT');
        return result;
      } catch (err) {
        this.backend.exec('ROLLBACK');
        throw err;
      }
    }
    // IndexedDB: transactions تُدار تلقائياً
    return fn(this);
  }

  /**
   * Batch — ينفّذ عدة عمليات في transaction واحد
   */
  async batch(operations) {
    return this.transaction(async (db) => {
      const results = [];
      for (const op of operations) {
        if (op.type === 'insert') results.push(await db.insert(op.table, op.data));
        else if (op.type === 'update') results.push(await db.update(op.table, op.data, op.where));
        else if (op.type === 'delete') results.push(await db.delete(op.table, op.where));
        else if (op.type === 'exec') results.push(await db.exec(op.sql, op.params));
      }
      return results;
    });
  }

  /**
   * استعلام — يُرجع مصفوفة
   */
  async query(...args) {
    return this.backend.query(...args);
  }

  /**
   * استعلام واحد
   */
  async queryOne(...args) {
    return this.backend.queryOne(...args);
  }

  /**
   * Reactive query — يُعاد تحميله عند الإشارة
   */
  reactive(key, queryFn, deps = []) {
    if (!this.queryCache.has(key)) {
      const data = $state(null);
      const loading = $state(true);
      const error = $state(null);

      const reload = async () => {
        loading.set(true);
        error.set(null);
        try {
          const result = await queryFn();
          data.set(result);
        } catch (err) {
          error.set(err.message);
        } finally {
          loading.set(false);
        }
      };

      // أعد التحميل عند تغيّر الإشارات
      $effect(() => {
        for (const dep of deps) dep();
        reload();
      });

      this.queryCache.set(key, { data, loading, error, reload });
    }
    return this.queryCache.get(key);
  }

  /**
   * Insert helper
   */
  async insert(table, data) {
    if (this.type === 'sqlite') {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      return this.backend.exec(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
    // IndexedDB
    return this.backend.exec(table, 'put', data);
  }

  /**
   * Update helper
   */
  async update(table, data, where) {
    if (this.type === 'sqlite') {
      const setClause = Object.keys(data).map(k => `${k} = ?`).join(', ');
      const whereClause = Object.entries(where).map(([k, v]) => `${k} = ?`).join(' AND ');
      const values = [...Object.values(data), ...Object.values(where)];
      return this.backend.exec(
        `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`,
        values
      );
    }
    return this.backend.exec(table, 'put', data);
  }

  /**
   * Delete helper
   */
  async delete(table, where) {
    if (this.type === 'sqlite') {
      const whereClause = Object.entries(where).map(([k, v]) => `${k} = ?`).join(' AND ');
      const values = Object.values(where);
      return this.backend.exec(
        `DELETE FROM ${table} WHERE ${whereClause}`,
        values
      );
    }
    return this.backend.exec(table, 'delete', where.id || where);
  }

  close() {
    this.backend.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) SCHEMA BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export function schema(name, definition) {
  const columns = [];
  for (const [col, type] of Object.entries(definition)) {
    columns.push(`${col} ${type}`);
  }
  return {
    name,
    sql: `CREATE TABLE IF NOT EXISTS ${name} (${columns.join(', ')})`,
    definition,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) MIGRATIONS
// ─────────────────────────────────────────────────────────────────────────────

export class Migrator {
  constructor(db) {
    this.db = db;
    this.migrations = [];
  }

  add(version, up, down) {
    this.migrations.push({ version, up, down });
  }

  async run() {
    if (this.db.type !== 'sqlite') return;
    // أنشئ جدول migrations
    this.db.backend.exec('CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT)');
    const applied = this.db.backend.query('SELECT version FROM _migrations');
    const appliedVersions = new Set(applied.map(r => r.version));

    for (const migration of this.migrations) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`[migrations] تطبيق ${migration.version}`);
        migration.up(this.db);
        this.db.backend.exec(
          'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
          [migration.version, new Date().toISOString()]
        );
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  createDatabase,
  schema,
  Migrator,
  isNode,
  isBrowser,
};
