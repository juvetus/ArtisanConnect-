'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { type Language, type TranslationKey, getTranslation } from './i18n';

const LANG_STORAGE_KEY = 'artisan-connect-lang';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
      if (stored === 'fr' || stored === 'en') {
        setLanguageState(stored);
      } else {
        // Détecter la langue du navigateur si en anglais
        const browserLang = navigator.language?.slice(0, 2);
        if (browserLang === 'en') {
          setLanguageState('en');
        }
      }
    } catch {
      // localStorage non disponible au SSR
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // Ignore
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
