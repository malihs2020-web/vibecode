import { useCallback, useEffect, useState } from 'react';

/** Состояние, синхронизированное с localStorage (тот же формат ключей, что в прежней версии). */
export function useLocalStorage<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      /* ignore */
    }
    return initial instanceof Function ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);

  const reset = useCallback((next: T) => setValue(next), []);

  return [value, setValue, reset] as const;
}
