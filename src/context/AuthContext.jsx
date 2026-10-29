/**
 * Authentication Context & Hook
 * Manages user session persistence, registration, login, and logout.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { isAppwriteConfigured } from '../config/appwrite';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isConfigured = isAppwriteConfigured();

  // Restore authenticated session on mount
  const checkSession = useCallback(async () => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      setUser(null);
      setError(err?.message || 'Failed to restore session');
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    setError(null);
    try {
      const loggedUser = await authService.login(email, password);
      setUser(loggedUser);
      return loggedUser;
    } catch (err) {
      setError(err?.message || 'Login failed');
      throw err;
    }
  };

  const register = async (email, password, name) => {
    setError(null);
    try {
      const newUser = await authService.register(email, password, name);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err?.message || 'Registration failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const refreshUser = async () => {
    const refreshed = await authService.getCurrentUser();
    setUser(refreshed);
    return refreshed;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isConfigured,
        login,
        register,
        logout,
        refreshUser,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
