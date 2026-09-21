import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ResetPasswordModal from './ResetPasswordModal';
import { Button } from 'react-bootstrap';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

function ResetPasswordRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | valid | invalid | error

  useEffect(() => {
    // Handle Supabase auth redirect
    const handleAuthRedirect = async () => {
      try {
        if (!isSupabaseConfigured || !supabase) {
          setStatus('error');
          return;
        }

        // Check if we have access_token and refresh_token in URL
        const access_token = searchParams.get('access_token');
        const refresh_token = searchParams.get('refresh_token');
        const type = searchParams.get('type');

        // Also check URL hash for parameters (Supabase sometimes uses fragments)
        const hash = window.location.hash.substring(1);
        let hashParams = {};
        if (hash) {
          hashParams = new URLSearchParams(hash);
        }

        // Get tokens from either search params or hash
        const finalAccessToken = access_token || hashParams.get('access_token');
        const finalRefreshToken = refresh_token || hashParams.get('refresh_token');
        const finalType = type || hashParams.get('type');

        // Try different approaches based on what parameters we have
        if (finalType === 'recovery' && finalAccessToken && finalRefreshToken) {
          // Set the session with the tokens from URL
          const { error } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken,
          });

          if (error) {
            setStatus('invalid');
          } else {
            setStatus('valid');
          }
        } else if (finalType === 'recovery') {
          // Sometimes Supabase handles the session automatically
          // Check if we already have a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus('valid');
          } else {
            setStatus('invalid');
          }
        } else if (finalAccessToken) {
          // Try with just access token
          const { error } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken || '',
          });
          
          if (error) {
            setStatus('invalid');
          } else {
            setStatus('valid');
          }
        } else {
          setStatus('invalid');
        }
      } catch (err) {
        logger.error('Auth redirect error:', err);
        setStatus('error');
      }
    };

    handleAuthRedirect();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
        <div className="text-center text-white">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div>Checking your reset link...</div>
        </div>
      </div>
    );
  }

  if (status === 'valid') {
    return <ResetPasswordModal show={true} onHide={() => navigate('/home')} />;
  }

  const messageByStatus = {
    invalid: 'This reset link is invalid or has expired. Please request a new one.',
    error: 'Could not validate the reset link. Please try again.',
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '40vh' }}>
      <div className="text-center text-white">
        <div className="mb-2">{messageByStatus[status] || messageByStatus.error}</div>
        <Button variant='success' className="btn btn-primary me-3" onClick={() => navigate('/home')}>Home</Button>
        <Button className="btn btn-secondary" onClick={() => window.dispatchEvent(new Event('open-forgot-password-modal'))}>Request new link</Button>
      </div>
    </div>
  );
}

export default ResetPasswordRoute;


