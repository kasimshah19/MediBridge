import axios from 'axios';

/**
 * Global Axios instance configured with API baseURL and cookie credentials.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor placeholder (Phase 1: handling 401 unauthenticated redirects)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Phase 1: auto redirect or refresh token on 401
    return Promise.reject(error);
  }
);

export default api;

