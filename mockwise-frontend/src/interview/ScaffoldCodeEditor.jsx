import { useCallback, useEffect, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { joinStubScaffold, splitStubScaffold } from '../utils/stubScaffold';
import '../styles/ScaffoldCodeEditor.css';

/**
 * Single Monaco buffer (full line numbers) with readonly scaffold regions
 * (imports / class shell) and an editable middle for solution + helpers.
 */
function ScaffoldCodeEditor({
  value,
  language,
  theme,
  readOnly = false,
  isDark = true,
  loadingLabel = null,
  onChange,
  onMountExtra,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const applyingRef = useRef(false);
  const scaffoldRef = useRef({ prefix: '', body: '', suffix: '' });
  const decoRef = useRef([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lang = language === 'cpp' ? 'cpp' : language;
  const fullText = value || '';

  const scaffold = useMemo(
    () => splitStubScaffold(fullText, language),
    [fullText, language]
  );

  useEffect(() => {
    scaffoldRef.current = {
      prefix: scaffold.prefix,
      body: scaffold.body,
      suffix: scaffold.suffix,
    };
  }, [scaffold]);

  const paintReadonly = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;

    const { prefix, suffix } = scaffoldRef.current;
    const total = model.getLineCount();
    const ranges = [];

    if (prefix) {
      const endPos = model.getPositionAt(Math.min(prefix.length, model.getValueLength()));
      ranges.push({
        range: new monaco.Range(1, 1, endPos.lineNumber, endPos.column),
        options: {
          isWholeLine: true,
          className: 'scaffold-readonly-line',
          inlineClassName: 'scaffold-readonly-inline',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }
    if (suffix) {
      const startOff = Math.max(0, model.getValueLength() - suffix.length);
      const startPos = model.getPositionAt(startOff);
      ranges.push({
        range: new monaco.Range(
          startPos.lineNumber,
          1,
          total,
          model.getLineMaxColumn(total)
        ),
        options: {
          isWholeLine: true,
          className: 'scaffold-readonly-line',
          inlineClassName: 'scaffold-readonly-inline',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }
    decoRef.current = editor.deltaDecorations(decoRef.current, ranges);
  }, []);

  const restoreScaffold = useCallback((middle) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const { prefix, suffix } = scaffoldRef.current;
    const restored = joinStubScaffold(prefix, middle ?? '', suffix);
    applyingRef.current = true;
    const pos = editor.getPosition();
    model.setValue(restored);
    scaffoldRef.current = { ...scaffoldRef.current, body: middle ?? '' };
    if (pos) {
      const line = Math.min(Math.max(pos.lineNumber, 1), model.getLineCount());
      editor.setPosition({
        lineNumber: line,
        column: Math.min(pos.column, model.getLineMaxColumn(line)),
      });
    }
    applyingRef.current = false;
    paintReadonly();
    onChangeRef.current?.(restored);
  }, [paintReadonly]);

  // Sync external value (stub load / language switch)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;
    const next = loadingLabel || fullText;
    if (model.getValue() !== next) {
      applyingRef.current = true;
      model.setValue(next);
      applyingRef.current = false;
    }
    if (!loadingLabel) paintReadonly();
    else decoRef.current = editor.deltaDecorations(decoRef.current, []);
  }, [fullText, loadingLabel, language, paintReadonly]);

  // Enforce readonly scaffold
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || readOnly || loadingLabel) return;

    const sub = editor.onDidChangeModelContent(() => {
      if (applyingRef.current) return;
      const model = editor.getModel();
      if (!model) return;
      const current = model.getValue();
      const { prefix, suffix, body } = scaffoldRef.current;
      if (!prefix && !suffix) {
        onChangeRef.current?.(current);
        return;
      }
      const okPrefix = !prefix || current.startsWith(prefix);
      const okSuffix = !suffix || current.endsWith(suffix);
      if (!okPrefix || !okSuffix) {
        // Keep attempted middle if we can salvage it
        let middle = body;
        if (okPrefix && suffix) {
          const end = current.length - suffix.length;
          if (end >= prefix.length) middle = current.slice(prefix.length, end);
        } else if (okPrefix && !suffix) {
          middle = current.slice(prefix.length);
        }
        restoreScaffold(middle);
        return;
      }
      const middle = current.slice(
        prefix.length,
        suffix ? current.length - suffix.length : current.length
      );
      scaffoldRef.current = { ...scaffoldRef.current, body: middle };
      onChangeRef.current?.(current);
    });

    return () => sub.dispose();
  }, [readOnly, loadingLabel, restoreScaffold, fullText, language]);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    paintReadonly();
    onMountExtra?.(editor, monaco);
  };

  const displayValue = loadingLabel || fullText;
  const locked = !!(readOnly || loadingLabel);

  return (
    <div className={`scaffold-editor ${isDark ? 'scaffold-dark' : 'scaffold-light'}`}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          language={lang}
          theme={theme}
          value={displayValue}
          options={{
            readOnly: locked,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, Monaco, Consolas, monospace",
            wordWrap: 'on',
            renderLineHighlight: 'none',
            occurrencesHighlight: 'off',
            selectionHighlight: false,
            matchBrackets: 'never',
            glyphMargin: true,
            lineNumbers: 'on',
            padding: { top: 8 },
            smoothScrolling: true,
          }}
          onMount={handleMount}
        />
      </div>
    </div>
  );
}

export default ScaffoldCodeEditor;
