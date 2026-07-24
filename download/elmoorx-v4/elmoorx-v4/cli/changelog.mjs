/**
 * elmoorx changelog — يولّد CHANGELOG من git commits
 */
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function generateChangelog(options = {}) {
  const cwd = process.cwd();
  const { output = 'CHANGELOG.md', from, to = 'HEAD' } = options;

  console.log(`\n  ✦ Elmoorx v4 — Changelog Generator`);
  console.log(`  ─────────────────────────────────────`);

  // اقرأ الإصدار الحالي
  let version = '1.0.0';
  const pkgPath = join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      version = pkg.version || version;
    } catch {}
  }

  // اجلب git commits
  let commits = [];
  try {
    const range = from ? `${from}..${to}` : to;
    const output = execSync(
      `git log ${range} --pretty=format:"%H|%s|%an|%ad" --date=short`,
      { cwd, encoding: 'utf8', timeout: 5000 }
    ).trim();
    commits = output.split('\n').filter(Boolean).map(line => {
      const [hash, subject, author, date] = line.split('|');
      return { hash, subject, author, date };
    });
  } catch (err) {
    console.log(`  ⚠ لم يتم العثور على git commits`);
    console.log(`  ${err.message}`);
    return;
  }

  if (commits.length === 0) {
    console.log(`  ⚠ لا توجد commits`);
    return;
  }

  console.log(`  │ الإصدار: ${version}`);
  console.log(`  │ Commits: ${commits.length}`);

  // صنّف commits
  const categories = {
    'feat': { title: '✨ ميزات جديدة', items: [] },
    'fix': { title: '🐛 إصلاحات', items: [] },
    'docs': { title: '📚 توثيق', items: [] },
    'style': { title: '💎 تنسيق', items: [] },
    'refactor': { title: '♻️ إعادة هيكلة', items: [] },
    'perf': { title: '⚡ أداء', items: [] },
    'test': { title: '🧪 اختبارات', items: [] },
    'chore': { title: '🔧 مهام', items: [] },
    'other': { title: '📋 أخرى', items: [] },
  };

  for (const commit of commits) {
    const match = commit.subject.match(/^(\w+)(\([^)]+\))?:\s*(.+)$/);
    if (match) {
      const type = match[1].toLowerCase();
      const scope = match[2] || '';
      const message = match[3];
      const cat = categories[type] || categories.other;
      cat.items.push({ ...commit, scope, message, type });
    } else {
      categories.other.items.push({ ...commit, message: commit.subject, scope: '', type: 'other' });
    }
  }

  // بناء الـ markdown
  const today = new Date().toISOString().slice(0, 10);
  let md = `# Changelog\n\n`;
  md += `## [${version}] - ${today}\n\n`;

  for (const [key, cat] of Object.entries(categories)) {
    if (cat.items.length === 0) continue;
    md += `### ${cat.title}\n\n`;
    for (const item of cat.items) {
      const scopeStr = item.scope ? `**${item.scope.slice(1, -1)}** ` : '';
      md += `- ${scopeStr}${item.message} (${item.hash.slice(0, 7)})\n`;
    }
    md += `\n`;
  }

  // اقرع CHANGELOG الموجود وأدمج
  const changelogPath = join(cwd, output);
  let existing = '';
  if (existsSync(changelogPath)) {
    existing = readFileSync(changelogPath, 'utf8');
    // أزل الـ header القديم
    existing = existing.replace(/^# Changelog\n\n/, '');
    md += existing;
  }

  writeFileSync(changelogPath, md);

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ تم توليد ${output}`);
  console.log(`  │ الفئات:`);
  for (const [key, cat] of Object.entries(categories)) {
    if (cat.items.length > 0) {
      console.log(`  │   ${cat.title}: ${cat.items.length}`);
    }
  }
  console.log(`  ─────────────────────────────────────\n`);
}
