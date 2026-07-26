/**
 * Elmoorx v4 — Developer Tools UI Components
 * ============================================
 * مكونات أدوات المطور:
 *   - FileExplorer (مستكشف ملفات)
 *   - CodeExplorer (متصفح كود)
 *   - DevTools (لوحة أدوات تطوير)
 *   - DebugPanel (لوحة تصحيح)
 *   - EventLog (سجل أحداث)
 *   - StateInspector (مفتش state)
 */

import { h, $state, $computed, $effect, onCleanup } from '../runtime/core.mjs';
import { theme } from './index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) FILE EXPLORER — مستكشف ملفات
// ─────────────────────────────────────────────────────────────────────────────

export function FileExplorer(props) {
  const {
    files = [], // [{ name, path, type: 'file'|'dir', children: [], size, ext }]
    onSelect,
    onToggle,
    showIcons = true,
    ...rest
  } = props;

  const renderNode = (node, depth = 0) => {
    const isDir = node.type === 'dir' || node.children;
    const hasChildren = node.children && node.children.length > 0;
    const expanded = $state(node.expanded || depth < 1);

    return h('div', { key: node.path || node.name },
      h('div', {
        onClick: () => {
          if (isDir) expanded.set(!expanded());
          else onSelect?.(node);
          onToggle?.(node);
        },
        style: `display:flex;align-items:center;gap:0.3rem;padding:0.3rem 0.4rem;cursor:pointer;border-radius:${theme.radius.sm};padding-right:${depth * 1.2 + 0.4}rem;:hover{background:${theme.colors.dark};}font-size:0.85rem;color:${theme.colors.text};`,
      },
        isDir
          ? h('span', { style: 'font-size:0.7rem;width:14px;color:' + theme.colors.textMuted }, expanded() ? '▼' : '▶')
          : h('span', { style: 'width:14px;' }),
        showIcons && h('span', { style: 'font-size:0.9rem;' },
          isDir ? (expanded() ? '📂' : '📁') : getFileIcon(node.ext || node.name)
        ),
        h('span', { style: isDir ? 'font-weight:500;' : '' }, node.name),
        !isDir && node.size && h('span', {
          style: `margin-right:auto;color:${theme.colors.textMuted};font-size:0.7rem;`,
        }, formatSize(node.size))
      ),
      hasChildren && expanded() && h('div', null,
        node.children.map(child => renderNode(child, depth + 1))
      )
    );
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.md};padding:0.5rem;user-select:none;font-family:system-ui;`,
    ...rest,
  }, files.map(f => renderNode(f)));
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    js: '📜', mjs: '📜', ts: '📘', tsx: '⚛️', jsx: '⚛️',
    html: '🌐', css: '🎨', json: '📋', md: '📝',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️',
    mp3: '🎵', mp4: '🎬', pdf: '📄', zip: '📦',
  };
  return icons[ext] || '📄';
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) CODE EXPLORER — متصفح كود مع syntax highlighting
// ─────────────────────────────────────────────────────────────────────────────

export function CodeExplorer(props) {
  const {
    files = [], // [{ name, path, content, language }]
    initialFile = null,
    ...rest
  } = props;

  const activeFile = $state(initialFile || files[0]?.path);
  const current = $computed(() => files.find(f => f.path === activeFile()) || files[0]);

  return h('div', {
    style: `display:flex;background:${theme.colors.surface};border-radius:${theme.radius.md};overflow:hidden;height:500px;`,
    ...rest,
  },
    // Sidebar
    h('div', {
      style: `width:200px;background:${theme.colors.dark};padding:0.5rem;overflow-y:auto;border-left:1px solid ${theme.colors.border};`,
    },
      h('div', { style: `color:${theme.colors.textMuted};font-size:0.7rem;text-transform:uppercase;margin-bottom:0.5rem;padding:0 0.4rem;` }, 'الملفات'),
      files.map(f =>
        h('div', {
          key: f.path,
          onClick: () => activeFile.set(f.path),
          style: `padding:0.3rem 0.5rem;cursor:pointer;border-radius:${theme.radius.sm};font-size:0.8rem;color:${activeFile() === f.path ? theme.colors.primary : theme.colors.text};background:${activeFile() === f.path ? theme.colors.primary + '20' : 'transparent'};display:flex;align-items:center;gap:0.3rem;`,
        },
          h('span', null, getFileIcon(f.name)),
          h('span', null, f.name)
        )
      )
    ),
    // Code area
    h('div', {
      style: 'flex:1;overflow:auto;direction:ltr;text-align:left;',
    },
      current() && h('pre', {
        style: `margin:0;padding:1rem;font-family:'Courier New',monospace;font-size:0.85rem;line-height:1.6;color:${theme.colors.text};white-space:pre-wrap;word-break:break-word;`,
      },
        h('code', {
          innerHTML: highlightCode(current().content || '', current().language || 'javascript'),
        })
      )
    )
  );
}

function highlightCode(code, language) {
  let html = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'async', 'await', 'new', 'this', 'try', 'catch', 'null', 'true', 'false'];
  html = html.replace(/(\/\/[^\n]*)/g, '<span style="color:#64748b;">$1</span>');
  html = html.replace(/(["'`])((?:\\.|(?!\1).)*)\1/g, '<span style="color:#a7f3d0;">$1$2$1</span>');
  html = html.replace(/\b(\d+)\b/g, '<span style="color:#fde68a;">$1</span>');
  for (const kw of keywords) {
    html = html.replace(new RegExp(`\\b(${kw})\\b`, 'g'), `<span style="color:#bfdbfe;font-weight:600;">$1</span>`);
  }
  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) DEV TOOLS — لوحة أدوات تطوير
