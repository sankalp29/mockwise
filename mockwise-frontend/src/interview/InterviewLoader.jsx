import { useEffect, useContext, useState, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Spinner, Button } from 'react-bootstrap';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { useApiOnce } from '../hooks/useApiOnce';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';
import { AUTH_BYPASS } from '../utils/authBypass';
import '../styles/InterviewLoader.css';

/**
 * Map raw API / client errors to friendly copy that fits the product tone.
 */
function getInterviewLoadErrorCopy(rawError, isRecovery) {
  const message = String(rawError || '').trim();
  const lower = message.toLowerCase();

  if (
    !AUTH_BYPASS &&
    (lower.includes('not authenticated') ||
      lower.includes('user not authenticated') ||
      lower.includes('jwt') ||
      lower.includes('unauthorized') ||
      lower === 'request failed with status code 401')
  ) {
    return {
      title: 'Sign in to continue',
      body: isRecovery
        ? 'Your session needs to be verified before we can reopen this interview.'
        : 'Mock interviews are tied to your account so we can save progress and feedback.',
      hint: 'Please sign in, then start or resume your interview from the practice page.',
      primaryLabel: 'Back to home',
      primaryPath: '/home',
      secondaryLabel: isRecovery ? 'Go to dashboard' : 'Back to practice',
      secondaryPath: isRecovery ? '/dashboard' : '/practice/coding',
      openLogin: true,
    };
  }

  if (lower.includes('already has an interview') || lower.includes('ongoing interview')) {
    return {
      title: 'You already have an interview in progress',
      body: 'Finish or resume your current session before starting a new one.',
      hint: null,
      primaryLabel: 'Go to dashboard',
      primaryPath: '/dashboard',
      secondaryLabel: 'Back to practice',
      secondaryPath: '/practice/coding',
      openLogin: false,
    };
  }

  if (lower.includes('expired') || lower.includes('410')) {
    return {
      title: 'This session has expired',
      body: 'Interview sessions time out after the allotted duration. Start a fresh mock when you are ready.',
      hint: null,
      primaryLabel: 'Start a new interview',
      primaryPath: '/practice/coding',
      secondaryLabel: 'Go to dashboard',
      secondaryPath: '/dashboard',
      openLogin: false,
    };
  }

  if (lower.includes('not found') || lower.includes('404')) {
    return {
      title: 'Interview not found',
      body: 'We could not find this interview session. It may have been removed or the link is incorrect.',
      hint: null,
      primaryLabel: isRecovery ? 'Go to dashboard' : 'Back to practice',
      primaryPath: isRecovery ? '/dashboard' : '/practice/coding',
      secondaryLabel: 'Back to home',
      secondaryPath: '/home',
      openLogin: false,
    };
  }

  if (!AUTH_BYPASS && (lower.includes('do not have access') || lower.includes('403') || lower.includes('forbidden'))) {
    return {
      title: 'Access unavailable',
      body: 'This interview belongs to another account, or your session no longer has permission to open it.',
      hint: 'Sign in with the account that started the interview.',
      primaryLabel: 'Back to home',
      primaryPath: '/home',
      secondaryLabel: 'Go to dashboard',
      secondaryPath: '/dashboard',
      openLogin: true,
    };
  }

  if (lower.includes('invalid interview parameters')) {
    return {
      title: 'Something was missing',
      body: 'We need your difficulty, question count, and time choices to build the session.',
      hint: 'Head back to practice and start again with your preferred settings.',
      primaryLabel: 'Back to practice',
      primaryPath: '/practice/coding',
      secondaryLabel: 'Back to home',
      secondaryPath: '/home',
      openLogin: false,
    };
  }

  return {
    title: isRecovery ? 'Could not recover your interview' : 'Could not start your interview',
    body: message || 'Something went wrong while preparing your session. Please try again.',
    hint: 'If this keeps happening, return home and try starting a new mock interview.',
    primaryLabel: isRecovery ? 'Go to dashboard' : 'Back to practice',
    primaryPath: isRecovery ? '/dashboard' : '/practice/coding',
    secondaryLabel: 'Back to home',
    secondaryPath: '/home',
    openLogin: false,
  };
}

