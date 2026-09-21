import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../styles/AppStatus.css';

/**
 * Shown for unknown routes (Route path="*").
 */
function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="app-status-page">
      <div className="app-status-card" role="status">
        <div className="app-status-icon" aria-hidden="true">
          404
        </div>
        <div className="app-status-brand">MockWise</div>
        <h1 className="app-status-title">Page not found</h1>
        <p className="app-status-body">
          That URL does not match any page in the app. Check the link or head back home.
        </p>
        <p className="app-status-hint">
          If you followed a bookmark, the path may have moved.
        </p>
        <div className="app-status-actions">
          <Button variant="success" onClick={() => navigate('/home')}>
            Go home
          </Button>
          <Button variant="outline-light" onClick={() => navigate('/practice/coding')}>
            Practice
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
