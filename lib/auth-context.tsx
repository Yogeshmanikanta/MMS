'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from './types';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'admin',
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false, message: 'Not implemented' }),
  logout: () => {}
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('mms_user_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.user && parsed.token) {
          setUser(parsed.user);
          setToken(parsed.token);
        }
      }
    } catch (e) {
      console.error('Failed to restore auth session from localStorage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('mms_user_session', JSON.stringify({ user: data.user, token: data.token }));
        return { success: true };
      }

      return {
        success: false,
        message: data.message || 'Invalid username or password.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Network or server error during login. Please check connection.'
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mms_user_session');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'admin',
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