function InterviewLoader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { interviewId } = useParams();
  const { getAccessToken, user } = useContext(SupabaseAuthContext);
  
  // Use global API hooks to prevent duplicate requests
  const startKeySuffix = location.state?.startToken ? `new-${location.state.startToken}` : 'new';
  const startInterviewApi = useApiOnce(`interview-start-${interviewId || startKeySuffix}`);
  const recoverInterviewApi = useApiOnce(`interview-recover-${interviewId}`);
  
  // More robust tracking - use a simpler approach
  const hasAttemptedRequest = useRef(false);
  
  // Debug: Check initial state of API hooks
  logger.log('🏁 InterviewLoader mounted:', {
    interviewId,
    startApiInitiated: startInterviewApi.isRequestInitiated(),
    recoverApiInitiated: recoverInterviewApi.isRequestInitiated()
  });

  // Handle React Strict Mode and prevent duplicate requests across component re-mounts
  useEffect(() => {
    const handleComponentMount = () => {
      // In React Strict Mode, components mount/unmount/remount
      // We need to persist the request state across these cycles
      // Only clear if this is truly a new session (different user or significant time gap)
      const lastSessionTime = sessionStorage.getItem('last_interview_session_time');
      const now = Date.now();
      const timeSinceLastSession = now - (parseInt(lastSessionTime) || 0);
      
      // Clear if more than 30 seconds have passed (indicates new session)
      if (timeSinceLastSession > 30000) {
        logger.log('🧹 Clearing old session storage entries');
        startInterviewApi.resetRequest();
        recoverInterviewApi.resetRequest();
      }
      
      sessionStorage.setItem('last_interview_session_time', now.toString());
    };
    
    handleComponentMount();
  }, []); // Only run on mount
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [currentProgressStepIndex, setCurrentProgressStepIndex] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const animationStartRef = useRef(null);
  const intervalIdRef = useRef(null); // To store the setInterval ID persistently
  const apiQuestionsFetchedRef = useRef(false); // To track if API questions have been fetched
  const apiCallInitiatedRef = useRef(false); // To prevent duplicate API calls on re-renders
  const interviewDataRef = useRef(null); // To store interview data for navigation

  const progressSteps = [
    "Preparing your mock interview environment", // Step 1 (1 second)
    "Generating interview questions", // Step 2 (min 2 seconds, depends on API)
    "Launching your interview", // Step 3 (1 second)
  ];

  // useEffect for managing the animation interval
  useEffect(() => {
    const durationStep1 = 1000; // 1 second
    const minDurationStep2 = 2000; // Minimum 2 seconds for step 2
    const duration3 = 1000; // 1 second
    const fixedTotalAnimationDuration = durationStep1 + minDurationStep2 + duration3; // Minimum total 4 seconds for visual bar progression

    const startProgressAnimation = (initialElapsedTime = 0) => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }

      animationStartRef.current = Date.now() - initialElapsedTime;

      intervalIdRef.current = setInterval(() => {
        const elapsedTime = Date.now() - animationStartRef.current;

        // Cap visual progress at 90% until API completes to avoid sitting at 100%
        const rawProgress = (elapsedTime / fixedTotalAnimationDuration) * 100;
        const visualProgress = apiQuestionsFetchedRef.current ? rawProgress : Math.min(rawProgress, 90);
        setProgressBarWidth(Math.min(100, visualProgress));

        let newStepIndex = 0;
        if (elapsedTime < durationStep1) {
          newStepIndex = 0; // Step 1: Preparing
        } else if (!apiQuestionsFetchedRef.current || (elapsedTime - durationStep1 < minDurationStep2)) {
          // Step 2: Generating (wait for API OR min 2s for step 2)
          newStepIndex = 1;
        } else if (elapsedTime - (durationStep1 + minDurationStep2) < duration3) {
          // Step 3: Launching (if API done AND min 2s for step 2 passed)
          newStepIndex = 2;
        } else {
          // All steps completed and their minimum durations met
          newStepIndex = progressSteps.length - 1; // Ensure it ends on the last step
        }

        setCurrentProgressStepIndex(prevIndex => {
          if (newStepIndex !== prevIndex) {
            setFadeKey(prevKey => prevKey + 1);
            return newStepIndex;
          }
          return prevIndex;
        });

        // Overall Animation Completion and Redirection Check
        if (newStepIndex === progressSteps.length - 1 && apiQuestionsFetchedRef.current && (elapsedTime >= fixedTotalAnimationDuration)) {
          clearInterval(intervalIdRef.current);
          setProgressBarWidth(100);
          setCurrentProgressStepIndex(progressSteps.length - 1);
          setFadeKey(prevKey => prevKey + 1);

          if (interviewDataRef.current && interviewDataRef.current.interview && interviewDataRef.current.interview.id) {
            sessionStorage.setItem(`interview_${interviewDataRef.current.interview.id}`, JSON.stringify(interviewDataRef.current));
            sessionStorage.removeItem('interviewLoaderProgress');
            sessionStorage.removeItem('interviewLoaderStartTs');
            navigate(`/interview/session/${interviewDataRef.current.interview.id}`, {
              replace: true,
              state: interviewDataRef.current
            });
          } else {
            logger.error('❌ Navigation failed: Missing interview data', interviewDataRef.current);
            setError('Could not start interview. Please try again.');
            setLoading(false);
          }
        }
      }, 50); // Update every 50ms for smooth animation
    };

    // Start/resume animation using a persistent start timestamp so it doesn't reset on remount
    const tsKey = 'interviewLoaderStartTs';
    const now = Date.now();
    const existingTs = parseInt(sessionStorage.getItem(tsKey) || '0');
    const startTs = existingTs && (now - existingTs) < 60000 ? existingTs : now; // reuse within 60s
    if (!existingTs || startTs === now) {
      sessionStorage.setItem(tsKey, startTs.toString());
    }

    const initialElapsed = now - startTs;
    setCurrentProgressStepIndex(0);
    setProgressBarWidth(Math.min(100, (initialElapsed / (1000 + 2000 + 1000)) * 100));
    setFadeKey(0);
    startProgressAnimation(initialElapsed);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [progressSteps.length]);

  // New useEffect to trigger interview start/recovery based on props
  useEffect(() => {
    logger.log('🔥 useEffect triggered:', {
      user: !!user,
      userId: user?.id,
      interviewId,
      locationState: location.state,
      locationStateString: JSON.stringify(location.state),
      pathname: location.pathname
    });
    
    const initializeInterview = async () => {
      logger.log('🚀 initializeInterview called');
      
      // ROBUST GUARD: Prevent any duplicate attempts within this component instance
      if (hasAttemptedRequest.current) {
        logger.log('🛑 Request already attempted in this component instance, blocking');
        return;
      }
      
      // Primary guard: ensure user is authenticated
      if (!AUTH_BYPASS && !user) {
        logger.log('❌ No user, returning');
        return;
      }

      // Check if API requests have already been initiated using global hooks
      const isStartApiInitiated = startInterviewApi.isRequestInitiated();
      const isRecoverApiInitiated = recoverInterviewApi.isRequestInitiated();
      
      logger.log('🔍 Detailed API status check:', {
        interviewId,
        isStartApiInitiated,
        isRecoverApiInitiated,
        sessionStorageStart: sessionStorage.getItem('api_request_interview-start-new'),
        sessionStorageStartInProgress: sessionStorage.getItem('api_inprogress_interview-start-new'),
        sessionStorageStartTimestamp: sessionStorage.getItem('api_timestamp_interview-start-new'),
        currentTime: Date.now(),
        timestampAge: Date.now() - (parseInt(sessionStorage.getItem('api_timestamp_interview-start-new')) || 0)
      });
      
      // For new interviews, check start API; for recovery, check recover API.
      // If already initiated, latch onto existing result instead of returning.
      if (interviewId && isRecoverApiInitiated) {
        logger.log('⏭️ Recovery API already initiated, waiting for existing result...');
        try {
          const responseData = await recoverInterviewApi.waitForExistingResult();
          apiQuestionsFetchedRef.current = true;
          if (!responseData.valid) {
            throw new Error(responseData.error || 'Invalid interview session');
          }
          if (responseData.expired) {
            setError('This interview session has expired');
            setLoading(false);
            return;
          }
          const interview = responseData.interview;
          const questions = responseData.questions;
          const interviewData = {
            interview,
            questions,
            startTime: new Date(interview.startedAt).getTime(),
            difficulty: interview.difficulty.toLowerCase(),
            numQuestions: interview.numQuestions,
            timeMinutes: interview.timeMinutes,
            recovered: true
          };
          interviewDataRef.current = interviewData;
        } catch (e) {
          logger.error('Failed to await existing recovery result:', e);
          setError(e.message || 'Failed to recover interview session');
          setLoading(false);
        }
        return;
      } else if (!interviewId && isStartApiInitiated) {
        logger.log('⏭️ Start API already initiated, waiting for existing result...');
        try {
          const responseData = await startInterviewApi.waitForExistingResult();
          apiQuestionsFetchedRef.current = true;
          const interview = responseData.interview;
          const questions = responseData.questions;
          if (!questions || questions.length === 0) {
            throw new Error('No questions received from server');
          }
          const interviewData = {
            interview,
            questions,
            startTime: Date.now(),
            difficulty: location.state?.difficulty,
            numQuestions: location.state?.numQuestions,
            timeMinutes: location.state?.timeMinutes
          };
          interviewDataRef.current = interviewData;
        } catch (e) {
          logger.error('Failed to await existing start result:', e);
          setError(e.message || 'Failed to start interview');
          setLoading(false);
        }
        return;
      }

      const startNewInterviewLocal = async (difficulty, numQuestions, timeMinutes) => {
        try {
          setLoading(true);

          const accessToken = await getAccessToken();
          if (!AUTH_BYPASS && !accessToken) {
            throw new Error('User not authenticated');
          }

          const headers = {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          
          const requestData = {
            difficulty: difficulty.toUpperCase(),
            numQuestions: parseInt(numQuestions),
            timeMinutes: parseInt(timeMinutes)
          };
          
          logger.log('📤 Making API request with data:', requestData);
          const result = await startInterviewApi.makeRequest({
            method: 'post',
            url: buildApiUrl(API_ENDPOINTS.INTERVIEW_START),
            data: requestData,
            headers
          });
          
          logger.log('📥 API request result:', result);

          let responseData;
          if (result.skipped) {
            logger.log('⏭️ Request was skipped, waiting for existing result...');
            responseData = await startInterviewApi.waitForExistingResult();
          } else {
            responseData = result.data; // useApiOnce returns { data, response }
          }
          logger.log('🔍 Full response data:', responseData);

          // Signal that API questions have been fetched
          apiQuestionsFetchedRef.current = true;

          const interview = responseData.interview;
          const questions = responseData.questions;
          
          logger.log('🔍 Extracted data:', { interview, questions });

          if (!questions || questions.length === 0) {
            throw new Error('No questions received from server');
          }
          
          const interviewData = {
            interview,
            questions,
            startTime: Date.now(),
            difficulty,
            numQuestions,
            timeMinutes
          };

          interviewDataRef.current = interviewData; // Store for later navigation

        } catch (error) {
          logger.error('Error starting interview:', error);
          
          // Handle specific case of user already having an interview in progress
          const errorMessage = error.response?.data?.error || error.message || 'Failed to start interview';
          if (errorMessage.includes('already has an interview in progress')) {
            logger.error('❌ Interview already exists - this should not happen with our duplicate prevention');
            setError('You have an ongoing interview. Please go to your dashboard to continue or wait for it to expire.');
            setLoading(false);
            // DON'T reset hasAttemptedRequest for this error - prevent infinite retries
          } else {
            setError(errorMessage);
            setLoading(false);
            hasAttemptedRequest.current = false; // Reset on other errors to allow retry
            apiCallInitiatedRef.current = false; // Reset if API call failed
          }
        }
      };

      const recoverInterviewSessionLocal = async () => {
        try {
          setLoading(true); 
          
          const accessToken = await getAccessToken();
          if (!AUTH_BYPASS && !accessToken) {
            throw new Error('User not authenticated');
          }

          const headers = {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          };
          const result = await recoverInterviewApi.makeRequest({
            method: 'get',
            url: buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewId}/validate`),
            headers
          });
          
          let responseData;
          if (result.skipped) {
            logger.log('⏭️ Recovery request skipped, waiting for existing result...');
            responseData = await recoverInterviewApi.waitForExistingResult();
          } else {
            responseData = result.data; // useApiOnce returns { data, response }
          }

          // Signal that API questions have been fetched
          apiQuestionsFetchedRef.current = true;

          if (!responseData.valid) {
            throw new Error(responseData.error || 'Invalid interview session');
          }

          if (responseData.expired) {
            setError('This interview session has expired');
            setLoading(false);
            return;
          }

          const interview = responseData.interview;
          const questions = responseData.questions;
          
          const interviewData = {
            interview,
            questions,
            startTime: new Date(interview.startedAt).getTime(),
            difficulty: interview.difficulty.toLowerCase(),
            numQuestions: interview.numQuestions,
            timeMinutes: interview.timeMinutes,
            recovered: true
          };

          interviewDataRef.current = interviewData; // Store for later navigation

        } catch (error) {
          logger.error('Error recovering interview:', error);
          if (error.response?.status === 404) {
            setError('Interview session not found');
          }
          else if (error.response?.status === 403) {
            setError('You do not have access to this interview session');
          }
          else if (error.response?.status === 410) {
            setError('This interview session has expired');
          }
          else {
            setError(error.response?.data?.error || error.message || 'Failed to recover interview session');
          }
          setLoading(false);
          // Only reset for certain types of errors to prevent infinite loops
          if (error.response?.status === 404 || error.response?.status === 403 || error.response?.status === 410) {
            // These are definitive errors that won't be resolved by retrying
            // Don't reset hasAttemptedRequest
          } else {
            hasAttemptedRequest.current = false; // Reset on other errors to allow retry
          }
          apiCallInitiatedRef.current = false; // Reset if API call failed
        }
      };

      logger.log('🎯 Determining path:', {
        hasInterviewId: !!interviewId,
        hasLocationState: !!location.state,
        difficulty: location.state?.difficulty,
        numQuestions: location.state?.numQuestions,
        timeMinutes: location.state?.timeMinutes
      });

      // Set the flag BEFORE attempting any API calls
      hasAttemptedRequest.current = true;

      if (interviewId) {
        logger.log('📋 Taking recovery path');
        await recoverInterviewSessionLocal();
      } else if (location.state?.difficulty && location.state?.numQuestions && location.state?.timeMinutes) {
        logger.log('🆕 Taking new interview path');
        const { difficulty, numQuestions, timeMinutes } = location.state;
        await startNewInterviewLocal(difficulty, numQuestions, timeMinutes);
      } else {
        logger.log('❌ Invalid parameters, showing error');
        setError("Invalid interview parameters. Please start a new interview from the practice page.");
        setLoading(false);
        hasAttemptedRequest.current = false; // Reset on invalid parameters
        apiCallInitiatedRef.current = false; // Reset if invalid parameters, allowing retries
      }
    };

    initializeInterview();
  }, [user?.id, interviewId]); // Note: user?.id should be stable, but user object itself might change

  const errorCopy = useMemo(
    () => (error ? getInterviewLoadErrorCopy(error, !!interviewId) : null),
    [error, interviewId]
  );

  const handlePrimaryAction = () => {
    if (!errorCopy) return;
    if (errorCopy.openLogin) {
      sessionStorage.setItem('returnTo', errorCopy.secondaryPath || '/practice/coding');
      navigate(errorCopy.primaryPath, { replace: true });
      // Allow the home shell to mount, then open login
      setTimeout(() => {
        window.dispatchEvent(new Event('open-login-modal'));
      }, 50);
      return;
    }
    navigate(errorCopy.primaryPath, { replace: true });
  };

  const handleSecondaryAction = () => {
    if (!errorCopy) return;
    navigate(errorCopy.secondaryPath, { replace: true });
  };

  if (error && errorCopy) {
    return (
      <div className="container-fluid interview-loader-page d-flex align-items-center justify-content-center">
        <div className="interview-loader-error-card" role="alert">
          <div className="interview-loader-error-icon" aria-hidden="true">
            !
          </div>
          <h1 className="interview-loader-error-title">
            <span className="mockwise-gradient">MockWise</span>
            <span className="d-block mt-2 text-white" style={{ fontSize: '0.9em', fontWeight: 700 }}>
              {errorCopy.title}
            </span>
          </h1>
          <p className="interview-loader-error-message">{errorCopy.body}</p>
          {errorCopy.hint ? (
            <p className="interview-loader-error-hint">{errorCopy.hint}</p>
          ) : null}
          <div className="interview-loader-error-actions">
            <Button variant="success" onClick={handlePrimaryAction}>
              {errorCopy.openLogin ? 'Sign in' : errorCopy.primaryLabel}
            </Button>
            <Button variant="outline-light" onClick={handleSecondaryAction}>
              {errorCopy.secondaryLabel}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid interview-loader-page d-flex flex-column align-items-center justify-content-center">
      <div className="text-center mb-5">
        <h2 className="display-4 fw-bold mb-4">{interviewId ? 'Recovering Interview Session' : 'Creating Your Interview'}</h2>
      </div>

      {/* Progress Bar Container */}
      <div className="progress-container position-relative mb-4" style={{ width: '80%', maxWidth: '600px', height: '30px', backgroundColor: '#333', borderRadius: '15px', overflow: 'hidden' }}>
        {/* Progress Bar Fill */}
        <div 
          className="progress-bar-fill h-100 position-absolute top-0 start-0"
          style={{
            width: `${progressBarWidth}%`,
            backgroundColor: '#28a745',
            transition: 'width 0.3s ease-in-out',
            borderRadius: '15px',
          }}
        ></div>
        {/* Progress Text */}
        <div 
          key={fadeKey} // Use fadeKey to trigger re-render for transition
          className="progress-text w-100 h-100 d-flex align-items-center justify-content-center position-absolute top-0 start-0 text-white fw-bold"
          style={{
            opacity: 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          {progressSteps[currentProgressStepIndex]}
        </div>
      </div>

      <div className="d-flex flex-column align-items-start w-80" style={{ maxWidth: '600px', width: '80%' }}>
        {progressSteps.map((step, index) => (
          <p 
            key={index} 
            className="mb-2"
            style={{
              color: index <= currentProgressStepIndex ? '#28a745' : '#ffffff',
              fontWeight: 'bold',
              transition: 'color 0.5s ease-in-out',
            }}
          >
            <span className="me-2">{index + 1}.</span> {step}
          </p>
        ))}
      </div>

      {loading && (
        <Spinner animation="border" variant="light" className="mt-5" />
      )}
    </div>
  );
}

export default InterviewLoader;