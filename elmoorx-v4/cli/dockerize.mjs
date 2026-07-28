/**
 * elmoorx dockerize — يولّد Dockerfile + docker-compose.yml + Kubernetes manifests
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function dockerizeProject(options = {}) {
  const cwd = process.cwd();
  const {
    port = 3000,
    baseImage = 'node:24-alpine',
    force = false,
    replicas = 3,
    redis = true,
    prometheus = true,
    grafana = true,
    kubernetes = false,
  } = options;

  console.log(`\n  ✦ Elmoorx v4 — Dockerize`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ: ${port}`);
  console.log(`  │ الصورة: ${baseImage}`);
  console.log(`  │ Replicas: ${replicas}`);
  console.log(`  │ Redis: ${redis ? '✓' : '✗'}`);
  console.log(`  │ Prometheus: ${prometheus ? '✓' : '✗'}`);
  console.log(`  │ Grafana: ${grafana ? '✓' : '✗'}`);
  console.log(`  │ Kubernetes: ${kubernetes ? '✓' : '✗'}`);

  // Dockerfile (multi-stage production)
  const dockerfilePath = join(cwd, 'Dockerfile');
  if (existsSync(dockerfilePath) && !force) {
    console.log(`  ⚠ Dockerfile موجود — استخدم --force للكتابة فوقه`);
  } else {
    const dockerfile = `# Elmoorx v4 — Multi-stage Production Dockerfile
FROM ${baseImage} AS builder
WORKDIR /app
COPY . .
RUN node elmoorx.mjs build --target=node --out=dist 2>&1 || true

FROM ${baseImage} AS production
RUN apk add --no-cache tini ca-certificates
RUN addgroup -g 1001 -S nodejs && adduser -S elmoorx -u 1001 -G nodejs
WORKDIR /app
COPY --from=builder --chown=elmoorx:nodejs /app /app
EXPOSE ${port}
ENV NODE_ENV=production PORT=${port} HOST=0.0.0.0
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:${port}/health || exit 1
USER elmoorx
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "elmoorx.mjs", "serve-prod", "--port=${port}"]
`;
    writeFileSync(dockerfilePath, dockerfile);
    console.log(`  │ ✓ Dockerfile (multi-stage, non-root, tini)`);
  }

  // docker-compose.yml
  const composePath = join(cwd, 'docker-compose.yml');
  if (existsSync(composePath) && !force) {
    console.log(`  ⚠ docker-compose.yml موجود — استخدم --force`);
  } else {
    const services = [
      `  app:
    build: .
    image: elmoorx-app:latest
    deploy:
      replicas: ${replicas}
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    environment:
      - NODE_ENV=production
      - PORT=${port}
      - HOST=0.0.0.0${redis ? `
      - REDIS_URL=redis://redis:6379
      - RATE_LIMIT_STORE=redis
      - SESSION_STORE=redis` : ''}
    ${redis ? 'depends_on:\n      redis:\n        condition: service_healthy\n    ' : ''}healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:${port}/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped
    networks:
      - elmoorx-net`,
    ];

    if (redis) {
      services.push(`  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - elmoorx-net
    restart: unless-stopped`);
    }

    if (prometheus) {
      services.push(`  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./deploy/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - elmoorx-net
    restart: unless-stopped`);
    }

    if (grafana) {
      services.push(`  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - elmoorx-net
    restart: unless-stopped`);
    }

    const volumes = [];
    if (redis) volumes.push('  redis-data:');
    if (prometheus) volumes.push('  prometheus-data:');
    if (grafana) volumes.push('  grafana-data:');

    const compose = `version: '3.9'

services:
${services.join('\n\n')}

networks:
  elmoorx-net:
    driver: bridge

volumes:
${volumes.join('\n')}
`;
    writeFileSync(composePath, compose);
    console.log(`  │ ✓ docker-compose.yml${redis ? ' (with Redis)' : ''}${prometheus ? ' + Prometheus' : ''}${grafana ? ' + Grafana' : ''}`);
  }

  // .dockerignore
  const dockerignorePath = join(cwd, '.dockerignore');
  if (!existsSync(dockerignorePath) || force) {
    writeFileSync(dockerignorePath, `node_modules/
.git/
.elmoorx-test-cache/
dist/
*.log
.env
.env.local
.cache/
.git/
coverage/
.nyc_output/
.DS_Store
`);
    console.log(`  │ ✓ .dockerignore`);
  }

  // deploy/ directory
  const deployDir = join(cwd, 'deploy');
  if (!existsSync(deployDir)) mkdirSync(deployDir, { recursive: true });

  // prometheus.yml
  if (prometheus && (!existsSync(join(deployDir, 'prometheus.yml')) || force)) {
    writeFileSync(join(deployDir, 'prometheus.yml'), `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'elmoorx'
    metrics_path: /metrics
    static_configs:
      - targets: ['app:${port}']
`);
    console.log(`  │ ✓ deploy/prometheus.yml`);
  }

  // Kubernetes manifests
  if (kubernetes) {
    const k8sDir = join(deployDir, 'kubernetes');
    if (!existsSync(k8sDir)) mkdirSync(k8sDir, { recursive: true });
    if (!existsSync(join(k8sDir, 'manifests.yaml')) || force) {
      writeFileSync(join(k8sDir, 'manifests.yaml'), generateK8sManifests(port, replicas, redis));
      console.log(`  │ ✓ deploy/kubernetes/manifests.yaml`);
    }
  }

  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ ✓ مكتمل!`);
  console.log(`  │`);
  console.log(`  │ البناء:    docker build -t elmoorx-app .`);
  console.log(`  │ التشغيل:   docker run -p ${port}:${port} elmoorx-app`);
  console.log(`  │ Compose:   docker-compose up -d`);
  if (kubernetes) {
    console.log(`  │ K8s:       kubectl apply -f deploy/kubernetes/manifests.yaml`);
  }
  console.log(`  │ Health:    curl http://localhost:${port}/health`);
  console.log(`  │ Metrics:   curl http://localhost:${port}/metrics`);
  console.log(`  ─────────────────────────────────────\n`);
}

function generateK8sManifests(port, replicas, withRedis) {
  return `# Elmoorx v4 — Kubernetes Manifests
apiVersion: v1
kind: Namespace
metadata:
  name: elmoorx
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: elmoorx-config
  namespace: elmoorx
data:
  NODE_ENV: "production"
  PORT: "${port}"
  HOST: "0.0.0.0"${withRedis ? `
  REDIS_URL: "redis://redis:6379"
  RATE_LIMIT_STORE: "redis"
  SESSION_STORE: "redis"` : ''}
---
apiVersion: v1
kind: Secret
metadata:
  name: elmoorx-secret
  namespace: elmoorx
type: Opaque
stringData:
  JWT_SECRET: "REPLACE_WITH_YOUR_SECRET"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elmoorx-app
  namespace: elmoorx
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: elmoorx
  template:
    metadata:
      labels:
        app: elmoorx
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "${port}"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: elmoorx
          image: elmoorx-app:latest
          ports:
            - containerPort: ${port}
          envFrom:
            - configMapRef:
                name: elmoorx-config
            - secretRef:
                name: elmoorx-secret
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: ${port}
            initialDelaySeconds: 5
            periodSeconds: 10
      terminationGracePeriodSeconds: 60
---
apiVersion: v1
kind: Service
metadata:
  name: elmoorx-service
  namespace: elmoorx
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: ${port}
  selector:
    app: elmoorx
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: elmoorx-hpa
  namespace: elmoorx
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: elmoorx-app
  minReplicas: ${replicas}
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: elmoorx-pdb
  namespace: elmoorx
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: elmoorx
${withRedis ? `---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: elmoorx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          volumeMounts:
            - name: redis-data
              mountPath: /data
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: redis-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: elmoorx
spec:
  ports:
    - port: 6379
  selector:
    app: redis
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: elmoorx
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi` : ''}
`;
}
