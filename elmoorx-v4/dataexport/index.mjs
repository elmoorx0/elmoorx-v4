/**
 * Elmoorx v4 — Data Export & Import Utilities
 * =============================================
 * أدوات تصدير واستيراد البيانات:
 *   - exportCSV, exportJSON, exportHTML, exportMarkdown
 *   - importCSV, importJSON
 *   - downloadFile, copyToClipboard
 *   - ExportButton component
 */

import { h, $state } from '../runtime/core.mjs';
import { writeFileSync } from 'node:fs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function exportCSV(data, columns, options = {}) {
  const { delimiter = ',', includeHeader = true, quote = '"', filename = 'export.csv', bom = true } = options;

  const escapeCSV = (val) => {
    const str = String(val ?? '');
    if (str.includes(delimiter) || str.includes(quote) || str.includes('\n')) {
      return quote + str.replace(new RegExp(quote, 'g'), quote + quote) + quote;
    }
    return str;
  };

  const rows = [];
  if (includeHeader) rows.push(columns.map(c => escapeCSV(c.label || c.key)).join(delimiter));
  for (const row of data) rows.push(columns.map(c => escapeCSV(row[c.key])).join(delimiter));

  return { content: (bom ? '\uFEFF' : '') + rows.join('\n'), filename, mime: 'text/csv;charset=utf-8' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) JSON EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function exportJSON(data, options = {}) {
  const { pretty = true, filename = 'export.json', fields = null } = options;
  const exportData = fields ? data.map(row => {
    const filtered = {};
    for (const f of fields) filtered[f] = row[f];
    return filtered;
  }) : data;
  return { content: pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData), filename, mime: 'application/json' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) HTML TABLE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function exportHTML(data, columns, options = {}) {
  const { filename = 'export.html', title = 'تصدير البيانات', styling = true } = options;
  const style = styling ? '<style>body{font-family:system-ui;padding:2rem;direction:rtl}h1{color:#0ea5e9}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:#94a3b8;padding:0.75rem;text-align:right}td{padding:0.75rem;border-bottom:1px solid #e2e8f0}</style>' : '';
  const header = columns.map(c => `<th>${c.label || c.key}</th>`).join('');
  const body = data.map(row => `<tr>${columns.map(c => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`).join('');
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${title}</title>${style}</head><body><h1>${title}</h1><p>${data.length} سجل</p><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  return { content: html, filename, mime: 'text/html;charset=utf-8' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) MARKDOWN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function exportMarkdown(data, columns, options = {}) {
  const { filename = 'export.md' } = options;
  const header = `| ${columns.map(c => c.label || c.key).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const rows = data.map(row => `| ${columns.map(c => String(row[c.key] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`).join('\n');
  return { content: `${header}\n${sep}\n${rows}`, filename, mime: 'text/markdown' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) CSV IMPORT
// ─────────────────────────────────────────────────────────────────────────────

export function importCSV(csvText, options = {}) {
  const { delimiter = ',', hasHeader = true, quote = '"' } = options;
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1);
  const rows = [];
  let current = '', inQuotes = false, row = [];
  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i], next = csvText[i + 1];
    if (ch === quote) {
      if (inQuotes && next === quote) { current += quote; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) { row.push(current); current = ''; continue; }
    if (ch === '\n' && !inQuotes) { row.push(current); rows.push(row); row = []; current = ''; continue; }
    if (ch === '\r') continue;
    current += ch;
  }
  if (current || row.length > 0) { row.push(current); rows.push(row); }
  if (!hasHeader) return rows;
  const headers = rows[0] || [];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((hd, i) => { obj[hd.trim()] = row[i] ?? ''; });
    return obj;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) JSON IMPORT
// ─────────────────────────────────────────────────────────────────────────────

export function importJSON(jsonText) {
  try { return JSON.parse(jsonText); }
  catch (err) { throw new Error(`JSON غير صالح: ${err.message}`); }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) DOWNLOAD HELPER
// ─────────────────────────────────────────────────────────────────────────────

export function downloadFile(content, filename, mime = 'text/plain') {
  if (typeof document !== 'undefined') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  } else if (typeof writeFileSync !== 'undefined') {
    writeFileSync(filename, content);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) CLIPBOARD
// ─────────────────────────────────────────────────────────────────────────────

export async function copyToClipboard(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  if (typeof document !== 'undefined') {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); return true; }
    catch { return false; }
    finally { document.body.removeChild(ta); }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) EXPORT BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export function ExportButton(props) {
  const { data = [], columns = [], formats = ['csv', 'json', 'html'], filename = 'export', ...rest } = props;
  const open = $state(false);

  const handleExport = (format) => {
    let result;
    switch (format) {
      case 'csv': result = exportCSV(data, columns, { filename: filename + '.csv' }); break;
      case 'json': result = exportJSON(data, { filename: filename + '.json' }); break;
      case 'html': result = exportHTML(data, columns, { filename: filename + '.html' }); break;
      case 'md': result = exportMarkdown(data, columns, { filename: filename + '.md' }); break;
    }
    if (result) downloadFile(result.content, result.filename, result.mime);
    open.set(false);
  };

  const icons = { csv: '📊', json: '📄', html: '🌐', md: '📝' };
  const labels = { csv: 'CSV', json: 'JSON', html: 'HTML', md: 'Markdown' };

  return h('div', { style: 'position:relative;display:inline-block;', ...rest },
    h('button', {
      onClick: () => open.set(!open()),
      style: 'padding:0.4rem 0.8rem;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:4px;cursor:pointer;font-size:0.85rem;',
    }, '⬇ تصدير'),
    open() && h('div', {
      style: 'position:absolute;top:100%;left:0;background:#1e293b;border:1px solid #334155;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:100;padding:0.25rem;margin-top:0.25rem;min-width:120px;',
    },
      formats.map(fmt =>
        h('button', {
          key: fmt,
          onClick: () => handleExport(fmt),
          style: 'display:flex;align-items:center;gap:0.5rem;width:100%;padding:0.4rem 0.6rem;background:none;border:none;color:#e2e8f0;cursor:pointer;font-size:0.85rem;border-radius:4px;text-align:right;',
        },
          h('span', null, icons[fmt] || '📄'),
          h('span', null, labels[fmt] || fmt)
        )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  exportCSV, exportJSON, exportHTML, exportMarkdown,
  importCSV, importJSON,
  downloadFile, copyToClipboard,
  ExportButton,
};
