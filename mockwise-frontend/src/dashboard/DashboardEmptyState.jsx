import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FileText, History, AlertCircle } from 'lucide-react';
import '../styles/DashboardEmpty.css';

const ICONS = {
  metrics: FileText,
  history: History,
  error: AlertCircle,
};

/**
 * Themed empty / soft-error panel used across dashboard sections.
 */
function DashboardEmptyState({
  variant = 'metrics', // metrics | history | error
  title,
  body,
  hint,
  primaryLabel = 'Start a mock interview',
  primaryPath = '/practice/coding',
  secondaryLabel = null,
  secondaryPath = '/home',
  onPrimary = null,
}) {
  const navigate = useNavigate();
  const Icon = ICONS[variant] || FileText;
  const isError = variant === 'error';

  const handlePrimary = () => {
    if (onPrimary) {
      onPrimary();
      return;
    }
    navigate(primaryPath);
  };

  return (
    <div className={`dashboard-empty-card${isError ? ' is-error' : ''}`} role="status">
      <div className="dashboard-empty-icon" aria-hidden="true">
        <Icon size={32} strokeWidth={1.75} />
      </div>
      <h2 className="dashboard-empty-title">{title}</h2>
      {body ? <p className="dashboard-empty-body">{body}</p> : null}
      {hint ? <p className="dashboard-empty-hint">{hint}</p> : null}
      <div className="dashboard-empty-actions">
        <Button variant="success" onClick={handlePrimary}>
          {primaryLabel}
        </Button>
        {secondaryLabel ? (
          <Button variant="outline-light" onClick={() => navigate(secondaryPath)}>
            {secondaryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default DashboardEmptyState;
