// ============================================================================
// API Service
// ============================================================================

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// ============================================================================
// Configuration
// ============================================================================

// Use relative path in production (nginx proxies /api), absolute URL in development
const API_BASE_URL = import.meta.env.PROD 
  ? '' 
  : import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ============================================================================
// API Client Creation
// ============================================================================

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ============================================================================
// Request Interceptor
// ============================================================================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// Response Interceptor
// ============================================================================

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { token } = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('auth_token', token);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        // No refresh token, logout
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// HTTP Methods
// ============================================================================

export const http = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then(res => res.data),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then(res => res.data),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.put<T>(url, data, config).then(res => res.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then(res => res.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then(res => res.data),
};

// ============================================================================
// Export
// ============================================================================

export { api };
export type { AxiosError };
