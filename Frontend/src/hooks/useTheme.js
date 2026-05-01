import { createContext, useContext, useState, useEffect, createElement, useRef } from 'react';

const KEY = 'pixelboard-theme';
const ThemeContext = createContext(null);

function applyTheme(t) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = t === 'dark' || (t === 'default' && prefersDark);
  if (isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem(KEY) || 'default';
    applyTheme(saved);
    return saved;
  });

  // Keep a ref to avoid stale closure in the media query listener
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    applyTheme(theme);

    // Only watch system changes when in 'default' mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (themeRef.current === 'default') applyTheme('default');
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (val) => {
    localStorage.setItem(KEY, val);
    setThemeState(val);
    applyTheme(val); // apply immediately — don't wait for useEffect
  };

  return createElement(ThemeContext.Provider, { value: { theme, setTheme } }, children);
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

