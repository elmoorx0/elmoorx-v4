/**
 * Elmoorx v4 — Dependency Graph (بدون تبعيات)
 * ===========================================
 * يحلل تبعيات المشروع:
 *   - استخراج imports/exports
 *   - بناء graph
 *   - اكتشاف circular dependencies
 *   - رسم graph (ASCII + DOT)
 *   - إحصائيات
 *   - تحديد الـ orphan modules
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, extname, basename, relative, dirname, resolve as resolvePath } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// 1) EXTRACT IMPORTS
// ─────────────────────────────────────────────────────────────────────────────

export function extractImports(code, filePath) {
  const imports = [];
  const patterns = [
    // import X from 'path'
    /import\s+(?:([_\w]+)(?:\s*,\s*\{([^}]+)\})?|\{([^}]+)\}|\*\s+as\s+([_\w]+))\s+from\s+['"]([^'"]+)['"]/g,
    // import 'path'
    /import\s+['"]([^'"]+)['"]/g,
    // dynamic import('path')
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // require('path')
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const importPath = match[5] || match[1] || match[6];
      if (importPath) {
        const resolved = resolveImportPath(importPath, filePath);
        if (resolved) {
          imports.push({
            raw: importPath,
            resolved,
            type: importPath.startsWith('.') || importPath.startsWith('/') ? 'relative' : 'external',
          });
        }
      }
    }
  }

  return imports;
}

function resolveImportPath(importPath, fromFile) {
  // external
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null; // تجاهل الـ external
  }

  const fromDir = dirname(fromFile);
  let resolved = resolvePath(fromDir, importPath);

  // أضف امتدادات
  const extensions = ['', '.mjs', '.js', '.ts', '.tsx', '.jsx', '/index.mjs', '/index.js', '/index.ts'];
  for (const ext of extensions) {
    if (existsSync(resolved + ext)) return resolved + ext;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) BUILD GRAPH
// ─────────────────────────────────────────────────────────────────────────────

export function buildDependencyGraph(dir, options = {}) {
  const {
    exclude = ['node_modules', '.elmoorx', 'dist', '.git', '.elmoorx-test-cache', 'framework-source'],
    extensions = ['.js', '.mjs', '.ts', '.tsx', '.jsx'],
  } = options;

  const nodes = new Map(); // filePath → { imports, importedBy }

  // اجمع كل الملفات
  const files = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    const entries = readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  };

  walk(dir);

  // حلل كل ملف
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const imports = extractImports(content, file);
    nodes.set(file, {
      file,
      imports: imports.map(i => i.resolved).filter(Boolean),
      importedBy: [],
    });
  }

  // املأ importedBy
  for (const [file, node] of nodes) {
    for (const imported of node.imports) {
      if (nodes.has(imported)) {
        nodes.get(imported).importedBy.push(file);
      }
    }
  }

  return {
    nodes,
    files: Array.from(nodes.keys()),
    stats: {
      totalFiles: nodes.size,
      totalImports: Array.from(nodes.values()).reduce((s, n) => s + n.imports.length, 0),
      avgImports: nodes.size > 0
        ? (Array.from(nodes.values()).reduce((s, n) => s + n.imports.length, 0) / nodes.size).toFixed(2)
        : 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) DETECT CIRCULAR DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────

export function detectCircularDeps(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const path = [];

  const dfs = (file) => {
    if (recursionStack.has(file)) {
      // cycle found
      const cycleStart = path.indexOf(file);
      cycles.push(path.slice(cycleStart).concat(file));
      return;
    }
    if (visited.has(file)) return;

    visited.add(file);
    recursionStack.add(file);
    path.push(file);

    const node = graph.nodes.get(file);
    if (node) {
      for (const imported of node.imports) {
        if (graph.nodes.has(imported)) {
          dfs(imported);
        }
      }
    }

    path.pop();
    recursionStack.delete(file);
  };

  for (const file of graph.files) {
    if (!visited.has(file)) dfs(file);
  }

  return cycles;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) FIND ORPHAN MODULES (not imported by anyone)
// ─────────────────────────────────────────────────────────────────────────────

export function findOrphans(graph) {
  const orphans = [];
  for (const [file, node] of graph.nodes) {
    if (node.importedBy.length === 0 && !file.endsWith('index.mjs') && !file.endsWith('index.tsx')) {
      orphans.push(file);
    }
  }
  return orphans;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) MOST IMPORTED MODULES
// ─────────────────────────────────────────────────────────────────────────────

export function mostImported(graph, limit = 10) {
  const sorted = Array.from(graph.nodes.values())
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, limit);
  return sorted.map(n => ({
    file: n.file,
    importedBy: n.importedBy.length,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) ASCII GRAPH
// ─────────────────────────────────────────────────────────────────────────────

export function toAsciiGraph(graph, options = {}) {
  const { maxDepth = 2, showExternal = false } = options;
  const lines = [];
  const visited = new Set();

  const render = (file, depth = 0, prefix = '') => {
    if (depth > maxDepth) return;
    if (visited.has(file)) {
      lines.push(`${prefix}↻ ${basename(file)} (circular)`);
      return;
    }
    visited.add(file);

    const node = graph.nodes.get(file);
    if (!node) return;

    const name = depth === 0 ? basename(file) : basename(file);
    lines.push(`${prefix}${depth === 0 ? '' : '├─ '}${name}`);

    for (let i = 0; i < node.imports.length; i++) {
      const imported = node.imports[i];
      const isLast = i === node.imports.length - 1;
      render(imported, depth + 1, prefix + (isLast ? '   ' : '│  '));
    }
  };

  // ابدأ من الملفات التي ليس لها importers (entry points)
  const entries = Array.from(graph.nodes.values())
    .filter(n => n.importedBy.length === 0);

  for (const entry of entries) {
    render(entry.file);
    lines.push('');
    visited.clear();
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) DOT FORMAT (for Graphviz)
// ─────────────────────────────────────────────────────────────────────────────

export function toDot(graph) {
  const lines = ['digraph dependencies {', '  rankdir=LR;', '  node [shape=box, fontname="Arial"];', ''];

  // nodes
  for (const file of graph.files) {
    const name = basename(file);
    lines.push(`  "${file}" [label="${name}"];`);
  }

  // edges
  for (const [file, node] of graph.nodes) {
    for (const imported of node.imports) {
      if (graph.nodes.has(imported)) {
        lines.push(`  "${file}" -> "${imported}";`);
      }
    }
  }

  lines.push('}');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) FORMAT REPORT
// ─────────────────────────────────────────────────────────────────────────────

export function formatReport(graph) {
  const cycles = detectCircularDeps(graph);
  const orphans = findOrphans(graph);
  const top = mostImported(graph, 5);

  let output = '';
  output += `\n  ✦ Elmoorx v4 — Dependency Graph Report\n`;
  output += `  ${'═'.repeat(50)}\n`;
  output += `  │ الملفات:              ${graph.stats.totalFiles}\n`;
  output += `  │ إجمالي الـ imports:    ${graph.stats.totalImports}\n`;
  output += `  │ متوسط imports/ملف:     ${graph.stats.avgImports}\n`;
  output += `  │ Circular deps:        ${cycles.length}\n`;
  output += `  │ Orphan modules:       ${orphans.length}\n`;
  output += `  ${'═'.repeat(50)}\n`;

  if (cycles.length > 0) {
    output += `\n  ⚠ Circular Dependencies:\n`;
    output += `  ${'─'.repeat(50)}\n`;
    for (const cycle of cycles.slice(0, 5)) {
      output += `  ${cycle.map(f => basename(f)).join(' → ')}\n`;
    }
    if (cycles.length > 5) {
      output += `  ... و ${cycles.length - 5} أخرى\n`;
    }
  }

  if (orphans.length > 0) {
    output += `\n  📦 Orphan Modules (غير مستوردة):\n`;
    output += `  ${'─'.repeat(50)}\n`;
    for (const orphan of orphans.slice(0, 10)) {
      output += `  • ${relative(process.cwd(), orphan)}\n`;
    }
    if (orphans.length > 10) {
      output += `  ... و ${orphans.length - 10} أخرى\n`;
    }
  }

  if (top.length > 0) {
    output += `\n  🏆 الأكثر استيراداً:\n`;
    output += `  ${'─'.repeat(50)}\n`;
    for (const t of top) {
      output += `  ${String(t.importedBy).padStart(3)}x  ${relative(process.cwd(), t.file)}\n`;
    }
  }

  return output;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  extractImports,
  buildDependencyGraph,
  detectCircularDeps,
  findOrphans,
  mostImported,
  toAsciiGraph,
  toDot,
  formatReport,
};
