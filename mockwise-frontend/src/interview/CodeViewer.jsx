import { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button, Spinner, Alert } from 'react-bootstrap';
import { BsFillMoonFill, BsFillSunFill } from 'react-icons/bs';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import '../styles/InterviewSession.css';

function CodeViewer() {
  const { interviewId, submissionId, codeType } = useParams(); // codeType: 'user' or 'optimal'
  const navigate = useNavigate();
  const { getAccessToken } = useContext(SupabaseAuthContext);

  // State
  const [submission, setSubmission] = useState(null);
  const [optimalCode, setOptimalCode] = useState('');
  const [optimalLoading, setOptimalLoading] = useState(false);
  const [optimalError, setOptimalError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editorTheme, setEditorTheme] = useState('hc-black');
  const [, setLoadedFromCache] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => {
    // Load saved panel width or default to 40%
    const saved = localStorage.getItem('codeviewer_panel_width');
    return saved ? parseFloat(saved) : 40;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Language mapping for Monaco Editor
  const languageMap = {
    'java': 'java',
    'python': 'python',
    'cpp': 'cpp',
  };

  // Functions
  const getCodeToDisplay = () => {
    if (codeType === 'optimal') {
      return optimalCode || submission?.question?.optimalCode || '';
    }
    return submission?.code || '';
  };

  const getCodeTitle = () => {
    return codeType === 'optimal' ? 'Optimal Code' : 'Your Code';
  };

  const handleToggleTheme = () => {
    setEditorTheme(prev => prev === 'hc-black' ? 'vs-light' : 'hc-black');
  };

  // Resizable splitter handlers
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
      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
      setLeftPanelWidth(constrainedWidth);
      // Save to localStorage for persistence
      localStorage.setItem('codeviewer_panel_width', constrainedWidth.toString());
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse event listeners for dragging
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

  // LocalStorage cache helpers
  const getCacheKey = () => `codeviewer_${interviewId}_${submissionId}_${codeType}`;

  const loadFromCacheIfAvailable = () => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return false;
      const parsed = JSON.parse(cached);
      if (parsed?.submission) {
        setSubmission(parsed.submission);
      }
      if (codeType === 'optimal' && typeof parsed?.optimalCode === 'string') {
        setOptimalCode(parsed.optimalCode);
      }
      setLoadedFromCache(true);
      setLoading(false);
      return true;
    } catch (e) {
      logger.error('Failed to load CodeViewer cache', e);
      return false;
    }
  };

  const persistCache = (sub, optCode) => {
    try {
      const payload = {
        submission: sub ?? submission,
        optimalCode: typeof optCode === 'string' ? optCode : (codeType === 'optimal' ? optimalCode : undefined),
      };
      localStorage.setItem(getCacheKey(), JSON.stringify(payload));
    } catch (_e) {
      // ignore cache write failures
    }
  };

  // Fetch feedback data and find the specific submission
  useEffect(() => {
    // Try cache first to avoid network and any reload on visibility changes
    const hadCache = loadFromCacheIfAvailable();

    const fetchFeedbackData = async () => {
      try {
        setLoading(true);
        setError(null);

        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error('User not authenticated');
        }

        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        };

        // Fetch the full feedback data (same as InterviewFeedback)
        const response = await axios.get(
          buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewId}/feedback`),
          { headers }
        );

        const feedbackData = response.data;
        
        // Find the specific submission by ID
        const foundSubmission = feedbackData.submissions?.find(sub => sub.id === submissionId);
        
        if (!foundSubmission) {
          throw new Error('Submission not found');
        }

        setSubmission(foundSubmission);
        // Persist cache whenever we successfully resolve the submission
        persistCache(foundSubmission, undefined);
      } catch (err) {
        logger.error('Error fetching feedback data:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load submission');
      } finally {
        setLoading(false);
      }
    };

    if (!hadCache && interviewId && submissionId) {
      fetchFeedbackData();
    }
  }, [interviewId, submissionId, codeType, getAccessToken]);

  // Fetch optimal code if needed
  useEffect(() => {
    const fetchOptimalCode = async () => {
      if (codeType !== 'optimal' || !submission?.question?.id || !submission?.language) return;

      try {
        setOptimalLoading(true);
        setOptimalError(null);

        const accessToken = await getAccessToken();
        if (!accessToken) {
          throw new Error('User not authenticated');
        }

        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        };

        // Use the same API endpoint as InterviewFeedback
        const response = await axios.get(
          buildApiUrl(API_ENDPOINTS.INTERVIEW_OPTIMAL_CODE),
          { 
            params: { 
              questionId: submission.question.id, 
              language: submission.language 
            }, 
            headers 
          }
        );

        const code = response.data?.code || '';
        setOptimalCode(code);
        // Persist cache including optimal code
        persistCache(undefined, code);
      } catch (err) {
        logger.error('Error fetching optimal code:', err);
        setOptimalError(err.response?.data?.error || err.message || 'Failed to load optimal code');
      } finally {
        setOptimalLoading(false);
      }
    };

    fetchOptimalCode();
  }, [codeType, submission?.question?.id, submission?.language, getAccessToken]);

  if (loading) {
    return (
      <Container fluid className="h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="light" size="lg" />
          <div className="text-white mt-3">Loading code...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
        <Alert variant="danger" className="w-50">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={() => navigate(`/interview/feedback/${interviewId}`)}>
            Back to Feedback
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="h-100 d-flex flex-column code-viewer-container" style={{ backgroundColor: '#000000', minHeight: '100vh' }}>
      {/* Question Header */}
      <div className="d-flex justify-content-center align-items-center p-3 position-relative">
        <h1 className="text-white mb-0">
          {submission?.question?.title}
        </h1>
        <Button 
          variant="success" 
          size="md"
          className="fw-bold position-absolute end-0"
          onClick={() => navigate(`/interview/feedback/${interviewId}`)}
          style={{ marginRight: '12px' }}
        >
          Back to Feedback
        </Button>
      </div>

      {/* Main Content - Resizable Panels */}
      <div className="flex-grow-1 d-flex resizable-container" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Question Panel */}
        <div 
          className="h-100 d-flex flex-column border-end border-secondary rounded-3"
          style={{ 
            width: `${leftPanelWidth}%`,
            backgroundColor: '#FFFFFF',
            minWidth: '300px',
            padding: '12px',
            marginRight: '8px',
            marginLeft: '12px'
          }}
        >
          <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,1)', height: '100%' }}>
            <div style={{ overflowY: 'auto', height: '100%', fontFamily: 'Fira Code, monospace' }} className="text-black markdown-content">
              <ReactMarkdown>{submission?.question?.description || ''}</ReactMarkdown>
              <ReactMarkdown>
                {submission?.question?.example || ''}
              </ReactMarkdown>
              <ReactMarkdown>
                  {submission?.question?.constraints || ''}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Resizable Splitter */}
        <div 
          style={{
            width: '6px',
            background: isDragging ? '#198754' : 'rgba(255,255,255,0.3)',
            cursor: 'col-resize',
            position: 'relative',
            transition: isDragging ? 'none' : 'background-color 0.2s ease',
            flexShrink: 0
          }}
          onMouseDown={handleMouseDown}
        >
          <div style={{
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
            transition: isDragging ? 'none' : 'background-color 0.2s ease'
          }}>
            <div style={{
              width: '3px',
              height: '20px',
              background: isDragging ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
              borderRadius: '1px',
              marginRight: '2px'
            }}></div>
            <div style={{
              width: '3px',
              height: '20px',
              background: isDragging ? '#FFFFFF' : 'rgba(255,255,255,0.8)',
              borderRadius: '1px'
            }}></div>
          </div>
        </div>

        {/* Code Panel */}
        <div
          className="h-100 d-flex flex-column"
          style={{
            width: `${100 - leftPanelWidth}%`,
            backgroundColor: '#1e1e1e',
            minWidth: '400px',
            marginLeft: '8px',
            marginRight: '12px',
            padding: '12px',
            borderRadius: '1rem'
          }}
        >
          <div className="rounded-3 d-flex flex-column" style={{ background: '#1e1e1e', height: '100%', overflow: 'hidden' }}>
            <div className="p-3 border-bottom border-secondary d-flex justify-content-center align-items-center position-relative">
              <div className="d-flex align-items-center">
                <h3 className="text-white mb-0">{getCodeTitle()}</h3>
              </div>
              <div className="position-absolute end-0 d-flex align-items-center gap-2">
                <Button
                  size="md" 
                  className="fw-bold me-3"
                  variant={'light'}//editorTheme === 'hc-black' ? 'light' : 'dark'}
                  onClick={handleToggleTheme}
                  title={editorTheme === 'hc-black' ? 'Light Mode' : 'Dark Mode'}
                >
                  {editorTheme === 'hc-black' ? <BsFillSunFill /> : <BsFillMoonFill />}
                </Button>
                <div className="text-muted small">
                  {codeType === 'optimal' && optimalLoading && (
                    <Spinner animation="border" size="sm" className="me-2" />
                  )}
                  {codeType === 'optimal' && optimalError && (
                    <span className="text-warning">Failed to load optimal code</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-grow-1 rounded-bottom" style={{ backgroundColor: '#1e1e1e', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: '0 0 0.375rem 0.375rem', overflow: 'hidden' }}>
                <Editor
                  height="100%"
                  language={languageMap[submission?.language] || 'text'}
                  theme={editorTheme}
                  value={getCodeToDisplay()}
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollbar: {
                      vertical: 'auto',
                      horizontal: 'auto'
                    },
                    renderLineHighlight: 'none',
                    renderLineHighlightOnlyWhenFocus: true
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

export default CodeViewer;
