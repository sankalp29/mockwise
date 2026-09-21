import { useState, useContext } from 'react';
import { Modal, FloatingLabel, Form, Button, Alert } from 'react-bootstrap';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import { validateEmail } from '../utils/validation';
import '../styles/Home.css';
import '../styles/LoginModal.css';

function ForgotPasswordModal({ show, onHide, switchToLogin }) {
    const { resetPassword } = useContext(SupabaseAuthContext);
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [variant, setVariant] = useState('info');
    const [emailSent, setEmailSent] = useState(false);

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        setErrors((prev) => ({
            ...prev,
            email: validateEmail(value),
        }));
    };

    const handleResetPassword = async () => {
        const emailErr = validateEmail(email);

        if (emailErr) {
            setErrors({ email: emailErr });
            return;
        }

        try {
            setLoading(true);
            setMessage('');
            
            const { error } = await resetPassword(email.trim());
            
            if (error) {
                setVariant('danger');
                setMessage(error.message);
            } else {
                setVariant('success');
                setMessage('Password reset email sent! Please check your inbox and follow the instructions.');
                setEmailSent(true);
                setEmail('');
                setErrors({});
            }
        } catch (_err) {
            setVariant('danger');
            setMessage('Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setErrors({});
        setMessage('');
        setEmailSent(false);
        setLoading(false);
        onHide();
    };

    if (emailSent) {
        return (
            <Modal show={show} onHide={handleClose} size="md" className="login-signup-modal" centered>
                <Modal.Header closeButton>
                    <div className="w-100 d-flex justify-content-center">
                        <Modal.Title className="text-white">Check Your Email</Modal.Title>
                    </div>
                </Modal.Header>
                <Modal.Body className="text-center">
                    <h5 className="text-white mb-3">Reset Link Sent</h5>
                    <p className="text-white-50 mb-4">
                        We've sent a password reset link to your email. 
                        Please check your inbox and follow the instructions to reset your password.
                    </p>
                    <div className="d-flex gap-2 justify-content-center">
                        <Button variant="primary" onClick={handleClose} className="fw-bold">
                            Close
                        </Button>
                        <Button variant="success" onClick={switchToLogin} className="fw-bold">
                            Back to Sign In
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>
        );
    }

    return (
        <Modal show={show} onHide={handleClose} size="md" className="login-signup-modal" centered>
            <Modal.Header closeButton className="position-relative">
                <div className="w-100 text-center">
                    <Modal.Title>
                        <h4 className="text-white mb-0">Reset Your Password</h4>
                    </Modal.Title>
                </div>
            </Modal.Header>
            <Modal.Body>
                {message && (
                    <Alert variant={variant} className="mb-3">{message}</Alert>
                )}

                <p className="text-white mb-4">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                <div className="mb-4">
                    <FloatingLabel controlId="floatingEmail" label="Email address" className="mb-3">
                        <Form.Control
                            type="email"
                            placeholder=""
                            value={email}
                            onChange={handleEmailChange}
                            isInvalid={!!errors.email}
                            className={errors.email ? 'is-invalid no-icon' : ''}
                        />
                        {errors.email && (
                            <div className="invalid-feedback d-block">{errors.email}</div>
                        )}
                    </FloatingLabel>

                    <div className="d-flex gap-2">
                        <Button 
                            variant="danger" 
                            className="flex-fill fw-bold"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="success" 
                            className="flex-fill fw-bold"
                            onClick={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </div>
                </div>

                <div className="text-center">
                    <div className="text-white">
                        Remember your password?{' '}
                        <Button variant="link" className="signin-link p-0" onClick={switchToLogin}>
                            Sign in
                        </Button>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default ForgotPasswordModal;
