import { useEffect, useContext, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';

function FeedbackLoader() {
  const navigate = useNavigate();
  const { interviewId } = useParams(); // Assuming interviewId is passed for feedback
  const { getAccessToken, user } = useContext(SupabaseAuthContext);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); 
  const [currentProgressStepIndex, setCurrentProgressStepIndex] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);

  const animationStartRef = useRef(null);
  const animationResolveRef = useRef(null); // To store the resolve function of the animation promise
  const intervalIdRef = useRef(null); // To store the setInterval ID persistently
  const apiFeedbackGeneratedRef = useRef(false); // To track if API feedback has been generated
  const feedbackStartedRef = useRef(false); // New ref to prevent multiple feedback generation calls

  const progressSteps = [
    "Running test cases on your code", // Step 1 (2 second)
    "Analysing your code and providing feedback", // Step 2 (min 2 seconds, depends on API)
    "Finalizing your report", // Step 3 (1 second)
  ];

  const isFeedbackReady = (data) => {
    try {
      const subs = data?.submissions || [];
      if (subs.length === 0) return false;
      return subs.every((s) => {
        if (!s?.claudeFeedback) return false;
        try { JSON.parse(s.claudeFeedback); return true; } catch { return false; }
      });
    } catch { return false; }
  };

  // useEffect for managing the animation interval
  useEffect(() => {
    const durationStep1 = 1000; // 1 second
    const minDurationStep2 = 2000; // Minimum 2 seconds for step 2
    const durationStep3 = 1000; // 1 second
    const fixedTotalAnimationDuration = durationStep1 + minDurationStep2 + durationStep3; // Minimum total 4 seconds for visual bar progression

    const startProgressAnimation = (initialElapsedTime = 0) => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }

      animationStartRef.current = Date.now() - initialElapsedTime;

      intervalIdRef.current = setInterval(() => {
        const elapsedTime = Date.now() - animationStartRef.current;

        // Keep progressing based on elapsed wall time (works even if timers are throttled)
        setProgressBarWidth(Math.min(100, (elapsedTime / fixedTotalAnimationDuration) * 100));

        let newStepIndex = 0;
        if (elapsedTime < durationStep1) {
          newStepIndex = 0; // Step 1: Analyzing
        } else if (!apiFeedbackGeneratedRef.current || (elapsedTime - durationStep1 < minDurationStep2)) {
          // Step 2: Generating (wait for API OR min 2s for step 2)
          newStepIndex = 1;
        } else if (elapsedTime - (durationStep1 + minDurationStep2) < durationStep3) {
          // Step 3: Finalizing (if API done AND min 2s for step 2 passed)
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
        if (newStepIndex === progressSteps.length - 1 && apiFeedbackGeneratedRef.current && (elapsedTime >= fixedTotalAnimationDuration)) {
          clearInterval(intervalIdRef.current);
          setProgressBarWidth(100);
          setCurrentProgressStepIndex(progressSteps.length - 1);
          setFadeKey(prevKey => prevKey + 1);

          if (animationResolveRef.current) {
            animationResolveRef.current();
            animationResolveRef.current = null; // Clear the resolve function after use
          }
        }
      }, 50); // Update every 50ms for smooth animation
    };

    // Start/resume animation using a persistent start timestamp so it doesn't reset on remount/visibility changes
    const tsKey = 'feedbackLoaderStartTs';
    const now = Date.now();
    const existingTs = parseInt(sessionStorage.getItem(tsKey) || '0');
    const startTs = existingTs && (now - existingTs) < 600000 ? existingTs : now; // reuse within 10 minutes
    if (!existingTs || startTs === now) {
      sessionStorage.setItem(tsKey, startTs.toString());
    }

    const initialElapsed = now - startTs;
    setCurrentProgressStepIndex(0);
    setProgressBarWidth(Math.min(100, (initialElapsed / fixedTotalAnimationDuration) * 100));
    setFadeKey(0);
    startProgressAnimation(initialElapsed);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [progressSteps.length]);

  // useEffect to trigger feedback generation based on props
  useEffect(() => {
    const generateFeedback = async () => {
      if (!user || !interviewId) { // Wait for user and interviewId
        return;
      }
      // Check if feedback generation has already started for this instance
      if (feedbackStartedRef.current) {
        return;
      }

      feedbackStartedRef.current = true; // Mark as started

      try {
        setLoading(true);

        // Kickoff already happens server-side after submit.
        // Here we just hit the feedback endpoint to ensure connectivity
        // and consider generation "started" for the animation.
        const accessToken = await getAccessToken();
        const headers = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {};
        await axios.get(buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewId}/feedback`), { headers });

        // Signal that backend is reachable and generation is in progress
        apiFeedbackGeneratedRef.current = true;
        
        const animationCompletionPromise = new Promise(resolve => {
          animationResolveRef.current = resolve;
        });

        await animationCompletionPromise;

        // Hold near-complete UI while we wait for backend readiness (up to ~2 minutes)
        setProgressBarWidth(95);
        setCurrentProgressStepIndex(2);

        const pollUntilReady = async () => {
          const start = Date.now();
          const timeoutMs = 120000; // 2 minutes max wait
          const headersPoll = accessToken ? { headers: { 'Authorization': `Bearer ${accessToken}` } } : {};
          while (Date.now() - start < timeoutMs) {
            try {
              const r = await axios.get(buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewId}/feedback`), headersPoll);
              if (isFeedbackReady(r.data)) return true;
            } catch {}
            await new Promise(res => setTimeout(res, 2000));
          }
          return false;
        };

        await pollUntilReady();

        // Store flags indicating submission fully completed for this interview
        sessionStorage.setItem(`feedback_initiated_${interviewId}`, 'true');
        sessionStorage.setItem(`interview_${interviewId}_submitted`, 'true');
        sessionStorage.removeItem(`interview_${interviewId}_submitting`);
        localStorage.setItem(`interview_${interviewId}_submitted`, 'true');
        localStorage.removeItem(`interview_${interviewId}_submitting`);
        sessionStorage.removeItem('feedbackLoaderProgress'); // Clear progress state

        // Clear the timestamp so the next visit starts fresh
        sessionStorage.removeItem('feedbackLoaderStartTs');
        navigate(`/interview/feedback/${interviewId}`, {
          replace: true,
          state: { interviewId }
        });

      } catch (error) {
        logger.error('Error generating feedback:', error);
        setError(error.response?.data?.error || error.message || 'Failed to generate feedback');
        setLoading(false);
      }
    };

    generateFeedback();
  }, [user, interviewId, navigate, getAccessToken, animationResolveRef]);

  const handleRetryOrHome = () => {
    navigate('/dashboard', { replace: true }); // Always go to dashboard for feedback errors
  };

  if (error) {
    return (
      <div className="container-fluid d-flex align-items-center justify-content-center text-white" style={{ height: '100vh', background: '#000000' }}>
        <div className="text-center">
          <Alert variant="danger" className="mb-4">
            <Alert.Heading>Feedback Loading Error</Alert.Heading>
            <p>{error}</p>
          </Alert>
          <button
            className="btn btn-primary"
            onClick={handleRetryOrHome}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid d-flex flex-column align-items-center justify-content-center text-white" style={{ height: '100vh', background: '#000000' }}>
      <div className="text-center mb-5">
        <h2 className="display-4 fw-bold mb-4">Generating Feedback</h2>
        <h5 className="mt-2" style={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
          Great job finishing your interview!<br />
          While we crunch the numbers and analyze your code, take a deep breath, stretch your fingers, or sip on something refreshing — your feedback is on its way!
        </h5>
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

export default FeedbackLoader;
