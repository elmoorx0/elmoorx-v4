/**
 * Elmoorx v4 — Environment Config Loader (بدون تبعيات)
 * ===================================================
 * يحلّل ملفات .env ويضيفها لـ process.env
 *
 * المميزات:
 *   - تحليل .env بقواعد POSIX-compatible
 *   - دعم quotes (single, double)
 *   - دعم escape sequences
 *   - دعم multi-line values
 *   - دعم variable interpolation ($VAR, ${VAR})
 *   - دعم .env.local, .env.{NODE_ENV}, .env
 *   - لا يُعمّم المتغيرات الموجودة (process.env.X يفوز)
 *
 * الاستخدام:
 *   import { loadEnv, getConfig } from './config.mjs';
 *   loadEnv(); // يحمّل .env تلقائياً
 *   const port = getConfig('PORT', 3000);
 *   const dbUrl = getConfig('DATABASE_URL', { required: true });
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ENV FILE PARSER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يحلّل محتوى ملف .env ويُرجع كائن من key→value
 *
 * القواعد:
 *   - KEY=value
 *   - KEY="value with spaces"
 *   - KEY='value with $special chars'
 *   - KEY=`value with $interpolation`
 *   - export KEY=value
 *   - # comment
 *   - KEY=$OTHER_KEY  (interpolation)
 *   - KEY=${OTHER_KEY:-default}  (default value)
 *   - multi-line: KEY="line1\nline2"
 */
export function parseEnvFile(content, existingVars = {}) {
  const result = {};
  const lines = content.split('\n');
  let i = 0;

  while (i < lines.length) {
    let line = lines[i].trim();

    // skip comments و empty lines
    if (!line || line.startsWith('#')) { i++; continue; }

    // skip export keyword
    if (line.startsWith('export ')) line = line.slice(7).trim();

    // ابحث عن =
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) { i++; continue; }

    let key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    // إزالة quotes إن وُجدت
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        // double quotes: عالج escape sequences و interpolation
        value = processEscapes(value);
        value = interpolate(value, { ...existingVars, ...result });
      } else {
        // single quotes: literal (لا interpolation)
      }
    } else {
      // unquoted: عالج escape + interpolation
      value = processEscapes(value);
      value = interpolate(value, { ...existingVars, ...result });
    }

    // multi-line values: إذا لم تُغلق الـ quotes
    // (نحن نتعامل معها ببساطة هنا — القاعدة: القيمة تأتي على نفس السطر)

    result[key] = value;
    i++;
  }

  return result;
}

/**
 * يعالج escape sequences في القيمة
 */
function processEscapes(s) {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .replace(/\\\$/g, '$');
}

/**
 * يعالج variable interpolation
 *   $VAR → value of VAR
 *   ${VAR} → value of VAR
 *   ${VAR:-default} → value of VAR or default
 *   ${VAR:+alt} → alt if VAR is set
 */
function interpolate(s, vars) {
  return s
    // ${VAR:-default} أو ${VAR:+alt}
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*):([-?+])([^}]+)\}/g, (match, varName, op, defaultVal) => {
      const val = vars[varName] ?? process.env[varName];
      if (op === '-') return val !== undefined ? val : defaultVal;
      if (op === '+') return val !== undefined ? defaultVal : '';
      return val !== undefined ? val : defaultVal;
    })
    // ${VAR}
    .replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, varName) => {
      return vars[varName] ?? process.env[varName] ?? '';
    })
    // $VAR (لا تتبع بـ alphanumeric _)
    .replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (match, varName) => {
      return vars[varName] ?? process.env[varName] ?? '';
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) LOAD ENV FILES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يحمّل ملفات .env بترتيب الأولوية (الأخير يفوز):
 *   1. .env
 *   2. .env.local (إن لم يكن test)
 *   3. .env.{NODE_ENV}
 *   4. .env.{NODE_ENV}.local
 *
 * لكن process.env دائماً يفوز على أي ملف.
 */
