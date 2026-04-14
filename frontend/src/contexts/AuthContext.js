import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function formatApiErrorDetail(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    checkAuth();

    // Auto-refresh access token on 401 responses
    let isRefreshing = false;
    let queue = [];

    const interceptor = axios.interceptors.response.use(
      res => res,
      async err => {
        const original = err.config;
        const is401 = err.response?.status === 401;
        const isAuthRoute = original.url?.includes('/api/auth/');
        if (!is401 || isAuthRoute || original._retry) return Promise.reject(err);

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            queue.push({ resolve, reject });
          }).then(() => axios(original)).catch(e => Promise.reject(e));
        }

        original._retry = true;
        isRefreshing = true;
        try {
          await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
          queue.forEach(p => p.resolve());
          queue = [];
          return axios(original);
        } catch {
          queue.forEach(p => p.reject());
          queue = [];
          setUser(false);
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/auth/me`, {
        withCredentials: true
      });
      setUser(data);
    } catch (error) {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );
      setUser(data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: formatApiErrorDetail(error.response?.data?.detail) || error.message
      };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/register`,
        userData,
        { withCredentials: true }
      );
      setUser(data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: formatApiErrorDetail(error.response?.data?.detail) || error.message
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      setUser(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};