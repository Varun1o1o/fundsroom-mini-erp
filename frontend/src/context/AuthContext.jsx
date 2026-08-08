import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('erp_token');
    setUser(null);
    setLoading(false);
  }, []);

  const checkUserSession = useCallback(async () => {
    const token = localStorage.getItem('erp_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await authAPI.getMe();
      setUser(data.user);
    } catch (err) {
      console.error('Session validation failed. Logging out...', err);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('erp_token', response.token);
      setUser(response.user);
      setLoading(false);
      return response.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const val = {
    user,
    loading,
    login,
    logout,
    refreshSession: checkUserSession,
  };

  return <AuthContext.Provider value={val}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
