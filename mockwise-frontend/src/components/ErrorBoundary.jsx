import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { logger } from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Container fluid className="py-4">
          <Alert variant="danger" className="text-center">
            <Alert.Heading>Something went wrong</Alert.Heading>
            <p className="mb-3">
              An unexpected error occurred. You can try again or reload the page.
            </p>
            <div className="mb-3 d-flex gap-2 justify-content-center flex-wrap">
              <Button variant="outline-danger" onClick={this.handleRetry}>
                Try again
              </Button>
              <Button variant="outline-light" onClick={() => { window.location.href = '/home'; }}>
                Go home
              </Button>
            </div>
            {import.meta.env.DEV && (
              <details className="text-start">
                <summary>Error details (development only)</summary>
                <pre className="mt-2" style={{ fontSize: '0.8rem', color: '#666' }}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
