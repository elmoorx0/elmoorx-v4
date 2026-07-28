#!/usr/bin/env node
/**
 * Elmoorx v4 — Load Testing Tool (بدون تبعيات)
 * ==============================================
 * يختبر أداء السيرفر تحت حمل متزامن.
 *
 * المميزات:
 *   - N طلب متزامن
 *   - معدل طلبات قابل للتحكم (requests/sec)
 *   - إحصائيات مفصّلة (latency percentiles, throughput, errors)
 *   - دعم endpoints متعددة
 *   - دعم method, body, headers مخصصة
 *
 * الاستخدام:
 *   node load-test.mjs --url=http://localhost:3000/ --concurrent=100 --duration=30
 *   node load-test.mjs --url=http://localhost:3000/api/users --method=POST --body='{"name":"test"}'
 */

import { performance } from 'node:perf_hooks';

// ─────────────────────────────────────────────────────────────────────────────
// 1) PARSE ARGS
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: 'http://localhost:3000/',
    concurrent: 10,
    duration: 10,
    rate: 0,
    method: 'GET',
    body: null,
    headers: {},
    timeout: 30,
    endpoints: null,
    json: false,
  };

  for (const arg of args) {
    const [k, v] = arg.split('=');
    switch (k) {
      case '--url': opts.url = v; break;
      case '--concurrent': opts.concurrent = parseInt(v); break;
      case '--duration': opts.duration = parseInt(v); break;
      case '--rate': opts.rate = parseInt(v); break;
      case '--method': opts.method = v; break;
      case '--body': opts.body = v; break;
      case '--header': {
        const [hk, hv] = v.split(':');
        opts.headers[hk.trim()] = hv.trim();
        break;
      }
      case '--timeout': opts.timeout = parseInt(v); break;
      case '--endpoints': opts.endpoints = v.split(',').map(s => s.trim()); break;
      case '--json': opts.json = true; break;
      case '--help':
        console.log(`
  Elmoorx v4 — Load Tester

  Usage:
    node load-test.mjs [options]

  Options:
    --url=<url>           Target URL (default: http://localhost:3000/)
    --concurrent=<n>      Concurrent requests (default: 10)
    --duration=<sec>      Test duration in seconds (default: 10)
    --rate=<n>            Requests per second (default: 0 = unlimited)
    --method=<method>     HTTP method (default: GET)
    --body=<body>         Request body (string)
    --header=<k:v>        Custom header (repeatable)
    --timeout=<sec>       Request timeout (default: 30)
    --endpoints=<a,b,c>   Multiple endpoints (round-robin)
    --json                Output JSON results

  Examples:
    node load-test.mjs --url=http://localhost:3000/ --concurrent=50 --duration=30
    node load-test.mjs --url=http://localhost:3000/api/users --method=POST --body='{"name":"test"}'
    node load-test.mjs --endpoints=/,/health,/api/users,/blog/hello
`);
        process.exit(0);
    }
  }

  return opts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) LOAD TESTER
// ─────────────────────────────────────────────────────────────────────────────

class LoadTester {
  constructor(options) {
    this.opts = options;
    this.results = [];
    this.errors = 0;
    this.success = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.activeRequests = 0;
    this.totalRequests = 0;
    this.bytesReceived = 0;
  }

  async run() {
    const { concurrent, duration, rate } = this.opts;
    console.log(`\n  ✦ Elmoorx v4 — Load Test`);
    console.log(`  ════════════════════════════════════════`);
    console.log(`  Target:       ${this.opts.url}`);
    console.log(`  Method:       ${this.opts.method}`);
    console.log(`  Concurrent:   ${concurrent}`);
    console.log(`  Duration:     ${duration}s`);
    console.log(`  Rate limit:   ${rate > 0 ? rate + ' req/s' : 'unlimited'}`);
    console.log(`  ════════════════════════════════════════\n`);

    this.startTime = performance.now();
    const endTime = this.startTime + duration * 1000;

    const workers = [];
    for (let i = 0; i < concurrent; i++) {
      workers.push(this.worker(i, endTime));
    }

    const progressInterval = setInterval(() => this.printProgress(), 1000);

    await Promise.all(workers);
    clearInterval(progressInterval);

    this.endTime = performance.now();
    this.printResults();
  }

  async worker(id, endTime) {
    const { rate } = this.opts;
    const interval = rate > 0 ? 1000 / rate : 0;

    while (performance.now() < endTime) {
      if (performance.now() < endTime) {
        await this.makeRequest(id);
        if (interval > 0) {
          await new Promise(r => setTimeout(r, interval));
        }
      }
    }
  }

