/**
 * elmoorx metrics — تحليل تعقيد وجودة الكود
 */
import { analyzeDir, formatReport } from '../metrics/index.mjs';

export async function metricsProject(options = {}) {
  const cwd = process.cwd();
  console.log(`\n  ✦ Elmoorx v4 — Code Metrics`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ التحليل: ${cwd}`);

  const result = analyzeDir(cwd, {
    exclude: ['node_modules', '.elmoorx', 'dist', '.git', '.elmoorx-test-cache', 'framework-source'],
  });

  console.log(formatReport(result));

  const { summary } = result;
  if (summary.avgMaintainability < 50) {
    console.log(`  ⚠ قابلية الصيانة منخفضة (${summary.avgMaintainability}/100)\n`);
  } else if (summary.avgMaintainability >= 80) {
    console.log(`  ✓ قابلية صيانة ممتازة\n`);
  } else {
    console.log(`  ○ قابلية صيانة جيدة\n`);
  }
}
