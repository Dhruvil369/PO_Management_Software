// Central API config for frontend
const apiUrl = import.meta.env.VITE_API_URL;

// Debug logging
console.log('Environment API URL:', apiUrl);

// Fallback to localhost if environment variable is not set
export const API_BASE_URL = apiUrl ? `${apiUrl}/api` : 'http://localhost:5000/api';
export const UPLOADS_BASE_URL = apiUrl ? `${apiUrl}/uploads` : 'http://localhost:5000/uploads';

// Debug logging
console.log('Final API_BASE_URL:', API_BASE_URL);
console.log('Final UPLOADS_BASE_URL:', UPLOADS_BASE_URL);