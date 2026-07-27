/**
 * elmoorx migrate — إدارة database migrations
 * elmoorx seed — ملء قاعدة البيانات ببيانات تجريبية
 * elmoorx model — توليد model من schema
 */
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATIONS
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = 'migrations';
const MIGRATIONS_TABLE = '_migrations';

export async function migrateCommand(action = 'up', options = {}) {
  const cwd = process.cwd();
  const migrationsDir = join(cwd, MIGRATIONS_DIR);

  console.log(`\n  ✦ Elmoorx v4 — Migrations`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ Action: ${action}`);

  switch (action) {
    case 'create': {
      const name = options.name;
      if (!name) {
        console.error('  الاستخدام: elmoorx migrate create <name>');
        process.exit(1);
      }
      await createMigration(migrationsDir, name);
      break;
    }
    case 'up':
    case 'run':
      await runMigrations(migrationsDir, options);
      break;
    case 'down':
    case 'rollback':
      await rollbackMigration(migrationsDir, options);
      break;
    case 'status':
      await migrationStatus(migrationsDir);
      break;
    case 'list':
      await listMigrations(migrationsDir);
      break;
    default:
      console.error(`  أمر غير معروف: ${action}`);
      console.error(`  الأوامر: create, up, down, status, list`);
  }
}

async function createMigration(dir, name) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const timestamp = Date.now();
  const fileName = `${timestamp}_${name.replace(/\s+/g, '_')}.mjs`;
  const filePath = join(dir, fileName);

  const template = `// Migration: ${name}
// Created: ${new Date().toISOString()}

export async function up(db) {
  // نفّذ التغييرات هنا
  // مثال:
  // await db.exec(\`
  //   CREATE TABLE IF NOT EXISTS example (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     name TEXT NOT NULL,
  //     created_at TEXT DEFAULT CURRENT_TIMESTAMP
  //   );
  // \`);
}

export async function down(db) {
  // التراجع عن التغييرات
  // await db.exec('DROP TABLE IF EXISTS example;');
}
`;

  writeFileSync(filePath, template);
  console.log(`  │ ✓ ${fileName}`);
  console.log(`  ─────────────────────────────────────\n`);
}

async function runMigrations(dir, options) {
  if (!existsSync(dir)) {
    console.log(`  ⚠ مجلد migrations/ غير موجود`);
    console.log(`  شغّل: elmoorx migrate create <name>`);
    return;
  }

  const files = readdirSync(dir)
    .filter(f => f.endsWith('.mjs'))
    .sort();

  console.log(`  │ الملفات: ${files.length}`);

  // Load database adapter
  let db = null;
  try {
    const { createDatabase } = await import('../database/index.mjs');
    db = await createDatabase({ type: 'sqlite', path: './data/app.db' });
    // Create migrations table
    db.exec(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (version TEXT PRIMARY KEY, applied_at TEXT)`);
  } catch (err) {
    console.log(`  ⚠ لا يمكن الاتصال بقاعدة البيانات: ${err.message}`);
    console.log(`  تأكد من وجود .elmoorx/database/index.mjs`);
    return;
  }

  // Get applied migrations
  const applied = db.query(`SELECT version FROM ${MIGRATIONS_TABLE}`).map(r => r.version);
  let count = 0;

  for (const file of files) {
    if (applied.includes(file)) continue;

    console.log(`  │ → ${file}`);
    try {
      const migration = await import(`file://${join(dir, file)}`);
      if (migration.up) await migration.up(db);
      db.exec(`INSERT INTO ${MIGRATIONS_TABLE} (version, applied_at) VALUES (?, ?)`, [file, new Date().toISOString()]);
      console.log(`  │ ✓ ${file}`);
      count++;
    } catch (err) {
      console.error(`  │ ✗ ${file}: ${err.message}`);
      break;
    }
  }

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ ${count} migration(s) applied\n`);
}

async function rollbackMigration(dir, options) {
  if (!existsSync(dir)) return;

  let db = null;
  try {
    const { createDatabase } = await import('../database/index.mjs');
    db = await createDatabase({ type: 'sqlite', path: './data/app.db' });
  } catch { return; }

  const applied = db.query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version DESC`);
  if (applied.length === 0) {
    console.log(`  │ لا توجد migrations للتراجع`);
    return;
  }

  const last = applied[0].version;
  console.log(`  │ ← ${last}`);
  try {
    const migration = await import(`file://${join(dir, last)}`);
    if (migration.down) await migration.down(db);
    db.exec(`DELETE FROM ${MIGRATIONS_TABLE} WHERE version = ?`, [last]);
    console.log(`  │ ✓ تم التراجع عن ${last}`);
  } catch (err) {
    console.error(`  │ ✗ ${err.message}`);
  }
  console.log(`  ─────────────────────────────────────\n`);
}

