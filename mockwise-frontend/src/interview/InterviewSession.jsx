import { useEffect, useMemo, useState, useContext, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, ProgressBar, Modal, Spinner, Alert, Dropdown, DropdownButton, Form } from 'react-bootstrap';
import { BsFillMoonFill, BsFillSunFill } from 'react-icons/bs';
import ReactMarkdown from 'react-markdown';
import '../styles/InterviewSession.css';
import axios from 'axios';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';
import CompileResultPanel from './CompileResultPanel';
import ScaffoldCodeEditor from './ScaffoldCodeEditor';

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Parse toolchain messages into LeetCode-style diagnostics (line/col when possible). */
function parseCompileDiagnostics(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((raw) => {
    const message = String(raw ?? '');
    // "Error on line 12:3: ..." or "Error on line 12: ..." (Java toolchain)
    let m = message.match(/\b(?:error|warning)\s+on\s+line\s+(\d+)(?::(\d+))?\b/i);
    if (m) {
      return {
        line: Number(m[1]),
        column: m[2] ? Number(m[2]) : 1,
        message,
        severity: /warning/i.test(message) ? 'warning' : 'error',
      };
    }
    // "solution.cpp:14:5: error: ..." / "file.py:3: syntax error"
    m = message.match(/(?:^|[\s"'])(?:[\w./\\-]+):(\d+)(?::(\d+))?\b/);
    if (m) {
      return {
        line: Number(m[1]),
        column: m[2] ? Number(m[2]) : 1,
        message,
        severity: /warning/i.test(message) ? 'warning' : 'error',
      };
    }
    // "line 7"
    m = message.match(/\bline\s+(\d+)\b/i);
    if (m) {
      return {
        line: Number(m[1]),
        column: 1,
        message,
        severity: /warning/i.test(message) ? 'warning' : 'error',
      };
    }
    return { line: null, column: null, message, severity: 'error' };
  });
}

function buildCompileResultFromMessages(messages, { forceFailed = false } = {}) {
  const list = Array.isArray(messages) ? messages.filter((x) => x != null && String(x).length > 0) : [];
  if (forceFailed) {
    return {
      status: 'failed',
      summary: list[0] ? String(list[0]) : 'Compile check failed.',
      messages: list.map(String),
      diagnostics: [],
    };
  }
  if (list.length === 0) {
    return {
      status: 'success',
      summary: 'No compile errors.',
      messages: [],
      diagnostics: [],
    };
  }
  // Legacy success string from older clients
  const onlySuccess =
    list.length === 1 && String(list[0]).toLowerCase().includes('no syntax errors');
  if (onlySuccess) {
    return {
      status: 'success',
      summary: 'No compile errors.',
      messages: [],
      diagnostics: [],
    };
  }
  const diagnostics = parseCompileDiagnostics(list);
  return {
    status: 'compile_error',
    summary:
      diagnostics.length === 1
        ? '1 compile error'
        : `${diagnostics.length} compile errors`,
    messages: list.map(String),
    diagnostics,
  };
}

function InterviewSession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { interviewId } = useParams();
  const { getAccessToken } = useContext(SupabaseAuthContext);

  // State for interview data
  const [interviewData, setInterviewData] = useState(null);
  const [problems, setProblems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [codeByIndex, setCodeByIndex] = useState([]);
  const [timeComplexityByIndex, setTimeComplexityByIndex] = useState([]);
  const [spaceComplexityByIndex, setSpaceComplexityByIndex] = useState([]);
  
  // Timer state
  const [remaining, setRemaining] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState(null);
  
  // UI state
  const [showEndModal, setShowEndModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);
  // Per-question compile result: null | { status, summary, messages, diagnostics }
  const [compileResultByIndex, setCompileResultByIndex] = useState([]);
  const [isCheckingSyntax, setIsCheckingSyntax] = useState(false);
  const [showCompilePanel, setShowCompilePanel] = useState(false);
  const [runOutput] = useState(null);
  const [isExecutingCode] = useState(false);
  const [languageByIndex, setLanguageByIndex] = useState([]); // Language per question
  const [editorTheme, setEditorTheme] = useState(() => {
    const savedTheme = localStorage.getItem('monaco_editor_theme');
    // Prefer soft VS Code dark over high-contrast black for long sessions
    if (savedTheme === 'hc-black') return 'vs-dark';
    return savedTheme || 'vs-dark';
  });
  // Which language stub is currently being fetched (null = not loading).
  // Display "Loading X stub..." only when this matches selectedLanguage — avoids
  // mismatched labels when a prior fetch finishes after a language switch.
  const [loadingStubLanguage, setLoadingStubLanguage] = useState(null);
  const isLoadingStub = loadingStubLanguage !== null;
  const isDark = editorTheme === 'vs-dark' || editorTheme === 'hc-black';
  const milestoneBeepsRef = useRef(new Set());
  const [showFiveMinAlert, setShowFiveMinAlert] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const prevRemainingRef = useRef(null);
  /** Monotonic token so stale stub responses never apply after a newer request. */
  const stubLoadGenRef = useRef(0);

  // Helper to get current language for the current question
  const selectedLanguage = useMemo(() => {
    return languageByIndex[currentIndex] || 'java';
  }, [languageByIndex, currentIndex]);

  // Persist and restore compile results across visibility changes
  const compileResultKey = useMemo(
    () => `interview_${interviewId}_compileResultByIndex`,
    [interviewId]
  );

  const setAndPersistCompileResult = useCallback((result, questionIndex) => {
    setCompileResultByIndex((prev) => {
      const updated = [...prev];
      updated[questionIndex] = result;
      try {
        const payload = JSON.stringify(updated);
        sessionStorage.setItem(compileResultKey, payload);
        localStorage.setItem(compileResultKey, payload);
      } catch (_) { /* ignore */ }
      return updated;
    });
    if (result) setShowCompilePanel(true);
  }, [compileResultKey]);

  const clearCompileResult = useCallback((questionIndex) => {
    setAndPersistCompileResult(null, questionIndex);
    setShowCompilePanel(false);
    // Clear Monaco markers
    try {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor?.getModel?.();
      if (monaco && model) {
        monaco.editor.setModelMarkers(model, 'mockwise-compile', []);
      }
    } catch (_) { /* ignore */ }
  }, [setAndPersistCompileResult]);

  const applyMonacoMarkers = useCallback((diagnostics) => {
    try {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor?.getModel?.();
      if (!monaco || !model) return;
      const markers = (diagnostics || [])
        .filter((d) => Number.isFinite(d.line) && d.line > 0)
        .map((d) => ({
          severity:
            d.severity === 'warning'
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Error,
          message: d.message,
          startLineNumber: d.line,
          startColumn: d.column && d.column > 0 ? d.column : 1,
          endLineNumber: d.line,
          endColumn: (d.column && d.column > 0 ? d.column : 1) + 1,
        }));
      monaco.editor.setModelMarkers(model, 'mockwise-compile', markers);
    } catch (_) { /* ignore */ }
  }, []);

  const jumpToCompileLine = useCallback((line, column = 1) => {
    try {
      const editor = editorRef.current;
      if (!editor || !Number.isFinite(line) || line < 1) return;
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: column > 0 ? column : 1 });
      editor.focus();
    } catch (_) { /* ignore */ }
  }, []);

  // Restore compile results on first mount
  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(compileResultKey) || sessionStorage.getItem(compileResultKey);
      if (!stored) return;
      const arr = JSON.parse(stored);
      if (!Array.isArray(arr)) return;
      // Migrate legacy string[][] error lists → structured results
      const migrated = arr.map((item) => {
        if (item == null) return null;
        if (Array.isArray(item)) return buildCompileResultFromMessages(item);
        if (typeof item === 'object' && item.status) return item;
        return null;
      });
      setCompileResultByIndex(migrated);
      if (migrated.some(Boolean)) setShowCompilePanel(true);
    } catch (_) { /* ignore */ }
  }, [compileResultKey]);

  const playBeep = useCallback(() => {
    try {
      const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || window['webkitAudioContext']) : null;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.06;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 220);
    } catch (_e) { /* ignore audio errors */ }
  }, []);

  const handleToggleTheme = useCallback(() => {
    setEditorTheme((prevTheme) => {
      const dark = prevTheme === 'vs-dark' || prevTheme === 'hc-black';
      const newTheme = dark ? 'vs-light' : 'vs-dark';
      localStorage.setItem('monaco_editor_theme', newTheme);
      return newTheme;
    });
  }, []);
  
  // Resizable splitter state
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    const saved = localStorage.getItem('interview_panel_width');
    return saved ? parseFloat(saved) : 50;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Load interview data from location state or sessionStorage
  useEffect(() => {
    if (!interviewId) {
      navigate('/practice/coding', { replace: true });
      return;
    }

    const submittedFlag = sessionStorage.getItem(`interview_${interviewId}_submitted`) || 
                         localStorage.getItem(`interview_${interviewId}_submitted`);
    
    logger.log('Checking submitted flag for interview:', interviewId, 'Flag value:', submittedFlag);
    
    if (submittedFlag === 'true') {
      logger.log('Interview already submitted, redirecting to feedback...');
      logger.log('Redirecting to:', `/interview/feedback/${interviewId}/loading`);
      navigate(`/interview/feedback/${interviewId}/loading`, { replace: true });
      return;
    }

    const submittingFlag = sessionStorage.getItem(`interview_${interviewId}_submitting`) || 
                          localStorage.getItem(`interview_${interviewId}_submitting`);

    const startedAt = sessionStorage.getItem(`interview_${interviewId}_startedAt`);
    if (!startedAt) {
      sessionStorage.setItem(`interview_${interviewId}_startedAt`, Date.now().toString());
      sessionStorage.removeItem(`interview_${interviewId}_submitted`);
      sessionStorage.removeItem(`interview_${interviewId}_submitting`);
      localStorage.removeItem(`interview_${interviewId}_submitted`);
      localStorage.removeItem(`interview_${interviewId}_submitting`);
    }
    
    if (submittingFlag === 'true') {
      logger.log('Interview is being submitted, showing submitting state...');
      setIsSubmitting(true);
      setShowEndModal(true);
    }

    if (interviewData && problems.length > 0) {
      logger.log('Interview data already loaded, skipping re-initialization');
      return;
    }

    const localStored = localStorage.getItem(`interview_${interviewId}`);
    const sessionStored = sessionStorage.getItem(`interview_${interviewId}`);
    let data = null;

    if (localStored) {
      try {
        const localData = JSON.parse(localStored);
        if (localData.currentCode || localData.lastUpdated) {
          logger.log('Using localStorage data (durable)');
          data = localData;
          logger.log('Local data:', localData);
        }
      } catch (e) {
        logger.error('Error parsing local interview data:', e);
      }
    }

    if (!data && sessionStored) {
      try {
        const sessionData = JSON.parse(sessionStored);
        if (sessionData.currentCode || sessionData.lastUpdated) {
          logger.log('Using sessionStorage data (has saved code or more recent)');
          data = sessionData;
          logger.log('Session data:', sessionData);
        }
      } catch (e) {
        logger.error('Error parsing stored interview data:', e);
      }
    }
    
    if (!data) {
      data = location.state;
      logger.log('Using location.state data');
    }
    
    if (!data) {
      navigate(`/interview/recover/${interviewId}`, { replace: true });
      return;
    }

    if (!data || !data.interview || !data.questions) {
      setError('Invalid interview data');
      return;
    }

    setInterviewData(data);
    setProblems(data.questions);
    
    if (data.isSubmitted) {
      setIsSubmitted(true);
    }
    
    const savedCode = data.currentCode;
    logger.log('Loading interview session:', { 
      interviewId, 
      hasLocationState: !!location.state,
      hasSavedCode: !!savedCode,
      savedCodeLength: savedCode?.length,
      questionsLength: data.questions.length,
      savedCode: savedCode
    });
    
    // Initialize language per question first (needed to seed per-language drafts).
    const initialLanguages = Array.isArray(data.languageByIndex) && data.languageByIndex.length === data.questions.length
      ? data.languageByIndex
      : data.questions.map(() => 'java');
    setLanguageByIndex(initialLanguages);
    logger.log('Initial languages set:', initialLanguages);

    const initialCode = savedCode && savedCode.length === data.questions.length
      ? savedCode
      : data.questions.map(problem =>
          problem.defaultTemplate || `function solve(input) {\n  // Write your code here\n  return null;\n}`
        );
    setCodeByIndex(initialCode);
    logger.log('Initial code set:', initialCode);

    // Seed drafts only when restoring a prior session buffer — not generic placeholders
    // (those must be replaced by a real language stub on first load).
    const restoredFromStorage = !!(savedCode && savedCode.length === data.questions.length);
    if (restoredFromStorage) {
      try {
        data.questions.forEach((problem, i) => {
          if (!problem?.id) return;
          const lang = initialLanguages[i] || 'java';
          const draftKey = `interview_${interviewId}_draft_${problem.id}_${lang}`;
          const hasDraft =
            sessionStorage.getItem(draftKey) !== null || localStorage.getItem(draftKey) !== null;
          if (!hasDraft && typeof initialCode[i] === 'string') {
            sessionStorage.setItem(draftKey, initialCode[i]);
            localStorage.setItem(draftKey, initialCode[i]);
          }
        });
      } catch (_) { /* ignore */ }
    }

    const initialTime = Array.isArray(data.selfTimeComplexity) && data.selfTimeComplexity.length === data.questions.length
      ? data.selfTimeComplexity
      : data.questions.map(() => '');
    const initialSpace = Array.isArray(data.selfSpaceComplexity) && data.selfSpaceComplexity.length === data.questions.length
      ? data.selfSpaceComplexity
      : data.questions.map(() => '');
    setTimeComplexityByIndex(initialTime);
    setSpaceComplexityByIndex(initialSpace);

    if (data.currentIndex !== undefined && data.currentIndex >= 0 && data.currentIndex < data.questions.length) {
      logger.log('Restoring currentIndex from saved data:', data.currentIndex);
      setCurrentIndex(data.currentIndex);
    }

    const totalTimeMs = data.timeMinutes * 60 * 1000;
    const startTime = data.startTime || Date.now();
    const elapsed = Date.now() - startTime;
    const remainingMs = Math.max(0, totalTimeMs - elapsed);
    
    setRemaining(Math.floor(remainingMs / 1000));
    setTimerStartTime(Date.now() - elapsed);

    // Persist initial data with languageByIndex
    const updatedData = { 
      ...data, 
      startTime, 
      lastUpdated: Date.now(),
      languageByIndex: initialLanguages
    };
    sessionStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
    localStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));

  }, [interviewId, location.state, navigate, interviewData, problems.length]);

  /**
   * Fetch stub from API only (no loading UI state — callers own loadingStubLanguage).
   * Backend: GET .../stub → { stub: "..." }
   */
  const fetchCodeStubFromApi = useCallback(async (questionId, language) => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error('User not authenticated');
    }
    const response = await axios.get(
      `${buildApiUrl(API_ENDPOINTS.INTERVIEW_QUESTIONS)}/${questionId}/stub?language=${encodeURIComponent(language)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const body = response.data;
    if (typeof body === 'string') return body;
    if (body && typeof body.stub === 'string') return body.stub;
    logger.warn('Unexpected stub response shape:', body);
    return '';
  }, [getAccessToken]);

  /** Per-question, per-language draft (session first, localStorage backup). */
  const getDraftKey = useCallback((problemId, language) => {
    return `interview_${interviewId}_draft_${problemId}_${language}`;
  }, [interviewId]);

  const removeCodeDraft = useCallback((problemId, language) => {
    if (!problemId || !language) return;
    try {
      const key = getDraftKey(problemId, language);
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch (_) { /* ignore */ }
  }, [getDraftKey]);

  /** True for values that must never block a real stub fetch. */
  const isPoisonedDraft = useCallback((code) => {
    if (typeof code !== 'string') return true;
    const src = code.trim();
    // Empty string is allowed (user cleared the editor after a real load).
    if (src === '') return false;
    return (
      src.startsWith('function solve(input)') ||
      src.startsWith('// default template') ||
      src.startsWith('/* default template */') ||
      src.startsWith('Loading ')
    );
  }, []);

  const readCodeDraft = useCallback((problemId, language) => {
    if (!problemId || !language) return null;
    try {
      const key = getDraftKey(problemId, language);
      let raw = sessionStorage.getItem(key);
      if (raw === null) raw = localStorage.getItem(key);
      if (raw === null) return null;
      // Drop poisoned values from earlier bugs so we re-fetch the real stub.
      if (isPoisonedDraft(raw) && raw.trim() !== '') {
        removeCodeDraft(problemId, language);
        return null;
      }
      return raw;
    } catch (_) { /* ignore */ }
    return null;
  }, [getDraftKey, isPoisonedDraft, removeCodeDraft]);

  const writeCodeDraft = useCallback((problemId, language, code) => {
    if (!problemId || !language || typeof code !== 'string') return;
    // Never persist loading placeholders.
    if (code.startsWith('Loading ')) return;
    try {
      const key = getDraftKey(problemId, language);
      sessionStorage.setItem(key, code);
      localStorage.setItem(key, code);
    } catch (_) { /* ignore */ }
  }, [getDraftKey]);

  const isGenericPlaceholder = useCallback((code) => {
    const src = (code || '').trim();
    if (!src) return true;
    return (
      src.startsWith('function solve(input)') ||
      src.startsWith('// default template') ||
      src.startsWith('/* default template */') ||
      src.startsWith('Loading ')
    );
  }, []);
  /**
   * Save buffer for a language only when it is real content we should keep:
   * - already had a draft for that language (update it), or
   * - buffer is non-placeholder content.
   * Never poison storage with "" / "Loading…" / default template while a stub is still in flight.
   */
  const saveLanguageDraftSafely = useCallback((problemId, language, code) => {
    if (!problemId || !language) return;
    const existing = readCodeDraft(problemId, language);
    if (existing !== null) {
      writeCodeDraft(problemId, language, code ?? '');
      return;
    }
    if (!isGenericPlaceholder(code)) {
      writeCodeDraft(problemId, language, code);
    }
  }, [readCodeDraft, writeCodeDraft, isGenericPlaceholder]);

  const persistInterviewSnapshot = useCallback((overrides = {}) => {
    if (!interviewData) return;
    try {
      const updatedData = {
        ...interviewData,
        currentCode: codeByIndex,
        currentIndex,
        languageByIndex,
        lastUpdated: Date.now(),
        selfTimeComplexity: timeComplexityByIndex,
        selfSpaceComplexity: spaceComplexityByIndex,
        ...overrides,
      };
      const payload = JSON.stringify(updatedData);
      sessionStorage.setItem(`interview_${interviewId}`, payload);
      localStorage.setItem(`interview_${interviewId}`, payload);
    } catch (_) { /* ignore */ }
  }, [
    interviewData,
    codeByIndex,
    currentIndex,
    languageByIndex,
    timeComplexityByIndex,
    spaceComplexityByIndex,
    interviewId,
  ]);

  /**
   * Ensure editor has code for (question, language):
   * 1) restore draft from session/local storage if present (no network)
   * 2) else fetch stub once, persist as draft, show in editor
   * Race-safe via stubLoadGenRef; loading label uses loadingStubLanguage.
   */
  const ensureCodeForLanguage = useCallback(async (problemId, language, questionIndex) => {
    if (!problemId || !language || questionIndex == null || questionIndex < 0) return;

    const existing = readCodeDraft(problemId, language);
    if (existing !== null) {
      setCodeByIndex(prev => {
        const next = [...prev];
        if (next[questionIndex] === existing) return prev;
        next[questionIndex] = existing;
        return next;
      });
      setLoadingStubLanguage(prev => (prev === language ? null : prev));
      return existing;
    }

    const gen = ++stubLoadGenRef.current;
    setLoadingStubLanguage(language);
    try {
      const stub = await fetchCodeStubFromApi(problemId, language);
      // Stale response after a newer ensureCodeForLanguage / language switch.
      if (gen !== stubLoadGenRef.current) return null;

      if (typeof stub === 'string' && stub.trim().length > 0) {
        writeCodeDraft(problemId, language, stub);
        setCodeByIndex(prev => {
          const next = [...prev];
          next[questionIndex] = stub;
          return next;
        });
        return stub;
      }
      setError(`No code stub available for ${language}.`);
      return '';
    } catch (err) {
      if (gen !== stubLoadGenRef.current) return null;
      logger.error(`Error fetching code stub for question ${problemId} and language ${language}:`, err);
      const apiMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === 'string' ? err.response.data : null) ||
        err.message ||
        'Failed to fetch code stub.';
      setError(apiMessage);
      return '';
    } finally {
      if (gen === stubLoadGenRef.current) {
        setLoadingStubLanguage(null);
      }
    }
  }, [readCodeDraft, writeCodeDraft, fetchCodeStubFromApi]);

  // Keep latest loader in a ref so the effect only re-runs on question/language
  // changes — not when callback identities churn.
  const ensureCodeForLanguageRef = useRef(ensureCodeForLanguage);
  ensureCodeForLanguageRef.current = ensureCodeForLanguage;

  const currentProblemId = problems[currentIndex]?.id ?? null;

  // Load draft or stub when question index / language changes only.
  useEffect(() => {
    if (!currentProblemId || !selectedLanguage || isSubmitting || isSubmitted) return;
    ensureCodeForLanguageRef.current(currentProblemId, selectedLanguage, currentIndex);
  }, [currentIndex, currentProblemId, selectedLanguage, isSubmitting, isSubmitted]);
  const handleConfirmSubmit = useCallback(async () => {
    setIsSubmitting(true);
    
    navigate(`/interview/feedback/${interviewId}/loading`, { replace: true });
    logger.log('Initiating navigation to feedback page...');
    logger.log('Navigation command sent');

    sessionStorage.setItem(`interview_${interviewId}_submitting`, 'true');
    localStorage.setItem(`interview_${interviewId}_submitting`, 'true');
    
    try {
      const submissions = problems.map((problem, index) => ({
        questionId: problem.id,
        code: codeByIndex[index] || '',
        language: languageByIndex[index] || 'java',
        timeComplexity: (Array.isArray(timeComplexityByIndex) ? timeComplexityByIndex[index] : '') || '',
        spaceComplexity: (Array.isArray(spaceComplexityByIndex) ? spaceComplexityByIndex[index] : '') || ''
      }));

      logger.log('Preparing submission:', {
        interviewId: interviewData.interview.id,
        submissionsCount: submissions.length,
        submissions: submissions,
        url: buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewData.interview.id}/submit`)
      });

      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('User not authenticated');
      }

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      };

      logger.log('Submitting with headers:', headers);
      logger.log('Submitting with interview id:', interviewData.interview.id);

      const response = await axios.post(
        buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewData.interview.id}/submit`),
        { submissions },
        { headers },
      );

      logger.log('Interview submitted:', response.data);

    } catch (error) {
      logger.error('Error submitting interview:', error);
      logger.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
      
      sessionStorage.removeItem(`interview_${interviewId}_submitting`);
      localStorage.removeItem(`interview_${interviewId}_submitting`);
      
      setError(error.response?.data?.error || error.message || 'Submission failed');
    } finally { /* cleanup handled above */ }
  }, [interviewData, problems, codeByIndex, getAccessToken, navigate, interviewId, languageByIndex, timeComplexityByIndex, spaceComplexityByIndex]);
  
  // Timer effect with persistence
  useEffect(() => {
    if (!interviewData || timerStartTime === null) return;

    const interval = setInterval(() => {
      const totalTimeMs = interviewData.timeMinutes * 60 * 1000;
      const elapsed = Date.now() - timerStartTime;
      const remainingMs = Math.max(0, totalTimeMs - elapsed);
      const remainingSeconds = Math.floor(remainingMs / 1000);

      setRemaining(remainingSeconds);

      const prevRemaining = typeof prevRemainingRef.current === 'number' ? prevRemainingRef.current : remainingSeconds + 1;
      if (prevRemaining > 300 && remainingSeconds <= 300 && !milestoneBeepsRef.current.has(300)) {
        milestoneBeepsRef.current.add(300);
        playBeep();
        setShowFiveMinAlert(true);
        setTimeout(() => setShowFiveMinAlert(false), 3000);
      }
      prevRemainingRef.current = remainingSeconds;

      // Persist languageByIndex in timer
      if (remainingSeconds > 0) {
        const updatedData = {
          ...interviewData,
          startTime: timerStartTime,
          currentCode: codeByIndex,
          currentIndex,
          languageByIndex,
          selfTimeComplexity: timeComplexityByIndex,
          selfSpaceComplexity: spaceComplexityByIndex,
          lastUpdated: Date.now()
        };
        sessionStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
        localStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
      }

      if (remainingSeconds <= 0 && !isSubmitting) {
        logger.log('Timer expired, auto-submitting interview...');
        handleConfirmSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [interviewData, timerStartTime, codeByIndex, currentIndex, interviewId, handleConfirmSubmit, isSubmitting, languageByIndex, timeComplexityByIndex, spaceComplexityByIndex, playBeep]);

  // FIXED: Handle visibility change to properly save and restore selectedLanguage
  useEffect(() => {
    const handleVisibilityChange = () => {
      logger.log('Visibility changed:', { 
        hidden: document.hidden, 
        visibilityState: document.visibilityState,
        hasFocus: document.hasFocus()
      });
      
      if (document.hidden) {
        logger.log('Page becoming hidden, saving code and languages:', { code: codeByIndex, languages: languageByIndex });
        if (interviewData && codeByIndex.length > 0) {
          const updatedData = { 
            ...interviewData, 
            currentCode: codeByIndex, 
            currentIndex, 
            languageByIndex,
            lastUpdated: Date.now(), 
            selfTimeComplexity: timeComplexityByIndex, 
            selfSpaceComplexity: spaceComplexityByIndex 
          };
          sessionStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
          localStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
          logger.log('Code and languages saved to storage on hide');
        }
      } else if (interviewData && timerStartTime) {
        logger.log('Page became visible, loading saved code and language');
        const totalTimeMs = interviewData.timeMinutes * 60 * 1000;
        const elapsed = Date.now() - timerStartTime;
        const remainingMs = Math.max(0, totalTimeMs - elapsed);
        const remainingSeconds = Math.floor(remainingMs / 1000);
        setRemaining(remainingSeconds);
        
        const localStoredNow = localStorage.getItem(`interview_${interviewId}`);
        const sessionStoredNow = sessionStorage.getItem(`interview_${interviewId}`);
        const loadOrder = [localStoredNow, sessionStoredNow];
        const sourceLabel = localStoredNow ? 'localStorage' : 'sessionStorage';
        logger.log('Checking for saved data:', { from: sourceLabel, hasLocal: !!localStoredNow, hasSession: !!sessionStoredNow });

        const storedData = loadOrder.find(Boolean);
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            logger.log('Parsed stored data:', data);
            if (data.currentCode && data.currentCode.length === problems.length) {
              logger.log('Restoring saved code and languages:', { code: data.currentCode, languages: data.languageByIndex });
              setCodeByIndex(data.currentCode);
              if (data.currentIndex !== undefined) {
                setCurrentIndex(data.currentIndex);
              }
              // Restore languageByIndex from storage
              if (Array.isArray(data.languageByIndex) && data.languageByIndex.length === problems.length) {
                logger.log('Restoring languageByIndex:', data.languageByIndex);
                setLanguageByIndex(data.languageByIndex);
              }
              if (Array.isArray(data.selfTimeComplexity) && data.selfTimeComplexity.length === problems.length) {
                setTimeComplexityByIndex(data.selfTimeComplexity);
              }
              if (Array.isArray(data.selfSpaceComplexity) && data.selfSpaceComplexity.length === problems.length) {
                setSpaceComplexityByIndex(data.selfSpaceComplexity);
              }
            } else {
              logger.log('Saved code length mismatch:', { 
                savedLength: data.currentCode?.length, 
                expectedLength: problems.length 
              });
            }
          } catch (e) {
            logger.error('Error parsing stored data on visibility change:', e);
          }
        }
      }
    };

    // Save languageByIndex on beforeunload
    const handleBeforeUnload = () => {
      logger.log('Before unload, saving code and languages:', { code: codeByIndex, languages: languageByIndex });
      if (interviewData && codeByIndex.length > 0) {
        const updatedData = { 
          ...interviewData, 
          currentCode: codeByIndex, 
          currentIndex, 
          languageByIndex,
          lastUpdated: Date.now(), 
          selfTimeComplexity: timeComplexityByIndex, 
          selfSpaceComplexity: spaceComplexityByIndex 
        };
        sessionStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
        localStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
      }
    };

    // Restore languageByIndex on focus
    const handleFocus = () => {
      logger.log('Window gained focus - loading saved code and languages');
      if (interviewData) {
        const localStoredNow = localStorage.getItem(`interview_${interviewId}`);
        const sessionStoredNow = sessionStorage.getItem(`interview_${interviewId}`);
        const storedData = localStoredNow || sessionStoredNow;
        if (storedData) {
          try {
            const data = JSON.parse(storedData);
            if (data.currentCode && data.currentCode.length === problems.length) {
              logger.log('Restoring code and languages on focus:', { code: data.currentCode, languages: data.languageByIndex });
              setCodeByIndex(data.currentCode);
              if (data.currentIndex !== undefined) {
                setCurrentIndex(data.currentIndex);
              }
              // Restore languageByIndex on focus
              if (Array.isArray(data.languageByIndex) && data.languageByIndex.length === problems.length) {
                logger.log('Restoring languageByIndex on focus:', data.languageByIndex);
                setLanguageByIndex(data.languageByIndex);
              }
            }
          } catch (e) {
            logger.error('Error parsing stored data on focus:', e);
          }
        }
      }
    };

    // Save languageByIndex on blur
    const handleBlur = () => {
      logger.log('Window lost focus - saving code and languages');
      if (interviewData && codeByIndex.length > 0) {
        const updatedData = { 
          ...interviewData, 
          currentCode: codeByIndex, 
          currentIndex, 
          languageByIndex,
          lastUpdated: Date.now(), 
          selfTimeComplexity: timeComplexityByIndex, 
          selfSpaceComplexity: spaceComplexityByIndex 
        };
        sessionStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
        localStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
        logger.log('Code and languages saved on blur');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [interviewData, timerStartTime, codeByIndex, currentIndex, interviewId, problems.length, languageByIndex, timeComplexityByIndex, spaceComplexityByIndex]);

  const handleEndInterview = useCallback(() => {
    setShowEndModal(true);
  }, []);

  const handleCheckSyntax = useCallback(async () => {
    setShowCompilePanel(true);
    setIsCheckingSyntax(true);
    // Clear previous markers while running
    applyMonacoMarkers([]);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('User not authenticated');
      }

      const currentCode = codeByIndex[currentIndex];
      const language = selectedLanguage;

      const response = await axios.post(
        buildApiUrl(API_ENDPOINTS.INTERVIEW_SYNTAX_CHECK),
        { code: currentCode, language },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const errors = response.data?.errors;
      const result = buildCompileResultFromMessages(
        Array.isArray(errors) ? errors : []
      );
      setAndPersistCompileResult(result, currentIndex);
      if (result.status === 'compile_error') {
        applyMonacoMarkers(result.diagnostics);
      } else {
        applyMonacoMarkers([]);
      }
    } catch (error) {
      logger.error('Error checking syntax:', error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to compile.';
      const result = buildCompileResultFromMessages([msg], { forceFailed: true });
      setAndPersistCompileResult(result, currentIndex);
      applyMonacoMarkers([]);
    } finally {
      setIsCheckingSyntax(false);
    }
  }, [
    codeByIndex,
    currentIndex,
    getAccessToken,
    selectedLanguage,
    setAndPersistCompileResult,
    applyMonacoMarkers,
  ]);

  const handleLanguageChange = useCallback((newLanguage) => {
    const currentProblem = problems[currentIndex];
    if (!currentProblem?.id) return;
    if (newLanguage === selectedLanguage) return;

    const oldLanguage = selectedLanguage;
    // Persist leaving language safely (never write empty/placeholder as first draft).
    saveLanguageDraftSafely(
      currentProblem.id,
      oldLanguage,
      codeByIndex[currentIndex] ?? ''
    );

    const newLanguages = languageByIndex.map((lang, i) =>
      i === currentIndex ? newLanguage : lang
    );
    setLanguageByIndex(newLanguages);

    // Cancel any in-flight stub response so it cannot apply to the wrong language.
    stubLoadGenRef.current += 1;

    const cached = readCodeDraft(currentProblem.id, newLanguage);
    if (cached !== null) {
      setLoadingStubLanguage(null);
      const newCode = codeByIndex.map((c, i) => (i === currentIndex ? cached : c));
      setCodeByIndex(newCode);
      persistInterviewSnapshot({
        currentCode: newCode,
        languageByIndex: newLanguages,
      });
      return;
    }

    // No draft yet — clear buffer and mark loading for NEW language.
    // useEffect([selectedLanguage]) will call ensureCodeForLanguage once.
    setLoadingStubLanguage(newLanguage);
    setCodeByIndex(prev => {
      const next = [...prev];
      next[currentIndex] = '';
      return next;
    });
    persistInterviewSnapshot({
      languageByIndex: newLanguages,
    });
  }, [
    currentIndex,
    problems,
    codeByIndex,
    languageByIndex,
    selectedLanguage,
    saveLanguageDraftSafely,
    readCodeDraft,
    persistInterviewSnapshot,
  ]);
  const handleResetCode = useCallback(async () => {
    const currentProblem = problems[currentIndex];
    if (!currentProblem?.id) return;
    const lang = selectedLanguage;
    const gen = ++stubLoadGenRef.current;
    setLoadingStubLanguage(lang);
    try {
      // Explicit user action: replace only the current language draft with a fresh stub.
      const stub = await fetchCodeStubFromApi(currentProblem.id, lang);
      if (gen !== stubLoadGenRef.current) return;
      if (typeof stub === 'string' && stub.trim().length > 0) {
        writeCodeDraft(currentProblem.id, lang, stub);
        setCodeByIndex(prev => {
          const next = prev.map((c, i) => (i === currentIndex ? stub : c));
          persistInterviewSnapshot({ currentCode: next });
          return next;
        });
      }
    } catch (err) {
      if (gen !== stubLoadGenRef.current) return;
      logger.error('Reset code failed:', err);
      setError(err.message || 'Failed to reset code.');
    } finally {
      if (gen === stubLoadGenRef.current) {
        setLoadingStubLanguage(null);
      }
    }
  }, [
    problems,
    currentIndex,
    selectedLanguage,
    fetchCodeStubFromApi,
    writeCodeDraft,
    persistInterviewSnapshot,
  ]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const container = e.currentTarget.getBoundingClientRect ? e.currentTarget.getBoundingClientRect() : 
                     document.querySelector('.resizable-container')?.getBoundingClientRect();
    
    if (container) {
      const newLeftWidth = ((e.clientX - container.left) / container.width) * 100;
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
      setLeftPanelWidth(constrainedWidth);
      localStorage.setItem('interview_panel_width', constrainedWidth.toString());
    }
  }, [isDragging]);

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

  const totalSeconds = useMemo(() => {
    return interviewData ? interviewData.timeMinutes * 60 : 0;
  }, [interviewData]);

  const progress = useMemo(() => {
    if (totalSeconds === 0) return 0;
    return Math.max(0, Math.min(100, ((totalSeconds - remaining) / totalSeconds) * 100));
  }, [totalSeconds, remaining]);

  if (error) {
    return (
      <div className="container-fluid d-flex align-items-center justify-content-center text-white" style={{ height: '100vh' }}>
        <Alert variant="danger">
          <Alert.Heading>Interview Session Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="primary" onClick={() => navigate('/practice/coding')}>
            Back to Practice
          </Button>
        </Alert>
      </div>
    );
  }

  if (!interviewData || problems.length === 0) {
    return (
      <div className="container-fluid d-flex align-items-center justify-content-center text-white" style={{ height: '100vh' }}>
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  return (
    <div className={`interview-session ${isDark ? 'theme-dark' : 'theme-light'}`}>
      <div className="is-topbar">
        <div className="d-flex align-items-center gap-3">
          <div className="is-topbar-label">
            Question {currentIndex + 1} of {problems.length}
          </div>
          <div className="d-flex align-items-center gap-2">
            {problems.map((_, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={idx === currentIndex ? 'success' : (isDark ? 'outline-secondary' : 'outline-dark')}
                className="rounded-circle"
                style={{ width: 36, height: 36, padding: 0 }}
                onClick={() => !(isSubmitting || isSubmitted) && setCurrentIndex(idx)}
                disabled={isSubmitting || isSubmitted}
              >
                {idx + 1}
              </Button>
            ))}
          </div>
        </div>
        {showFiveMinAlert && (
          <div
            className="position-absolute start-50 translate-middle-x"
            style={{ top: '12px' }}
          >
            <span
              className="fw-bold"
              style={{
                background: 'rgba(220, 53, 69, 0.92)',
                color: '#ffffff',
                borderRadius: '999px',
                padding: '8px 16px',
                fontSize: '0.95rem',
                boxShadow: '0 4px 16px rgba(0,0,0,0.25)'
              }}
            >
              5 minutes remaining
            </span>
          </div>
        )}
        <div className="d-flex align-items-center gap-3" style={{ minWidth: 280 }}>
          <div className="is-timer">{formatTime(remaining)}</div>
          <div style={{ width: 180 }}>
            <ProgressBar
              now={progress}
              variant={remaining > totalSeconds * 0.2 ? 'success' : 'danger'}
              className="rounded-progress"
            />
          </div>
          <Button variant="danger" size="md" className="fw-bold" onClick={handleEndInterview} disabled={isSubmitting || isSubmitted}>
            {isSubmitting ? 'Submitting...' : 'End'}
          </Button>
        </div>
      </div>

      <div className="resizable-container" style={{ 
        flex: 1, 
        minHeight: 0, 
        display: 'flex', 
        gap: '0px',
      }}>
        <div
          className="is-problem-shell"
          style={{ width: `${leftPanelWidth}%`, minWidth: '300px' }}
        >
          <div className="is-problem-panel">
            <div className="is-problem-scroll markdown-content">
              <ReactMarkdown>{problems[currentIndex]?.description || ''}</ReactMarkdown>
              <ReactMarkdown components={{ pre: ({ node, ...props }) => <pre {...props} /> }}>
                {problems[currentIndex]?.example || ''}
              </ReactMarkdown>
              <div>
                <ReactMarkdown components={{ pre: ({ node, ...props }) => <pre {...props} /> }}>
                  {problems[currentIndex]?.constraints || ''}
                </ReactMarkdown>
              </div>
              <Alert className="is-note">
                <strong>Note: </strong>
                We intentionally do not allow test case execution during interviews to encourage thorough code review and manual debugging skills.
                Please dry-run your solution before submitting.
              </Alert>
            </div>
          </div>
        </div>

        <div
          className={`is-splitter ${isDragging ? 'is-active' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <div className="is-splitter-handle">
            <span />
            <span />
          </div>
        </div>

        <div
          className="is-editor-shell"
          style={{ width: `${100 - leftPanelWidth}%`, minWidth: '300px' }}
        >
          <div className="is-editor-panel">
            <div className="is-editor-toolbar">
              <div className="d-flex align-items-center gap-2">
                <div className="is-editor-toolbar-label">Language</div>
                <DropdownButton
                  variant={isDark ? 'outline-light' : 'outline-dark'}
                  title={selectedLanguage === 'cpp' ? 'C++' : selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}
                  id="language-dropdown"
                  disabled={isSubmitting || isSubmitted || isLoadingStub}
                  className={`custom-dropdown-button language-select-dropdown ${isDark ? 'dropdown-dark' : 'dropdown-light'}`}
                >
                  <Dropdown.Item
                    onClick={() => handleLanguageChange('java')}
                    className={`language-select-item d-flex align-items-center justify-content-between ${selectedLanguage === 'java' ? 'active' : ''}`}
                  >
                    Java {selectedLanguage === 'java' && <span className="ms-2">&#10003;</span>}
                  </Dropdown.Item>
                  <Dropdown.Divider className="language-select-divider" />
                  <Dropdown.Item
                    onClick={() => handleLanguageChange('python')}
                    className={`language-select-item d-flex align-items-center justify-content-between ${selectedLanguage === 'python' ? 'active' : ''}`}
                  >
                    Python {selectedLanguage === 'python' && <span className="ms-2">&#10003;</span>}
                  </Dropdown.Item>
                  <Dropdown.Divider className="language-select-divider" />
                  <Dropdown.Item
                    onClick={() => handleLanguageChange('cpp')}
                    className={`language-select-item d-flex align-items-center justify-content-between ${selectedLanguage === 'cpp' ? 'active' : ''}`}
                  >
                    C++ {selectedLanguage === 'cpp' && <span className="ms-2">&#10003;</span>}
                  </Dropdown.Item>
                </DropdownButton>

                <Button
                  size="md"
                  className="fw-bold"
                  variant={isDark ? 'outline-light' : 'outline-dark'}
                  onClick={handleToggleTheme}
                  disabled={isSubmitting || isSubmitted}
                  title={isDark ? 'Light mode' : 'Dark mode'}
                >
                  {isDark ? <BsFillSunFill /> : <BsFillMoonFill />}
                </Button>
                <Button
                  size="md"
                  className="fw-bold is-reset-btn"
                  variant="warning"
                  onClick={handleResetCode}
                  disabled={isSubmitting || isSubmitted || isLoadingStub}
                  title="Reset code to language stub"
                >
                  Reset
                </Button>
              </div>
              <div className="d-flex gap-2">
                <Button
                  size="md"
                  className="fw-bold"
                  variant="success"
                  onClick={handleCheckSyntax}
                  disabled={isSubmitting || isSubmitted || isCheckingSyntax || isLoadingStub}
                  title="Compile and check for syntax errors"
                >
                  {isCheckingSyntax ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Compiling…
                    </>
                  ) : (
                    'Compile'
                  )}
                </Button>
              </div>
            </div>
            
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, minHeight: 0 }}>
                <ScaffoldCodeEditor
                  value={codeByIndex[currentIndex] || ''}
                  language={selectedLanguage}
                  theme={editorTheme}
                  isDark={isDark}
                  readOnly={isSubmitting || isSubmitted}
                  loadingLabel={
                    loadingStubLanguage === selectedLanguage
                      ? `Loading ${selectedLanguage} stub...`
                      : null
                  }
                  onMountExtra={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    try {
                      requestAnimationFrame(() => editor.focus());
                      setTimeout(() => editor.focus(), 0);
                    } catch (_e) { /* ignore */ }
                    const existing = compileResultByIndex[currentIndex];
                    if (existing?.status === 'compile_error') {
                      applyMonacoMarkers(existing.diagnostics);
                    }
                  }}
                  onChange={(text) => {
                    if (isSubmitting || isSubmitted || loadingStubLanguage === selectedLanguage) return;
                    const newCode = codeByIndex.map((c, i) => (i === currentIndex ? text : c));
                    setCodeByIndex(newCode);
                    const cp = problems[currentIndex];
                    if (cp?.id) {
                      writeCodeDraft(cp.id, selectedLanguage, text);
                    }
                    if (interviewData) {
                      persistInterviewSnapshot({ currentCode: newCode });
                    }
                  }}
                />
              </div>
              {(showCompilePanel || isCheckingSyntax || compileResultByIndex[currentIndex]) && (
                <CompileResultPanel
                  result={compileResultByIndex[currentIndex] || null}
                  isChecking={isCheckingSyntax}
                  isDark={isDark}
                  onClose={() => clearCompileResult(currentIndex)}
                  onJumpToLine={jumpToCompileLine}
                />
              )}
            </div>
            <div className="is-meta-row">
              <div className="d-flex flex-wrap gap-3">
                <div className="is-meta-card">
                  <div className="is-meta-label">Time complexity</div>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    size="sm"
                    className="is-meta-input"
                    placeholder="e.g., O(n log n)"
                    value={timeComplexityByIndex[currentIndex] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = timeComplexityByIndex.map((v, i) => (i === currentIndex ? val : v));
                      setTimeComplexityByIndex(next);
                      if (interviewData) {
                        const updatedData = {
                          ...interviewData,
                          currentCode: codeByIndex,
                          currentIndex,
                          languageByIndex,
                          lastUpdated: Date.now(),
                          selfTimeComplexity: next,
                          selfSpaceComplexity: spaceComplexityByIndex,
                        };
                        sessionStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
                        localStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
                      }
                    }}
                    disabled={isSubmitting || isSubmitted}
                  />
                </div>
                <div className="is-meta-card">
                  <div className="is-meta-label">Space complexity</div>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    size="sm"
                    className="is-meta-input"
                    placeholder="e.g., O(1)"
                    value={spaceComplexityByIndex[currentIndex] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const next = spaceComplexityByIndex.map((v, i) => (i === currentIndex ? val : v));
                      setSpaceComplexityByIndex(next);
                      if (interviewData) {
                        const updatedData = {
                          ...interviewData,
                          currentCode: codeByIndex,
                          currentIndex,
                          languageByIndex,
                          lastUpdated: Date.now(),
                          selfTimeComplexity: timeComplexityByIndex,
                          selfSpaceComplexity: next,
                        };
                        sessionStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
                        localStorage.setItem(`interview_${interviewId}`, JSON.stringify(updatedData));
                      }
                    }}
                    disabled={isSubmitting || isSubmitted}
                  />
                </div>
              </div>
            </div>
            {runOutput && (
              <div className="mt-3">
                <h6>Run Output</h6>
                <pre className="bg-dark text-light p-2 rounded-2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {isExecutingCode ? <Spinner animation="border" size="sm" /> : runOutput}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal 
        show={showEndModal}
        onHide={() => !isSubmitting && setShowEndModal(false)} 
        centered
        backdrop={isSubmitting ? 'static' : true}
        keyboard={!isSubmitting}
        className="end-interview-modal"
      >
        <Modal.Header closeButton={!isSubmitting}>
          <div className="w-100 d-flex justify-content-center">
            <Modal.Title className="text-white">End Interview</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#000000', color: '#FFFFFF' }}>
          <p className="mb-4">Are you sure you want to end the interview? Your code will be submitted for evaluation.</p>
          <p className="text-center mb-0" style={{ color: '#CCCCCC' }}>This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: '#000000', borderTop: '1px solid #FFFFFF' }} className="d-flex justify-content-center">
          <Button variant="primary" onClick={() => setShowEndModal(false)} disabled={isSubmitting} className='fw-bold me-2'>
            Continue Coding
          </Button>
          <Button variant="success" onClick={handleConfirmSubmit} disabled={isSubmitting} className='fw-bold'>
            {isSubmitting && <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />}
            {isSubmitting ? 'Submitting...' : 'Submit & Get Feedback'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default InterviewSession;