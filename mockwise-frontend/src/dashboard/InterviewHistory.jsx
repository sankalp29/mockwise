import { useState, useEffect, useRef, useContext } from 'react';
import { Table, Button, Spinner } from 'react-bootstrap';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';
import { useApiOnce } from '../hooks/useApiOnce';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import DashboardEmptyState from './DashboardEmptyState';
import '../styles/DashboardEmpty.css';
import './InterviewHistory.css';

function InterviewHistory() {
  const { getAccessToken } = useContext(SupabaseAuthContext);
  
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inFlightRef = useRef(false);
  const hasLoadedOnceRef = useRef(false); // Track if we've loaded data in this session
  
  const historyApi = useApiOnce('interview-history');
  const historyCacheKey = 'interview_history_data';

  // Initial load effect - only runs once on mount
  useEffect(() => {
    logger.log('InterviewHistory initial load effect running');
    
    // Always reset API cache on component mount to ensure fresh data on page refresh
    // This is safe because:
    // - Page refresh (Cmd+R): Component remounts, gets fresh data
    // - Navigate away and back: hasLoadedOnceRef prevents duplicate fetch
    historyApi.resetRequest();
    logger.log('Reset useApiOnce cache for fresh data');
    
    const fetchInitialData = async () => {
      if (inFlightRef.current) {
        logger.log('InterviewHistory: Request already in flight, skipping initial load');
        return;
      }
      
      inFlightRef.current = true;
      setError(null);
      
      try {
        const token = await getAccessToken();
        if (!token) {
          logger.log('InterviewHistory: No token available for initial load');
          setLoading(false);
          inFlightRef.current = false;
          return;
        }
        
        logger.log('InterviewHistory: Making API request to dashboard progress');
        
        const headers = { Authorization: `Bearer ${token}` };
        
        const result = await historyApi.makeRequest({
          method: 'get',
          url: buildApiUrl(API_ENDPOINTS.DASHBOARD_PROGRESS),
          headers
        });
        
        logger.log('InterviewHistory API result:', result);
        
        if (!result.skipped) {
          logger.log('InterviewHistory: Setting data:', result.data);
          setInterviewHistory(Array.isArray(result.data) ? result.data : []);
          hasLoadedOnceRef.current = true; // Mark as loaded
          // Cache the data in sessionStorage for this tab only
          try { 
            sessionStorage.setItem(historyCacheKey, JSON.stringify(result.data));
          } catch (e) {
            logger.warn('Failed to cache interview history:', e);
          }
        } else {
          logger.log('InterviewHistory: API request was skipped - using cached data from previous load');
        }
        
        setLoading(false);
      } catch (err) {
        logger.error('Error fetching initial interview history:', err);
        setError(err);
        setLoading(false);
        // Try to load cached data as fallback
        try {
          const cached = sessionStorage.getItem(historyCacheKey);
          if (cached) {
            logger.log('InterviewHistory: Loading cached data as fallback after error');
            const parsedData = JSON.parse(cached);
            setInterviewHistory(Array.isArray(parsedData) ? parsedData : []);
            setError(null); // Clear error if we have cached data
          }
        } catch (e) {
          logger.warn('Failed to load cached data as fallback:', e);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    // Try to load from sessionStorage for instant display (this tab only)
    if (loading && !hasLoadedOnceRef.current) {
      logger.log('Checking for cached data in this tab for instant display');
      try {
        const cachedHistory = sessionStorage.getItem(historyCacheKey);
        
        if (cachedHistory) {
          logger.log('Found cached history in this tab, displaying instantly');
          const parsedData = JSON.parse(cachedHistory);
          setInterviewHistory(Array.isArray(parsedData) ? parsedData : []);
          setLoading(false);
        }
      } catch {}
    }

    // Fetch data only if this is the first load
    if (!hasLoadedOnceRef.current) {
      logger.log('First load, fetching fresh data');
      fetchInitialData();
    } else {
      logger.log('Already loaded in this session - skipping fetch');
      setLoading(false);
    }
  }, [getAccessToken]); // Only runs on mount - removed historyApi and historyCacheKey to prevent re-runs

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDifficulty = (difficulty) => {
    if (!difficulty) return 'N/A';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  };

  const getRatingColor = (rating) => {
    if (rating >= 8) return '#198754'; // Green
    if (rating >= 6) return '#FFC107'; // Yellow
    return '#DC3545'; // Red
  };

  const handleViewFeedback = (interviewId) => {
    window.open(`/interview/feedback/${interviewId}`, '_blank');
  };

  logger.log('InterviewHistory render state:', { 
    loading, 
    error, 
    interviewHistory: Array.isArray(interviewHistory) ? interviewHistory.length : 0,
    hasData: !!interviewHistory 
  });

  if (loading) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-section-title">Past Interviews</h2>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '180px' }}>
          <Spinner animation="border" variant="success" />
        </div>
      </section>
    );
  }

  const isEmpty =
    !loading &&
    (!interviewHistory || !Array.isArray(interviewHistory) || interviewHistory.length === 0);

  if (isEmpty) {
    return (
      <section className="dashboard-section">
        <h2 className="dashboard-section-title">Past Interviews</h2>
        {error ? (
          <DashboardEmptyState
            variant="error"
            title="Could not load past interviews"
            body={error.message || 'Unable to fetch your interview history right now.'}
            hint="You can still start a new mock while we sort this out."
            primaryLabel="Start a mock interview"
            primaryPath="/practice/coding"
            secondaryLabel="Back to home"
            secondaryPath="/home"
          />
        ) : (
          <DashboardEmptyState
            variant="history"
            title="No past interviews yet"
            body="Finished mocks will show up here with date, difficulty, score, and a link to full feedback."
            hint="Your first completed session unlocks this history list."
            primaryLabel="Start a mock interview"
            primaryPath="/practice/coding"
            secondaryLabel="Back to home"
            secondaryPath="/home"
          />
        )}
      </section>
    );
  }

  return (
    <section className="dashboard-section">
      <h2 className="dashboard-section-title">Past Interviews</h2>
      <div className="interview-history-table-shell">
        <div className="table-responsive">
          <Table striped hover variant="dark" className="interview-history-table">
            <thead>
              <tr>
                <th>Interview Date</th>
                <th>Difficulty</th>
                <th>Questions</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interviewHistory && Array.isArray(interviewHistory) && interviewHistory.map((interview, index) => (
                <tr key={interview.id || index}>
                  <td className="interview-date">
                    {formatDate(interview.date)}
                  </td>
                  <td className="interview-difficulty">
                    <span className={`difficulty-badge difficulty-${interview.difficulty?.toLowerCase()}`}>
                      {formatDifficulty(interview.difficulty)}
                    </span>
                  </td>
                  <td className="interview-questions">
                    {interview.numQuestions || 'N/A'}
                  </td>
                  <td className="interview-rating">
                    <span
                      className="rating-value"
                      style={{ color: getRatingColor(interview.overallRating) }}
                    >
                      {interview.overallRating ? `${interview.overallRating} / 10` : `0 / 10`}
                    </span>
                  </td>
                  <td className="interview-actions">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleViewFeedback(interview.id)}
                      className="view-feedback-btn"
                    >
                      View Detailed Feedback
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </section>
  );
}

export default InterviewHistory;
