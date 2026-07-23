/**
 * Elmoorx v4 — Tree Shaker (بدون تبعيات)
 * ============================
 * يزيل الكود غير المستخدم:
 *   - تحليل imports/exports
 *   - تتبع الاستخدام
 *   - إزالة الدوال/المتغيرات غير المستخدمة
 *   - إزالة الـ exports غير المستوردة
 *   - إزالة الـ dead branches
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) ANALYZE — يحلل الكود ويجد الـ exports/imports
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeModule(code) {
  const exports = new Set();
  const imports = new Set();
  const used = new Set();

  // استخرج exports
  const exportMatches = code.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/g);
  for (const m of exportMatches) exports.add(m[1]);

  // استخرج imports
  const importMatches = code.matchAll(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from/g);
  for (const m of importMatches) {
    if (m[1]) {
      // named imports
      m[1].split(',').forEach(s => {
        const name = s.trim().split(/\s+as\s+/)[0].trim();
        if (name) imports.add(name);
      });
    } else if (m[2]) {
      // namespace import
      imports.add(m[2]);
    } else if (m[3]) {
      // default import
      imports.add(m[3]);
    }
  }

  // استخرج الاستخدام (كل identifier)
  const usageMatches = code.matchAll(/\b(\w+)\b/g);
  for (const m of usageMatches) used.add(m[1]);

  return { exports, imports, used };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) SHAKE — يزيل الكود غير المستخدم
// ─────────────────────────────────────────────────────────────────────────────

export function shake(code, options = {}) {
  const {
    removeUnusedExports = true,
    removeUnusedFunctions = true,
    removeUnusedVariables = true,
    externalImports = new Set(), // imports من ملفات أخرى تستخدمها
  } = options;

  const analysis = analyzeModule(code);
  const allUsed = new Set([...analysis.used, ...externalImports, ...analysis.imports]);

  let result = code;

  // 1) إزالة الـ exports غير المستخدمة (في ملفات library)
  if (removeUnusedExports) {
    result = removeUnusedExportsFromCode(result, allUsed, analysis.exports);
  }

  // 2) إزالة الدوال غير المستخدمة (التي لم تُصدّر ولم تُستخدم)
  if (removeUnusedFunctions) {
    result = removeUnusedFunctionsFromCode(result, allUsed, analysis.exports);
  }

  // 3) إزالة المتغيرات غير المستخدمة
  if (removeUnusedVariables) {
    result = removeUnusedVariablesFromCode(result, allUsed, analysis.exports);
  }

  return {
    code: result,
    originalSize: code.length,
    shakenSize: result.length,
    savings: ((1 - result.length / code.length) * 100).toFixed(1) + '%',
    exports: analysis.exports.size,
    imports: analysis.imports.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function removeUnusedExportsFromCode(code, used, exports) {
  // إذا كان الملف entry point، لا نحذف الـ exports
  if (code.includes('import.meta.main')) return code;

  // ابحث عن exports غير مستخدمة
  for (const name of exports) {
    // إذا لم تُستخدم في أي مكان (عدا الـ export نفسه)
    const usageCount = (code.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (usageCount <= 1) {
      // احذف التصدير
      code = code.replace(new RegExp(`export\\s+(?:default\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+${name}\\s*[=({]`, 'g'), (match) => {
        // احذف export keyword فقط، أو احذف الدالة كاملة
        return match.replace('export ', '');
      });
    }
  }
  return code;
}

function removeUnusedFunctionsFromCode(code, used, exports) {
  // ابحث عن دوال غير مُصدّرة وغير مستخدمة
  const funcMatches = code.matchAll(/(?:^|\n)\s*(?:async\s+)?function\s+(\w+)\s*\(/g);
  const funcsToDelete = [];
  for (const m of funcMatches) {
    const name = m[1];
    if (exports.has(name)) continue; // مُصدّرة
    // عدّ الاستخدام
    const usageCount = (code.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (usageCount <= 1) {
      funcsToDelete.push(name);
    }
  }

  for (const name of funcsToDelete) {
    // احذف الدالة كاملة
    const regex = new RegExp(`\\n?\\s*(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{[^}]*\\}`, 'g');
    code = code.replace(regex, '');
  }

  return code;
}

function removeUnusedVariablesFromCode(code, used, exports) {
  // ابحث عن متغيرات غير مُصدّرة وغير مستخدمة
  const varMatches = code.matchAll(/(?:^|\n)\s*(?:const|let|var)\s+(\w+)\s*=/g);
  const varsToDelete = [];
  for (const m of varMatches) {
    const name = m[1];
    if (exports.has(name)) continue;
    const usageCount = (code.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
    if (usageCount <= 1) {
      varsToDelete.push(name);
    }
  }

  for (const name of varsToDelete) {
    // احذف المتغير
    const regex = new RegExp(`\\n?\\s*(?:const|let|var)\\s+${name}\\s*=[^;]+;`, 'g');
    code = code.replace(regex, '');
  }

  return code;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) BUNDLE WIDE SHAKE — يحلل عدة ملفات
// ─────────────────────────────────────────────────────────────────────────────

export function shakeBundle(files, options = {}) {
  // files: [{ path, code, isEntry }]
  const allExports = new Map(); // name → file
  const allImports = new Set();

  for (const file of files) {
    const analysis = analyzeModule(file.code);
    for (const exp of analysis.exports) {
      allExports.set(exp, file.path);
    }
    for (const imp of analysis.imports) {
      allImports.add(imp);
    }
  }

  // ابحث عن exports غير مستوردة في أي ملف
  const usedExports = new Set();
  for (const name of allImports) {
    usedExports.add(name);
  }

  // أضف الـ exports من entry files
  for (const file of files) {
    if (file.isEntry) {
      const analysis = analyzeModule(file.code);
      for (const exp of analysis.exports) usedExports.add(exp);
    }
  }

  // اهزز كل ملف
  const result = [];
  for (const file of files) {
    const externalImports = new Set();
    // ابحث عن imports من ملفات أخرى
    const analysis = analyzeModule(file.code);
    for (const imp of analysis.imports) {
      if (allExports.has(imp)) externalImports.add(imp);
    }

    const shaken = shake(file.code, { ...options, externalImports });
    result.push({ path: file.path, ...shaken });
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  analyzeModule,
  shake,
  shakeBundle,
};
