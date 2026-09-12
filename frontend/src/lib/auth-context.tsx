'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import type { AuthSession, Role, User } from './types';

const STORAGE_KEY = 'artisan-connect-session';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; role: Role; gender?: 'female' | 'male' | 'cooperative' | 'other' }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // La session ne peut être lue qu'après hydratation : localStorage n'existe pas au rendu serveur.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const session: AuthSession = JSON.parse(stored);
      setAuthToken(session.accessToken);
      setUser(session.user);
    }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    // Jeton expiré ou compte supprimé : on purge la session plutôt que d'afficher un faux connecté.
    setUnauthorizedHandler(() => {
      localStorage.removeItem(STORAGE_KEY);
      setAuthToken(null);
      setUser(null);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const login = async (email: string, password: string) => {
      const session = await api.login({ email, password });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setAuthToken(session.accessToken);
      setUser(session.user);
    };

    return {
      user,
      ready,
      login,
      async register(data) {
        await api.register(data);
        await login(data.email, data.password);
      },
      logout() {
        localStorage.removeItem(STORAGE_KEY);
        setAuthToken(null);
        setUser(null);
      },
    };
  }, [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
