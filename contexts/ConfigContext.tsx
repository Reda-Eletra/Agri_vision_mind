import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { configureAiModel } from '../services/geminiService';

interface ConfigContextType {
  modelName: string;
  isLoading: boolean;
  checkForUpdates: () => Promise<string>;
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean | ((prev: boolean) => boolean)) => void;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

// Theme preference key – stored in sessionStorage (not localStorage)
const THEME_KEY = 'agri_theme';

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modelName, setModelName] = useState<string>('gemini-2.5-flash');
  const [isLoading, setIsLoading]   = useState(true);
  const [isDarkMode, _setIsDarkMode] = useState(() => {
    // Read from sessionStorage first; fall back to OS preference
    const saved = sessionStorage.getItem(THEME_KEY);
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const setIsDarkMode: ConfigContextType['setIsDarkMode'] = (value) => {
    _setIsDarkMode((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      sessionStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const fetchConfig = useCallback(async (): Promise<string> => {
    try {
      const response = await fetch('/config.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch config file.');
      const config   = await response.json();
      const newModel = config.geminiModel;
      if (newModel) {
        setModelName(newModel);
        configureAiModel(newModel);
        return newModel;
      }
      throw new Error('Model name not found in config file.');
    } catch (error) {
      console.error('Could not load app configuration, using default.', error);
      configureAiModel('gemini-2.5-flash');
      return modelName;
    }
  }, [modelName]);

  useEffect(() => {
    const initialLoad = async () => {
      await fetchConfig();
      setIsLoading(false);
    };
    initialLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkForUpdates = useCallback(async (): Promise<string> => {
    const oldModel = modelName;
    const newModel = await fetchConfig();
    if (newModel !== oldModel) return `Model updated from ${oldModel} to ${newModel}!`;
    return 'Your model is up to date.';
  }, [fetchConfig, modelName]);

  const value = { modelName, isLoading, checkForUpdates, isDarkMode, setIsDarkMode };

  return (
    <ConfigContext.Provider value={value}>
      {!isLoading && children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) throw new Error('useConfig must be used within a ConfigProvider');
  return context;
};
