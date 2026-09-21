import { useEffect, useRef, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, ProgressBar, Spinner, Alert, Button, Accordion } from 'react-bootstrap';
import '../styles/InterviewFeedback.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import axios from 'axios';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';

function InterviewFeedback() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const pollCountRef = useRef(0);
  const { getAccessToken } = useContext(SupabaseAuthContext);

  useEffect(() => {
    // If we already have final feedback cached, use it and skip refetch
    const cached = sessionStorage.getItem(`feedback_${interviewId}`) || localStorage.getItem(`feedback_${interviewId}`);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setFeedbackData(data);
        setLoading(false);
        
        // Restore currentIndex if it was saved
        const savedCurrentIndex = sessionStorage.getItem(`feedback_${interviewId}_currentIndex`) || 
                                  localStorage.getItem(`feedback_${interviewId}_currentIndex`);
        if (savedCurrentIndex !== null) {
          const index = parseInt(savedCurrentIndex, 10);
          if (index >= 0 && data.submissions && index < data.submissions.length) {
            logger.log('Restoring currentIndex from saved data:', index);
            setCurrentIndex(index);
          }
        }
        
        return () => {};
      } catch {}
    }
    // initial fetch
    fetchFeedback();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [interviewId]);

  // Handle visibility change and window focus/blur to persist currentIndex
  useEffect(() => {
    const saveCurrentIndex = () => {
      logger.log('Saving currentIndex:', currentIndex);
      try {
        sessionStorage.setItem(`feedback_${interviewId}_currentIndex`, currentIndex.toString());
        localStorage.setItem(`feedback_${interviewId}_currentIndex`, currentIndex.toString());
      } catch (e) {
        logger.error('Error saving currentIndex:', e);
      }
    };

    const restoreCurrentIndex = () => {
      logger.log('Window gained focus - checking for saved currentIndex');
      try {
        const savedCurrentIndex = sessionStorage.getItem(`feedback_${interviewId}_currentIndex`) || 
                                  localStorage.getItem(`feedback_${interviewId}_currentIndex`);
        if (savedCurrentIndex !== null) {
          const index = parseInt(savedCurrentIndex, 10);
          if (index >= 0 && feedbackData?.submissions && index < feedbackData.submissions.length) {
            logger.log('Restoring currentIndex on focus:', index);
            setCurrentIndex(index);
          }
        }
      } catch (e) {
        logger.error('Error restoring currentIndex:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page becoming hidden - save current state
        saveCurrentIndex();
      } else {
        // Page became visible - restore current state
        restoreCurrentIndex();
      }
    };

    const handleFocus = () => {
      restoreCurrentIndex();
    };

    const handleBlur = () => {
      saveCurrentIndex();
    };

    const handleBeforeUnload = () => {
      saveCurrentIndex();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentIndex, interviewId, feedbackData]);

  // Helper function to change currentIndex and persist it
  const handleCurrentIndexChange = (newIndex) => {
    setCurrentIndex(newIndex);
    try {
      sessionStorage.setItem(`feedback_${interviewId}_currentIndex`, newIndex.toString());
      localStorage.setItem(`feedback_${interviewId}_currentIndex`, newIndex.toString());
      logger.log('Saved currentIndex on manual change:', newIndex);
    } catch (e) {
      logger.error('Error saving currentIndex on change:', e);
    }
  };

  const fetchFeedback = async () => {
    try {
      const token = await (getAccessToken ? getAccessToken() : null);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewId}/feedback`), { headers });
      
      setFeedbackData(response.data);

      // Restore currentIndex if it was saved (for fresh API fetch)
      const savedCurrentIndex = sessionStorage.getItem(`feedback_${interviewId}_currentIndex`) || 
                                localStorage.getItem(`feedback_${interviewId}_currentIndex`);
      if (savedCurrentIndex !== null) {
        const index = parseInt(savedCurrentIndex, 10);
        if (index >= 0 && response.data.submissions && index < response.data.submissions.length) {
          logger.log('Restoring currentIndex from saved data (API fetch):', index);
          setCurrentIndex(index);
        }
      }

      // If any submission lacks feedback, start polling until available or timeout
      const needsPolling = (data) => {
        const submissions = data?.submissions || [];
        // Poll if no submissions yet (race with DB commit) OR any submission lacks feedback
        if (submissions.length === 0) return true;
        return submissions.some((s) => !s.claudeFeedback || !parseFeedback(s.claudeFeedback));
      };

      if (needsPolling(response.data)) {
        // start or continue polling
        if (!pollRef.current) {
          pollCountRef.current = 0;
          pollRef.current = setInterval(async () => {
            try {
              pollCountRef.current += 1;
              const tok = await (getAccessToken ? getAccessToken() : null);
              const hdrs = tok ? { Authorization: `Bearer ${tok}` } : {};
              const pollResp = await axios.get(buildApiUrl(`${API_ENDPOINTS.INTERVIEW_BASE}/${interviewId}/feedback`), { headers: hdrs });
              setFeedbackData(pollResp.data);
              if (!needsPolling(pollResp.data) || pollCountRef.current >= 60) { // ~2 minutes
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            } catch (_e) {
              // stop polling on error
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            }
          }, 2000);
        }
      } else {
        // all feedback ready, stop polling and cache final result
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        try {
          sessionStorage.setItem(`feedback_${interviewId}`, JSON.stringify(response.data));
          localStorage.setItem(`feedback_${interviewId}`, JSON.stringify(response.data));
        } catch {}
      }
    } catch (err) {
      logger.error('Error fetching feedback:', err);
      setError('Failed to load interview feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const parseFeedback = (feedbackJson) => {
    try {
      return JSON.parse(feedbackJson);
    } catch (e) {
      logger.error('Error parsing feedback JSON:', e);
      return null;
    }
  };

  const getScoreColor = (score) => {
    if (score === -1) return 'secondary'; // Error/unable to evaluate
    if (score >= 8) return 'success';
    if (score >= 6) return 'warning';
    return 'danger';
  };

  const renderFeedbackCard = (submission, index) => {
    const feedback = parseFeedback(submission.claudeFeedback);
  
    if (!feedback) {
      return (
        <Card className="mb-4" key={submission.id}>
          <Card.Header>
            <h5 className="mb-0">Question {index + 1}: {submission.question?.title}</h5>
          </Card.Header>
          <Card.Body>
            <Alert variant="warning">
              Feedback is still being generated or there was an error processing it.
              <Button variant="link" onClick={fetchFeedback} className="p-0 ms-2">
                Refresh
              </Button>
            </Alert>
          </Card.Body>
        </Card>
      );
    }
  
    return (
      <div key={submission.id}>
        <Card className="mb-4">
          <Card.Header>
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Question {index + 1} : {submission.question?.title}</h5>
            </div>
          </Card.Header>
  
          <Card.Body>
            <Row>
              {/* ---- Performance Metrics ---- */}
              <Col md={6}>
                <h5 className="fw-bold d-flex align-items-center">
                  <i className="bi bi-bar-chart-line text-primary me-2 align-middle"></i>
                  Performance Metrics
                </h5>
                {/* ---- Correctness ---- */}
                <div className="mb-3 feedback-card">
                  <Accordion>
                    <Accordion.Item eventKey={`correctness-${submission.id}`}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <span>Correctness</span>
                          <span className="feedback-link text-muted">View detailed feedback</span>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <p className="text-black">{feedback.correctness?.feedback}</p>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <ProgressBar 
                      now={feedback.correctness?.score === -1 ? 100 : (feedback.correctness?.score / 10) * 100} 
                      variant={getScoreColor(feedback.correctness?.score)}
                      className="flex-grow-1 me-3 progress-bar"
                    />
                    <span className="fw-bold text-black flex-shrink-0 score-box">
                      {feedback.correctness?.score === -1 ? 'N/A' : `${feedback.correctness?.score}/10`}
                    </span>
                  </div>
                </div>
  
                {/* ---- Optimality ---- */}
                <div className="mb-3 feedback-card">
                  <Accordion>
                    <Accordion.Item eventKey={`optimality-${submission.id}`}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <span>Optimality</span>
                          <span className="feedback-link text-muted">View detailed feedback</span>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <p className="text-black">
                          {feedback.optimality?.feedback || 'No optimality feedback available.'}
                        </p>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <ProgressBar 
                      now={feedback.optimality?.score === -1 ? 100 : (feedback.optimality?.score / 10) * 100} 
                      variant={getScoreColor(feedback.optimality?.score)}
                      className="flex-grow-1 me-3 progress-bar"
                    />
                    <span className="fw-bold text-black flex-shrink-0 score-box">
                      {feedback.optimality?.score === -1 ? 'N/A' : `${feedback.optimality?.score}/10`}
                    </span>
                  </div>
                </div>

                {/* ---- Time Complexity ---- */}
                <div className="mb-3 feedback-card">
                  <Accordion>
                    <Accordion.Item eventKey={`time-${submission.id}`}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <span>Time Complexity</span>
                          <span className="feedback-link text-muted">View detailed feedback</span>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <p className="text-black">
                          {feedback.timeComplexity?.bigO && `Big O: ${feedback.timeComplexity.bigO} - `}
                          {feedback.timeComplexity?.feedback}
                        </p>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <ProgressBar 
                      now={feedback.timeComplexity?.score === -1 ? 100 : (feedback.timeComplexity?.score / 10) * 100} 
                      variant={getScoreColor(feedback.timeComplexity?.score)}
                      className="flex-grow-1 me-3 progress-bar"
                    />
                    <span className="fw-bold text-black flex-shrink-0 score-box">
                      {feedback.timeComplexity?.score === -1 ? 'N/A' : `${feedback.timeComplexity?.score}/10`}
                    </span>
                  </div>
                </div>
  
                {/* ---- Space Complexity ---- */}
                <div className="mb-3 feedback-card">
                  <Accordion>
                    <Accordion.Item eventKey={`space-${submission.id}`}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <span>Space Complexity</span>
                          <span className="feedback-link text-muted">View detailed feedback</span>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <p className="text-black">
                          {feedback.spaceComplexity?.bigO && `Big O: ${feedback.spaceComplexity.bigO} - `}
                          {feedback.spaceComplexity?.feedback}
                        </p>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <ProgressBar 
                      now={feedback.spaceComplexity?.score === -1 ? 100 : (feedback.spaceComplexity?.score / 10) * 100} 
                      variant={getScoreColor(feedback.spaceComplexity?.score)}
                      className="flex-grow-1 me-3 progress-bar"
                    />
                    <span className="fw-bold text-black flex-shrink-0 score-box">
                      {feedback.spaceComplexity?.score === -1 ? 'N/A' : `${feedback.spaceComplexity?.score}/10`}
                    </span>
                  </div>
                </div>
  
                {/* ---- Clarity ---- */}
                <div className="mb-3 feedback-card">
                  <Accordion>
                    <Accordion.Item eventKey={`clarity-${submission.id}`}>
                      <Accordion.Header>
                        <div className="d-flex justify-content-between align-items-center w-100">
                          <span>Code Clarity</span>
                          <span className="feedback-link text-muted">View detailed feedback</span>
                        </div>
                      </Accordion.Header>
                      <Accordion.Body>
                        <p className="text-black">{feedback.clarity?.feedback}</p>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <ProgressBar 
                      now={feedback.clarity?.score === -1 ? 100 : (feedback.clarity?.score / 10) * 100} 
                      variant={getScoreColor(feedback.clarity?.score)}
                      className="flex-grow-1 me-3 progress-bar"
                    />
                    <span className="fw-bold text-black flex-shrink-0 score-box">
                      {feedback.clarity?.score === -1 ? 'N/A' : `${feedback.clarity?.score}/10`}
                    </span>
                  </div>
                </div>
  
                
              </Col>
  
              {/* Strengths & Weaknesses */}
              <Col md={6}>
              <div className="mb-3 ms-3 me-3 p-3 rounded shadow-sm strengths-box">
                <div className="mb-3">
                  <h5 className="fw-bold text-success">
                    <i className="bi bi-check-square-fill me-2 text-success"></i>
                    Strengths
                  </h5>
                  {feedback.strengths && feedback.strengths.length > 0 && (
                    <ul>
                      {feedback.strengths.map((strength, idx) => (
                        <li key={idx} className="mb-1 text-black">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mb-3 ms-3 me-3 p-3 rounded shadow-sm weaknesses-box">
                <div className="mb-3">
                  <h5 className="fw-bold text-danger">
                    <i className="bi bi-x-square-fill me-2 text-danger"></i>
                    Areas for Improvement
                  </h5>
                  {feedback.improvements && feedback.improvements.length > 0 && (
                    <ul>
                      {feedback.improvements.map((improvement, idx) => (
                        <li key={idx} className="mb-1">
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              </Col>
            </Row>
          </Card.Body>
          {/* ---- Overall Feedback in new Card ---- */}
          <div className="mt-3 mb-3 ms-3 me-3 p-3 rounded shadow-sm score-box ">
            <h5 className="fw-bold d-flex align-items-center mb-2 text-black">
              <i className="bi bi-chat-square-text text-warning me-2 align-middle"></i>
              Overall Feedback
            </h5>
            <p className="mb-2 fw-normal text-black">{feedback.overallFeedback}</p>
            <span className="me-2 fw-bold text-black">Your score for this question is :</span>
            <span className="fw-bold text-black score-box">
              {feedback.overallRating === -1 ? 'N/A' : `${feedback.overallRating}/10`}
            </span>
            <div className="mt-3">
              <Button 
                variant="primary" 
                className="fw-bold"
                onClick={() => {
                  // Open in new tab
                  const url = `/interview/code/${interviewId}/${submission.id}/user`;
                  logger.log('Opening user code in new tab:', url);
                  window.open(url, '_blank');
                }}
              >
                View Your Code
              </Button>
              <Button
                variant="success"
                className="fw-bold ms-2"
                onClick={() => {
                  // Open in new tab
                  const url = `/interview/code/${interviewId}/${submission.id}/optimal`;
                  logger.log('Opening optimal code in new tab:', url);
                  window.open(url, '_blank');
                }}
              >
                View Optimal Code
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };
  

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <h4>Generating your feedback...</h4>
          <p className="mt-3 fs-large text-white">
            We are analyzing your code. Please allow us a few moments.
          </p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Feedback</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={() => navigate('/home')}>
              Back to Home
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  const interview = feedbackData?.interview;
  const submissions = feedbackData?.submissions || [];
  const overallAverage = submissions.length > 0 
    ? submissions.reduce((sum, sub) => {
        const feedback = parseFeedback(sub.claudeFeedback);
        const rating = feedback?.overallRating;
        return sum + (rating === -1 ? 0 : (rating || 0));
      }, 0) / submissions.filter(sub => {
        const feedback = parseFeedback(sub.claudeFeedback);
        return feedback?.overallRating !== -1;
      }).length 
    : 0;

  return (
    <Container className="py-4">
      <div className="mb-4">
        <div className="position-relative">
          <h1 className="text-center m-0 fw-bold" style={{ fontSize: '4rem' }}>Interview Feedback</h1>
          <div className="position-absolute mt-4 top-0 end-0">
            <Badge bg={getScoreColor(overallAverage)} className="fs-5 px-3 py-2">
              Overall: {isNaN(overallAverage) ? 'N/A' : `${overallAverage.toFixed(1)}/10`}
            </Badge>
          </div>
          <p className="text-center text-white mb-0 mt-2">
            {interview?.difficulty} • {interview?.numQuestions} questions • {interview?.timeMinutes} minutes
          </p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading>No submissions found</Alert.Heading>
          <p>It looks like there were no code submissions for this interview.</p>
        </Alert>
      ) : (
        renderFeedbackCard(submissions[Math.min(currentIndex, submissions.length - 1)], Math.min(currentIndex, submissions.length - 1))
      )}

      {submissions.length > 0 && (
        <div className="d-flex justify-content-center align-items-center flex-wrap gap-2 mt-4">
          {submissions.map((s, idx) => (
            <Button
              key={s.id || idx}
              variant={idx === currentIndex ? 'success' : 'outline-success'}
              className="fw-bold rounded-circle"
              style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => handleCurrentIndexChange(idx)}
            >
              {idx + 1}
            </Button>
          ))}
        </div>
      )}

      <div className="text-center mt-5">
        <Button variant="primary" onClick={() => navigate('/dashboard')} className="me-3 fw-bold">
          View Dashboard
        </Button>
        <Button variant="success" onClick={() => navigate('/practice/coding')} className='fw-bold'>
          Start New Interview
        </Button>
      </div>

    </Container>
  );
}

export default InterviewFeedback;
