// Cloudflare Workers adapter — Elmoorx v4
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // خدمة الملفات الثابتة من الـ bundle
    if (path === '/' || path === '/index.html') {
      return new Response(INDEX_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (path === '/runtime/core.mjs') {
      return new Response(RUNTIME_CORE, { headers: { 'Content-Type': 'application/javascript' } });
    }
    // TODO: serve more assets

    return new Response('Not Found', { status: 404 });
  },
};
