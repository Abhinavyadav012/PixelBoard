import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser as apiLogin, registerUser as apiRegister } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  });
  const [token, setToken]   = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const saveSession = (userData, jwt) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', jwt);
    setUser(userData);
    setToken(jwt);
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiLogin({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      saveSession({ _id: data._id, name: data.name, email: data.email, avatar: data.avatar }, data.token);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiRegister({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      saveSession({ _id: data._id, name: data.name, email: data.email, avatar: data.avatar }, data.token);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  // Called by AuthCallbackPage after Google OAuth redirect
  const loginWithToken = (userData, jwt) => {
    saveSession(
      { _id: userData._id, name: userData.name, email: userData.email, avatar: userData.avatar },
      jwt
    );
  };

  // Called by ProfilePage after a successful profile update
  const updateUser = (userData) => {
    const updated = { ...user, ...userData };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, logout, loginWithToken, updateUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
