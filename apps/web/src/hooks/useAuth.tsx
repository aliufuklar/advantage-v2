import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User, AuthState } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
  });

  useEffect(() => {
    if (state.token) {
      api.setToken(state.token);
      api.getMe().then((user: unknown) => {
        setState({ user: user as User, token: state.token, isAuthenticated: true });
      }).catch(() => {
        localStorage.removeItem('token');
        setState({ user: null, token: null, isAuthenticated: false });
      });
    }
  }, [state.token]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    localStorage.setItem('token', data.accessToken);
    api.setToken(data.accessToken);
    const user = await api.getMe();
    setState({ user: user as User, token: data.accessToken, isAuthenticated: true });
  };

  const register = async (email: string, username: string, password: string, fullName: string) => {
    await api.register(email, username, password, fullName);
  };

  const logout = () => {
    localStorage.removeItem('token');
    api.setToken(null);
    setState({ user: null, token: null, isAuthenticated: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}