import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = localStorage.getItem('peerlearn_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const { user: nextUser } = await api('/auth/me');
      setUser(nextUser);
      return nextUser;
    } catch (_error) {
      localStorage.removeItem('peerlearn_token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const login = async (payload) => {
    const { token, user: nextUser } = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('peerlearn_token', token);
    setUser(nextUser);
    return nextUser;
  };

  const signup = async (payload) => {
    const { token, user: nextUser } = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    localStorage.setItem('peerlearn_token', token);
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem('peerlearn_token');
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, login, signup, logout, refresh }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
