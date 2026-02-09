// ============================================================================
// API Service
// ============================================================================

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// ============================================================================
// Configuration
// ============================================================================

// Use relative path in production (nginx proxies /api), absolute URL in development
const API_BASE_URL = import.meta.env.PROD 
  ? '' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

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

interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRetry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig;

    // Handle 401 errors - only retry if not already retried and not the refresh endpoint
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRetry
    ) {
      originalRequest._retry = true;

      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          // Mark refresh request to prevent infinite loop
          const refreshConfig = {
            ...originalRequest,
            _skipAuthRetry: true,
          } as AxiosRequestConfig;
          const response = await api.post<{ accessToken: string; refreshToken: string }>(
            '/auth/refresh',
            { refreshToken },
            refreshConfig
          );
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          // Update both tokens
          localStorage.setItem('auth_token', accessToken);
          localStorage.setItem('refresh_token', newRefreshToken);
          
          // Update original request headers
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
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
    api.get<T>(url, config).then((res: AxiosResponse<T>) => res.data),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then((res: AxiosResponse<T>) => res.data),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.put<T>(url, data, config).then((res: AxiosResponse<T>) => res.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then((res: AxiosResponse<T>) => res.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res: AxiosResponse<T>) => res.data),
};

// ============================================================================
// Export
// ============================================================================

export { api };
export type { AxiosError };
