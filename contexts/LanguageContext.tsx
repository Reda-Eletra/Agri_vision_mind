import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { translations } from '../translations';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper function to get nested keys like 'app.title'
const getNestedTranslation = (language: Language, key: string): string | undefined => {
    return key.split('.').reduce((obj, k) => (obj as any)?.[k], translations[language] as any);
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const t = useCallback((key: string, params?: { [key: string]: string | number }): string => {
    let translation = getNestedTranslation(language, key);
    
    if (!translation) {
        console.warn(`Translation key not found: ${key}`);
        // Fallback to English if translation is missing
        translation = getNestedTranslation('en', key);
    }

    if (!translation) {
        return key; // Return the key itself if not found in English either
    }

    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation!.replace(`{{${paramKey}}}`, String(params[paramKey]));
      });
    }
    
    return translation;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};