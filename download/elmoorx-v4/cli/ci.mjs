/**
 * elmoorx ci — يولّد ملفات CI/CD (GitHub Actions, GitLab CI)
 * elmoorx init-git — يهيّئ git repo مع .gitignore وأول commit
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// ─────────────────────────────────────────────────────────────────────────────
// CI — توليد ملفات CI/CD
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCI(options = {}) {
  const cwd = process.cwd();
  const { platform = 'github', force = false, nodeVersion = '22' } = options;

  console.log(`\n  ✦ Elmoorx v4 — CI/CD Generator`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ Platform: ${platform}`);

  if (platform === 'github' || platform === 'all') {
    const githubDir = join(cwd, '.github', 'workflows');
    if (!existsSync(githubDir)) mkdirSync(githubDir, { recursive: true });

    // CI workflow — test + build
    const ciPath = join(githubDir, 'ci.yml');
    if (!existsSync(ciPath) || force) {
      writeFileSync(ciPath, `name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [${nodeVersion}, 24]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
      - name: Install
        run: |
          # لا حاجة لـ npm install — Elmoorx مستقل!
          echo "✦ Elmoorx — لا تبعيات npm"
      - name: Test
        run: ./elmoorx test
      - name: Scan
        run: ./elmoorx scan --no-exit
      - name: Metrics
        run: ./elmoorx metrics
      - name: Build
        run: ./elmoorx build --target=browser
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  build-docker:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t elmoorx-app .
      - name: Save image
        run: docker save elmoorx-app | gzip > elmoorx-app.tar.gz
`);
      console.log(`  │ ✓ .github/workflows/ci.yml`);
    }

    // Deploy workflow
    const deployPath = join(githubDir, 'deploy.yml');
    if (!existsSync(deployPath) || force) {
      writeFileSync(deployPath, `name: Deploy

on:
  release:
    types: [created]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${nodeVersion}
      - name: Build
        run: ./elmoorx build --target=browser
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
`);
      console.log(`  │ ✓ .github/workflows/deploy.yml`);
    }

    // Dependabot
    const dependabotPath = join(cwd, '.github', 'dependabot.yml');
    if (!existsSync(dependabotPath) || force) {
      writeFileSync(dependabotPath, `version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
`);
      console.log(`  │ ✓ .github/dependabot.yml`);
    }
  }

  if (platform === 'gitlab' || platform === 'all') {
    const gitlabPath = join(cwd, '.gitlab-ci.yml');
    if (!existsSync(gitlabPath) || force) {
      writeFileSync(gitlabPath, `stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:${nodeVersion}
  script:
    - ./elmoorx test
    - ./elmoorx scan --no-exit
    - ./elmoorx metrics

build:
  stage: build
  image: node:${nodeVersion}
  script:
    - ./elmoorx build --target=browser
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  image: node:${nodeVersion}
  only:
    - main
  script:
    - echo "Deploy to production"
    - ./elmoorx deploy --target=static
`);
      console.log(`  │ ✓ .gitlab-ci.yml`);
    }
  }

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل!`);
  console.log(`  │`);
  console.log(`  │ GitHub: ادفع الكود وسيتم تشغيل CI تلقائياً`);
  console.log(`  │ GitLab:  ادفع الكود وسيتم تشغيل CI تلقائياً`);
  console.log(`  ─────────────────────────────────────\n`);
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT GIT — تهيئة git repo
// ─────────────────────────────────────────────────────────────────────────────

export async function initGit(options = {}) {
  const cwd = process.cwd();
  const { force = false, message = 'Initial commit — Elmoorx v4' } = options;

  console.log(`\n  ✦ Elmoorx v4 — Git Init`);
  console.log(`  ─────────────────────────────────────`);

  // Check if git already initialized
  const gitDir = join(cwd, '.git');
  if (existsSync(gitDir) && !force) {
    console.log(`  ⚠ git مُهيأ مسبقاً — استخدم --force لإعادة التهيئة`);
    return;
  }

  // .gitignore
  const gitignorePath = join(cwd, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, `# Dependencies
node_modules/

# Build
dist/
.cache/

# Test
.elmoorx-test-cache/
coverage/

# Environment
.env
.env.local
.env.*.local

# Logs
*.log
npm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker
*.tar.gz
`);
    console.log(`  │ ✓ .gitignore`);
  }

  // git init
  try {
    execSync('git init', { cwd, stdio: 'pipe' });
    console.log(`  │ ✓ git init`);
  } catch (err) {
    console.error(`  ✗ git init فشل: ${err.message}`);
    return;
  }

  // git add
  try {
    execSync('git add -A', { cwd, stdio: 'pipe' });
    console.log(`  │ ✓ git add`);
  } catch {}

  // git commit
  try {
    execSync(`git commit -m "${message}"`, { cwd, stdio: 'pipe' });
    console.log(`  │ ✓ git commit`);
  } catch (err) {
    console.log(`  │ ⚠ git commit: ${err.message?.split('\n')[0] || 'فشل'}`);
  }

  // Show status
  try {
    const status = execSync('git status --short', { cwd, encoding: 'utf8' });
    if (status.trim()) {
      console.log(`  │ الملفات المتتبعة: ${status.trim().split('\n').length}`);
    } else {
      console.log(`  │ ✓ كل الملفات مُتبعة`);
    }
  } catch {}

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل!`);
  console.log(`  │`);
  console.log(`  │ أضف remote:  git remote add origin <url>`);
  console.log(`  │ ادفع:        git push -u origin main`);
  console.log(`  ─────────────────────────────────────\n`);
}
