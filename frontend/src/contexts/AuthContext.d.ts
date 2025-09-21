/**
 * TypeScript declarations for AuthContext
 * Provides comprehensive type safety for authentication context
 */

export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
  role?: 'user' | 'admin' | 'moderator';
  preferences?: Record<string, any>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthContextValue extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  
  // Token management
  updateToken: (token: string) => void;
  
  // User management
  updateUser: (userData: Partial<User>) => Promise<void>;
  
  // Status checks
  hasError: boolean;
  isLoggedIn: boolean;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication context provider component
 */
export declare const AuthProvider: React.FC<AuthProviderProps>;

/**
 * Hook to access authentication context
 */
export declare function useAuth(): AuthContextValue;