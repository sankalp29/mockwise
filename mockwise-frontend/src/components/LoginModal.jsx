import { useState, useContext } from 'react';
import { Modal, FloatingLabel, Form, Button, Alert } from 'react-bootstrap';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import PasswordInput from './PasswordInput';
import { validateEmail, validatePassword } from '../utils/validation';
import '../styles/Home.css';
import '../styles/LoginModal.css';

function LoginModal({ show, onHide, switchToSignup, switchToForgotPassword }) {
    const { signIn, signInWithGoogle, resendVerificationEmail } = useContext(SupabaseAuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showResendVerification, setShowResendVerification] = useState(false);
    const [resendingVerification, setResendingVerification] = useState(false);

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        setErrors((prev) => ({
            ...prev,
            email: validateEmail(value),
        }));
    };

    const handlePasswordChange = (value) => {
        setPassword(value);
        setErrors((prev) => ({
            ...prev,
            password: validatePassword(value),
        }));
    };

    const handleLogin = async () => {
        const emailErr = validateEmail(email);
        const passwordErr = validatePassword(password);

        const newErrors = {
            ...(emailErr && { email: emailErr }),
            ...(passwordErr && { password: passwordErr }),
        };

        setErrors(newErrors);

        if (Object.keys(newErrors).length !== 0) return;

        try {
            setLoading(true);
            setMessage('');
            
            const { error } = await signIn(email.trim(), password);
            
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    setErrors({ password: 'Invalid email or password' });
                } else if (error.message.includes('Email not confirmed')) {
                    setErrors({ email: 'Please verify your email before signing in' });
                    setShowResendVerification(true);
                } else {
                    setErrors({ email: error.message });
                }
            } else {
                // Success - close modal
                setEmail('');
                setPassword('');
                setErrors({});
                setShowResendVerification(false);
                onHide();
            }
        } catch (_err) {
            setErrors({ email: 'Login failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const { error } = await signInWithGoogle();
            if (error) {
                setMessage(error.message);
            } else {
                onHide();
            }
        } catch (_err) {
            setMessage('Google login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        if (switchToForgotPassword) {
            switchToForgotPassword();
        }
    };

    const handleResendVerification = async () => {
        if (!email.trim()) {
            setErrors({ email: 'Please enter your email address' });
            return;
        }

        try {
            setResendingVerification(true);
            const { error } = await resendVerificationEmail(email.trim());
            
            if (error) {
                setMessage(`Failed to resend verification email: ${error.message}`);
            } else {
                setMessage('Verification email sent! Please check your inbox.');
                setShowResendVerification(false);
                setErrors({});
            }
        } catch (_err) {
            setMessage('Failed to resend verification email. Please try again.');
        } finally {
            setResendingVerification(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="md" aria-labelledby="contained-modal-title-vcenter" className="login-signup-modal" centered>
            <Modal.Header closeButton className="position-relative">
                <div className="w-100 text-center">
                    <Modal.Title>
                        <h2 className="text-white mb-2">
                            Welcome to <span className="mockwise-gradient">MockWise</span>
                        </h2>
                    </Modal.Title>
                </div>
            </Modal.Header>
            <Modal.Body>
                {message && (
                    <Alert variant="info" className="mb-3">{message}</Alert>
                )}

                <div id="signin-options" className="mt-2">
                    <div className="text-center mb-4">
                        <Button 
                            variant="outline-light" 
                            size="lg" 
                            className="w-100 d-flex align-items-center justify-content-center"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                        >
                            <svg className="me-2" width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continue with Google
                        </Button>
                    </div>
                </div>

                <div className="d-flex align-items-center my-3">
                    <hr className="flex-grow-1 text-white" />
                    <div className="px-2 text-white">or</div>
                    <hr className="flex-grow-1 text-white" />
                </div>

                <div className="mb-3">
                    <FloatingLabel controlId="floatingInput" label="Email address" className="mb-3">
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

                    <PasswordInput
                        label="Password"
                        id="floatingInputPassword"
                        value={password}
                        onChange={handlePasswordChange}
                        errorMsg={errors.password}
                    />

                    <div className="mb-3">
                        <Button variant="button" type="button" className="forgot-password" onClick={handleForgotPassword}>
                            Forgot password?
                        </Button>
                    </div>

                    {showResendVerification && (
                        <div className="mb-3 text-center">
                            <p className="text-warning small mb-2">
                                Your email is not verified. Please check your inbox or resend the verification email.
                            </p>
                            <Button 
                                variant="outline-warning" 
                                size="sm"
                                onClick={handleResendVerification}
                                disabled={resendingVerification}
                            >
                                {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
                            </Button>
                        </div>
                    )}

                    <div className="d-flex justify-content-center">
                        <Button 
                            variant="success" 
                            size="lg" 
                            className="fw-bold w-100"
                            onClick={handleLogin}
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </div>
                </div>

                <div className="d-flex justify-content-center">
                    <div className="text-white">
                        Don't have an account?
                        <Button variant="button" className="signup align-baseline" onClick={switchToSignup}>
                            Sign up
                        </Button>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default LoginModal;
