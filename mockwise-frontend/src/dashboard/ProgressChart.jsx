import { useState, useEffect, useContext, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { useApiOnce } from '../hooks/useApiOnce';
import { buildApiUrl, API_ENDPOINTS } from '../utils/api';
import { logger } from '../utils/logger';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend
);

const ProgressChart = ({ refreshSignal }) => {
  const { getAccessToken, user } = useContext(SupabaseAuthContext);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const progressApi = useApiOnce('dashboard-progress');
  const inFlightRef = useRef(false);
  const progressCacheKey = user ? `dashboard_progress_${user.id}` : 'dashboard_progress_anon';

  // NEW: chart ref to detect clicks on points
  const chartRef = useRef(null);

  useEffect(() => {
    if (refreshSignal > 0) {
      setIsRefreshing(true);
      try { localStorage.removeItem(progressCacheKey); } catch {}
      progressApi.resetRequest();
      inFlightRef.current = false;
    }

    if (!isRefreshing && isLoading && refreshSignal === 0) {
      let usedCache = false;
      try {
        const cachedProgress = localStorage.getItem(progressCacheKey);
        if (cachedProgress) {
          setChartData(JSON.parse(cachedProgress));
          setIsLoading(false);
          usedCache = true;
        }
      } catch {}
      if (usedCache) return;
    }

    const fetchData = async () => {
      if (inFlightRef.current) return;
      const hasData = chartData.length > 0;
      if (hasData && !isRefreshing && refreshSignal === 0) return;

      inFlightRef.current = true;
      setError(null);

      try {
        const token = await (getAccessToken ? getAccessToken() : null);
        if (!token) {
          inFlightRef.current = false;
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const progressResult = await progressApi.makeRequest({
          method: 'get',
          url: buildApiUrl(API_ENDPOINTS.DASHBOARD_PROGRESS),
          headers,
        });

        if (!progressResult.skipped) {
          const transformedData = progressResult.data.map(interview => ({
            name: new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: interview.overallRating,
            questions: interview.numQuestions,
            date: interview.date,
            interviewId: interview.id,
            difficulty: interview.difficulty,
            duration: interview.timeMinutes,
          }));
          setChartData(transformedData);

          try { localStorage.setItem(progressCacheKey, JSON.stringify(transformedData)); } catch {}
        }
      } catch (err) {
        logger.error('Error fetching progress data:', err);
        setError(err.message || 'We were unable to fetch progress data. Please try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        inFlightRef.current = false;
      }
    };

    if (user) fetchData();
  }, [user, getAccessToken, refreshSignal, progressApi, progressCacheKey, isRefreshing, isLoading, chartData.length]);

  if (isLoading) {
    return (
      <div style={{ backgroundColor: '#2d2d2d', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#ffffff', textAlign: 'center' }}>Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#2d2d2d', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#ffffff', textAlign: 'center' }}>
          <div style={{ marginBottom: '1rem' }}>Loading your graph. Please allow up to a minute.</div>
        </div>
      </div>
    );
  }

  // Prepare data for Chart.js - reverse order to show oldest to newest (left to right)
  const reversedData = [...chartData].reverse();
  const labels = reversedData.map(d => d.name);
  const scores = reversedData.map(d => d.score);

  const data = {
    labels,
    datasets: [
      {
        label: 'Score',
        data: scores,
        fill: false,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 12, // keep larger hover radius for easier clicking
        pointBorderColor: '#ffffff',
      },
    ],
  };

  const tooltipStyle = {
    background: "#ffffff", // white background requested
    color: "#111827",
    border: "1px solid #16a3b7",
    boxShadow: "0px 6px 16px rgba(0,0,0,0.2)",
    borderRadius: "12px",
    padding: "14px 16px",
    fontSize: "0.9rem",
    lineHeight: "1.4",
    zIndex: 999,
    maxWidth: "280px",
    cursor: "pointer", // clickable
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 20,
        right: 20,
        top: 20,
        bottom: 20,
      },
    },
    // NEW: top-level onClick that opens feedback if a point is clicked
    onClick: function (evt) {
      try {
        const chart = chartRef.current;
        if (!chart) return;

        // try to use Chart.js API to get elements at event
        // chart.getElementsAtEventForMode expects native event, Chart.js should pass native evt here
        const points = typeof chart.getElementsAtEventForMode === 'function'
          ? chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true)
          : (chart.chart && typeof chart.chart.getElementsAtEventForMode === 'function' ? chart.chart.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true) : []);

         if (points && points.length) {
           const idx = points[0].index;
           const d = reversedData[idx];
          if (d?.interviewId) {
            window.open(`/interview/feedback/${d.interviewId}`, '_blank', 'noopener');
            const tooltipEl = document.getElementById('chartjs-custom-tooltip');
            if (tooltipEl) {
            tooltipEl.style.opacity = 0;
            tooltipEl.style.pointerEvents = 'none';
            }
          }
        }
      } catch (err) {
        // swallow to avoid breaking chart behavior
        logger.error('click handler error', err);
      }
    },
    plugins: {
      tooltip: {
        enabled: false,
        external: function (context) {
          let tooltipEl = document.getElementById('chartjs-custom-tooltip');
          if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-custom-tooltip';
            document.body.appendChild(tooltipEl);
          }

          const tooltipModel = context.tooltip;
          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = 0;
            tooltipEl.style.pointerEvents = 'none';
            return;
          }

           const idx = tooltipModel.dataPoints[0].dataIndex;
           const d = reversedData[idx];
           const label = d.date;

          // fill content (keeps it simple and white background)
          tooltipEl.innerHTML = `
            <div>
                <div style="margin-bottom:6px;"><strong>Date:</strong> ${label}</div>
              <div style="margin-bottom:4px;"><strong>Score:</strong> ${d.score}</div>
              <div style="margin-bottom:4px;"><strong>Questions:</strong> ${d.questions}</div>
              <div style="margin-bottom:4px;"><strong>Difficulty:</strong> ${d.difficulty}</div>
              <div style="margin-bottom:6px;"><strong>Duration:</strong> ${d.duration} min</div>
              <div style="margin-top:8px; font-size:0.85rem; color:#16a3b7;">Click to open detailed feedback</div>
            </div>
          `;

          // keep tooltip clickable
          tooltipEl.onclick = () => {
            if (d.interviewId) {
              window.open(`/interview/feedback/${d.interviewId}`, '_blank', 'noopener');
            }
            tooltipEl.style.opacity = 0;
            tooltipEl.style.pointerEvents = 'none';
          };

          // compute bounding and clamp to viewport (left/right)
          const canvasRect = context.chart.canvas.getBoundingClientRect();
          let left = canvasRect.left + tooltipModel.caretX;
          let top = canvasRect.top + tooltipModel.caretY;

          // measure after content is inserted
          const ttWidth = tooltipEl.offsetWidth || 260;
          const ttHeight = tooltipEl.offsetHeight || 120;
          const viewportW = window.innerWidth;
          const viewportH = window.innerHeight;

          // clamp horizontally
          if (left + ttWidth > viewportW - 10) left = viewportW - ttWidth - 10;
          if (left < 10) left = 10;

          // clamp vertically so it doesn't go off top/bottom (basic clamp)
          if (top + ttHeight > viewportH - 10) top = viewportH - ttHeight - 10;
          if (top < 10) top = 10;

          tooltipEl.style.opacity = 1;
          tooltipEl.style.position = 'absolute';
          tooltipEl.style.left = left + 'px';
          tooltipEl.style.top = top + 'px';
          tooltipEl.style.pointerEvents = 'auto';

          // apply visual styling
          Object.assign(tooltipEl.style, {
            background: tooltipStyle.background,
            color: tooltipStyle.color,
            border: tooltipStyle.border,
            boxShadow: tooltipStyle.boxShadow,
            borderRadius: tooltipStyle.borderRadius,
            padding: tooltipStyle.padding,
            fontSize: tooltipStyle.fontSize,
            lineHeight: tooltipStyle.lineHeight,
            maxWidth: tooltipStyle.maxWidth,
            cursor: tooltipStyle.cursor,
            zIndex: tooltipStyle.zIndex,
            transition: tooltipStyle.transition || '',
          });
        },
      },
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: {
          color: '#ffffff',
          font: { size: 12 },
          maxRotation: 0,
          minRotation: 0,
        },
        grid: { color: '#374151' },
        offset: true,
      },
      y: {
        ticks: { color: '#ffffff', font: { size: 12 } },
        grid: { color: '#374151' },
        suggestedMin: 0,
        suggestedMax: 10,
      },
    },
  };

  return (
    <div style={{ backgroundColor: '#2d2d2d', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', height: '400px' }}>
      <div style={{ marginBottom: '1rem' }}>
        {/* <h3 className='text-center' style={{ fontSize: '1.25rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.25rem' }}>Track your interview performance over time</h3> */}
        <p className='text-center' style={{ color: '#9ca3af', fontSize: '1.25rem', margin: 0 }}>Track your interview performance over time</p>
      </div>
      <div style={{ height: '90%', width: '100%' }}>
        {/* pass ref so we can read chart instance for clicks */}
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
};

export default ProgressChart;
