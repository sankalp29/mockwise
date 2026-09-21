import { useMemo } from 'react';
import { Button, Spinner } from 'react-bootstrap';
import '../styles/CompileResultPanel.css';

/**
 * LeetCode-inspired compile/result strip under the editor.
 * statuses: success | compile_error | failed | idle
 */
function CompileResultPanel({
  result,
  isChecking,
  isDark,
  onClose,
  onJumpToLine,
}) {
  const statusMeta = useMemo(() => {
    if (isChecking) {
      return {
        key: 'running',
        label: 'Running',
        className: 'crp-status-running',
        summary: 'Compiling your code…',
      };
    }
    if (!result) {
      return {
        key: 'idle',
        label: 'Ready',
        className: 'crp-status-idle',
        summary: 'Click Compile to check your solution for syntax and compile errors.',
      };
    }
    if (result.status === 'success') {
      return {
        key: 'success',
        label: 'Accepted',
        className: 'crp-status-success',
        summary: 'No compile errors. Your code is syntactically valid.',
      };
    }
    if (result.status === 'failed') {
      return {
        key: 'failed',
        label: 'Error',
        className: 'crp-status-failed',
        summary: result.summary || 'Could not complete the compile check.',
      };
    }
    const n = result.diagnostics?.length || result.messages?.length || 0;
    return {
      key: 'compile_error',
      label: 'Compile Error',
      className: 'crp-status-error',
      summary: n === 1 ? '1 compile error' : `${n} compile errors`,
    };
  }, [result, isChecking]);

  const lines = useMemo(() => {
    if (!result) return [];
    if (Array.isArray(result.diagnostics) && result.diagnostics.length > 0) {
      return result.diagnostics;
    }
    return (result.messages || []).map((message) => ({
      line: null,
      column: null,
      message,
      severity: 'error',
    }));
  }, [result]);

  if (!isChecking && !result) {
    return null;
  }

  return (
    <div className={`compile-result-panel ${isDark ? 'crp-dark' : 'crp-light'}`}>
      <div className="crp-header">
        <div className="crp-header-left">
          <span className="crp-tab crp-tab-active">Compile Result</span>
        </div>
        <div className="crp-header-right">
          {onClose && !isChecking && (
            <Button
              variant="link"
              size="sm"
              className="crp-close"
              onClick={onClose}
              title="Close"
            >
              ✕
            </Button>
          )}
        </div>
      </div>

      <div className="crp-body">
        <div className={`crp-status-row ${statusMeta.className}`}>
          {isChecking ? (
            <Spinner animation="border" size="sm" className="me-2" />
          ) : statusMeta.key === 'success' ? (
            <span className="crp-status-icon" aria-hidden>✓</span>
          ) : statusMeta.key === 'compile_error' || statusMeta.key === 'failed' ? (
            <span className="crp-status-icon" aria-hidden>✕</span>
          ) : null}
          <span className="crp-status-label">{statusMeta.label}</span>
          <span className="crp-status-summary">{statusMeta.summary}</span>
        </div>

        {!isChecking && result?.status === 'compile_error' && lines.length > 0 && (
          <div className="crp-console" role="log" aria-live="polite">
            {lines.map((d, i) => {
              const hasLine = Number.isFinite(d.line) && d.line > 0;
              return (
                <div
                  key={i}
                  className={`crp-console-line ${hasLine ? 'crp-console-line-clickable' : ''}`}
                  onClick={() => {
                    if (hasLine && onJumpToLine) onJumpToLine(d.line, d.column || 1);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && hasLine && onJumpToLine) {
                      e.preventDefault();
                      onJumpToLine(d.line, d.column || 1);
                    }
                  }}
                  role={hasLine ? 'button' : undefined}
                  tabIndex={hasLine ? 0 : undefined}
                  title={hasLine ? `Go to line ${d.line}` : undefined}
                >
                  {hasLine && (
                    <span className="crp-line-ref">
                      Line {d.line}
                      {d.column ? `:${d.column}` : ''}
                    </span>
                  )}
                  <span className="crp-line-msg">{d.message}</span>
                </div>
              );
            })}
          </div>
        )}

        {!isChecking && result?.status === 'failed' && result.summary && (
          <div className="crp-console">
            <div className="crp-console-line">
              <span className="crp-line-msg">{result.summary}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default CompileResultPanel;
