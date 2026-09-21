import { Suspense, lazy, useContext } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SupabaseAuthContext } from './SupabaseAuthContext';
import Header from './Header';
import Home from './home/Home';
import RouteFallback from './components/RouteFallback';
import { AUTH_BYPASS } from './utils/authBypass';

// Heavy routes: load on demand so /home is not paying for Monaco/dashboard/feedback
const CustomizeYourInterview = lazy(() => import('./CustomizeYourInterview'));
const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const InterviewSession = lazy(() => import('./interview/InterviewSession'));
const InterviewLoader = lazy(() => import('./interview/InterviewLoader'));
const InterviewFeedback = lazy(() => import('./interview/InterviewFeedback'));
const DemoFeedback = lazy(() => import('./interview/DemoFeedback'));
const FeedbackLoader = lazy(() => import('./interview/FeedbackLoader'));
const CodeViewer = lazy(() => import('./interview/CodeViewer'));
const ResetPasswordRoute = lazy(() => import('./login/ResetPasswordRoute'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PracticeEntryRedirect() {
  return <Navigate to="/practice/coding" replace />;
}

/**
 * Auth gate for protected routes. Module-scoped so the component type is stable.
 */
function ProtectedRoute({ element, isAuthLoading, userLoggedIn, returnTo }) {
  if (AUTH_BYPASS) {
    return element;
  }
  if (isAuthLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  if (!userLoggedIn) {
    sessionStorage.setItem('returnTo', returnTo);
    return <Navigate to="/home" replace />;
  }
  return element;
}

function RouteHandler({ showToast }) {
  const { user, loading } = useContext(SupabaseAuthContext);
  const userLoggedIn = AUTH_BYPASS || !!user;
  const isAuthLoading = AUTH_BYPASS ? false : loading;
  const location = useLocation();
  const hideChrome =
    location.pathname.startsWith('/interview/session') ||
    location.pathname.startsWith('/interview/code');
  const returnTo = location.pathname + location.search + location.hash;

  const guard = (element) => (
    <ProtectedRoute
      element={element}
      isAuthLoading={isAuthLoading}
      userLoggedIn={userLoggedIn}
      returnTo={returnTo}
    />
  );

  return (
    <>
      {!hideChrome && <Header userLoggedIn={userLoggedIn} showToast={showToast} />}

      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/reset-password" element={<ResetPasswordRoute />} />
          <Route path="/interview/start" element={guard(<InterviewLoader />)} />
          <Route path="/interview/session/:interviewId" element={guard(<InterviewSession />)} />
          <Route path="/interview/recover/:interviewId" element={guard(<InterviewLoader />)} />
          <Route path="/interview/feedback/demo" element={guard(<DemoFeedback />)} />
          <Route
            path="/interview/feedback/:interviewId/loading"
            element={guard(<FeedbackLoader />)}
          />
          <Route path="/interview/feedback/:interviewId" element={guard(<InterviewFeedback />)} />
          <Route
            path="/interview/code/:interviewId/:submissionId/:codeType"
            element={guard(<CodeViewer />)}
          />
          <Route path="/practice" element={<PracticeEntryRedirect />} />
          <Route path="/practice/:interviewType" element={<CustomizeYourInterview />} />
          <Route path="/dashboard" element={guard(<Dashboard />)} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default RouteHandler;
