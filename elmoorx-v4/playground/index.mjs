/**
 * Elmoorx v4 — Code Playground (بدون تبعيات)
 * ============================================
 * محرر كود تفاعلي مع:
 *   - تبويبات متعددة (HTML, CSS, JS)
 *   - معاينة حية
 *   - حفظ في localStorage
 *   - مشاركة عبر URL
 *   - تنسيق الكود
 *   - تحميل الملفات
 */

import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = resolve(__dirname, '..');

export async function startPlayground(port = 9200) {
  console.log(`\n  ✦ Elmoorx v4 — Code Playground`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ: ${port}`);

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generatePlaygroundHTML());
      return;
    }

    // خدمة runtime
    if (url.pathname.startsWith('/.elmoorx/')) {
      const file = join(FRAMEWORK_ROOT, url.pathname.replace(/^\/\.elmoorx\//, ''));
      if (existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(readFileSync(file, 'utf8'));
        return;
      }
    }

    // خدمة modules
    const moduleMatch = url.pathname.match(/^\/(?:\.elmoorx\/)?(runtime|router|store|ui|charts|utils|markdown|forms|animation|i18n|http|graphql)\/?(.*)$/);
    if (moduleMatch) {
      const [, moduleName, rest] = moduleMatch;
      const subPath = rest ? `${moduleName}/${rest}` : `${moduleName}/index.mjs`;
      const file = join(FRAMEWORK_ROOT, subPath);
      if (existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(readFileSync(file, 'utf8'));
        return;
      }
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  server.listen(port, () => {
    console.log(`  │ جاهز ✓\n  ─────────────────────────────────────`);
    console.log(`\n  → http://localhost:${port}\n`);
  });
}

