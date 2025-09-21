import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { adminService } from '../services/adminService';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  isAdmin: false,
  adminAccessChecked: false
};

function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
        error: null
      };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isAdmin: action.payload.isAdmin || false,
        adminAccessChecked: action.payload.adminAccessChecked || false
      };
    
    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isAdmin: false,
        adminAccessChecked: false
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case 'SET_ADMIN_ACCESS':
      return {
        ...state,
        isAdmin: action.payload.isAdmin,
        adminAccessChecked: true
      };
    
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      const user = await authService.getCurrentUser();
      if (user) {
        // Check admin status from user role field
        const isAdmin = user.role === 'admin';

        dispatch({ 
          type: 'LOGIN_SUCCESS', 
          payload: { 
            user, 
            token, 
            isAdmin, 
            adminAccessChecked: true 
          } 
        });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await authService.login(credentials);
      
      localStorage.setItem('token', response.token);
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken);
      }

      // Check admin status from user role field
      const isAdmin = response.user.role === 'admin';

      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { 
          user: response.user, 
          token: response.token,
          isAdmin,
          adminAccessChecked: true
        } 
      });

      // Update last login timestamp now that token is stored
      try {
        await authService.updateLastLogin(response.user.id);
      } catch (error) {
        // Non-critical error, don't fail the login
        console.warn('Failed to update last login timestamp:', error);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      dispatch({ 
        type: 'LOGIN_ERROR', 
        payload: errorMessage 
      });
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const checkAdminAccess = async () => {
    if (!state.isAuthenticated || !state.user) return false;
    
    // Check admin status from user role field (already loaded)
    const isAdmin = state.user.role === 'admin';
    
    if (!state.adminAccessChecked) {
      dispatch({ 
        type: 'SET_ADMIN_ACCESS', 
        payload: { isAdmin } 
      });
    }
    
    return isAdmin;
  };

  const value = {
    ...state,
    login,
    logout,
    clearError,
    updateUser,
    checkAuthStatus,
    checkAdminAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}

export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, isLoading, adminAccessChecked, checkAdminAccess } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (isAuthenticated && !adminAccessChecked) {
      // Check admin access if not already checked
      checkAdminAccess();
      return;
    }

    if (adminAccessChecked && !isAdmin) {
      // User is authenticated but not admin
      navigate('/app/dashboard', { replace: true });
    }
  }, [isAuthenticated, isAdmin, isLoading, adminAccessChecked, navigate, checkAdminAccess]);

  if (isLoading || !adminAccessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return null;
  }

  return children;
}