/**
 * elmoorx visual — يفتح Visual Builder في المتصفح
 * محرر مرئي Drag-Drop يولّد كود Elmoorx
 */
import { createServer } from 'node:http';
import { WebSocketServer } from '../vendor/ws-shim.mjs';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export async function startVisualBuilder(port = 8080) {
  console.log(`\n  ✦ Elmoorx Visual Builder`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  │ المنفذ: ${port}`);

  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(BUILDER_HTML);
      return;
    }
    if (req.url === '/runtime/core.mjs') {
      // serve runtime
      try {
        const runtime = readFileSyncRuntime();
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(runtime);
        return;
      } catch {}
    }
    res.writeHead(404);
    res.end('Not Found');
  });

  // WebSocket لإرسال الكود المُولّد إلى الـ CLI
  const wss = new WebSocketServer({ server, path: '/__ws__' });
  let clientWs = null;
  wss.on('connection', (ws) => {
    clientWs = ws;
    console.log(`  │ متصل ✓`);
  });

  function readFileSyncRuntime() {
    const { readFileSync } = require('node:fs');
    const { dirname } = require('node:path');
    const { fileURLToPath } = require('node:url');
    const runtimePath = join(dirname(fileURLToPath(import.meta.url)), '..', 'runtime', 'core.mjs');
    return readFileSync(runtimePath, 'utf8');
  }

  server.listen(port, () => {
    console.log(`  │ جاهز ✓\n  ─────────────────────────────────────`);
    console.log(`\n  → http://localhost:${port}\n`);
    console.log(`  اسحب المكونات على Canvas، ثم انقر "تصدير الكود" لحفظه في src/`);
  });
}