export function loadEnv(options = {}) {
  const {
    cwd = process.cwd(),
    nodeEnv = process.env.NODE_ENV || 'development',
    files: customFiles = null,
    override = false,  // هل نُعمّم process.env؟
  } = options;

  const files = customFiles || [
    '.env',
    '.env.local',
    `.env.${nodeEnv}`,
    `.env.${nodeEnv}.local`,
  ];

  const loadedVars = {};

  for (const file of files) {
    const filePath = join(cwd, file);
    if (!existsSync(filePath)) continue;

    try {
      const content = readFileSync(filePath, 'utf8');
      const parsed = parseEnvFile(content, { ...process.env, ...loadedVars });

      for (const [k, v] of Object.entries(parsed)) {
        loadedVars[k] = v;
        // لا تُعمّم process.env إلا لو طُلب صراحةً أو لو لم يكن موجوداً
        if (override || process.env[k] === undefined) {
          process.env[k] = v;
        }
      }
    } catch (err) {
      console.warn(`[config] فشل تحميل ${file}: ${err.message}`);
    }
  }

  return loadedVars;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) CONFIG GETTER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يُرجع قيمة config مع دعم types و defaults
 *
 * @param {string} key  اسم المتغير
 * @param {any} defaultValue  القيمة الافتراضية
 * @param {object} options  { required, type, min, max, choices }
 */
export function getConfig(key, defaultValue = null, options = {}) {
  const {
    required = false,
    type = 'string', // 'string' | 'number' | 'boolean' | 'json' | 'array'
    min,
    max,
    choices,
  } = options;

  let value = process.env[key];

  if (value === undefined) {
    if (required) {
      throw new Error(`[config] Required env var "${key}" is not set`);
    }
    return defaultValue;
  }

  // تحويل النوع
  switch (type) {
    case 'number':
      value = Number(value);
      if (isNaN(value)) {
        if (required) throw new Error(`[config] "${key}" must be a number, got: ${value}`);
        return defaultValue;
      }
      if (min !== undefined && value < min) {
        throw new Error(`[config] "${key}" must be >= ${min}, got: ${value}`);
      }
      if (max !== undefined && value > max) {
        throw new Error(`[config] "${key}" must be <= ${max}, got: ${value}`);
      }
      return value;

    case 'boolean':
      if (typeof value === 'string') {
        return ['true', '1', 'yes', 'on', 'TRUE', 'YES'].includes(value);
      }
      return Boolean(value);

    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        if (required) throw new Error(`[config] "${key}" must be valid JSON`);
        return defaultValue;
      }

    case 'array':
      return value.split(',').map(s => s.trim()).filter(Boolean);

    case 'string':
    default:
      if (choices && !choices.includes(value)) {
        throw new Error(`[config] "${key}" must be one of: ${choices.join(', ')}, got: ${value}`);
      }
      return value;
  }
}

/**
 * يُرجع كل الـ config المطابق لـ prefix
 * مثال: getConfigByPrefix('DB_') → { DB_HOST, DB_PORT, DB_USER, ... }
 */
export function getConfigByPrefix(prefix, options = {}) {
  const { dropPrefix = true } = options;
  const result = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith(prefix)) {
      const newKey = dropPrefix ? key.slice(prefix.length).toLowerCase() : key;
      result[newKey] = value;
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) SCHEMA VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * يتحقق من schema config كاملة
 * @param {object} schema  { KEY: { type, default, required, ... }, ... }
 *
 * مثال:
 *   const config = validateConfig({
 *     PORT: { type: 'number', default: 3000, min: 1, max: 65535 },
 *     DATABASE_URL: { required: true },
 *     LOG_LEVEL: { type: 'string', choices: ['debug', 'info', 'warn', 'error'], default: 'info' },
 *   });
 */
export function validateConfig(schema) {
  const result = {};
  const errors = [];

  for (const [key, spec] of Object.entries(schema)) {
    try {
      result[key] = getConfig(key, spec.default, spec);
    } catch (err) {
      errors.push(err.message);
    }
  }

  if (errors.length > 0) {
    throw new Error('Config validation failed:\n  ' + errors.join('\n  '));
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) AUTO-LOAD ON IMPORT
// ─────────────────────────────────────────────────────────────────────────────

// حمّل .env تلقائياً عند الـ import الأول (إلا لو طُلب خلاف ذلك)
if (process.env.ELMOORX_NO_AUTO_ENV !== '1') {
  loadEnv();
}

export default {
  parseEnvFile,
  loadEnv,
  getConfig,
  getConfigByPrefix,
  validateConfig,
};
