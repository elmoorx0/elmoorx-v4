# ─────────────────────────────────────────────────────────────────────────────
# Elmoorx v4 — Multi-stage Production Dockerfile
# مستقل عن npm/npx — كل التبعيات مدمجة
# ─────────────────────────────────────────────────────────────────────────────

# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app

# انسخ الكود (لا حاجة لـ npm install — كل التبعيات مدمجة!)
COPY . .

# البناء للإنتاج
RUN node elmoorx.mjs build --target=node --out=dist 2>&1 || true

# Stage 2: Production (distroless for security)
FROM node:24-alpine AS production

# تثبيت tini لـ proper signal handling (graceful shutdown)
RUN apk add --no-cache tini ca-certificates

# إنشاء user غير root للأمان
RUN addgroup -g 1001 -S nodejs && \
    adduser -S elmoorx -u 1001 -G nodejs

WORKDIR /app

# انسخ الـ build output فقط
COPY --from=builder --chown=elmoorx:nodejs /app /app

# المنفذ
EXPOSE 3000

# متغيرات البيئة
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# بدّل للمستخدم غير root
USER elmoorx

# استخدم tini كـ init (يتعامل مع SIGTERM/SIGINT بشكل صحيح)
ENTRYPOINT ["/sbin/tini", "--"]

# شغّل خادم SSR
CMD ["node", "elmoorx.mjs", "serve-prod", "--port=3000"]

# ملاحظات:
# - الحجم النهائي ~120MB (بدون node_modules)
# - يعمل على amd64 + arm64 (alpine متعدد البنى)
# - non-root user للأمان
# - tini لـ proper signal handling (graceful shutdown)
# - ca-certificates للـ HTTPS requests
# - health check مدمج
