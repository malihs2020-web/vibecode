import { useEffect } from 'react';
import { todayKey } from '@/lib/date';
import type { Diary, Food } from '@/lib/types';

const BACKUP_KEY = 'autoBackup';

export interface AutoBackup {
  date: string;
  foods: Food[];
  diary: Diary;
  goalCal: number | null;
}

export function loadAutoBackup(): AutoBackup | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as AutoBackup) : null;
  } catch {
    return null;
  }
}

export function useAutoBackup(foods: Food[], diary: Diary, goalCal: number | null) {
  useEffect(() => {
    const today = todayKey();
    const existing = loadAutoBackup();
    if (existing?.date === today) return;
    const backup: AutoBackup = { date: today, foods, diary, goalCal };
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    } catch {
      // storage full — skip silently
    }
  }, [foods, diary, goalCal]);
}
