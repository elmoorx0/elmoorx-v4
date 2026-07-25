/**
 * elmoorx graph — رسم بياني للتبعيات
 * elmoorx graph [--ascii] [--dot] [--cycles]
 */
import { buildDependencyGraph, detectCircularDeps, findOrphans, mostImported, toAsciiGraph, toDot, formatReport } from '../deps-graph/index.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function graphProject(args) {
  const cwd = process.cwd();
  console.log(`\n  ✦ Elmoorx v4 — Dependency Graph`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المسار: ${cwd}`);

  const graph = buildDependencyGraph(cwd, {
    exclude: ['node_modules', '.elmoorx', 'dist', '.git', '.elmoorx-test-cache', 'framework-source'],
  });

  console.log(`  │ الملفات: ${graph.stats.totalFiles}`);
  console.log(`  │ Imports: ${graph.stats.totalImports}`);

  if (args.includes('--ascii')) {
    console.log(`\n  ASCII Graph:`);
    console.log(toAsciiGraph(graph, { maxDepth: 3 }));
  }

  if (args.includes('--dot')) {
    const dot = toDot(graph);
    const dotPath = join(cwd, 'dependency-graph.dot');
    writeFileSync(dotPath, dot);
    console.log(`  │ ✓ DOT file: ${dotPath}`);
    console.log(`  │ شغّل: dot -Tpng ${dotPath} -o graph.png`);
  }

  if (args.includes('--cycles')) {
    const cycles = detectCircularDeps(graph);
    console.log(`\n  Circular Dependencies: ${cycles.length}`);
    for (const cycle of cycles) {
      console.log(`  ${cycle.join(' → ')}`);
    }
  }

  // التقرير الكامل
  console.log(formatReport(graph));
}
