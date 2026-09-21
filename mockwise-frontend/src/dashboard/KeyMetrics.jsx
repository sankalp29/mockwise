import { useEffect, useState, useContext, useRef } from 'react';
import { Spinner } from 'react-bootstrap';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { useApiOnce } from '../hooks/useApiOnce';
import { Sun, FileText, Clock, Gauge, Timer, Activity, Award, MinusCircle } from 'lucide-react';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';
import DashboardEmptyState from './DashboardEmptyState';
import '../styles/DashboardEmpty.css';
import './KeyMetrics.css';

const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
};

// New MiniBarChart Component
const MiniBarChart = ({ data }) => {
    // Determine color based on value for a more semantic display
    const getColorStyle = (val) => {
        if (val >= 8) return '#198754'; // A vibrant green
        if (val >= 6) return '#FFC107'; // A golden yellow
        return '#DC3545'; // Red color
    };

    return (
        <div className="km-minibar">
            {Object.entries(data).map(([key, val]) => {
                // Calculate bar height as a percentage of max score (10)
                const barHeightPercentage = (val / 10) * 100;
                
                // Determine if the score label should be inside or outside
                // A score of 5 or more is a reasonable threshold for a 100px tall chart
                const isScoreInside = barHeightPercentage >= 50;
                
                // Add a minimum height for zero-score bars to make them visible
                const barDisplayHeight = barHeightPercentage > 0 ? `${barHeightPercentage}%` : '5px';

                const barStyle = {
                    width: '100%',
                    height: barDisplayHeight,
                    backgroundColor: getColorStyle(val),
                    borderRadius: '0.25rem',
                    transition: 'height 0.5s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                };
                
                return (
                    <div key={key} className="km-barwrap">
                        {!isScoreInside && <span className="km-score-out">{val}/10</span>}
                        <div style={barStyle}>
                            {isScoreInside && <span className="km-score-in">{val}/10</span>}
                        </div>
                        <span className="km-bar-label">{key}</span>
                    </div>
                );
            })}
        </div>
    );
};

const MetricCard = ({ title, value, icon: Icon }) => {
    // Determine value color class
    const getValueColorClass = (val, cardTitle) => {
        if (cardTitle === "Highest Score") return 'km-value-success';
        if (cardTitle === "Lowest Score") return 'km-value-danger';
        if (["Total Mocks", "Total Time Spent", "Avg Time/Question", "Last mock attended on"].includes(cardTitle)) {
            return 'km-value-info';
        }
        if (typeof val === 'number') {
            if (val >= 8) return 'km-value-success';
            if (val >= 6) return 'km-value-warning';
            return 'km-value-danger';
        }
        return 'km-value-default';
    };

    // Determine value size class
    const getValueSizeClass = (title) => {
        return ["Strongest Topic", "Weakest Topic", "Most Common Mistake"].includes(title) 
            ? 'km-card-value-small' 
            : 'km-card-value';
    };

    return (
        <div className="km-card">
            <div className="km-card-icon">
                <Icon size={32} />
            </div>
            <div className="km-card-content">
                <h2 className="km-card-title">{title}</h2>
                {title === "Score by Difficulty" ? (
                    <MiniBarChart data={value} />
                ) : (
                    typeof value === 'string' || typeof value === 'number' ? (
                        <div className={`${getValueSizeClass(title)} ${getValueColorClass(value, title)}`}>
                            {title === "Average Score" || title === "Highest Score" || title === "Lowest Score" ? `${value}/10` : value}
                        </div>
                    ) : null
                )}
            </div>
        </div>
    );
};

// Main App component with inline CSS
const KeyMetrics = () => {
    logger.log("KeyMetrics component rendering");
    const { getAccessToken, user } = useContext(SupabaseAuthContext);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    logger.log("KeyMetrics state:", { metrics, loading, error, user: !!user });
    
    // Use the hook to prevent duplicate API requests
    const metricsApi = useApiOnce('dashboard-metrics');
    const inFlightRef = useRef(false);
    const hasLoadedOnceRef = useRef(false); // Track if we've loaded data in this session

    const metricsCacheKey = user ? `dashboard_metrics_${user.id}` : 'dashboard_metrics_anon';

    useEffect(() => {
        logger.log("KeyMetrics useEffect running");
        
        // Always reset API cache on component mount to ensure fresh data on page refresh
        // This is safe because:
        // - Page refresh (Cmd+R): Component remounts, gets fresh data
        // - Navigate away and back: hasLoadedOnceRef prevents duplicate fetch
        metricsApi.resetRequest();
        logger.log("Reset useApiOnce cache for fresh data");
        
        const fetchData = async () => {
            logger.log("fetchData called");
            // Prevent multiple simultaneous requests
            if (inFlightRef.current) {
                logger.log("Request already in flight, skipping");
                return;
            }
            
            inFlightRef.current = true;
            setError(null);
            
            try {
                // Add timeout for getAccessToken to prevent hanging
                const tokenPromise = getAccessToken ? getAccessToken() : Promise.resolve(null);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Authentication timeout')), 5000)
                );
                
                const token = await Promise.race([tokenPromise, timeoutPromise]);
                
                if (!token) {
                    logger.log("No token available");
                    inFlightRef.current = false;
                    setLoading(false);
                    return;
                }
                
                logger.log("Making API request to dashboard metrics");
                const headers = { Authorization: `Bearer ${token}` };
                
                // Fetch metrics - will always be fresh since we reset the cache above
                const metricsResult = await metricsApi.makeRequest({
                    method: 'get',
                    url: buildApiUrl(API_ENDPOINTS.DASHBOARD_METRICS),
                    headers
                });
                
                logger.log("Fetch Dashboard AggregateAPI result: ", metricsResult);
                
                // Update metrics
                if (!metricsResult.skipped) {
                    logger.log("Setting metrics data:", metricsResult.data);
                    setMetrics(metricsResult.data);
                    hasLoadedOnceRef.current = true; // Mark as loaded
                    // Cache the data in sessionStorage for this tab only
                    // This ensures new tabs always fetch fresh data
                    try { 
                        sessionStorage.setItem(metricsCacheKey, JSON.stringify(metricsResult.data));
                    } catch {}
                } else {
                    logger.log("API request was skipped - using cached data from previous load");
                }
                
            } catch (e) {
                logger.error('Failed to fetch dashboard data:', e);
                
                // Provide more specific error messages
                let errorMessage = 'Failed to load dashboard data';
                if (e.message === 'Authentication timeout') {
                    errorMessage = 'Authentication is taking too long. Please try refreshing the page.';
                } else if (e.message?.includes('Network')) {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
                    errorMessage = 'Authentication expired. Please log in again.';
                }
                
                setError(errorMessage);
            } finally {
                setLoading(false);
                inFlightRef.current = false;
            }
        };


        // Try to load from sessionStorage for instant display (this tab only)
        if (loading && !hasLoadedOnceRef.current) {
            logger.log("Checking for cached data in this tab for instant display");
            try {
                const cachedMetrics = sessionStorage.getItem(metricsCacheKey);
                
                if (cachedMetrics) {
                    logger.log("Found cached metrics in this tab, displaying instantly");
                    setMetrics(JSON.parse(cachedMetrics));
                    setLoading(false);
                }
            } catch {}
        }
        
        // Fetch data only if this is the first load OR if we don't have cached data
        if (user && !hasLoadedOnceRef.current) {
            logger.log("User available, fetching fresh data (first load)");
            fetchData();
        } else if (user && hasLoadedOnceRef.current) {
            logger.log("User available, but already loaded in this session - skipping fetch");
            setLoading(false);
        } else {
            logger.log("No user available, not fetching data");
            setLoading(false);
        }
    }, [getAccessToken, user?.id, metricsApi]);

    logger.log("Metrics from backend:", metrics);

    // Show loading state only when initially loading (no cached data) or when we have no data
    const shouldShowLoading = loading;
    
    logger.log("Render decision:", { shouldShowLoading, loading, metrics: !!metrics });
    
    if (shouldShowLoading) {
        return (
            <section className="dashboard-section">
                <h2 className="dashboard-section-title">Key Metrics</h2>
                <div className="km-loading-container">
                    <div className="km-loading-card">
                        <div className="km-loading-title">
                            Generating your dashboard summary
                        </div>
                        <div className="km-loading-subtitle">
                            Fetching your latest metrics...
                        </div>
                        <div className="km-loading-spinner">
                            <Spinner animation="border" variant="success" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }
    
    if (error) {
        return (
            <section className="dashboard-section">
                <h2 className="dashboard-section-title">Key Metrics</h2>
                <DashboardEmptyState
                    variant="error"
                    title="Could not load metrics"
                    body={error}
                    hint="Check your connection, then try again or start a new mock interview."
                    primaryLabel="Try practice page"
                    primaryPath="/practice/coding"
                    secondaryLabel="Back to home"
                    secondaryPath="/home"
                />
            </section>
        );
    }

    // Create data object with fallbacks
    const data = {
        totalInterviews: metrics?.totalInterviews || 0,
        totalTimeSpent: metrics ? formatDuration(metrics.totalTimeSpentSeconds || 0) : '0s',
        averageScore: metrics ? Number((metrics.averageScore || 0).toFixed(1)) : 0,
        highestScore: metrics ? Number((metrics.highestScore || 0).toFixed(1)) : 0,
        lowestScore: metrics ? Number((metrics.lowestScore || 0).toFixed(1)) : 0,
        averageScoreByDifficulty: metrics?.averageScoreByDifficulty || { Easy: 0, Medium: 0, Hard: 0 },
        averageTimePerQuestion: metrics ? formatDuration(metrics.averageTimePerQuestionSeconds || 0) : '0s',
        lastMockDate: metrics?.lastMockDate || '-'
    };

    // Empty: no payload, or zero completed mocks — avoid a wall of zeros
    const isEmpty =
        !loading &&
        (!metrics || !metrics.totalInterviews || metrics.totalInterviews === 0);

    if (isEmpty) {
        return (
            <section className="dashboard-section">
                <h2 className="dashboard-section-title">Key Metrics</h2>
                <DashboardEmptyState
                    variant="metrics"
                    title="No metrics yet"
                    body="Complete your first mock interview to unlock scores, time stats, and difficulty breakdowns."
                    hint="Metrics update automatically after each finished session."
                    primaryLabel="Start a mock interview"
                    primaryPath="/practice/coding"
                    secondaryLabel="Back to home"
                    secondaryPath="/home"
                />
            </section>
        );
    }
    
    return (
        <section className="dashboard-section">
            <h2 className="dashboard-section-title">Key Metrics</h2>
            <div className="km-wrap">
                <div className="km-inner">
                    <div className="km-grid">
                        <MetricCard
                            title="Total Mocks"
                            value={data?.totalInterviews}
                            icon={FileText}
                        />
                        <MetricCard
                            title="Total Time Spent"
                            value={data?.totalTimeSpent}
                            icon={Clock}
                        />
                        <MetricCard
                            title="Average Score"
                            value={data?.averageScore}
                            icon={Gauge}
                        />
                        <MetricCard
                            title="Avg Time/Question"
                            value={data?.averageTimePerQuestion}
                            icon={Timer}
                        />
                        <MetricCard
                            title="Highest Score"
                            value={data?.highestScore}
                            icon={Award}
                        />
                        <MetricCard
                            title="Lowest Score"
                            value={data?.lowestScore}
                            icon={MinusCircle}
                        />
                        <MetricCard
                            title="Score by Difficulty"
                            value={data?.averageScoreByDifficulty || {}}
                            icon={Activity}
                        />
                        <MetricCard
                            title="Last mock attended on"
                            value={data?.lastMockDate}
                            icon={Sun}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
};

export default KeyMetrics;