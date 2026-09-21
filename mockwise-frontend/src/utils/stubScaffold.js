/**
 * Split a problem stub into readonly scaffold + editable body + readonly suffix.
 *
 * Readonly: imports, class shell, fields, constructors, and the solution
 *           method signature line (including its opening "{" / ":").
 * Editable: solution method body, and any extra helper methods before class close.
 * Suffix:   closing brace(s) of the class (Java/C++).
 *
 * Full-document line numbers match compile diagnostics.
 */

function findMatchingBrace(code, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < code.length; i++) {
    const ch = code[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function lineStartIndex(code, index) {
  const i = code.lastIndexOf('\n', Math.max(0, index - 1));
  return i < 0 ? 0 : i + 1;
}

function lineEndIndex(code, index) {
  const i = code.indexOf('\n', index);
  return i < 0 ? code.length : i;
}

function lastImportBlockEnd(code, lang) {
  const lines = code.split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (lang === 'java' && (t.startsWith('import ') || t.startsWith('package '))) last = i;
    else if (lang === 'python' && (t.startsWith('import ') || t.startsWith('from '))) last = i;
    else if ((lang === 'cpp' || lang === 'c++') && (t.startsWith('#include') || t.startsWith('using '))) last = i;
    else if (last >= 0) break;
  }
  if (last < 0) return 0;
  let endLine = last;
  while (endLine + 1 < lines.length && lines[endLine + 1].trim() === '') endLine++;
  // char offset after this block (including trailing newline if any remains)
  let offset = 0;
  for (let i = 0; i <= endLine; i++) {
    offset += lines[i].length;
    if (i < lines.length - 1) offset += 1; // newline
  }
  if (endLine < lines.length - 1) {
    // keep the newline after the import block as part of prefix when present
  }
  return offset;
}

/**
 * Find the opening brace of the primary solution method (Java/C++).
 * Prefer methods containing "Write your solution" / TODO; else first non-ctor method.
 */
function findSolutionMethodOpenBrace(code, classOpenBrace, className) {
  const regionStart = classOpenBrace + 1;
  const region = code.slice(regionStart);

  const marker = region.search(/\/\/\s*Write your solution here|\/\/\s*TODO|#\s*Write your solution here/i);
  if (marker >= 0) {
    const absMarker = regionStart + marker;
    // Walk left from marker to find the '{' that opens this method body.
    // Search backwards for '{' that is the method open (first { before marker on same method).
    let brace = -1;
    for (let i = absMarker; i > classOpenBrace; i--) {
      if (code[i] === '{') {
        brace = i;
        break;
      }
    }
    if (brace > classOpenBrace) return brace;
  }

  // Fallback: scan for method signatures that are not constructors
  const methodRe =
    /(?:^|\n)([ \t]*)(?:(?:public|private|protected|static|virtual|const|override)\s+)*[\w:<>,\s*&]+?\s+([A-Za-z_]\w*)\s*\([^;]*\)\s*(?:const\s*)?\{/g;
  let m;
  while ((m = methodRe.exec(code)) !== null) {
    if (m.index < classOpenBrace) continue;
    const name = m[2];
    if (className && name === className) continue; // constructor
    // open brace is last char of match
    const open = m.index + m[0].length - 1;
    if (open > classOpenBrace) return open;
  }
  return -1;
}

function extractClassName(code) {
  const m = code.match(/\bclass\s+([A-Za-z_]\w*)/);
  return m ? m[1] : null;
}

function splitJavaCpp(code) {
  const className = extractClassName(code);
  const classKw = code.search(/\bclass\b[^{]*\{/);
  if (classKw < 0) {
    // No class: imports readonly, rest editable (helpers/functions)
    const importEnd = lastImportBlockEnd(code, 'java');
    const prefix = code.slice(0, importEnd);
    return {
      prefix,
      body: code.slice(importEnd),
      suffix: '',
      bodyStartLine: (prefix.match(/\n/g) || []).length + 1,
    };
  }

  const openBrace = code.indexOf('{', classKw);
  if (openBrace < 0) {
    return emptySplit(code);
  }
  const closeBrace = findMatchingBrace(code, openBrace);
  if (closeBrace < 0) {
    return emptySplit(code);
  }

  const methodOpen = findSolutionMethodOpenBrace(code, openBrace, className);
  if (methodOpen < 0) {
    // Whole class interior editable (fallback)
    const prefix = code.slice(0, openBrace + 1);
    const body = code.slice(openBrace + 1, closeBrace);
    const suffix = code.slice(closeBrace);
    return {
      prefix,
      body,
      suffix,
      bodyStartLine: (prefix.match(/\n/g) || []).length + 1,
    };
  }

  // Prefix includes method signature through the opening '{' of the solution method.
  // Prefer end-of-line after '{' so the whole signature line is readonly.
  let prefixEnd = methodOpen + 1;
  const afterBrace = code[prefixEnd];
  if (afterBrace === '\n' || afterBrace === '\r') {
    // keep newline in prefix so body starts on next line
    if (afterBrace === '\r' && code[prefixEnd + 1] === '\n') prefixEnd += 2;
    else prefixEnd += 1;
  }

  const prefix = code.slice(0, prefixEnd);
  const body = code.slice(prefixEnd, closeBrace);
  const suffix = code.slice(closeBrace);

  return {
    prefix,
    body,
    suffix,
    bodyStartLine: (prefix.match(/\n/g) || []).length + 1,
  };
}

/**
 * Python: imports + class + __init__ + solution `def` line are readonly.
 * Body is the indented method body and any later methods (helpers).
 */
function splitPython(code) {
  const importEnd = lastImportBlockEnd(code, 'python');

  // Find solution method def — prefer one with "Write your solution"
  const marker = code.search(/#\s*Write your solution here|#\s*TODO/i);
  let defLineStart = -1;
  if (marker >= 0) {
    // walk back to def line
    const before = code.slice(0, marker);
    const defMatch = before.match(/(?:^|\n)([ \t]*def[ \t]+\w+[^\n]*:[ \t]*)\n?$/);
    if (defMatch) {
      defLineStart = before.length - defMatch[1].length;
      if (before[before.length - defMatch[0].length] === '\n') {
        // ok
      }
      // more reliable:
      const lastDef = before.lastIndexOf('\ndef ');
      const lastDefStart = before.lastIndexOf('\n    def ');
      const idx = Math.max(lastDef, lastDefStart, before.startsWith('def ') ? 0 : -1);
      if (before.match(/(?:^|\n)[ \t]*def[ \t]+\w+/)) {
        const m = before.match(/(?:^|\n)([ \t]*def[ \t]+\w+[^\n]*:)/g);
        if (m && m.length) {
          const last = m[m.length - 1];
          defLineStart = before.lastIndexOf(last.replace(/^\n/, ''));
          if (before[defLineStart - 1] === '\n') {
            // defLineStart is correct
          }
          // fix: lastIndexOf the signature without leading newline
          const sig = last.replace(/^\n/, '');
          defLineStart = before.lastIndexOf(sig);
        }
      }
    }
  }

  if (defLineStart < 0) {
    // first def after class that is not __init__
    const re = /(?:^|\n)([ \t]*)def[ \t]+(\w+)[^\n]*:/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      if (m[2] === '__init__') continue;
      defLineStart = m[0].startsWith('\n') ? m.index + 1 : m.index;
      break;
    }
  }

  if (defLineStart < 0) {
    // only imports locked
    const prefix = code.slice(0, importEnd);
    return {
      prefix,
      body: code.slice(importEnd),
      suffix: '',
      bodyStartLine: (prefix.match(/\n/g) || []).length + 1,
    };
  }

  // prefix through end of def line (including newline if present)
  let prefixEnd = lineEndIndex(code, defLineStart);
  if (code[prefixEnd] === '\n') prefixEnd += 1;

  const prefix = code.slice(0, prefixEnd);
  const body = code.slice(prefixEnd);
  return {
    prefix,
    body,
    suffix: '',
    bodyStartLine: (prefix.match(/\n/g) || []).length + 1,
  };
}

function emptySplit(code) {
  return { prefix: '', body: code ?? '', suffix: '', bodyStartLine: 1 };
}

/**
 * @returns {{ prefix: string, body: string, suffix: string, bodyStartLine: number }}
 */
export function splitStubScaffold(code, language) {
  const src = code ?? '';
  const lang = (language || '').toLowerCase();
  if (!src.trim()) return emptySplit('');

  if (lang === 'python' || lang === 'py') {
    return splitPython(src);
  }
  if (lang === 'java' || lang === 'cpp' || lang === 'c++' || lang === 'cplusplus') {
    return splitJavaCpp(src);
  }
  // default: imports-only lock when possible
  return splitJavaCpp(src);
}

export function joinStubScaffold(prefix, body, suffix) {
  return `${prefix ?? ''}${body ?? ''}${suffix ?? ''}`;
}

export function lineCount(text) {
  if (!text) return 0;
  return text.split('\n').length;
}
