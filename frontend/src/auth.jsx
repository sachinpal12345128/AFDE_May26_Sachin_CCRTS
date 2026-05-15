// Auth context — wraps the app and exposes login/logout, the current
// user, and the user's role. Token is persisted to localStorage so
// page reloads keep the user signed in.

import { createContext, useContext, useEffect, useState } from 'react';
import api, { apiLogin, apiMe, apiRegister, errorMessage } from './api.js';

const STORAGE_KEY = 'ccrts.token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  // Inject token into every outgoing request
  useEffect(() => {
    const id = api.interceptors.request.use((cfg) => {
      const t = localStorage.getItem(STORAGE_KEY);
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return () => api.interceptors.request.eject(id);
  }, []);

  // 401 from any call clears the session
  useEffect(() => {
    const id = api.interceptors.response.use(
      (r) => r,
      (err) => {
        if (err?.response?.status === 401 && localStorage.getItem(STORAGE_KEY)) {
          logout();
        }
        return Promise.reject(err);
      },
    );
    return () => api.interceptors.response.eject(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On mount with a stored token, fetch the user
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    apiMe()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && logoutLocal())
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(email, password) {
    const data = await apiLogin(email, password);
    localStorage.setItem(STORAGE_KEY, data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    await apiRegister(payload);
    return login(payload.email, payload.password);
  }

  function logoutLocal() {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  function logout() {
    logoutLocal();
  }

  const role = user?.role_name || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        loading,
        login,
        register,
        logout,
        errorMessage,
        isCustomer: role === 'Customer',
        isAgent: role === 'Agent',
        isSupervisor: role === 'Supervisor',
        isAdmin: role === 'Admin',
        isStaff: ['Admin', 'Supervisor', 'Agent'].includes(role),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
