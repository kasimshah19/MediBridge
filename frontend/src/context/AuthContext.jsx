import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth.api';
import { updateMe as apiUpdateMe } from '../api/user.api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const getDashboardPathForUser = (user) => {
  if (!user) return '/login';

  // Pharmacist & NGO require admin verification
  if (
    (user.role === 'pharmacist' || user.role === 'ngo') &&
    user.approvalStatus !== 'approved'
  ) {
    return '/approval-pending';
  }

  switch (user.role) {
    case 'admin':
      return '/admin/dashboard';
    case 'pharmacist':
      return '/pharmacist/dashboard';
    case 'ngo':
      return '/ngo/dashboard';
    case 'donor':
    default:
      return '/donor/dashboard';
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap user from /auth/me
  const refreshUser = useCallback(async () => {
    try {
      const response = await getMe();
      if (response?.data?.user) {
        setUser(response.data.user);
        return response.data.user;
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials) => {
    const res = await apiLogin(credentials);
    if (res?.data?.user) {
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res?.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await apiRegister(userData);
    if (res?.data?.user) {
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res?.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      toast.success('Signed out successfully');
      window.location.href = '/login';
    }
  };

  const updateProfile = async (data) => {
    const res = await apiUpdateMe(data);
    if (res?.data?.user) {
      setUser(res.data.user);
      return res.data.user;
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
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

export default AuthContext;
