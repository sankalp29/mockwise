import { useState, useContext, useEffect } from 'react';
import { Modal, FloatingLabel, Form, Button, Alert } from 'react-bootstrap';
import { SupabaseAuthContext } from '../SupabaseAuthContext';
import PasswordInput from './PasswordInput';
import { validateEmail, validatePassword, validatePasswordConfirmation } from '../utils/validation';
import '../styles/Home.css';
import '../styles/LoginModal.css';

function SignupModal({ show, onHide, switchToLogin }) {
    const { signUp, signInWithGoogle } = useContext(SupabaseAuthContext);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [signupSuccess, setSignupSuccess] = useState(false);
    // Ensure stale success state doesn't persist between opens
    useEffect(() => {
        if (show) {
            setSignupSuccess(false);
            // do not clear form here; just ensure we don't render success modal by default
        }
    }, [show]);

    const handleModalHide = () => {
        setSignupSuccess(false);
        setMessage('');
        setErrors({});
        onHide && onHide();
    };


    const validateName = (name) => {
        if (!name.trim()) {
            return 'Name is required';
        }
        return '';
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Live validation
        let error = '';
        switch (field) {
            case 'name':
                error = validateName(value);
                break;
            case 'email':
                error = validateEmail(value);
                break;
            case 'password':
                error = validatePassword(value);
                // Also check confirm password if it exists
                if (formData.confirmPassword && !error) {
                    setErrors(prev => ({
                        ...prev,
                        confirmPassword: validatePasswordConfirmation(value, formData.confirmPassword)
                    }));
                }
                break;
            case 'confirmPassword':
                error = validatePasswordConfirmation(formData.password, value);
                break;
            default:
                break;
        }
        
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const handleSignup = async () => {
        const nameErr = validateName(formData.name);
        const emailErr = validateEmail(formData.email);
        const passwordErr = validatePassword(formData.password);
        const confirmPasswordErr = validatePasswordConfirmation(formData.password, formData.confirmPassword);

        const newErrors = {
            ...(nameErr && { name: nameErr }),
            ...(emailErr && { email: emailErr }),
            ...(passwordErr && { password: passwordErr }),
            ...(confirmPasswordErr && { confirmPassword: confirmPasswordErr }),
        };

        setErrors(newErrors);

        if (Object.keys(newErrors).length !== 0) return;

        try {
            setLoading(true);
            setMessage('');
            
            const { data, error } = await signUp(formData.email.trim(), formData.password, {
                data: {
                    full_name: formData.name.trim()
                }
            });

            // Supabase nuance: duplicate email can return 200 with user.identities = []
            if (!error && data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                setErrors({ email: 'This email is already registered. Please sign in instead.' });
                setSignupSuccess(false);
                return;
            }
            
            if (error) {
                if (error.status === 422 || (error.message && error.message.includes('User already registered'))) {
                    setErrors({ email: 'This email is already registered. Please sign in instead.' });
                    setSignupSuccess(false);
                    return;
                }
                setErrors({ email: error.message || 'Signup failed.' });
                setSignupSuccess(false);
                return;
            } else {
                setSignupSuccess(true);
                setEmail(formData.email.trim());
                setMessage('Success! Please check your email for a verification link before signing in.');
                // Clear form
                setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                setErrors({});
            }
        } catch (_err) {
            setErrors({ email: 'Signup failed. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setLoading(true);
            const { error } = await signInWithGoogle();
            if (error) {
                setMessage(error.message);
            } else {
                onHide();
            }
        } catch (_err) {
            setMessage('Google signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (signupSuccess) {
        return (
            <Modal show={show} onHide={handleModalHide} size="md" centered className='login-signup-modal'>
                <Modal.Header closeButton>
                    <Modal.Title className="text-white" style={{ textAlign: 'center', width: '100%' }}>Check Your Email</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    <h5 className="text-white mb-3">Verify Your Email</h5>
                    <p className="text-white mb-4">
                        We've sent a verification link to <strong className="text-white">{email}</strong>. 
                        Please click the link in your email to verify your account.
                    </p>
                    <Button variant="success" onClick={switchToLogin} className="fw-bold">
                        Go to Sign In
                    </Button>
                </Modal.Body>
            </Modal>
        );
    }

    return (
        <Modal show={show} onHide={handleModalHide} size="md" aria-labelledby="contained-modal-title-vcenter" className="login-signup-modal" centered>
            <Modal.Header closeButton className="position-relative">
                <div className="w-100 text-center">
                    <Modal.Title>
                        <h2 className="text-white mb-2">
                            Join <span className="mockwise-gradient">MockWise</span>
                        </h2>
                    </Modal.Title>
                </div>
            </Modal.Header>
            <Modal.Body>
                {message && (
                    <Alert variant="info" className="mb-3">{message}</Alert>
                )}

                <div id="signup-options" className="mt-2">
                    <div className="text-center mb-4">
                        <Button 
                            variant="outline-light" 
                            size="lg" 
                            className="w-100 d-flex align-items-center justify-content-center"
                            onClick={handleGoogleSignup}
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
                    <FloatingLabel controlId="floatingName" label="Full Name" className="mb-3">
                        <Form.Control
                            type="text"
                            placeholder=""
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            isInvalid={!!errors.name}
                            className={errors.name ? 'is-invalid no-icon' : ''}
                        />
                        {errors.name && (
                            <div className="invalid-feedback d-block">{errors.name}</div>
                        )}
                    </FloatingLabel>

                    <FloatingLabel controlId="floatingEmail" label="Email address" className="mb-3">
                        <Form.Control
                            type="email"
                            placeholder=""
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            isInvalid={!!errors.email}
                            className={errors.email ? 'is-invalid no-icon' : ''}
                        />
                        {errors.email && (
                            <div className="invalid-feedback d-block">{errors.email}</div>
                        )}
                    </FloatingLabel>

                    <PasswordInput
                        label="Password"
                        id="floatingPassword"
                        value={formData.password}
                        onChange={(value) => handleInputChange('password', value)}
                        errorMsg={errors.password}
                        placeholder=""
                    />

                    <PasswordInput
                        label="Confirm Password"
                        id="floatingConfirmPassword"
                        value={formData.confirmPassword}
                        onChange={(value) => handleInputChange('confirmPassword', value)}
                        errorMsg={errors.confirmPassword}
                        placeholder=""
                    />

                    <div className="d-flex justify-content-center">
                        <Button 
                            variant="success" 
                            size="lg" 
                            className="fw-bold w-100"
                            onClick={handleSignup}
                            disabled={loading}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </div>
                </div>

                <div className="d-flex justify-content-center">
                    <div className="text-white">
                        Already have an account?
                        <Button variant="button" className="signup align-baseline" onClick={switchToLogin}>
                            Sign in
                        </Button>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
}

export default SignupModal;
