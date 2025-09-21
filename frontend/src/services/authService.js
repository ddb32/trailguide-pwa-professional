import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost';

class AuthService {
  constructor() {
    this.baseURL = `${API_URL}/api/v1`;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        
        // Enhanced token debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 Auth Debug - Request interceptor:', {
            url: config.url,
            method: config.method?.toUpperCase(),
            hasToken: !!token,
            tokenLength: token?.length || 0,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'None'
          });
        }
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn('⚠️ No authentication token found for API request:', config.url);
        }
        
        return config;
      },
      (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Auth Debug - Response success:', {
            url: response.config.url,
            status: response.status,
            hasData: !!response.data
          });
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Enhanced 401 error debugging
        if (error.response?.status === 401) {
          console.error('🚨 Authentication Error (401):', {
            url: originalRequest?.url,
            method: originalRequest?.method?.toUpperCase(),
            hasAuthHeader: !!originalRequest?.headers?.Authorization,
            authHeader: originalRequest?.headers?.Authorization ? 
              originalRequest.headers.Authorization.substring(0, 30) + '...' : 'Missing',
            errorMessage: error.response?.data?.message || error.message,
            retryAttempt: originalRequest._retry ? 'Yes' : 'No'
          });
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          console.log('🔄 Attempting token refresh for 401 error...');

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshAccessToken(refreshToken);
              localStorage.setItem('token', response.token);
              
              originalRequest.headers.Authorization = `Bearer ${response.token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials) {
    try {
      const response = await this.axiosInstance.post('/auth/login', {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
        rememberMe: credentials.rememberMe || false
      });

      return {
        success: true,
        user: response.data.user,
        token: response.data.token,
        refreshToken: response.data.refreshToken
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      throw new Error(errorMessage);
    }
  }

  async logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await this.axiosInstance.post('/auth/logout', { 
          refreshToken 
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const response = await this.axiosInstance.post('/auth/refresh', {
        refreshToken
      });
      
      return {
        token: response.data.token,
        refreshToken: response.data.refreshToken || refreshToken
      };
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  }

  async getCurrentUser() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null; // No token, user not authenticated
      }
      
      const response = await this.axiosInstance.get('/auth/me');
      return response.data.user;
    } catch (error) {
      // Handle authentication errors gracefully
      if (error.response?.status === 401) {
        // Token expired or invalid - clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        return null;
      }
      throw new Error('Failed to get current user');
    }
  }

  async updateLastLogin(userId) {
    try {
      await this.axiosInstance.patch(`/auth/users/${userId}/last-login`);
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  async forgotPassword(email) {
    try {
      const response = await this.axiosInstance.post('/auth/forgot-password', {
        email: email.trim().toLowerCase()
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async resetPassword(token, newPassword) {
    try {
      const response = await this.axiosInstance.post('/auth/reset-password', {
        token,
        password: newPassword
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  getErrorMessage(error) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.status === 401) {
      return 'Invalid email or password';
    }
    
    if (error.response?.status === 429) {
      return 'Too many login attempts. Please try again later.';
    }
    
    if (error.response?.status >= 500) {
      return 'Server error. Please try again later.';
    }
    
    if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
      return 'Network connection error. Please check your internet connection.';
    }
    
    return error.message || 'An unexpected error occurred';
  }

  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  getToken() {
    return localStorage.getItem('token');
  }

  getUserFromToken() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user || null;
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService();