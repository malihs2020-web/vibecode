import { getChatId } from '@/hooks/useTelegram';
import type { AppSettings, WaterReminderSettings } from './types';

export async function syncTelegramReminders(
  reminders: AppSettings['telegramReminders'],
  waterReminder?: WaterReminderSettings,
): Promise<void> {
  const chatId = getChatId();
  if (!chatId) return;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    await fetch('/api/telegram/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, timezone, reminders: reminders ?? {}, waterReminder }),
    });
  } catch {
    // не критично — тихо игнорируем
  }
}

export async function syncWaterCount(count: number, goal: number): Promise<void> {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) return;
  try {
    await fetch('/api/water/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, count, goal }),
    });
  } catch {
    // не критично
  }
}