async function migrationStatus(dir) {
  if (!existsSync(dir)) {
    console.log(`  │ مجلد migrations/ غير موجود`);
    return;
  }

  const files = readdirSync(dir).filter(f => f.endsWith('.mjs')).sort();
  let applied = [];
  try {
    const { createDatabase } = await import('../database/index.mjs');
    const db = await createDatabase({ type: 'sqlite', path: './data/app.db' });
    db.exec(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (version TEXT PRIMARY KEY, applied_at TEXT)`);
    applied = db.query(`SELECT version FROM ${MIGRATIONS_TABLE}`).map(r => r.version);
  } catch {}

  let pending = 0;
  let done = 0;
  console.log(`  │ Migrations:\n`);
  for (const file of files) {
    const isApplied = applied.includes(file);
    if (isApplied) done++; else pending++;
    console.log(`  │ ${isApplied ? '✓' : '○'} ${file}`);
  }
  console.log(`\n  │ ✓ Applied: ${done}`);
  console.log(`  │ ○ Pending: ${pending}`);
  console.log(`  ─────────────────────────────────────\n`);
}

async function listMigrations(dir) {
  if (!existsSync(dir)) {
    console.log(`  │ مجلد migrations/ غير موجود`);
    return;
  }
  const files = readdirSync(dir).filter(f => f.endsWith('.mjs')).sort();
  console.log(`  │ ${files.length} migrations:\n`);
  for (const f of files) console.log(`  │   ${f}`);
  console.log(`  ─────────────────────────────────────\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED — ملء قاعدة البيانات
// ─────────────────────────────────────────────────────────────────────────────

export async function seedCommand(options = {}) {
  const cwd = process.cwd();
  const seedDir = join(cwd, 'seeds');

  console.log(`\n  ✦ Elmoorx v4 — Database Seeder`);
  console.log(`  ─────────────────────────────────────`);

  if (!existsSync(seedDir)) {
    // Generate seed template
    mkdirSync(seedDir, { recursive: true });
    const template = `// Seed: initial data
// شغّل: elmoorx seed

export async function seed(db) {
  // أضف بيانات تجريبية هنا
  // مثال:
  // db.exec(\`
  //   INSERT INTO users (name, email) VALUES
  //   ('محمد', 'mohammed@example.com'),
  //   ('فاطمة', 'fatima@example.com');
  // \`);
  console.log('Seed completed!');
}
`;
    writeFileSync(join(seedDir, 'index.mjs'), template);
    console.log(`  │ ✓ تم إنشاء seeds/index.mjs`);
    console.log(`  │ عدّله ثم شغّل: elmoorx seed`);
    console.log(`  ─────────────────────────────────────\n`);
    return;
  }

  // Run seeds
  const files = readdirSync(seedDir).filter(f => f.endsWith('.mjs')).sort();
  console.log(`  │ Seeds: ${files.length}`);

  try {
    const { createDatabase } = await import('../database/index.mjs');
    const db = await createDatabase({ type: 'sqlite', path: './data/app.db' });

    for (const file of files) {
      console.log(`  │ → ${file}`);
      try {
        const seed = await import(`file://${join(seedDir, file)}`);
        if (seed.seed) await seed.seed(db);
        console.log(`  │ ✓ ${file}`);
      } catch (err) {
        console.error(`  │ ✗ ${file}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`  │ ✗ ${err.message}`);
  }

  console.log(`  ─────────────────────────────────────\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL — توليد model من schema
// ─────────────────────────────────────────────────────────────────────────────

export async function modelCommand(name, options = {}) {
  const cwd = process.cwd();
  const fields = options.fields || [];
  const Name = name.charAt(0).toUpperCase() + name.slice(1);
  const names = name.endsWith('y') ? name.slice(0, -1) + 'ies' : name + 's';

  console.log(`\n  ✦ Elmoorx v4 — Model Generator`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ Model: ${Name}`);
  console.log(`  │ Fields: ${fields.length}`);

  // Generate model file
  const modelDir = join(cwd, 'src', 'models');
  if (!existsSync(modelDir)) mkdirSync(modelDir, { recursive: true });

  const fieldsDef = fields.map(f => `  ${f.name}: ${f.type};`).join('\n');
  const fieldsInsert = fields.map(f => `    ${f.name}: data.${f.name} ?? null,`).join('\n');

  const modelContent = `// ${Name} model
export interface ${Name} {
  id: string;
${fieldsDef}
  createdAt: string;
  updatedAt: string;
}

export function create${Name}(data: Partial<${Name}> = {}): ${Name} {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
${fieldsInsert}
    createdAt: now,
    updatedAt: now,
  };
}

// Validation
export function validate${Name}(data: Partial<${Name}>): string[] {
  const errors: string[] = [];
${fields.filter(f => f.required).map(f => `  if (!data.${f.name}) errors.push('${f.name} is required');`).join('\n')}
  return errors;
}

// SQL Schema (for migrations)
export const ${name}Schema = \`
CREATE TABLE IF NOT EXISTS ${names} (
  id TEXT PRIMARY KEY,
${fields.map(f => `  ${f.name} ${sqlType(f.type)},`).join('\n')}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
\`;
`;

  writeFileSync(join(modelDir, `${name}.ts`), modelContent);
  console.log(`  │ ✓ src/models/${name}.ts`);

  // Generate migration
  const migDir = join(cwd, 'migrations');
  if (!existsSync(migDir)) mkdirSync(migDir, { recursive: true });
  const timestamp = Date.now();
  const migFile = `${timestamp}_create_${names}_table.mjs`;

  const migContent = `// Migration: create ${names} table
import { ${name}Schema } from '../src/models/${name}.js';

export async function up(db) {
  db.exec(${name}Schema);
}

export async function down(db) {
  db.exec('DROP TABLE IF EXISTS ${names};');
}
`;

  writeFileSync(join(migDir, migFile), migContent);
  console.log(`  │ ✓ migrations/${migFile}`);

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل! شغّل: elmoorx migrate up\n`);
}

function sqlType(tsType) {
  const map = { string: 'TEXT', number: 'REAL', boolean: 'INTEGER', date: 'TEXT' };
  return map[tsType] || 'TEXT';
}
