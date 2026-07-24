/**
 * elmoorx scan — فحص أمني للكود
 */
import { scanDir, formatReport } from '../security/index.mjs';

export async function scanProject(options = {}) {
  const cwd = process.cwd();
  console.log(`\n  ✦ Elmoorx v4 — Security Scan`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المسح: ${cwd}`);

  const results = scanDir(cwd, {
    exclude: ['node_modules', '.elmoorx', 'dist', '.git', '.elmoorx-test-cache', 'framework-source'],
  });

  console.log(formatReport(results));

  // exit code بناءً على الـ severity
  const { generateReport } = await import('../security/index.mjs');
  const report = generateReport(results);

  if (report.criticalCount > 0) {
    console.log(`  ⚠ يوجد ${report.criticalCount} مشكلة حرجة — يجب إصلاحها!\n`);
    if (!options.ignoreErrors) process.exit(1);
  } else if (report.highCount > 0) {
    console.log(`  ⚠ يوجد ${report.highCount} مشكلة عالية الأولوية\n`);
  } else {
    console.log(`  ✓ الكود آمن\n`);
  }
}
