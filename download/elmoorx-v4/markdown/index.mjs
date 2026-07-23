/**
 * Elmoorx v4 — Markdown Renderer (بدون تبعيات)
 * ==============================================
 * يحوّل Markdown إلى HTML أو vdom:
 *   - Headings (h1-h6)
 *   - Bold, italic, strikethrough
 *   - Links, images
 *   - Lists (ordered, unordered, nested)
 *   - Code blocks + inline code
 *   - Blockquotes
 *   - Tables
 *   - Horizontal rules
 *   - Paragraphs + line breaks
 *   - GFM extensions (task lists, autolinks)
 */

import { h, $state, $effect } from '../runtime/core.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) PARSER — يحوّل Markdown إلى AST
// ─────────────────────────────────────────────────────────────────────────────

export function parseMarkdown(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // skip empty lines
    if (line.trim() === '') { i++; continue; }

    // headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, text: headingMatch[2] });
      i++; continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++; continue;
    }

    // code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3);
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', lang, code: code.join('\n') });
      continue;
    }

    // blockquote
    if (line.trim().startsWith('>')) {
      const quote = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].trim().slice(1).trim());
        i++;
      }
      blocks.push({ type: 'blockquote', text: quote.join('\n') });
      continue;
    }

    // table
    if (line.includes('|') && i + 1 < lines.length && /^[\s|-]+$/.test(lines[i + 1])) {
      const headers = line.split('|').map(s => s.trim()).filter(Boolean);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i].split('|').map(s => s.trim()).filter(Boolean);
        rows.push(cells);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // unordered list
    if (/^[-*+]\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*+]\s/, '');
        const checked = /^\[([ x])\]\s/.exec(itemText);
        items.push({
          text: checked ? itemText.slice(4) : itemText,
          checked: checked ? checked[1] === 'x' : null,
        });
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // ordered list
    if (/^\d+\.\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push({ text: lines[i].trim().replace(/^\d+\.\s/, '') });
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // paragraph (multiple lines)
    const paragraphLines = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|>|```|[-*+]\s|\d+\.\s)/.test(lines[i].trim())) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) INLINE PARSER — يحوّل inline Markdown إلى HTML
// ─────────────────────────────────────────────────────────────────────────────

export function parseInline(text) {
  let html = escapeHtml(text);

  // images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;" />');

  // links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#0ea5e9;">$1</a>');

  // autolinks
  html = html.replace(/(?<!["\w])(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:#0ea5e9;">$1</a>');

  // bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // italic: *text* or _text_
  html = html.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<em>$1</em>');
  html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

  // strikethrough: ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

  // inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:0.15rem 0.4rem;border-radius:3px;color:#0ea5e9;font-family:monospace;font-size:0.9em;">$1</code>');

  return html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) RENDER TO HTML
// ─────────────────────────────────────────────────────────────────────────────

export function renderMarkdown(md) {
  const blocks = parseMarkdown(md);
  return blocks.map(renderBlock).join('\n');
}

function renderBlock(block) {
  switch (block.type) {
    case 'heading':
      return `<h${block.level} style="color:#e2e8f0;margin:1rem 0 0.5rem;">${parseInline(block.text)}</h${block.level}>`;
    case 'hr':
      return '<hr style="border:none;border-top:1px solid #334155;margin:1.5rem 0;" />';
    case 'code':
      return `<pre style="background:#1e293b;padding:1rem;border-radius:6px;overflow-x:auto;border:1px solid #334155;direction:ltr;text-align:left;"><code style="color:#a5f3fc;font-family:monospace;">${escapeHtml(block.code)}</code></pre>`;
    case 'blockquote':
      return `<blockquote style="border-right:4px solid #0ea5e9;padding:0.5rem 1rem;margin:1rem 0;color:#94a3b8;background:rgba(14,165,233,0.05);">${parseInline(block.text)}</blockquote>`;
    case 'table':
      return renderTable(block);
    case 'ul':
      return `<ul style="margin:0.5rem 0;padding-right:1.5rem;color:#cbd5e1;">${block.items.map(item =>
        `<li${item.checked !== null ? ` style="list-style:none;margin-right:-1rem;"` : ''}>${item.checked !== null ? `<input type="checkbox" ${item.checked ? 'checked' : ''} disabled style="margin-left:0.5rem;" />` : ''} ${parseInline(item.text)}</li>`
      ).join('')}</ul>`;
    case 'ol':
      return `<ol style="margin:0.5rem 0;padding-right:1.5rem;color:#cbd5e1;">${block.items.map(item => `<li>${parseInline(item.text)}</li>`).join('')}</ol>`;
    case 'paragraph':
      return `<p style="margin:0.5rem 0;color:#cbd5e1;line-height:1.7;">${parseInline(block.text)}</p>`;
    default:
      return '';
  }
}

function renderTable(block) {
  return `<table style="width:100%;border-collapse:collapse;margin:1rem 0;">
<thead><tr>${block.headers.map(h => `<th style="padding:0.5rem;background:#1e293b;border:1px solid #334155;color:#0ea5e9;text-align:right;">${parseInline(h)}</th>`).join('')}</tr></thead>
<tbody>${block.rows.map(row => `<tr>${row.map(c => `<td style="padding:0.5rem;border:1px solid #334155;color:#cbd5e1;">${parseInline(c)}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) RENDER TO VDOM
// ─────────────────────────────────────────────────────────────────────────────

export function renderMarkdownToVdom(md) {
  const html = renderMarkdown(md);
  // نُرجع div مع innerHTML
  return h('div', {
    innerHTML: html,
    style: 'font-family:system-ui;line-height:1.6;color:#e2e8f0;',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) MARKDOWN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function Markdown(props) {
  const { source, children } = props;
  const content = source || children || '';
  return renderMarkdownToVdom(content);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) EDITOR (simple)
// ─────────────────────────────────────────────────────────────────────────────

export function MarkdownEditor(props) {
  const { initialValue = '', onChange, preview = true } = props;
  const value = $state(initialValue);

  return h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:1rem;' },
    h('div', null,
      h('h4', { style: 'color:#94a3b8;margin-bottom:0.5rem;' }, 'Editor'),
      h('textarea', {
        value: value(),
        onInput: (e) => {
          value.set(e.target.value);
          onChange?.(e.target.value);
        },
        style: 'width:100%;min-height:400px;padding:1rem;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;font-family:monospace;direction:ltr;text-align:left;font-size:0.9rem;resize:vertical;',
      })
    ),
    preview && h('div', null,
      h('h4', { style: 'color:#94a3b8;margin-bottom:0.5rem;' }, 'Preview'),
      h('div', {
        style: 'min-height:400px;padding:1rem;background:#0f172a;border:1px solid #334155;border-radius:6px;overflow:auto;',
      }, renderMarkdownToVdom(value()))
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  parseMarkdown,
  parseInline,
  renderMarkdown,
  renderMarkdownToVdom,
  Markdown,
  MarkdownEditor,
};
