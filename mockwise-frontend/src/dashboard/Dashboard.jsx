import KeyMetrics from './KeyMetrics';
import InterviewHistory from './InterviewHistory';
import ErrorBoundary from '../components/ErrorBoundary';
import '../styles/DashboardEmpty.css';

function Dashboard() {
  return (
    <ErrorBoundary>
      <div className="dashboard-page">
        <header className="dashboard-hero">
          <h1 className="dashboard-hero-title">Your Progress</h1>
          <p className="dashboard-hero-subtitle">
            Track scores, time invested, and past mocks — all in one place.
          </p>
        </header>

        <ErrorBoundary>
          <KeyMetrics />
        </ErrorBoundary>
        <ErrorBoundary>
          <InterviewHistory />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

export default Dashboard;
