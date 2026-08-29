import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, type User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; password: string; display_name: string; role?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updatePoints: (points: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('livenova_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user: u } = await api.me();
      setUser(u);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('livenova_token');
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, refreshUser]);

  const login = async (username: string, password: string) => {
    const { user: u, token: t } = await api.login(username, password);
    localStorage.setItem('livenova_token', t);
    setToken(t);
    setUser(u);
  };

  const register = async (data: { username: string; email: string; password: string; display_name: string; role?: string }) => {
    const { user: u, token: t } = await api.register(data);
    localStorage.setItem('livenova_token', t);
    setToken(t);
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('livenova_token');
    setToken(null);
    setUser(null);
  };

  const updatePoints = (points: number) => {
    setUser((prev) => (prev ? { ...prev, points } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, updatePoints }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
