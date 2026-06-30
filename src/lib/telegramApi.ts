import { getChatId } from '@/hooks/useTelegram';
import type { AppSettings } from './types';

export async function syncTelegramReminders(reminders: AppSettings['telegramReminders']): Promise<void> {
  const chatId = getChatId();
  if (!chatId) return;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    await fetch('/api/telegram/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, timezone, reminders: reminders ?? {} }),
    });
  } catch {
    // не критично для работы приложения — тихо игнорируем
  }
}
