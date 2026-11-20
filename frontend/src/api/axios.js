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
  timeout: 45000, // 45 seconds for cold start resilience
});

// Response interceptor: on 401 redirect to login; handle 502/503 cold start retry
api.interceptors.response.use(
  (response) => {
    // Notify window that server is healthy/responsive
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('server-ready'));
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    // Handle Render cold start (502 Bad Gateway / 503 Service Unavailable / 504 Gateway Timeout)
    const isColdStart =
      error.response?.status === 502 ||
      error.response?.status === 503 ||
      error.response?.status === 504 ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error');

    if (isColdStart && !config?._isRetry) {
      config._isRetry = true;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('server-waking', {
            detail: { message: 'Connecting to MediBridge API. Cloud server may be waking up...' },
          })
        );
      }
      // Wait 4 seconds before retrying
      await new Promise((r) => setTimeout(r, 4000));
      return api(config);
    }

    // Handle 429 Rate Limiting
    if (error.response?.status === 429) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('api-rate-limited', {
            detail: { message: error.response?.data?.message || 'Rate limit exceeded. Please wait a moment.' },
          })
        );
      }
    }

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
