import { useContext, useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { Calendar, Target, HelpCircle, Settings, Clock } from 'lucide-react';

// Helper to format duration nicely from seconds or minutes
const formatDuration = (secondsOrMinutes) => {
  const seconds = secondsOrMinutes > 180 ? secondsOrMinutes : secondsOrMinutes * 60; // best-effort fallback
  const m = Math.floor(seconds / 60);
  return `${m} minutes`;
};

// Helper to get bar color based on score
const getBarColor = (score) => {
  if (score >= 0 && score <= 4) return '#dc3545'; // Red
  if (score >= 5 && score <= 7) return '#ffea61'; // Yellow
  return '#198754'; // Green
};

// Custom Bar component with score label inside, clickable and hoverable
const CustomBar = (props) => {
  const { payload, x, y, width, height } = props;
  const score = payload?.score ?? 0;
  const color = getBarColor(score);

  const handleClick = () => {
    if (payload?.interviewId) {
      window.open(`/interview/feedback/${payload.interviewId}`, '_blank', 'noopener');
    }
  };

  // Ensure even score=0 bars are visible for hover/click
  const barHeight = score === 0 ? 6 : height;       // minimum height for click
  const barY = score === 0 ? y - 3 : y;            // adjust Y position for 0
  const barFill = score === 0 ? '#8888' : color;   // tiny opacity for hover detection
  const barStroke = score === 0 ? '#888' : 'none'; // optional outline for 0 bars

  return (
    <g>
      <rect
        x={x}
        y={barY}
        width={width}
        height={barHeight}
        fill={barFill}
        stroke={barStroke}
        style={{ cursor: 'pointer' }}
        onClick={handleClick}
        onMouseEnter={(e) => { e.target.style.opacity = '0.8'; }}
        onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
      />

      <text
        x={x + width / 2}
        y={barY - 6}  // display score above the bar
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize="12"
        fontWeight="bold"
        style={{
          textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          pointerEvents: 'none', // text does not block hover/click
        }}
      >
        {score.toFixed(1)}
      </text>
    </g>
  );
};

// Helper to format dates for X-axis display
const formatDateForAxis = (dateString) => {
  const date = new Date(dateString);
  const month = date.toLocaleDateString('en-US', { month: 'short' }); // Jan, Feb, etc.
  const day = date.getDate();
  return `${month} ${day}`; // e.g., "Jan 15", "Mar 3"
};

const InterviewDetailsTooltip = ({ active, payload, label, coordinate, viewBox }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    // Calculate if this data point is in the right half of the chart (50-100%)
    // Use viewBox width to determine the threshold dynamically
    const chartWidth = viewBox?.width || 800;
    const isRightHalf = coordinate && coordinate.x > (chartWidth * 0.5);
    
    // Determine tooltip positioning based on data point location
    const tooltipStyle = {
      backgroundColor: '#FFFFFF',
      border: '1px solid #333',
      color: 'black',
      transform: isRightHalf ? 'translateX(-100%)' : 'translateX(0%)',
      transformOrigin: isRightHalf ? 'right center' : 'left center'
    };

    return (
      <div className="p-3 rounded-3" style={tooltipStyle}>
        <div className="d-flex align-items-center mb-1">
          <Calendar size={16} className="me-2" style={{ color: '#16a3b7' }} />
          <div><strong>Date:</strong> {label}</div>
        </div>
        <div className="d-flex align-items-center mb-1">
          <Target size={16} className="me-2" style={{ color: '#16a3b7' }} />
          <div><strong>Score:</strong> {data.score}</div>
        </div>
        <div className="d-flex align-items-center mb-1">
          <HelpCircle size={16} className="me-2" style={{ color: '#16a3b7' }} />
          <div><strong>Questions:</strong> {data.noOfQuestions}</div>
        </div>
        <div className="d-flex align-items-center mb-1">
          <Settings size={16} className="me-2" style={{ color: '#16a3b7' }} />
          <div><strong>Difficulty:</strong> {data.difficulty}</div>
        </div>
        <div className="d-flex align-items-center">
          <Clock size={16} className="me-2" style={{ color: '#16a3b7' }} />
          <div><strong>Duration:</strong> {data.duration}</div>
        </div>
        <div className="mt-2" style={{ fontSize: '1rem', opacity: 1 }}>
          Click on the bar to open detailed feedback.
        </div>
      </div>
    );
  }
  return null;
};


