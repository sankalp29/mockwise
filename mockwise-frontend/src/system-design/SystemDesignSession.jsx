import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SystemDesignWhiteboard from './SystemDesignWhiteboard';
import SystemDesignQuestionPanel from './SystemDesignQuestionPanel';
import {
  DEFAULT_DURATION_MINUTES,
  clearSystemDesignScene,
} from './excalidrawElements';
import {
  getDefaultSystemDesignQuestion,
  getSystemDesignQuestion,
  getSystemDesignQuestionsByDifficulty,
} from './systemDesignQuestions';
import '../styles/SystemDesign.css';

const TIMER_STORAGE_KEY = 'sd_session_timer_v2';

/** Build the ordered question list for this session (assigned at customize/start). */
function resolveSessionQuestions(state) {
  const ids = Array.isArray(state?.questionIds) ? state.questionIds : null;
  if (ids?.length) {
    const list = ids.map((id) => getSystemDesignQuestion(id)).filter(Boolean);
    if (list.length) return list;
  }
  // Legacy single-id start
  if (state?.questionId) {
    return [getSystemDesignQuestion(state.questionId)];
  }
  // Difficulty-only fallback
  if (state?.difficulty) {
    const byDiff = getSystemDesignQuestionsByDifficulty(state.difficulty);
    if (byDiff.length) return byDiff;
  }
  return [getDefaultSystemDesignQuestion()];
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Pause-safe countdown:
 * - While running: remaining = ceil((deadline - now) / 1000)
 * - On pause: freeze remaining, clear deadline (paused wall-clock time is ignored)
 * - On resume: deadline = now + remaining * 1000 (continues from frozen value)
 */
function readStoredTimer(totalSeconds, startedAt) {
  try {
    const raw = sessionStorage.getItem(TIMER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Only restore for the same session start (not a brand-new interview)
      if (
        typeof parsed?.remaining === 'number' &&
        typeof parsed?.timerOn === 'boolean' &&
        parsed.totalSeconds === totalSeconds &&
        parsed.startedAt === startedAt
      ) {
        return {
          remaining: Math.max(0, Math.min(totalSeconds, Math.floor(parsed.remaining))),
          timerOn: parsed.timerOn,
        };
      }
    }
  } catch {
    /* ignore */
  }
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return { remaining: Math.max(0, totalSeconds - elapsed), timerOn: true };
}

/**
 * Free HLD session — layout + resize behavior aligned with coding InterviewSession:
 * - .resizable-container flex row
 * - left % width, right (100-left) %
 * - 6px drag handle, document-level mousemove/mouseup while dragging
 * - width persisted in localStorage
 *
 * Each design question has its own whiteboard (storage + remount by question id).
 */
function SystemDesignSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const durationMinutes =
    location.state?.durationMinutes || DEFAULT_DURATION_MINUTES;
  // Capture once — never re-bind to wall clock on re-render
  const startedAtRef = useRef(location.state?.startedAt || Date.now());
  // Questions assigned at start for the chosen difficulty (not picked by the candidate)
  const sessionQuestions = useMemo(
    () => resolveSessionQuestions(location.state),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fixed for this session mount
    []
  );

  const [question, setQuestion] = useState(() => sessionQuestions[0]);
  // Bumped after "Clear this board" so Excalidraw remounts with empty scene
  const [boardEpoch, setBoardEpoch] = useState(0);

  const totalSeconds = durationMinutes * 60;
  const initialTimer = useMemo(
    () => readStoredTimer(totalSeconds, startedAtRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount
    []
  );
  const [remaining, setRemaining] = useState(initialTimer.remaining);
  const [timerOn, setTimerOn] = useState(initialTimer.timerOn);
  // Absolute end timestamp while running; null while paused
  const deadlineRef = useRef(
    initialTimer.timerOn ? Date.now() + initialTimer.remaining * 1000 : null
  );
  const remainingRef = useRef(initialTimer.remaining);
  const intervalRef = useRef(null);

  // Same key pattern as coding: interview_panel_width → sd uses dedicated key
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('sd_interview_panel_width');
      // Default 50% like coding session
      return saved ? parseFloat(saved) : 50;
    } catch {
      return 50;
    }
  });
  const [isDragging, setIsDragging] = useState(false);

  // Keep frozen remaining available to toggle without stale closures
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  // Persist so remount / HMR does not recompute from original startedAt
  useEffect(() => {
    try {
      sessionStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          remaining,
          timerOn,
          totalSeconds,
          startedAt: startedAtRef.current,
        })
      );
    } catch {
      /* ignore */
    }
  }, [remaining, timerOn, totalSeconds]);

  const clearTick = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Tick only while running from deadline. Pause leaves remaining frozen.
  useEffect(() => {
    clearTick();
    if (!timerOn) return undefined;

    // Ensure a deadline exists (e.g. after resume)
    if (deadlineRef.current == null) {
      deadlineRef.current = Date.now() + remainingRef.current * 1000;
    }

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline == null) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      remainingRef.current = left;
      setRemaining(left);
      if (left <= 0) {
        clearTick();
        deadlineRef.current = null;
      }
    };

    tick(); // sync immediately on resume / mount
    intervalRef.current = setInterval(tick, 250);
    return clearTick;
  }, [timerOn, clearTick]);

  const toggleTimer = useCallback(() => {
    if (timerOn) {
      // Pause: freeze current remaining; drop deadline so wall clock stops counting
      clearTick();
      const left =
        deadlineRef.current != null
          ? Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
          : remainingRef.current;
      remainingRef.current = left;
      setRemaining(left);
      deadlineRef.current = null;
      setTimerOn(false);
    } else {
      // Resume: rebuild deadline from frozen remaining — do NOT use original startedAt
      deadlineRef.current = Date.now() + remainingRef.current * 1000;
      setTimerOn(true);
    }
  }, [timerOn, clearTick]);

  const progress = useMemo(() => {
    if (totalSeconds <= 0) return 0;
    return Math.min(100, ((totalSeconds - remaining) / totalSeconds) * 100);
  }, [remaining, totalSeconds]);

  const clearBoard = useCallback(() => {
    if (
      !window.confirm(
        `Clear the whiteboard for “${question.title}” only? Other questions keep their diagrams.`
      )
    ) {
      return;
    }
    clearSystemDesignScene(question.id);
    setBoardEpoch((n) => n + 1);
  }, [question.title, question.id]);

  // —— Resize: same control flow as InterviewSession ——
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;

      const container = document
        .querySelector('.sd-resizable-container')
        ?.getBoundingClientRect();

      if (container) {
        const newLeftWidth = ((e.clientX - container.left) / container.width) * 100;
        // Same bounds as coding session (20%–80%)
        const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
        setLeftPanelWidth(constrainedWidth);
        try {
          localStorage.setItem('sd_interview_panel_width', constrainedWidth.toString());
        } catch {
          /* ignore */
        }
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const timerClass = [
    'sd-timer',
    remaining === 0 ? 'sd-timer-ended' : '',
    remaining > 0 && remaining <= 300 ? 'sd-timer-warn' : '',
    !timerOn && remaining > 0 ? 'sd-timer-paused' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const questionIndex = Math.max(
    0,
    sessionQuestions.findIndex((q) => q.id === question.id)
  );

  return (
    <div className="sd-session">
      <header className="sd-session-bar">
        <div className="sd-session-bar-left">
          <Link to="/home" className="sd-session-brand">
            MockWise
          </Link>
          <span className="sd-session-badge">System design · Free</span>
          <div className="sd-question-switcher d-none d-md-flex align-items-center gap-2">
            <span className="sd-q-count">
              Question {questionIndex + 1} of {sessionQuestions.length}
            </span>
            {sessionQuestions.map((q, idx) => (
              <Button
                key={q.id}
                type="button"
                size="sm"
                variant={q.id === question.id ? 'success' : 'outline-light'}
                className="rounded-circle sd-q-dot"
                style={{ width: 36, height: 36, padding: 0 }}
                title={q.title}
                onClick={() => setQuestion(q)}
              >
                {idx + 1}
              </Button>
            ))}
          </div>
        </div>

        <div className="sd-session-bar-center">
          <span className={timerClass} aria-live="polite">
            {formatTime(remaining)}
            {!timerOn && remaining > 0 ? (
              <span className="sd-timer-paused-label"> Paused</span>
            ) : null}
          </span>
          <div className="sd-session-progress" aria-hidden="true">
            <div className="sd-session-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="sd-session-bar-right">
          <Button
            type="button"
            size="sm"
            variant={timerOn ? 'outline-light' : 'warning'}
            className="sd-bar-btn"
            onClick={toggleTimer}
            aria-pressed={!timerOn}
          >
            {timerOn ? 'Pause timer' : 'Resume timer'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline-light"
            className="sd-bar-btn"
            onClick={clearBoard}
          >
            Clear this board
          </Button>
          <Button
            type="button"
            size="sm"
            variant="success"
            className="sd-bar-btn"
            onClick={() => {
              try {
                sessionStorage.removeItem(TIMER_STORAGE_KEY);
              } catch {
                /* ignore */
              }
              // Mock HLD feedback (architecture rubrics — not DSA metrics)
              navigate('/system-design/feedback', {
                replace: true,
                state: {
                  difficulty: location.state?.difficulty || question.difficulty,
                  durationMinutes,
                  freeAccess: location.state?.freeAccess !== false,
                  questionIds: sessionQuestions.map((q) => q.id),
                  startedAt: startedAtRef.current,
                },
              });
            }}
          >
            Submit interview
          </Button>
        </div>
      </header>

      {/* Matches coding InterviewSession .resizable-container structure */}
      <div
        className="sd-resizable-container resizable-container"
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: '0px',
        }}
      >
        {/* Left: question panel */}
        <div
          style={{
            width: `${leftPanelWidth}%`,
            minWidth: '300px',
            height: '100%',
            padding: '12px',
            boxSizing: 'border-box',
          }}
        >
          <SystemDesignQuestionPanel question={question} />
        </div>

        {/* Drag handle — same dimensions / grip as coding session */}
        <div
          style={{
            width: '6px',
            background: isDragging ? '#198754' : 'rgba(255,255,255,0.3)',
            cursor: 'col-resize',
            position: 'relative',
            transition: isDragging ? 'none' : 'background-color 0.2s ease',
            flexShrink: 0,
          }}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize question and whiteboard"
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '20px',
              height: '40px',
              background: isDragging ? '#198754' : 'rgba(255,255,255,0.5)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isDragging ? 'none' : 'background-color 0.2s ease',
            }}
          >
            <div
              style={{
                width: '3px',
                height: '20px',
                background: isDragging ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                borderRadius: '1px',
                marginRight: '2px',
              }}
            />
            <div
              style={{
                width: '3px',
                height: '20px',
                background: isDragging ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
                borderRadius: '1px',
              }}
            />
          </div>
        </div>

        {/* Right: whiteboard — width complementary to left, like coding editor pane */}
        <div
          style={{
            width: `${100 - leftPanelWidth}%`,
            minWidth: '300px',
            height: '100%',
            padding: '12px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="sd-board-frame"
            style={{
              height: '100%',
              borderRadius: '12px',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.06)',
              position: 'relative',
            }}
          >
            {/* key: remount per question + after clear so scenes never leak across prompts */}
            <SystemDesignWhiteboard
              key={`${question.id}:${boardEpoch}`}
              questionId={question.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemDesignSession;
