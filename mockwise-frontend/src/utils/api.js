// API configuration utility
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Dashboard
  DASHBOARD_METRICS: '/api/dashboard/metrics',
  DASHBOARD_PROGRESS: '/api/dashboard/progress',

  // Interview
  INTERVIEW_START: '/api/interview/start',
  INTERVIEW_ONGOING: '/api/interview/ongoing',
  INTERVIEW_QUESTIONS: '/api/interview/questions',
  INTERVIEW_BASE: '/api/interview',
  INTERVIEW_SYNTAX_CHECK: '/api/interview/check-syntax',
  INTERVIEW_OPTIMAL_CODE: '/api/interview/optimal-code'
};