function ProgressGraph({ refreshSignal = 0 }) {
    const { getAccessToken, user } = useContext(SupabaseAuthContext);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const containerRef = useRef(null);
    const inFlightRef = useRef(false);

    useEffect(() => {
      if (!user) return; // wait until auth/user is ready in this tab
      const cacheKey = user ? `dashboard_progress_${user.id}` : 'dashboard_progress_anon';
      const inflightKey = user ? `dashboard_progress_inflight_${user.id}` : 'dashboard_progress_inflight_anon';

      // If this is an explicit refresh, clear cache and in-flight flags first
      if (refreshSignal > 0) {
        try {
          localStorage.removeItem(cacheKey);
          sessionStorage.removeItem(inflightKey);
        } catch {}
        inFlightRef.current = false;
        setLoading(true);
      }
      
      let hydrated = false;
      try {
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          hydrated = true;
        }
      } catch {}

      // If we already hydrated from cache and this isn't an explicit refresh, skip network
      if (hydrated && refreshSignal === 0) {
        return;
      }

      // Clear cache on refresh to ensure fresh data
      if (refreshSignal > 0) {
        try { 
          localStorage.removeItem(cacheKey);
        } catch {}
      }

      const fetchSeries = async () => {
        // De-dupe across remounts/StrictMode and visibility changes
        if (inFlightRef.current || sessionStorage.getItem(inflightKey) === 'true') {
          return;
        }
        inFlightRef.current = true;
        try { sessionStorage.setItem(inflightKey, 'true'); } catch {}
        try {
          const token = await (getAccessToken ? getAccessToken() : null);
          if (!token) { inFlightRef.current = false; try { sessionStorage.removeItem(inflightKey); } catch {}; return; }
          const headers = { Authorization: `Bearer ${token}` };
          // Expected backend response: [{ id, date, overallRating, numQuestions, difficulty, timeMinutes }]
          const resp = await axios.get(buildApiUrl(API_ENDPOINTS.DASHBOARD_PROGRESS), { headers });
          const series = (resp.data || []).map((it) => ({
            interviewId: it.id,
            date: it.date,
            score: typeof it.overallRating === 'number' ? it.overallRating : 0,
            noOfQuestions: it.numQuestions,
            difficulty: it.difficulty,
            duration: formatDuration(it.timeMinutes * 60 || it.timeMinutes || 0)
          })).sort((a, b) => new Date(a.date) - new Date(b.date));
          setData(series);
          
          // Always cache the data in localStorage for persistence across tab switches
          try { 
            localStorage.setItem(cacheKey, JSON.stringify(series));
          } catch {}
        } catch (_e) {
          if (!hydrated) setError('Failed to load progress');
        } finally {
          if (!hydrated) setLoading(false);
          inFlightRef.current = false;
          try { sessionStorage.removeItem(inflightKey); } catch {}
        }
      };

      fetchSeries();
    }, [getAccessToken, user?.id, refreshSignal]);

    // Handle document visibility changes to prevent unnecessary reloads
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && data.length > 0) {
          // If we have cached data and the tab becomes visible, don't reload
          // The data is already available from localStorage
          return;
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [data.length]);

    return (
      <div className="p-4 mb-3" ref={containerRef}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ height: 320 }}>
            Loading your interview progress graph. Please allow us a moment.
            <div className="spinner-border text-light" role="status"><span className="visually-hidden">Loading...</span></div>
          </div>
        ) : (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart 
            data={data} 
            margin={{ top: 8, right: 24, bottom: 8, left: 24 }}
          >
            {/* AXES */}
            <XAxis
              dataKey="date"
              tick={{ fill: '#ffffff', fontSize: 14, fontWeight: 'bold' }}
              tickLine={true} // show tick line
              axisLine={{ stroke: '#aaa', strokeWidth: 3 }} // show axis line
              interval={0}
              minTickGap={40}
              tickFormatter={formatDateForAxis}
            />
            
            <YAxis
              domain={[0, 11]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: '#dddddd', fontSize: 16, fontWeight: 'bold'}}
              tickLine={true}   // show tick line
              axisLine={{ stroke: '#aaa', strokeWidth: 3 }} // show axis line
              width={40}
            />

            {/* TOOLTIP */}
            <Tooltip
              content={InterviewDetailsTooltip}
              trigger='item'
              wrapperStyle={{ pointerEvents: 'auto' }}
              allowEscapeViewBox={{ x: true, y: true }}
              isAnimationActive={false}
              cursor={false}
              className="progress-graph-tooltip"
            />

            {/* Bars with custom colors and score labels */}
            <Bar
              dataKey="score"
              shape={<CustomBar />}
              radius={[4, 4, 0, 0]}
              cursor="pointer"
              // barSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
        )}
        {error && <div className="text-danger mt-2">{error}</div>}
      </div>
    );
}

export default ProgressGraph;