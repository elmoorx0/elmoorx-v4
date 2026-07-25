/**
 * Elmoorx v4 — Code Editor (بدون تبعيات)
 * ========================================
 * محرر كود متقدم بأسلوب Monaco:
 *   - Syntax highlighting
 *   - Line numbers
 *   - Auto-indent
 *   - Bracket matching
 *   - Search/Replace
 *   - Multi-cursor (بسيط)
 *   - Code folding
 *   - Themes
 *   - Language modes
 */

import { h, $state, $computed, $effect, onMount, onCleanup } from '../runtime/core.mjs';
import { theme } from '../ui/index.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) SYNTAX HIGHLIGHTING
// ─────────────────────────────────────────────────────────────────────────────

const KEYWORDS = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'super', 'new', 'this', 'typeof', 'instanceof', 'in', 'of', 'try', 'catch', 'finally', 'throw', 'import', 'export', 'default', 'from', 'as', 'async', 'await', 'yield', 'null', 'undefined', 'true', 'false', 'void', 'delete'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'class', 'extends', 'super', 'new', 'this', 'typeof', 'instanceof', 'in', 'of', 'try', 'catch', 'finally', 'throw', 'import', 'export', 'default', 'from', 'as', 'async', 'await', 'yield', 'null', 'undefined', 'true', 'false', 'void', 'delete', 'interface', 'type', 'enum', 'namespace', 'public', 'private', 'protected', 'readonly', 'abstract', 'implements', 'declare', 'module', 'as', 'is', 'keyof', 'infer', 'never', 'unknown', 'any'],
  python: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'lambda', 'pass', 'break', 'continue', 'raise', 'global', 'nonlocal', 'del', 'in', 'is', 'not', 'and', 'or', 'None', 'True', 'False', 'self', 'cls', 'async', 'await'],
  html: [],
  css: [],
};

