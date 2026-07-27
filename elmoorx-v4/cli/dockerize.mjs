/**
 * elmoorx dockerize — يولّد Dockerfile + docker-compose.yml
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function dockerizeProject(options = {}) {
  const cwd = process.cwd();
  const { port = 3000, baseImage = 'node:24-alpine', force = false } = options;

  console.log(`\n  ✦ Elmoorx v4 — Dockerize`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ: ${port}`);
  console.log(`  │ الصورة: ${baseImage}`);

  // Dockerfile
  const dockerfilePath = join(cwd, 'Dockerfile');
  if (existsSync(dockerfilePath) && !force) {
    console.log(`  ⚠ Dockerfile موجود — استخدم --force للكتابة فوقه`);
  } else {
    const dockerfile = `# Elmoorx v4 — Dockerfile (مستقل عن npm)
FROM ${baseImage}

WORKDIR /app

# لا حاجة لـ npm install — كل التبعيات مدمجة!
COPY . .

# البناء
RUN node .elmoorx/elmoorx.mjs build --target=node --out=dist

# المنفذ
EXPOSE ${port}

# التشغيل
CMD ["node", "dist/server.mjs"]

# ملاحظات:
# - الحجم النهائي صغير جداً (بدون node_modules)
# - يعمل على أي architecture (alpine متعدد البنى)
# - لا يحتاج npm install في الـ container
`;
    writeFileSync(dockerfilePath, dockerfile);
    console.log(`  │ ✓ Dockerfile`);
  }

  // docker-compose.yml
  const composePath = join(cwd, 'docker-compose.yml');
  if (existsSync(composePath) && !force) {
    console.log(`  ⚠ docker-compose.yml موجود — استخدم --force`);
  } else {
    const compose = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "${port}:${port}"
    environment:
      - NODE_ENV=production
      - PORT=${port}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:${port}/"]
      interval: 30s
      timeout: 5s
      retries: 3

  # إضافة قاعدة بيانات (اختياري)
  # db:
  #   image: postgres:16-alpine
  #   environment:
  #     POSTGRES_DB: elmoorx
  #     POSTGRES_USER: elmoorx
  #     POSTGRES_PASSWORD: secret
  #   volumes:
  #     - db_data:/var/lib/postgresql/data
  #   ports:
  #     - "5432:5432"

# volumes:
#   db_data:
`;
    writeFileSync(composePath, compose);
    console.log(`  │ ✓ docker-compose.yml`);
  }

  // .dockerignore
  const dockerignorePath = join(cwd, '.dockerignore');
  if (!existsSync(dockerignorePath)) {
    writeFileSync(dockerignorePath, `node_modules/
.git/
.elmoorx-test-cache/
dist/
*.log
.env
.cache/
`);
    console.log(`  │ ✓ .dockerignore`);
  }

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل!`);
  console.log(`  │`);
  console.log(`  │ البناء:    docker build -t elmoorx-app .`);
  console.log(`  │ التشغيل:   docker run -p ${port}:${port} elmoorx-app`);
  console.log(`  │ Compose:   docker-compose up -d`);
  console.log(`  ─────────────────────────────────────\n`);
}