// ─────────────────────────────────────────────────────────────────────────────

export function DevTools(props) {
  const {
    position = 'bottom', // bottom | right | left
    ...rest
  } = props;

  const open = $state(false);
  const activeTab = $state('state'); // state | events | network | console
  const states = $state([]);
  const events = $state([]);
  const network = $state([]);
  const consoleLogs = $state([]);

  // Track signals
  const trackState = (name, signal) => {
    states.set(s => [...s, { name, value: signal(), signal }]);
  };

  // Track events
  const logEvent = (type, data) => {
    events.set(e => [...e, { type, data, time: new Date().toLocaleTimeString('ar') }].slice(-50));
  };

  // Track network
  const logNetwork = (method, url, status, duration) => {
    network.set(n => [...n, { method, url, status, duration, time: new Date().toLocaleTimeString('ar') }].slice(-50));
  };

  // Track console
  if (typeof window !== 'undefined') {
    const origLog = console.log;
    console.log = (...args) => {
      consoleLogs.set(l => [...l, { level: 'log', message: args.join(' '), time: new Date().toLocaleTimeString('ar') }].slice(-50));
      origLog.apply(console, args);
    };
  }

  const tabs = [
    { id: 'state', label: 'State', icon: '📊', count: states().length },
    { id: 'events', label: 'Events', icon: '⚡', count: events().length },
    { id: 'network', label: 'Network', icon: '🌐', count: network().length },
    { id: 'console', label: 'Console', icon: '💻', count: consoleLogs().length },
  ];

  const positions = {
    bottom: 'bottom:0;left:0;right:0;height:300px;',
    right: 'top:0;right:0;bottom:0;width:400px;',
    left: 'top:0;left:0;bottom:0;width:400px;',
  };

  if (!open()) {
    return h('button', {
      onClick: () => open.set(true),
      style: `position:fixed;${position === 'bottom' ? 'bottom:1rem;right:1rem;' : 'top:1rem;right:1rem;'}background:${theme.colors.primary};color:white;border:none;border-radius:${theme.radius.md};padding:0.5rem 1rem;cursor:pointer;font-size:0.85rem;z-index:9998;box-shadow:${theme.shadows.md};`,
    }, '🛠 DevTools');
  }

  return h('div', {
    style: `position:fixed;${positions[position]}background:${theme.colors.surface};border:1px solid ${theme.colors.border};z-index:9998;display:flex;flex-direction:column;box-shadow:${theme.shadows.lg};`,
    ...rest,
  },
    // Header
    h('div', {
      style: `display:flex;align-items:center;gap:0.25rem;padding:0.4rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};`,
    },
      tabs.map(tab =>
        h('button', {
          key: tab.id,
          onClick: () => activeTab.set(tab.id),
          style: `padding:0.3rem 0.6rem;background:${activeTab() === tab.id ? theme.colors.primary : 'none'};color:${activeTab() === tab.id ? 'white' : theme.colors.textMuted};border:none;border-radius:${theme.radius.sm};cursor:pointer;font-size:0.75rem;display:flex;align-items:center;gap:0.25rem;`,
        },
          h('span', null, tab.icon),
          h('span', null, tab.label),
          tab.count > 0 && h('span', { style: 'background:rgba(255,255,255,0.2);padding:0 0.3rem;border-radius:8px;font-size:0.65rem;' }, String(tab.count))
        )
      ),
      h('button', {
        onClick: () => open.set(false),
        style: `margin-right:auto;background:none;border:none;color:${theme.colors.textMuted};cursor:pointer;font-size:1rem;`,
      }, '×')
    ),
    // Content
    h('div', {
      style: 'flex:1;overflow-y:auto;padding:0.5rem;font-size:0.8rem;',
    },
      activeTab() === 'state' && (states().length === 0
        ? h('div', { style: `color:${theme.colors.textMuted};text-align:center;padding:1rem;` }, 'لا توجد states مسجلة')
        : states().map((s, i) =>
            h('div', { key: i, style: `padding:0.3rem;border-bottom:1px solid ${theme.colors.border};` },
              h('span', { style: `color:${theme.colors.primary};font-weight:500;` }, s.name),
              h('span', { style: `color:${theme.colors.textMuted};margin:0 0.5rem;` }, '='),
              h('span', { style: `color:${theme.colors.text};` }, JSON.stringify(s.value))
            )
          )
      ),
      activeTab() === 'events' && (events().length === 0
        ? h('div', { style: `color:${theme.colors.textMuted};text-align:center;padding:1rem;` }, 'لا توجد أحداث')
        : events().map((e, i) =>
            h('div', { key: i, style: `padding:0.3rem;border-bottom:1px solid ${theme.colors.border};` },
              h('span', { style: `color:${theme.colors.textMuted};font-size:0.7rem;` }, e.time),
              h('span', { style: `color:${theme.colors.warning};margin:0 0.5rem;` }, e.type),
              h('span', { style: `color:${theme.colors.text};` }, JSON.stringify(e.data))
            )
          )
      ),
      activeTab() === 'network' && (network().length === 0
        ? h('div', { style: `color:${theme.colors.textMuted};text-align:center;padding:1rem;` }, 'لا توجد طلبات شبكة')
        : network().map((n, i) =>
            h('div', { key: i, style: `padding:0.3rem;border-bottom:1px solid ${theme.colors.border};display:flex;gap:0.5rem;align-items:center;` },
              h('span', { style: `color:${theme.colors.primary};font-weight:600;font-size:0.7rem;min-width:40px;` }, n.method),
              h('span', { style: `color:${theme.colors.text};flex:1;font-size:0.75rem;direction:ltr;text-align:left;` }, n.url),
              h('span', { style: `color:${n.status >= 400 ? theme.colors.danger : theme.colors.success};font-size:0.7rem;` }, String(n.status)),
              h('span', { style: `color:${theme.colors.textMuted};font-size:0.7rem;` }, n.duration + 'ms')
            )
          )
      ),
      activeTab() === 'console' && (consoleLogs().length === 0
        ? h('div', { style: `color:${theme.colors.textMuted};text-align:center;padding:1rem;` }, 'Console فارغ')
        : consoleLogs().map((l, i) =>
            h('div', { key: i, style: `padding:0.2rem;border-bottom:1px solid ${theme.colors.border};color:${theme.colors.text};font-family:monospace;font-size:0.75rem;direction:ltr;text-align:left;` },
              h('span', { style: `color:${theme.colors.textMuted};font-size:0.65rem;` }, l.time + ' '),
              l.message
            )
          )
      )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) STATE INSPECTOR — مفتش state تفاعلي
// ─────────────────────────────────────────────────────────────────────────────

export function StateInspector(props) {
  const {
    state: stateProp = {},
    ...rest
  } = props;

  const expanded = $state(new Set());
  const search = $state('');

  const toggle = (path) => {
    const s = new Set(expanded());
    if (s.has(path)) s.delete(path);
    else s.add(path);
    expanded.set(s);
  };

  const renderValue = (value, path = '', depth = 0) => {
    const isExpanded = expanded().has(path);
    const isObject = value !== null && typeof value === 'object';
    const isArray = Array.isArray(value);

    if (search() && path && !path.toLowerCase().includes(search().toLowerCase()) && !JSON.stringify(value).toLowerCase().includes(search().toLowerCase())) {
      return null;
    }

    return h('div', { key: path, style: `padding-right:${depth * 1.5}rem;` },
      h('div', {
        onClick: () => isObject && toggle(path),
        style: `display:flex;align-items:center;gap:0.3rem;padding:0.2rem 0;cursor:${isObject ? 'pointer' : 'default'};font-size:0.8rem;`,
      },
        isObject
          ? h('span', { style: 'font-size:0.6rem;width:10px;color:' + theme.colors.textMuted }, isExpanded ? '▼' : '▶')
          : h('span', { style: 'width:10px;' }),
        h('span', { style: `color:${theme.colors.primary};font-weight:500;` }, path.split('.').pop() || 'root'),
        h('span', { style: `color:${theme.colors.textMuted};` }, ':'),
        h('span', {
          style: `color:${isArray ? theme.colors.warning : isObject ? theme.colors.info : theme.colors.success};font-family:monospace;font-size:0.75rem;`,
        },
          isObject
            ? (isArray ? `Array(${value.length})` : `Object {${Object.keys(value).length}}`)
            : JSON.stringify(value)
        )
      ),
      isObject && isExpanded && Object.entries(value).map(([key, val]) =>
        renderValue(val, path ? `${path}.${key}` : key, depth + 1)
      )
    );
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.md};padding:0.75rem;`,
    ...rest,
  },
    // Search
    h('input', {
      type: 'search',
      value: search(),
      onInput: e => search.set(e.target.value),
      placeholder: 'بحث في state...',
      style: `width:100%;padding:0.4rem 0.6rem;background:${theme.colors.dark};border:1px solid ${theme.colors.border};border-radius:${theme.radius.sm};color:${theme.colors.text};font-size:0.8rem;margin-bottom:0.5rem;outline:none;`,
    }),
    // Tree
    h('div', { style: 'font-family:monospace;' },
      renderValue(stateProp, '', 0)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EVENT LOG — سجل أحداث
// ─────────────────────────────────────────────────────────────────────────────

export function EventLog(props) {
  const {
    events = [], // [{ type, message, time, level, data }]
    maxItems = 50,
    ...rest
  } = props;

  const items = $state(events.slice(-maxItems));
  const filter = $state('all');

  const filtered = $computed(() => {
    if (filter() === 'all') return items();
    return items().filter(e => e.level === filter());
  });

  const levelColors = {
    info: theme.colors.info,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.danger,
  };

  const levelIcons = {
    info: 'ℹ',
    success: '✓',
    warning: '⚠',
    error: '✗',
  };

  return h('div', {
    style: `background:${theme.colors.surface};border-radius:${theme.radius.md};overflow:hidden;`,
    ...rest,
  },
    // Filter bar
    h('div', {
      style: `display:flex;gap:0.25rem;padding:0.4rem;background:${theme.colors.dark};border-bottom:1px solid ${theme.colors.border};`,
    },
      ['all', 'info', 'success', 'warning', 'error'].map(f =>
        h('button', {
          key: f,
          onClick: () => filter.set(f),
          style: `padding:0.2rem 0.5rem;background:${filter() === f ? theme.colors.primary : 'none'};color:${filter() === f ? 'white' : theme.colors.textMuted};border:none;border-radius:${theme.radius.sm};cursor:pointer;font-size:0.7rem;text-transform:uppercase;`,
        }, f)
      )
    ),
    // Log entries
    h('div', {
      style: 'max-height:300px;overflow-y:auto;',
    },
      filtered().length === 0
        ? h('div', { style: `padding:1rem;text-align:center;color:${theme.colors.textMuted};font-size:0.85rem;` }, 'لا توجد أحداث')
        : filtered().map((event, i) =>
            h('div', {
              key: i,
              style: `padding:0.4rem 0.75rem;border-bottom:1px solid ${theme.colors.border};display:flex;gap:0.5rem;align-items:flex-start;font-size:0.8rem;direction:ltr;text-align:left;`,
            },
              h('span', {
                style: `color:${levelColors[event.level] || theme.colors.textMuted};font-weight:bold;width:16px;flex-shrink:0;`,
              }, levelIcons[event.level] || '•'),
              h('span', { style: `color:${theme.colors.textMuted};font-size:0.7rem;min-width:60px;` }, event.time || ''),
              h('span', { style: `color:${theme.colors.warning};font-size:0.7rem;min-width:60px;` }, event.type || ''),
              h('span', { style: `color:${theme.colors.text};flex:1;` }, event.message || JSON.stringify(event.data))
            )
          )
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  FileExplorer,
  CodeExplorer,
  DevTools,
  StateInspector,
  EventLog,
};