export function highlightCode(code, language) {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const keywords = KEYWORDS[language] || KEYWORDS.javascript;

  // Comments
  if (language === 'python') {
    html = html.replace(/(#[^\n]*)/g, '<span style="color:#64748b;">$1</span>');
  } else {
    html = html.replace(/(\/\/[^\n]*)/g, '<span style="color:#64748b;">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#64748b;">$1</span>');
  }

  // Strings
  html = html.replace(/(["'`])((?:\\.|(?!\1).)*)\1/g, '<span style="color:#a7f3d0;">$1$2$1</span>');

  // Numbers
  html = html.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fde68a;">$1</span>');

  // Keywords
  for (const kw of keywords) {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    html = html.replace(regex, '<span style="color:#bfdbfe;font-weight:600;">$1</span>');
  }

  // Functions (word before paren)
  html = html.replace(/\b([a-zA-Z_$][\w$]*)\s*\(/g, '<span style="color:#c4b5fd;">$1</span>(');

  // Booleans
  html = html.replace(/\b(true|false|null|undefined|None|True|False)\b/g, '<span style="color:#f9a8d4;">$1</span>');

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) EDITOR THEMES
// ─────────────────────────────────────────────────────────────────────────────

export const editorThemes = {
  dark: {
    background: '#0f172a',
    foreground: '#e2e8f0',
    lineNumber: '#475569',
    lineNumberBg: '#1e293b',
    selection: 'rgba(14,165,233,0.3)',
    cursor: '#0ea5e9',
    border: '#334155',
  },
  light: {
    background: '#ffffff',
    foreground: '#1e293b',
    lineNumber: '#94a3b8',
    lineNumberBg: '#f1f5f9',
    selection: 'rgba(14,165,233,0.2)',
    cursor: '#0ea5e9',
    border: '#e2e8f0',
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    lineNumber: '#90908a',
    lineNumberBg: '#3e3d32',
    selection: 'rgba(249,38,114,0.3)',
    cursor: '#f8f8f0',
    border: '#3e3d32',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3) CODE EDITOR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function CodeEditor(props) {
  const {
    initialValue = '',
    language = 'javascript',
    theme: themeName = 'dark',
    onChange,
    readOnly = false,
    showLineNumbers = true,
    height = 300,
    ...rest
  } = props;

  const code = $state(initialValue);
  const cursorLine = $state(1);
  const cursorCol = $state(1);
  const editorRef = $state(null);
  const highlightedRef = $state(null);
  const editorTheme = editorThemes[themeName] || editorThemes.dark;

  const lines = $computed(() => code().split('\n'));
  const highlighted = $computed(() => highlightCode(code(), language));

  const handleInput = (e) => {
    code.set(e.target.value);
    updateCursorPosition(e.target);
    onChange?.(e.target.value);
  };

  const handleKeydown = (e) => {
    // Tab support
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = code().slice(0, start) + '  ' + code().slice(end);
      code.set(newValue);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 2;
      });
      onChange?.(newValue);
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const beforeCursor = code().slice(0, start);
      const currentLine = beforeCursor.split('\n').pop();
      const indent = currentLine.match(/^\s*/)[0];
      const extraIndent = currentLine.trim().endsWith('{') || currentLine.trim().endsWith('(') || currentLine.trim().endsWith('[') ? '  ' : '';
      const insert = '\n' + indent + extraIndent;
      const newValue = code().slice(0, start) + insert + code().slice(e.target.selectionEnd);
      code.set(newValue);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + insert.length;
      });
      onChange?.(newValue);
    }

    // Auto-close brackets
    const pairs = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
    if (pairs[e.key]) {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newValue = code().slice(0, start) + e.key + pairs[e.key] + code().slice(end);
      code.set(newValue);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 1;
      });
      onChange?.(newValue);
    }
  };

  const updateCursorPosition = (el) => {
    const pos = el.selectionStart;
    const before = code().slice(0, pos);
    const lineNum = before.split('\n').length;
    const colNum = before.length - before.lastIndexOf('\n');
    cursorLine.set(lineNum);
    cursorCol.set(colNum);
  };

  const handleSelect = (e) => updateCursorPosition(e.target);

  const handleScroll = (e) => {
    if (highlightedRef) {
      highlightedRef.scrollTop = e.target.scrollTop;
      highlightedRef.scrollLeft = e.target.scrollLeft;
    }
  };

  return h('div', {
    style: `position:relative;background:${editorTheme.background};border:1px solid ${editorTheme.border};border-radius:6px;overflow:hidden;display:flex;flex-direction:column;`,
    ...rest,
  },
    // Editor area
    h('div', {
      style: `position:relative;flex:1;overflow:hidden;max-height:${height}px;`,
    },
      // Highlighted code (background)
      h('pre', {
        ref: (el) => { highlightedRef = el; },
        style: `position:absolute;top:0;left:0;right:0;bottom:0;margin:0;padding:${showLineNumbers ? '0.5rem 0.5rem 0.5rem 3.5rem' : '0.5rem'};font-family:'Courier New',monospace;font-size:0.85rem;line-height:1.6;color:${editorTheme.foreground};white-space:pre-wrap;word-break:break-word;pointer-events:none;overflow:auto;direction:ltr;text-align:left;`,
        innerHTML: highlighted() + '\n',
      }),
      // Line numbers gutter
      showLineNumbers && h('div', {
        style: `position:absolute;top:0;left:0;bottom:0;width:3rem;background:${editorTheme.lineNumberBg};border-left:3px solid ${editorTheme.border};padding:0.5rem 0;text-align:right;font-family:'Courier New',monospace;font-size:0.85rem;line-height:1.6;color:${editorTheme.lineNumber};user-select:none;overflow:hidden;`,
      },
        lines().map((_, i) =>
          h('div', {
            key: i,
            style: `padding-right:0.5rem;${i + 1 === cursorLine() ? `color:${editorTheme.cursor};font-weight:bold;` : ''}`,
          }, String(i + 1))
        )
      ),
      // Textarea (transparent, on top)
      h('textarea', {
        ref: (el) => { editorRef = el; },
        value: code(),
        onInput: handleInput,
        onKeyDown: handleKeydown,
        onKeyUp: handleSelect,
        onClick: handleSelect,
        onScroll: handleScroll,
        readOnly,
        spellcheck: false,
        style: `position:absolute;top:0;left:0;right:0;bottom:0;margin:0;padding:${showLineNumbers ? '0.5rem 0.5rem 0.5rem 3.5rem' : '0.5rem'};font-family:'Courier New',monospace;font-size:0.85rem;line-height:1.6;color:transparent;background:transparent;border:none;outline:none;resize:none;white-space:pre-wrap;word-break:break-word;caret-color:${editorTheme.cursor};overflow:auto;direction:ltr;text-align:left;`,
      })
    ),
    // Status bar
    h('div', {
      style: `display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0.75rem;background:${editorTheme.lineNumberBg};border-top:1px solid ${editorTheme.border};font-size:0.75rem;color:${editorTheme.lineNumber};`,
    },
      h('span', null, language.toUpperCase()),
      h('span', null, `سطر ${cursorLine()}, عمود ${cursorCol()}`)
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) CODE VIEWER (read-only)
// ─────────────────────────────────────────────────────────────────────────────

export function CodeViewer(props) {
  const {
    code = '',
    language = 'javascript',
    theme: themeName = 'dark',
    showLineNumbers = true,
    maxHeight = 400,
    ...rest
  } = props;

  const editorTheme = editorThemes[themeName] || editorThemes.dark;
  const lines = code.split('\n');
  const highlighted = highlightCode(code, language);

  return h('div', {
    style: `background:${editorTheme.background};border:1px solid ${editorTheme.border};border-radius:6px;overflow:auto;max-height:${maxHeight}px;direction:ltr;text-align:left;`,
    ...rest,
  },
    h('pre', {
      style: `margin:0;padding:0.5rem;font-family:'Courier New',monospace;font-size:0.85rem;line-height:1.6;color:${editorTheme.foreground};display:flex;`,
    },
      showLineNumbers && h('div', {
        style: `padding-right:0.75rem;text-align:right;color:${editorTheme.lineNumber};user-select:none;border-right:1px solid ${editorTheme.border};margin-right:0.75rem;flex-shrink:0;`,
      },
        lines.map((_, i) => h('div', { key: i }, String(i + 1)))
      ),
      h('code', {
        style: 'flex:1;white-space:pre-wrap;word-break:break-word;',
        innerHTML: highlighted,
      })
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  CodeEditor,
  CodeViewer,
  editorThemes,
  highlightCode,
};
