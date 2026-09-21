import { useState, useContext } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import PasswordInput from '../components/PasswordInput';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { logger } from '../utils/logger';

function ResetPasswordModal({ show, onHide }) {
  const { updatePassword, signOut } = useContext(SupabaseAuthContext);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [serverVariant, setServerVariant] = useState('info');

  const validate = () => {
    const newErrors = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password should have at least 8 characters';
    }

    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setServerMessage('');
    if (!validate()) return;
    try {
      setSubmitting(true);
      const { error } = await updatePassword(password);
      
      if (error) {
        setServerVariant('danger');
        setServerMessage(error.message || 'Failed to reset password. Please try again.');
      } else {
        setServerVariant('success');
        setServerMessage('Password has been reset successfully. You will be redirected to login.');
        // Close modal and redirect to login after success
        setTimeout(async () => {
          if (onHide) onHide();
          // Sign out the user and redirect to login
          try {
            await signOut();
            window.dispatchEvent(new Event('open-login-modal'));
          } catch (signOutError) {
            logger.error('Sign out error:', signOutError);
          }
        }, 2500);
      }
    } catch (_err) {
      setServerVariant('danger');
      setServerMessage('Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="md" aria-labelledby="reset-password-modal" className="login-signup-modal" centered>
      <Modal.Header closeButton className="position-relative">
        <div className="w-100 text-center">
          <Modal.Title>
            <h4 className="text-white mb-0">Set a new password</h4>
          </Modal.Title>
        </div>
      </Modal.Header>
      <Modal.Body>
        {serverMessage && (
          <Alert variant={serverVariant} className="mb-3">{serverMessage}</Alert>
        )}

        <PasswordInput
          label="New password"
          id="resetPassword"
          value={password}
          onChange={(val) => {
            setPassword(val);
            // live-validate password
            setErrors((prev) => ({
              ...prev,
              password: !val ? 'Password is required' : (val.length < 8 ? 'Password should have at least 8 characters' : ''),
              confirmPassword: confirmPassword && confirmPassword !== val ? 'Passwords do not match' : '',
            }));
          }}
          errorMsg={errors.password}
        />

        <PasswordInput
          label="Confirm new password"
          id="resetConfirmPassword"
          value={confirmPassword}
          onChange={(val) => {
            setConfirmPassword(val);
            setErrors((prev) => ({
              ...prev,
              confirmPassword: val === password ? '' : 'Passwords do not match',
            }));
          }}
          errorMsg={errors.confirmPassword}
        />

        <div className="d-flex justify-content-center gap-2 mt-3">
          <Button variant="danger" onClick={onHide} disabled={submitting} className="fw-bold">Cancel</Button>
          <Button variant="success" onClick={handleSubmit} disabled={submitting} className="text-white fw-bold">
            {submitting && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className='me-2' />}
            {submitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
}

export default ResetPasswordModal;


