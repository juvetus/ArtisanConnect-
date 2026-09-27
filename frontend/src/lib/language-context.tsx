'use client';

import React, { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { type Language, type TranslationKey, getTranslation } from './i18n';

const LANG_STORAGE_KEY = 'artisan-connect-lang';
const LANGUAGE_CHANGE_EVENT = 'artisan-connect-language-change';

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(LANGUAGE_CHANGE_EVENT, onChange);
  };
}

function getLanguageSnapshot(): Language {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored;
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
  return navigator.language?.slice(0, 2) === 'en' ? 'en' : 'fr';
}

function getServerLanguageSnapshot(): Language {
  return 'fr';
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore(subscribeToLanguage, getLanguageSnapshot, getServerLanguageSnapshot);

  const setLanguage = (lang: Language) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      window.dispatchEvent(new Event(LANGUAGE_CHANGE_EVENT));
    } catch {
      // Language still follows the browser snapshot when storage is unavailable.
    }
  };

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: (key: TranslationKey, params?: Record<string, string | number>) =>
        getTranslation(language, key, params),
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
