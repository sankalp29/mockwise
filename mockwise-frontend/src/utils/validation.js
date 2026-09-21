/**
 * Utility functions for form validation
 */

/**
 * Validates email format using regex
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * Validates email field with error messages
 * @param {string} email - Email to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validateEmail = (email) => {
    if (!email.trim()) {
        return 'Email is required';
    } else if (!isValidEmail(email)) {
        return 'Invalid email format';
    }
    return '';
};

/**
 * Validates password field with error messages
 * @param {string} password - Password to validate
 * @returns {string} - Error message or empty string if valid
 */
export const validatePassword = (password) => {
    if (!password.length) {
        return 'Password is required';
    } else if (password.length < 8) {
        return 'Password should have at least 8 characters';
    }
    return '';
};

/**
 * Validates password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Password confirmation
 * @returns {string} - Error message or empty string if valid
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
    if (confirmPassword !== password) {
        return 'Passwords do not match';
    }
    return '';
};