const BUILDER_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Elmoorx Visual Builder</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #0f172a; color: #e2e8f0; height: 100vh; display: flex; flex-direction: column; }
    header { background: #1e293b; padding: 0.75rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
    header h1 { font-size: 1.25rem; color: #0ea5e9; }
    .toolbar button { background: #0ea5e9; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-left: 0.5rem; }
    .toolbar button.secondary { background: #334155; }
    main { display: grid; grid-template-columns: 250px 1fr 350px; flex: 1; overflow: hidden; }
    .palette { background: #1e293b; padding: 1rem; overflow-y: auto; border-left: 1px solid #334155; }
    .palette h3 { color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem; margin-top: 1rem; }
    .palette-item { background: #334155; padding: 0.5rem; border-radius: 4px; margin-bottom: 0.25rem; cursor: grab; user-select: none; }
    .palette-item:hover { background: #475569; }
    .canvas { background: #f8fafc; overflow: auto; padding: 2rem; }
    .canvas-drop { min-height: 600px; background: white; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 1rem; min-height: 500px; }
    .canvas-drop.drag-over { border-color: #0ea5e9; background: #f0f9ff; }
    .preview-element { margin: 0.5rem 0; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; position: relative; cursor: pointer; }
    .preview-element:hover { border-color: #0ea5e9; }
    .preview-element.selected { border-color: #0ea5e9; background: #f0f9ff; }
    .preview-element .actions { position: absolute; top: -8px; left: -8px; display: none; }
    .preview-element:hover .actions { display: flex; gap: 2px; }
    .preview-element .actions button { width: 18px; height: 18px; padding: 0; font-size: 10px; background: #ef4444; color: white; border: none; border-radius: 50%; cursor: pointer; }
    .inspector { background: #1e293b; padding: 1rem; overflow-y: auto; border-right: 1px solid #334155; }
    .inspector h3 { color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem; }
    .inspector .field { margin-bottom: 0.75rem; }
    .inspector label { display: block; color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.25rem; }
    .inspector input, .inspector textarea, .inspector select { width: 100%; padding: 0.4rem; background: #0f172a; border: 1px solid #334155; border-radius: 4px; color: #e2e8f0; font-size: 0.85rem; }
    .code-output { background: #0f172a; color: #a5f3fc; padding: 1rem; border-radius: 4px; font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; max-height: 300px; overflow-y: auto; direction: ltr; text-align: left; }
  </style>
</head>
<body>
  <header>
    <h1>✦ Elmoorx Visual Builder</h1>
    <div class="toolbar">
      <button onclick="exportCode()" class="secondary">📄 تصدير الكود</button>
      <button onclick="saveFile()">💾 حفظ في src/</button>
      <button onclick="clearCanvas()" class="secondary">🗑️ مسح</button>
    </div>
  </header>
  <main>
    <aside class="palette">
      <h3>تخطيط</h3>
      <div class="palette-item" draggable="true" data-type="div">▢ Div</div>
      <div class="palette-item" draggable="true" data-type="section">▤ Section</div>
      <div class="palette-item" draggable="true" data-type="header">Header</div>
      <div class="palette-item" draggable="true" data-type="footer">Footer</div>
      <div class="palette-item" draggable="true" data-type="main">Main</div>

      <h3>عناصر</h3>
      <div class="palette-item" draggable="true" data-type="h1">H1 عنوان</div>
      <div class="palette-item" draggable="true" data-type="h2">H2 عنوان</div>
      <div class="palette-item" draggable="true" data-type="p">¶ فقرة</div>
      <div class="palette-item" draggable="true" data-type="span">Span</div>
      <div class="palette-item" draggable="true" data-type="a">🔗 رابط</div>
      <div class="palette-item" draggable="true" data-type="img">🖼️ صورة</div>

      <h3>نماذج</h3>
      <div class="palette-item" draggable="true" data-type="button">🔘 زر</div>
      <div class="palette-item" draggable="true" data-type="input">Input</div>
      <div class="palette-item" draggable="true" data-type="textarea">Text Area</div>
      <div class="palette-item" draggable="true" data-type="label">Label</div>
      <div class="palette-item" draggable="true" data-type="form">Form</div>

      <h3>قوائم</h3>
      <div class="palette-item" draggable="true" data-type="ul">• قائمة</div>
      <div class="palette-item" draggable="true" data-type="li">عنصر قائمة</div>

      <h3>قوالب جاهزة</h3>
      <div class="palette-item" draggable="true" data-type="template-hero">★ Hero Section</div>
      <div class="palette-item" draggable="true" data-type="template-card">★ Card</div>
      <div class="palette-item" draggable="true" data-type="template-form">★ Login Form</div>
      <div class="palette-item" draggable="true" data-type="template-counter">★ Counter</div>
    </aside>

    <div class="canvas">
      <div class="canvas-drop" id="canvas" ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="dragLeave(event)" onclick="deselect(event)">
        <p style="color:#94a3b8;text-align:center;padding:2rem;">اسحب المكونات هنا للبدء...</p>
      </div>
    </div>

    <aside class="inspector" id="inspector">
      <h3>الخصائص</h3>
      <p style="color:#64748b;font-size:0.85rem;">اختر عنصراً لتحرير خصائصه</p>
      <div id="props"></div>

      <h3 style="margin-top:2rem;">الكود المُولّد</h3>
      <div class="code-output" id="code">// الكود سيظهر هنا</div>
    </aside>
  </main>

  <script>
    let tree = []; // شجرة العناصر
    let selectedId = null;
    let nextId = 1;

    function drop(e) {
      e.preventDefault();
      const type = e.dataTransfer.getData('type');
      if (!type) return;
      const el = createElement(type);
      tree.push(el);
      render();
      updateCode();
    }
    function allowDrop(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
    function dragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
    function deselect(e) { if (e.target.id === 'canvas') { selectedId = null; render(); renderInspector(); } }

    document.querySelectorAll('.palette-item').forEach(el => {
      el.addEventListener('dragstart', (e) => e.dataTransfer.setData('type', el.dataset.type));
    });

    function createElement(type) {
      const id = nextId++;
      const base = { id, type, props: {}, children: [] };

      // قوالب جاهزة
      if (type === 'template-hero') {
        return { id, type: 'div', props: { style: 'text-align:center;padding:4rem;background:#0f172a;color:white;' }, children: [
          { id: nextId++, type: 'h1', props: {}, children: [{ id: nextId++, type: 'text', text: 'مرحباً بك في Elmoorx' }] },
          { id: nextId++, type: 'p', props: {}, children: [{ id: nextId++, type: 'text', text: 'إطار العمل المستقل عن npm' }] },
          { id: nextId++, type: 'button', props: { style: 'padding:0.75rem 2rem;background:#0ea5e9;color:white;border:none;border-radius:6px;cursor:pointer;' }, children: [{ id: nextId++, type: 'text', text: 'ابدأ الآن' }] },
        ]};
      }
      if (type === 'template-card') {
        return { id, type: 'div', props: { style: 'background:white;border-radius:8px;padding:1.5rem;box-shadow:0 4px 6px rgba(0,0,0,0.1);' }, children: [
          { id: nextId++, type: 'h3', props: {}, children: [{ id: nextId++, type: 'text', text: 'عنوان البطاقة' }] },
          { id: nextId++, type: 'p', props: {}, children: [{ id: nextId++, type: 'text', text: 'وصف البطاقة هنا' }] },
        ]};
      }
      if (type === 'template-form') {
        return { id, type: 'form', props: { style: 'max-width:400px;margin:2rem auto;' }, children: [
          { id: nextId++, type: 'input', props: { type: 'email', placeholder: 'البريد', style: 'width:100%;padding:0.5rem;margin-bottom:0.5rem;' }, children: [] },
          { id: nextId++, type: 'input', props: { type: 'password', placeholder: 'كلمة المرور', style: 'width:100%;padding:0.5rem;margin-bottom:0.5rem;' }, children: [] },
          { id: nextId++, type: 'button', props: { style: 'width:100%;padding:0.75rem;background:#0ea5e9;color:white;border:none;border-radius:4px;cursor:pointer;' }, children: [{ id: nextId++, type: 'text', text: 'تسجيل الدخول' }] },
        ]};
      }
      if (type === 'template-counter') {
        return { id, type: 'div', props: { 'data-template': 'counter' }, children: [
          { id: nextId++, type: 'button', props: { 'data-action': 'decrement', style: 'padding:0.5rem 1rem;background:#ef4444;color:white;border:none;border-radius:4px;cursor:pointer;' }, children: [{ id: nextId++, type: 'text', text: '−' }] },
          { id: nextId++, type: 'span', props: { style: 'margin:0 1rem;font-size:1.5rem;' }, children: [{ id: nextId++, type: 'text', text: '0' }] },
          { id: nextId++, type: 'button', props: { 'data-action': 'increment', style: 'padding:0.5rem 1rem;background:#10b981;color:white;border:none;border-radius:4px;cursor:pointer;' }, children: [{ id: nextId++, type: 'text', text: '+' }] },
        ]};
      }

      // عناصر عادية
      const defaults = {
        h1: 'عنوان رئيسي', h2: 'عنوان فرعي', p: 'نص الفقرة هنا', span: 'نص', a: 'رابط',
        button: 'زر', label: 'تسمية', li: 'عنصر قائمة',
      };
      if (defaults[type]) base.children.push({ id: nextId++, type: 'text', text: defaults[type] });
      if (type === 'input') base.props = { type: 'text', placeholder: 'إدخال...' };
      if (type === 'img') base.props = { src: 'https://via.placeholder.com/150', alt: 'صورة' };
      if (type === 'a') base.props = { href: '#' };
      return base;
    }

    function render() {
      const canvas = document.getElementById('canvas');
      canvas.innerHTML = '';
      if (tree.length === 0) {
        canvas.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:2rem;">اسحب المكونات هنا للبدء...</p>';
        return;
      }
      tree.forEach(el => canvas.appendChild(renderElement(el)));
    }

    function renderElement(el) {
      if (el.type === 'text') {
        return document.createTextNode(el.text);
      }
      const dom = document.createElement(el.type);
      // props
      for (const [k, v] of Object.entries(el.props || {})) {
        if (k === 'style') dom.style.cssText = v;
        else if (k.startsWith('on')) dom.addEventListener(k.slice(2).toLowerCase(), () => alert('event: ' + k));
        else dom.setAttribute(k, v);
      }
      // children
      (el.children || []).forEach(c => dom.appendChild(renderElement(c)));
      // selection
      dom.dataset.id = el.id;
      dom.style.outline = selectedId === el.id ? '2px solid #0ea5e9' : '';
      dom.style.cursor = 'pointer';
      dom.onclick = (e) => { e.stopPropagation(); selectElement(el.id); };

      // delete button
      if (selectedId === el.id) {
        const del = document.createElement('button');
        del.textContent = '×';
        del.style.cssText = 'position:absolute;top:-8px;left:-8px;width:18px;height:18px;padding:0;font-size:10px;background:#ef4444;color:white;border:none;border-radius:50%;cursor:pointer;';
        del.onclick = (e) => { e.stopPropagation(); deleteElement(el.id); };
        dom.style.position = 'relative';
        dom.appendChild(del);
      }
      return dom;
    }

    function selectElement(id) {
      selectedId = id;
      render();
      renderInspector();
    }

    function deleteElement(id) {
      const remove = (arr) => {
        const i = arr.findIndex(e => e.id === id);
        if (i >= 0) { arr.splice(i, 1); return true; }
        for (const e of arr) if (e.children && remove(e.children)) return true;
        return false;
      };
      remove(tree);
      selectedId = null;
      render();
      renderInspector();
      updateCode();
    }

    function clearCanvas() {
      if (confirm('مسح كل العناصر؟')) {
        tree = []; selectedId = null; nextId = 1;
        render(); renderInspector(); updateCode();
      }
    }

    function findElement(id, arr = tree) {
      for (const e of arr) {
        if (e.id === id) return e;
        if (e.children) { const f = findElement(id, e.children); if (f) return f; }
      }
      return null;
    }

    function renderInspector() {
      const propsDiv = document.getElementById('props');
      if (!selectedId) {
        propsDiv.innerHTML = '<p style="color:#64748b;font-size:0.85rem;">اختر عنصراً لتحرير خصائصه</p>';
        return;
      }
      const el = findElement(selectedId);
      if (!el) return;
      let html = '<div class="field"><label>النوع</label><input value="' + el.type + '" disabled></div>';
      if (el.type === 'text') {
        html += '<div class="field"><label>النص</label><textarea oninput="updateProp(' + el.id + ', \\'text\\', this.value)">' + (el.text || '') + '</textarea></div>';
      } else {
        html += '<div class="field"><label>style</label><textarea oninput="updateProp(' + el.id + ', \\'style\\', this.value)" placeholder="CSS">' + (el.props.style || '') + '</textarea></div>';
        html += '<div class="field"><label>class</label><input value="' + (el.props.class || '') + '" oninput="updateProp(' + el.id + ', \\'class\\', this.value)"></div>';
        if (el.type === 'a') html += '<div class="field"><label>href</label><input value="' + (el.props.href || '') + '" oninput="updateProp(' + el.id + ', \\'href\\', this.value)"></div>';
        if (el.type === 'img') {
          html += '<div class="field"><label>src</label><input value="' + (el.props.src || '') + '" oninput="updateProp(' + el.id + ', \\'src\\', this.value)"></div>';
          html += '<div class="field"><label>alt</label><input value="' + (el.props.alt || '') + '" oninput="updateProp(' + el.id + ', \\'alt\\', this.value)"></div>';
        }
        if (el.type === 'input') {
          html += '<div class="field"><label>type</label><input value="' + (el.props.type || 'text') + '" oninput="updateProp(' + el.id + ', \\'type\\', this.value)"></div>';
          html += '<div class="field"><label>placeholder</label><input value="' + (el.props.placeholder || '') + '" oninput="updateProp(' + el.id + ', \\'placeholder\\', this.value)"></div>';
        }
        if (el.type === 'button') {
          html += '<div class="field"><label>onclick (حدث)</label><input placeholder="() => alert(\\"hi\\")" oninput="updateProp(' + el.id + ', \\'onClick\\', this.value)" value="' + (el.props.onClick || '') + '"></div>';
        }
      }
      propsDiv.innerHTML = html;
    }

    function updateProp(id, key, value) {
      const el = findElement(id);
      if (!el) return;
      if (key === 'text') el.text = value;
      else { el.props = el.props || {}; el.props[key] = value; }
      render();
      updateCode();
    }

    function generateCode(el, indent = '  ') {
      if (el.type === 'text') return JSON.stringify(el.text);
      const props = Object.entries(el.props || {})
        .filter(([k, v]) => v !== '' && v != null)
        .map(([k, v]) => k.startsWith('on') ? k + '={' + v + '}' : k + '=' + JSON.stringify(v))
        .join(' ');
      const tag = el.type;
      if (!el.children || el.children.length === 0) {
        return indent + '<' + tag + (props ? ' ' + props : '') + ' />';
      }
      const children = el.children.map(c => generateCode(c, indent + '  ')).join('\\n');
      return indent + '<' + tag + (props ? ' ' + props : '') + '>\\n' + children + '\\n' + indent + '</' + tag + '>';
    }

    function updateCode() {
      const code = tree.map(el => generateCode(el)).join('\\n');
      let full = '';
      // تحقق إن كان counter template
      const hasCounter = JSON.stringify(tree).includes('data-template');
      if (hasCounter) {
        full = "import { h, \\$state } from '@elmoorx/runtime';\\n\\nexport function Counter() {\\n  const count = \\$state(0);\\n  return (\\n" + code + "\\n  );\\n}\\n";
      } else {
        full = "import { h } from '@elmoorx/runtime';\\n\\nexport function Component() {\\n  return (\\n" + code + "\\n  );\\n}\\n";
      }
      document.getElementById('code').textContent = full;
      window.__generatedCode = full;
    }

    function exportCode() {
      const code = window.__generatedCode || '';
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Component.tsx'; a.click();
      URL.revokeObjectURL(url);
    }

    async function saveFile() {
      const code = window.__generatedCode || '';
      const name = prompt('اسم الملف:', 'VisualComponent');
      if (!name) return;
      // نرسل الكود عبر WebSocket
      const ws = new WebSocket('ws://' + location.host + '/__ws__');
      ws.onopen = () => { ws.send(JSON.stringify({ type: 'save', filename: name + '.tsx', code })); ws.close(); alert('✓ تم الحفظ في src/' + name + '.tsx'); };
      ws.onerror = () => alert('✗ فشل الاتصال');
    }

    updateCode();
  </script>
</body>
</html>`;
