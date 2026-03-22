/**
 * API Client - SmartPay Mobile
 * Centralized HTTP client with interceptors for auth, error handling, and logging
 * Location: mobile/services/api.ts
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { getSecureItem, setSecureItem, deleteSecureItem, getAccessTokenKey } from './secureStorage';
import { ApiError, ApiResponse } from '../types/api';
import NetInfo from '@react-native-community/netinfo';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';
const REFRESH_TOKEN_KEY = 'smartpay_refresh_token';

// ============================================================================
// ERROR TYPES
// ============================================================================

export class NetworkError extends Error {
  constructor(message: string = 'Network connection unavailable') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string = 'Too many requests',
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// AXIOS INSTANCE
// ============================================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR - Add JWT token and logging
// ============================================================================

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add JWT token if available (same key as SupabaseAuthContext / auth.ts setTokens)
    const token = await getSecureItem(getAccessTokenKey());
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracing
    if (config.headers) {
      config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Log requests in development
    if (__DEV__) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR - Handle errors and token refresh
// ============================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (__DEV__) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Log errors in development
    if (__DEV__) {
      console.error('[API Response Error]', {
        url: originalRequest?.url,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // Handle network errors
    if (!error.response) {
      throw new NetworkError('Network request failed. Please check your connection.');
    }

    const status = error.response.status;
    const errorData = error.response.data as { error?: ApiError; message?: string };

    // Handle 401 Unauthorized - Try to refresh token
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while token is being refreshed
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await getSecureItem(REFRESH_TOKEN_KEY);
        
        if (!refreshToken) {
          throw new UnauthorizedError('No refresh token available');
        }

        // Refresh the token (backend: /api/v1/auth/refresh)
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data;

        // Store new token (same key as SupabaseAuthContext so all auth flows work)
        await setSecureItem(getAccessTokenKey(), accessToken);

        // Update axios default header
        if (apiClient.defaults.headers.common) {
          apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        }

        // Retry queued requests
        processQueue(null, accessToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear session and redirect to login
        processQueue(refreshError as Error, null);
        await clearSession();
        throw new UnauthorizedError('Session expired. Please sign in again.');
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 429 Rate Limit
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      throw new RateLimitError(
        errorData?.error?.message || 'Too many requests. Please try again later.',
        retryAfterMs
      );
    }

    // Handle 400 Validation Error
    if (status === 400) {
      throw new ValidationError(
        errorData?.error?.message || errorData?.message || 'Invalid request',
        errorData?.error?.details
      );
    }

    // Handle other errors
    const errorMessage = errorData?.error?.message || errorData?.message || 'An error occurred';
    throw new Error(errorMessage);
  }
);

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

export async function clearSession(): Promise<void> {
  await deleteSecureItem(getAccessTokenKey());
  await deleteSecureItem(REFRESH_TOKEN_KEY);
  await deleteSecureItem('smartpay_token_expires_at');
}

export async function getStoredToken(): Promise<string | null> {
  return await getSecureItem(getAccessTokenKey());
}

export async function setTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await setSecureItem(getAccessTokenKey(), accessToken);
  if (refreshToken) {
    await setSecureItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  
  // Set expiry (4 hours from now)
  const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
  await setSecureItem('smartpay_token_expires_at', String(expiresAt));
}

// ============================================================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================================================

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx except 429)
      if (error instanceof AxiosError) {
        const status = error.response?.status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // Don't retry on auth errors
      if (error instanceof UnauthorizedError) {
        throw error;
      }

      // Calculate backoff delay
      const delay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

      if (attempt < maxRetries - 1) {
        if (__DEV__) {
          console.log(`[Retry] Attempt ${attempt + 1} failed. Retrying in ${delay + jitter}ms...`);
        }
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }

  throw lastError!;
}

// ============================================================================
// API CLIENT METHODS
// ============================================================================

// ============================================================================
// RESPONSE UNWRAPPING HELPER
// ============================================================================

/**
 * Safely unwrap API response, handling different response shapes
 * Backend may return data directly or wrapped in { data, success } object
 */
function unwrapResponse<T>(response: any): T {
  // If response has a 'data' property, unwrap it
  if (response.data !== undefined) {
    // Handle { data: { data: T } } (double-wrapped)
    if (response.data.data !== undefined) {
      return response.data.data as T;
    }
    // Handle { data: T }
    return response.data as T;
  }
  
  // Return response as-is if no wrapping detected
  return response as T;
}

export const api = {
  /**
   * GET request with retry logic
   */
  get: async <T = unknown>(
    url: string,
    config?: {
      params?: Record<string, unknown>;
      skipAuth?: boolean;
      retry?: boolean;
    }
  ): Promise<T> => {
    const request = () => apiClient.get(url, {
      params: config?.params,
    });

    const response = config?.retry !== false 
      ? await retryWithBackoff(request)
      : await request();

    return unwrapResponse<T>(response);
  },

  /**
   * POST request with retry logic
   */
  post: async <T = unknown>(
    url: string,
    data?: unknown,
    config?: {
      skipAuth?: boolean;
      retry?: boolean;
    }
  ): Promise<T> => {
    const request = () => apiClient.post(url, data);

    const response = config?.retry !== false 
      ? await retryWithBackoff(request)
      : await request();

    return unwrapResponse<T>(response);
  },

  /**
   * PATCH request
   */
  patch: async <T = unknown>(
    url: string,
    data?: unknown,
    config?: {
      skipAuth?: boolean;
    }
  ): Promise<T> => {
    const response = await apiClient.patch(url, data);
    return unwrapResponse<T>(response);
  },

  /**
   * DELETE request
   */
  delete: async <T = unknown>(
    url: string,
    config?: {
      skipAuth?: boolean;
    }
  ): Promise<T> => {
    const response = await apiClient.delete(url);
    return unwrapResponse<T>(response);
  },
};

// ============================================================================
// NETWORK STATUS
// ============================================================================

export async function checkNetworkStatus(): Promise<{
  isConnected: boolean;
  type: string | null;
}> {
  const netInfo = await NetInfo.fetch();
  return {
    isConnected: netInfo.isConnected ?? false,
    type: netInfo.type,
  };
}

export default apiClient;
