
export default function Home() {
  return {
    tag: 'div',
    props: { style: 'font-family:system-ui;padding:2rem;max-width:800px;margin:0 auto;' },
    children: [
      { tag: 'h1', props: { style: 'color:#0ea5e9;' }, children: ['Elmoorx v4 — Production Ready'] },
      { tag: 'p', props: { style: 'color:#475569;font-size:1.1rem;' }, children: ['تطبيق إنتاجي كامل مع كل الميدلوير'] },
      { tag: 'div', props: { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem;margin-top:2rem;' }, children: [
        { tag: 'div', props: { style: 'background:#f0f9ff;padding:1.5rem;border-radius:8px;border-left:4px solid #0ea5e9;' }, children: [
          { tag: 'h3', props: {}, children: ['Compression'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['gzip + brotli فوري'] }
        ]},
        { tag: 'div', props: { style: 'background:#f0fdf4;padding:1.5rem;border-radius:8px;border-left:4px solid #10b981;' }, children: [
          { tag: 'h3', props: {}, children: ['Security'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['CSP, HSTS, X-Frame-Options'] }
        ]},
        { tag: 'div', props: { style: 'background:#fef3c7;padding:1.5rem;border-radius:8px;border-left:4px solid #f59e0b;' }, children: [
          { tag: 'h3', props: {}, children: ['Observability'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['Health + Metrics + Logs'] }
        ]},
        { tag: 'div', props: { style: 'background:#fce7f3;padding:1.5rem;border-radius:8px;border-left:4px solid #ec4899;' }, children: [
          { tag: 'h3', props: {}, children: ['Reliability'] },
          { tag: 'p', props: { style: 'color:#64748b;' }, children: ['Graceful shutdown'] }
        ]}
      ]},
      { tag: 'h2', props: { style: 'margin-top:3rem;' }, children: ['Endpoints'] },
      { tag: 'ul', props: { style: 'line-height:2;' }, children: [
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /'] }, ' — هذه الصفحة (SSR)'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /health'] }, ' — فحص الصحة'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /metrics'] }, ' — Prometheus metrics'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /api/posts'] }, ' — API endpoint'] },
        { tag: 'li', props: {}, children: [{ tag: 'code', props: {}, children: ['GET /blog/:slug'] }, ' — صفحة ديناميكية'] }
      ]}
    ]
  };
}
