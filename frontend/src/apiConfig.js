const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (isProduction
    ? `${window.location.origin}/_/backend`
    : 'http://localhost:5000');
