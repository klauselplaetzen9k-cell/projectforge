// ============================================================================
// Authentication Context
// ============================================================================

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../services/api';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    token: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const { user } = await api.get('/auth/me');
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
            token,
          });
        } catch (error) {
          localStorage.removeItem('auth_token');
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            token: null,
          });
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await api.post('/auth/login', { email, password });
    localStorage.setItem('auth_token', token);
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
      token,
    });
  }, []);

  // Register
  const register = useCallback(async (data: RegisterData) => {
    const { user, token } = await api.post('/auth/register', data);
    localStorage.setItem('auth_token', token);
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
      token,
    });
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('auth_token');
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
    });
  }, []);

  // Update profile
  const updateProfile = useCallback(async (data: Partial<User>) => {
    const { user } = await api.put('/users/profile', data);
    setState(prev => ({ ...prev, user }));
  }, []);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.get('/auth/me');
      setState(prev => ({ ...prev, user }));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
