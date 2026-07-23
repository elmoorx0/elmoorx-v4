/**
 * Elmoorx v4 — Source Maps (بدون تبعيات)
 * ============================
 * يُنشئ source maps للـ JavaScript المُجمّع:
 *   - Version 3 spec
 *   - mappings مشفّرة (VLQ)
 *   - sources + sourcesContent
 *   - names
 *   - inline + external
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) VLQ ENCODING
// ─────────────────────────────────────────────────────────────────────────────

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeVLQ(value) {
  let result = '';
  let vlq = value < 0 ? (-value << 1) | 1 : (value << 1);
  do {
    let digit = vlq & 31;
    vlq >>= 5;
    if (vlq > 0) digit |= 32;
    result += BASE64_CHARS[digit];
  } while (vlq > 0);
  return result;
}

function decodeVLQ(str, offset) {
  let result = 0;
  let shift = 0;
  let i = offset;
  let digit;
  do {
    const char = str[i];
    digit = BASE64_CHARS.indexOf(char);
    if (digit === -1) break;
    result |= (digit & 31) << shift;
    shift += 5;
    i++;
  } while (digit >= 32);
  const value = result & 1 ? -(result >> 1) : result >> 1;
  return { value, nextOffset: i };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SOURCE MAP BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export class SourceMapBuilder {
  constructor(options = {}) {
    this.version = 3;
    this.file = options.file || '';
    this.sourceRoot = options.sourceRoot || '';
    this.sources = [];
    this.sourcesContent = [];
    this.names = [];
    this.mappings = '';
    this._generatedLine = 1;
    this._generatedColumn = 0;
    this._sourceIndex = 0;
    this._originalLine = 1;
    this._originalColumn = 0;
    this._nameIndex = 0;
    this._mappingParts = [];
  }

  addSource(sourcePath, content = null) {
    const index = this.sources.length;
    this.sources.push(sourcePath);
    this.sourcesContent.push(content);
    return index;
  }

  addMapping(generatedLine, generatedColumn, sourceIndex, originalLine, originalColumn, nameIndex = null) {
    while (this._generatedLine < generatedLine) {
      this._mappingParts.push(';');
      this._generatedLine++;
      this._generatedColumn = 0;
    }

    let part = '';
    const lastPart = this._mappingParts[this._mappingParts.length - 1];
    if (lastPart && lastPart !== ';') {
      part += ',';
    }

    part += encodeVLQ(generatedColumn - this._generatedColumn);
    this._generatedColumn = generatedColumn;

    if (sourceIndex !== null) {
      part += encodeVLQ(sourceIndex - this._sourceIndex);
      this._sourceIndex = sourceIndex;
      part += encodeVLQ(originalLine - this._originalLine);
      this._originalLine = originalLine;
      part += encodeVLQ(originalColumn - this._originalColumn);
      this._originalColumn = originalColumn;

      if (nameIndex !== null) {
        part += encodeVLQ(nameIndex - this._nameIndex);
        this._nameIndex = nameIndex;
      }
    }

    this._mappingParts.push(part);
  }

  addName(name) {
    const index = this.names.indexOf(name);
    if (index !== -1) return index;
    this.names.push(name);
    return this.names.length - 1;
  }

  toJSON() {
    return {
      version: this.version,
      file: this.file,
      sourceRoot: this.sourceRoot,
      sources: this.sources,
      sourcesContent: this.sourcesContent.some(c => c !== null) ? this.sourcesContent : undefined,
      names: this.names,
      mappings: this._mappingParts.join(''),
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  toInlineComment() {
    const base64 = typeof Buffer !== 'undefined'
      ? Buffer.from(this.toString()).toString('base64')
      : btoa(this.toString());
    return '//# sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) SIMPLE LINE MAPPER
// ─────────────────────────────────────────────────────────────────────────────

export function createSimpleSourceMap(generatedCode, originalCode, sourcePath, options = {}) {
  const builder = new SourceMapBuilder({ file: options.file || '' });
  const sourceIndex = builder.addSource(sourcePath, originalCode);

  const genLines = generatedCode.split('\n');
  const origLines = originalCode.split('\n');

  for (let i = 0; i < genLines.length; i++) {
    const genLine = i + 1;
    const origLine = Math.min(i + 1, origLines.length);
    builder.addMapping(genLine, 0, sourceIndex, origLine, 0);
  }

  return builder;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  SourceMapBuilder,
  createSimpleSourceMap,
  encodeVLQ,
  decodeVLQ,
};
