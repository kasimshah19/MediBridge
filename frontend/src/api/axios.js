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

// Response interceptor: on 401 redirect to login unless it's the initial bootstrap call
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthBootstrap = error.config?.url?.includes('/auth/me');
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    const isRegisterEndpoint = error.config?.url?.includes('/auth/register');

    if (
      error.response?.status === 401 &&
      !isAuthBootstrap &&
      !isLoginEndpoint &&
      !isRegisterEndpoint
    ) {
      // Clear any client state and redirect if needed
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
