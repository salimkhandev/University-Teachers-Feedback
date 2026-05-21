import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';
type ThemeSource = 'system' | 'manual';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  resetToSystemTheme: () => void;
  themeSource: ThemeSource;
  systemTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): { theme: Theme; source: ThemeSource } {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    return { theme: saved, source: 'manual' };
  }
  return { theme: getSystemTheme(), source: 'system' };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeSource, setThemeSource] = useState<ThemeSource>('system');
  const [theme, setThemeState] = useState<Theme>('light');
  const [systemTheme, setSystemTheme] = useState<Theme>('light');

  // Initialize theme on mount
  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial.theme);
    setThemeSource(initial.source);
    setSystemTheme(getSystemTheme());
  }, []);

  // Listen for OS-level theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);

      // Only auto-switch if user hasn't manually set a preference
      if (themeSource === 'system') {
        setThemeState(newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeSource]);

  // Apply theme class to <html> element and persist
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (themeSource === 'manual') {
      localStorage.setItem('theme', theme);
    } else {
      localStorage.removeItem('theme');
    }
  }, [theme, themeSource]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      return next;
    });
    setThemeSource('manual');
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setThemeSource('manual');
  }, []);

  const resetToSystemTheme = useCallback(() => {
    setThemeSource('system');
    setThemeState(getSystemTheme());
  }, []);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      setTheme, 
      resetToSystemTheme, 
      themeSource, 
      systemTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}