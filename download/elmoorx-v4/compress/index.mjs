/**
 * Elmoorx v4 — Compression (Gzip + Brotli)
 * =========================================
 * يضغط ملفات الإنتاج:
 *   - Gzip (Node.js zlib)
 *   - Brotli (Node.js zlib)
 *   - ضغط تلقائي للأصول الكبيرة
 *   - دعم .gz و .br extensions
 */

import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { writeFileSync, readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) COMPRESS FILE
// ─────────────────────────────────────────────────────────────────────────────

export function compressFile(filePath, options = {}) {
  const {
    gzip = true,
    brotli = true,
    level = 9,
    threshold = 1024,
  } = options;

  if (!existsSync(filePath)) {
    return null;
  }

  const stat = statSync(filePath);
  if (stat.size < threshold) {
    return { skipped: true, reason: 'too small' };
  }

  const content = readFileSync(filePath);
  const results = {};

  if (gzip) {
    try {
      const gzipped = gzipSync(content, { level });
      writeFileSync(filePath + '.gz', gzipped);
      results.gzip = {
        size: gzipped.length,
        savings: ((1 - gzipped.length / content.length) * 100).toFixed(1) + '%',
        path: filePath + '.gz',
      };
    } catch (err) {
      results.gzip = { error: err.message };
    }
  }

  if (brotli) {
    try {
      const compressed = brotliCompressSync(content, {
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
      });
      writeFileSync(filePath + '.br', compressed);
      results.brotli = {
        size: compressed.length,
        savings: ((1 - compressed.length / content.length) * 100).toFixed(1) + '%',
        path: filePath + '.br',
      };
    } catch (err) {
      results.brotli = { error: err.message };
    }
  }

  return {
    original: { size: content.length, path: filePath },
    ...results,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) COMPRESS DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

export function compressDir(dir, options = {}) {
  const {
    extensions = ['.html', '.js', '.mjs', '.css', '.json', '.svg', '.xml', '.txt'],
    exclude = ['.gz', '.br'],
    ...compressOptions
  } = options;

  const results = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    const entries = readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (extensions.includes(ext) && !exclude.some(e => entry.name.endsWith(e))) {
          results.push(compressFile(fullPath, compressOptions));
        }
      }
    }
  };

  walk(dir);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) COMPRESSION STATS
// ─────────────────────────────────────────────────────────────────────────────

export function printCompressionStats(results) {
  let totalOriginal = 0;
  let totalGzip = 0;
  let totalBrotli = 0;
  let fileCount = 0;

  for (const r of results) {
    if (!r || r.skipped) continue;
    totalOriginal += r.original?.size || 0;
    totalGzip += r.gzip?.size || 0;
    totalBrotli += r.brotli?.size || 0;
    fileCount++;
  }

  return {
    fileCount,
    totalOriginal,
    totalGzip,
    totalBrotli,
    gzipSavings: totalOriginal > 0 ? ((1 - totalGzip / totalOriginal) * 100).toFixed(1) + '%' : '0%',
    brotliSavings: totalOriginal > 0 ? ((1 - totalBrotli / totalOriginal) * 100).toFixed(1) + '%' : '0%',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  compressFile,
  compressDir,
  printCompressionStats,
};