function generatePlaygroundHTML() {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elmoorx v4 — Playground</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { background: #1e293b; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
    header h1 { color: #0ea5e9; font-size: 1.25rem; }
    .toolbar button { background: #0ea5e9; color: white; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; margin-left: 0.5rem; font-size: 0.85rem; }
    .toolbar button.secondary { background: #334155; }
    main { display: grid; grid-template-columns: 1fr 1fr; flex: 1; overflow: hidden; }
    .editor-panel { display: flex; flex-direction: column; border-left: 1px solid #334155; }
    .tabs { display: flex; background: #1e293b; border-bottom: 1px solid #334155; }
    .tab { padding: 0.5rem 1rem; cursor: pointer; color: #94a3b8; border-bottom: 2px solid transparent; font-size: 0.85rem; }
    .tab.active { color: #0ea5e9; border-bottom-color: #0ea5e9; }
    .tab-content { flex: 1; display: none; }
    .tab-content.active { display: block; }
    .tab-content textarea { width: 100%; height: 100%; background: #0f172a; color: #e2e8f0; border: none; padding: 0.75rem; font-family: 'Courier New', monospace; font-size: 0.85rem; resize: none; outline: none; direction: ltr; text-align: left; line-height: 1.6; tab-size: 2; }
    .preview-panel { display: flex; flex-direction: column; border-left: 1px solid #334155; }
    .preview-header { padding: 0.5rem 1rem; background: #1e293b; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; }
    .preview-header button { background: #334155; color: #94a3b8; border: none; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem; }
    iframe { flex: 1; background: white; border: none; width: 100%; }
    .console { background: #0f172a; border-top: 1px solid #334155; height: 150px; overflow-y: auto; padding: 0.5rem; font-family: monospace; font-size: 0.8rem; }
    .console-line { padding: 0.15rem 0; color: #94a3b8; }
    .console-line.error { color: #ef4444; }
    .console-line.warn { color: #f59e0b; }
    .console-line.info { color: #0ea5e9; }
    .status { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-left: 0.5rem; }
    .status.ok { background: #10b981; }
    .status.err { background: #ef4444; }
  </style>
</head>
<body>
  <header>
    <h1>✦ Elmoorx Playground</h1>
    <div class="toolbar">
      <button class="secondary" onclick="formatCode()">📝 تنسيق</button>
      <button class="secondary" onclick="saveCode()">💾 حفظ</button>
      <button class="secondary" onclick="shareCode()">🔗 مشاركة</button>
      <button class="secondary" onclick="downloadCode()">⬇ تحميل</button>
      <button onclick="runCode()">▶ تشغيل</button>
    </div>
  </header>
  <main>
    <div class="editor-panel">
      <div class="tabs">
        <div class="tab active" onclick="switchTab('js')">JavaScript</div>
        <div class="tab" onclick="switchTab('html')">HTML</div>
        <div class="tab" onclick="switchTab('css')">CSS</div>
      </div>
      <div class="tab-content active" id="tab-js">
        <textarea id="code-js" spellcheck="false" placeholder="// اكتب كود Elmoorx هنا..."></textarea>
      </div>
      <div class="tab-content" id="tab-html">
        <textarea id="code-html" spellcheck="false" placeholder="<!-- HTML هنا -->"></textarea>
      </div>
      <div class="tab-content" id="tab-css">
        <textarea id="code-css" spellcheck="false" placeholder="/* CSS هنا */"></textarea>
      </div>
    </div>
    <div class="preview-panel">
      <div class="preview-header">
        <span>معاينة <span class="status ok" id="status-dot"></span></span>
        <button onclick="runCode()">تحديث</button>
      </div>
      <iframe id="preview" sandbox="allow-scripts allow-same-origin"></iframe>
      <div class="console" id="console-output">
        <div class="console-line info">→ Console جاهز</div>
      </div>
    </div>
  </main>

  <script>
    // الكود الافتراضي
    const defaultCode = {
      js: \`import { h, \\$state, \\$effect, mount } from '/.elmoorx/runtime/core.mjs';

mount(() => {
  const count = \\$state(0);
  const doubled = \\$computed(() => count() * 2);

  \\$effect(() => {
    document.title = 'Count: ' + count();
  });

  return h('div', {
    style: 'padding:2rem;text-align:center;font-family:system-ui;'
  },
    h('h1', { style: 'color:#0ea5e9;' }, '✦ Elmoorx Playground'),
    h('p', { style: 'color:#94a3b8;margin:0.5rem 0;' }, 'عدّل الكود وشاهد التغيير!'),
    h('div', { style: 'font-size:3rem;color:#0ea5e9;margin:1rem 0;' },
      () => count()
    ),
    h('div', { style: 'color:#10b981;margin-bottom:1rem;' },
      'الضعف: ', () => doubled()
    ),
    h('div', { style: 'display:flex;gap:0.5rem;justify-content:center;' },
      h('button', {
        onClick: () => count.set(c => c - 1),
        style: 'padding:0.75rem 1.5rem;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.2rem;'
      }, '−'),
      h('button', {
        onClick: () => count.set(0),
        style: 'padding:0.75rem 1.5rem;background:#64748b;color:white;border:none;border-radius:8px;cursor:pointer;'
      }, 'تصفير'),
      h('button', {
        onClick: () => count.set(c => c + 1),
        style: 'padding:0.75rem 1.5rem;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1.2rem;'
      }, '+')
    )
  );
}, '#app');
\`,
      html: \`<div id="app"></div>\`,
      css: \`body { background: #0f172a; color: #e2e8f0; }\`
    };

    // تحميل الكود المحفوظ
    const saved = localStorage.getItem('elmoorx-playground');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        document.getElementById('code-js').value = data.js || defaultCode.js;
        document.getElementById('code-html').value = data.html || defaultCode.html;
        document.getElementById('code-css').value = data.css || defaultCode.css;
      } catch {
        loadDefault();
      }
    } else {
      loadDefault();
    }

    function loadDefault() {
      document.getElementById('code-js').value = defaultCode.js;
      document.getElementById('code-html').value = defaultCode.html;
      document.getElementById('code-css').value = defaultCode.css;
    }

    // Tab switching
    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('tab-' + tab).classList.add('active');
    }

    // Run code
    function runCode() {
      const js = document.getElementById('code-js').value;
      const html = document.getElementById('code-html').value;
      const css = document.getElementById('code-css').value;

      const doc = \`
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>\${css}</style>
</head><body>
\${html}
<script type="module">
\${js}
</script>
<script>
// Console capture
const origLog = console.log;
const origErr = console.error;
const origWarn = console.warn;
window.addEventListener('error', (e) => {
  parent.postMessage({ type: 'console', level: 'error', message: e.message }, '*');
});
console.log = function(...args) {
  parent.postMessage({ type: 'console', level: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
  origLog.apply(console, args);
};
console.error = function(...args) {
  parent.postMessage({ type: 'console', level: 'error', message: args.join(' ') }, '*');
  origErr.apply(console, args);
};
console.warn = function(...args) {
  parent.postMessage({ type: 'console', level: 'warn', message: args.join(' ') }, '*');
  origWarn.apply(console, args);
};
</script>
</body></html>\`;

      const iframe = document.getElementById('preview');
      iframe.srcdoc = doc;

      // Status
      document.getElementById('status-dot').className = 'status ok';

      // Clear console
      document.getElementById('console-output').innerHTML = '<div class="console-line info">→ تشغيل...</div>';
    }

    // Console message handler
    window.addEventListener('message', (e) => {
      if (e.data.type === 'console') {
        const output = document.getElementById('console-output');
        const line = document.createElement('div');
        line.className = 'console-line ' + (e.data.level === 'log' ? '' : e.data.level);
        line.textContent = e.data.message;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
      }
    });

    // Save
    function saveCode() {
      const data = {
        js: document.getElementById('code-js').value,
        html: document.getElementById('code-html').value,
        css: document.getElementById('code-css').value,
      };
      localStorage.setItem('elmoorx-playground', JSON.stringify(data));
      alert('✓ تم الحفظ!');
    }

    // Share
    function shareCode() {
      const data = {
        js: document.getElementById('code-js').value,
        html: document.getElementById('code-html').value,
        css: document.getElementById('code-css').value,
      };
      const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
      const url = location.origin + location.pathname + '#code=' + encoded;
      navigator.clipboard.writeText(url).then(() => {
        alert('✓ تم نسخ رابط المشاركة!');
      }).catch(() => {
        prompt('انسخ الرابط:', url);
      });
    }

    // Download
    function downloadCode() {
      const data = {
        js: document.getElementById('code-js').value,
        html: document.getElementById('code-html').value,
        css: document.getElementById('code-css').value,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'playground-code.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Format
    function formatCode() {
      const activeTab = document.querySelector('.tab.active').textContent.toLowerCase();
      const textarea = document.getElementById('code-' + (activeTab === 'javascript' ? 'js' : activeTab));
      let code = textarea.value;
      // Simple formatting: fix indentation
      let indent = 0;
      let formatted = '';
      for (const line of code.split('\\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('}') || trimmed.startsWith(')') || trimmed.startsWith(']')) indent = Math.max(0, indent - 1);
        formatted += '  '.repeat(indent) + trimmed + '\\n';
        for (const ch of trimmed) {
          if (ch === '{' || ch === '(' || ch === '[') indent++;
          if (ch === '}' || ch === ')' || ch === ']') indent = Math.max(0, indent - 1);
        }
      }
      textarea.value = formatted;
    }

    // Auto-run on load
    setTimeout(runCode, 500);

    // Auto-run on code change (debounced)
    let debounceTimer;
    document.querySelectorAll('textarea').forEach(t => {
      t.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(runCode, 1000);
      });
    });

    // Tab key support
    document.querySelectorAll('textarea').forEach(t => {
      t.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          e.target.value = e.target.value.slice(0, start) + '  ' + e.target.value.slice(end);
          e.target.selectionStart = e.target.selectionEnd = start + 2;
        }
      });
    });
  </script>
</body>
</html>`;
}
