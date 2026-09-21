import { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer, Toast } from 'react-bootstrap';
import { SupabaseAuthProvider } from './SupabaseAuthContext';
import RouteHandler from './RouteHandler';

function App() {
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  const showToast = (message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setIsToastVisible(true);
  };

  return (
    <SupabaseAuthProvider showToast={showToast}>
      <Router>
        <RouteHandler showToast={showToast} />
        <ToastContainer position="top-center" className="p-3">
          <Toast 
            onClose={() => setIsToastVisible(false)} 
            show={isToastVisible} 
            delay={1000} 
            autohide
            bg={toastVariant}
          >
            <Toast.Body className="text-white text-center fw-bold">
              {toastMessage}
            </Toast.Body>
          </Toast>
        </ToastContainer>
      </Router>
    </SupabaseAuthProvider>
  );
}

export default App;