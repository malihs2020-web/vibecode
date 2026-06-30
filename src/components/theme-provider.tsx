import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { isTelegram, initTelegram } from '@/hooks/useTelegram';

export type Theme = 'light' | 'dark';
export type Accent = 'blue' | 'green';

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  inTelegram: boolean;
  toggleTheme: () => void;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) return tg.colorScheme === 'dark' ? 'dark' : 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialAccent(): Accent {
  const stored = localStorage.getItem('accent');
  return stored === 'green' ? 'green' : 'blue';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [accent, setAccent] = useState<Accent>(getInitialAccent);
  const inTg = isTelegram();

  // Initialize Telegram Mini App
  useEffect(() => {
    initTelegram();
  }, []);

  // Sync theme with Telegram when it changes (user switches Telegram theme)
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.initData) return;
    function onThemeChanged() {
      setTheme(tg!.colorScheme === 'dark' ? 'dark' : 'light');
    }
    tg.onEvent('themeChanged', onThemeChanged);
    return () => tg.offEvent('themeChanged', onThemeChanged);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    if (!inTg) localStorage.setItem('theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#11182a' : '#ffffff');
  }, [theme, inTg]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('accent', accent);
  }, [accent]);

  const value: ThemeContextValue = {
    theme,
    accent,
    inTelegram: inTg,
    toggleTheme: inTg ? () => {} : () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    setAccent,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