  async makeRequest(id) {
    const url = this.opts.endpoints
      ? new URL(this.opts.endpoints[id % this.opts.endpoints.length], this.opts.url).href
      : this.opts.url;

    const start = performance.now();
    this.activeRequests++;
    this.totalRequests++;

    try {
      const options = {
        method: this.opts.method,
        headers: this.opts.headers,
        signal: this.signalWithTimeout(this.opts.timeout * 1000),
      };
      if (this.opts.body && ['POST', 'PUT', 'PATCH'].includes(this.opts.method)) {
        options.body = this.opts.body;
        if (!options.headers['Content-Type']) {
          options.headers['Content-Type'] = 'application/json';
        }
      }

      const res = await fetch(url, options);
      const text = await res.text();
      const duration = performance.now() - start;

      this.results.push({
        status: res.status,
        duration,
        bytes: text.length,
        success: res.status >= 200 && res.status < 400,
      });

      this.bytesReceived += text.length;
      if (res.status >= 200 && res.status < 400) {
        this.success++;
      } else {
        this.errors++;
      }
    } catch (err) {
      const duration = performance.now() - start;
      this.results.push({
        status: 0,
        duration,
        bytes: 0,
        success: false,
        error: err.message,
      });
      this.errors++;
    } finally {
      this.activeRequests--;
    }
  }

  signalWithTimeout(ms) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }

  printProgress() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const rps = this.totalRequests / elapsed;
    const avgLatency = this.results.length > 0
      ? this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length
      : 0;
    const successRate = this.totalRequests > 0
      ? (this.success / this.totalRequests * 100).toFixed(1)
      : 0;
    process.stdout.write(`\r  ${elapsed.toFixed(1)}s | ${this.totalRequests} reqs | ${rps.toFixed(0)} req/s | ${avgLatency.toFixed(0)}ms avg | ${successRate}% ok   `);
  }

  printResults() {
    const totalDuration = (this.endTime - this.startTime) / 1000;
    const rps = this.totalRequests / totalDuration;

    const sorted = this.results.map(r => r.duration).sort((a, b) => a - b);
    const p = (pct) => sorted.length > 0 ? sorted[Math.floor(sorted.length * pct / 100)].toFixed(2) : 0;
    const avg = sorted.length > 0 ? (sorted.reduce((s, d) => s + d, 0) / sorted.length).toFixed(2) : 0;
    const min = sorted.length > 0 ? sorted[0].toFixed(2) : 0;
    const max = sorted.length > 0 ? sorted[sorted.length - 1].toFixed(2) : 0;

    const successRate = (this.success / this.totalRequests * 100).toFixed(2);
    const throughputKB = (this.bytesReceived / 1024 / totalDuration).toFixed(2);

    if (this.opts.json) {
      console.log(JSON.stringify({
        totalRequests: this.totalRequests,
        success: this.success,
        errors: this.errors,
        durationSec: totalDuration.toFixed(2),
        rps: rps.toFixed(2),
        latency: {
          min: parseFloat(min),
          avg: parseFloat(avg),
          p50: parseFloat(p(50)),
          p90: parseFloat(p(90)),
          p95: parseFloat(p(95)),
          p99: parseFloat(p(99)),
          max: parseFloat(max),
        },
        successRate: parseFloat(successRate),
        throughputKBps: parseFloat(throughputKB),
      }, null, 2));
      return;
    }

    console.log(`\n\n  ════════════════════════════════════════`);
    console.log(`  📊 Results`);
    console.log(`  ════════════════════════════════════════`);
    console.log(`  Total requests:    ${this.totalRequests}`);
    console.log(`  Successful:        ${this.success} (${successRate}%)`);
    console.log(`  Errors:            ${this.errors}`);
    console.log(`  Duration:          ${totalDuration.toFixed(2)}s`);
    console.log(`  Requests/sec:      ${rps.toFixed(2)}`);
    console.log(`  Throughput:        ${throughputKB} KB/s`);
    console.log(`  ════════════════════════════════════════`);
    console.log(`  Latency (ms):`);
    console.log(`    min:             ${min}`);
    console.log(`    avg:             ${avg}`);
    console.log(`    p50:             ${p(50)}`);
    console.log(`    p90:             ${p(90)}`);
    console.log(`    p95:             ${p(95)}`);
    console.log(`    p99:             ${p(99)}`);
    console.log(`    max:             ${max}`);
    console.log(`  ════════════════════════════════════════\n`);

    const statusCounts = {};
    for (const r of this.results) {
      const key = r.status === 0 ? 'error' : r.status;
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    }
    console.log('  Status codes:');
    for (const [status, count] of Object.entries(statusCounts)) {
      const pct = (count / this.totalRequests * 100).toFixed(1);
      console.log(`    ${status}: ${count} (${pct}%)`);
    }
    console.log('');
  }
}

const opts = parseArgs();
const tester = new LoadTester(opts);
tester.run().catch(err => {
  console.error('Load test failed:', err);
  process.exit(1);
});
