'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import type { AuthSession, Role, User } from './types';

const STORAGE_KEY = 'artisan-connect-session';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: { email?: string; phone?: string; password: string; name: string; role: Role; gender?: 'female' | 'male' | 'cooperative' | 'other' }) => Promise<{ developmentOtp?: string }>;
  updateUser: (partial: Partial<User>) => void;
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
      try {
        const session: AuthSession = JSON.parse(stored);
        setAuthToken(session.accessToken);
        setUser(session.user);
      } catch {
        // Session illisible : on repart d'un état propre plutôt que de bloquer l'application.
        localStorage.removeItem(STORAGE_KEY);
      }
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
    const login = async (identifier: string, password: string) => {
      const session = await api.login({ identifier, password });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setAuthToken(session.accessToken);
      setUser(session.user);
    };

    const updateUser = (partial: Partial<User>) => {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...partial };
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const session: AuthSession = JSON.parse(stored);
          session.user = updated;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        }
        return updated;
      });
    };

    return {
      user,
      ready,
      login,
      async register(data) {
        const result = await api.register(data);
        if (data.email) await login(data.email, data.password);
        return result;
      },
      updateUser,
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
