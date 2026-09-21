import { useState } from 'react';
import { Form, FloatingLabel } from 'react-bootstrap';

function PasswordInput({ label, id, value, onChange, errorMsg }) {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const isInvalid = !!errorMsg;

    return (
        <FloatingLabel controlId={id} label={label} className="mb-3 position-relative">
            <Form.Control
                type={showPassword ? 'text' : 'password'}
                placeholder=""
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`pe-5 ${isInvalid ? '' : ''}`}
                style={{ paddingRight: '3rem' }}
            />
            {isInvalid && (
                <div className="invalid-feedback d-block">{errorMsg}</div>
            )}
            <span
                onClick={togglePasswordVisibility}
                style={{
                    position: 'absolute',
                    top: isInvalid ? '35%' : '50%',
                    right: '1rem',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off w-5 h-5 text-gray-400">
                        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                        <path d="m2 2 20 20" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye w-5 h-5 text-gray-400">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                )}
            </span>
        </FloatingLabel>
    );
}

export default PasswordInput;
