import type { ReminderKey, ReminderSetting, WaterReminderSettings } from '../../src/lib/types.js';

export interface Subscriber {
  chatId: number;
  timezone: string;
  reminders: Partial<Record<ReminderKey, ReminderSetting>>;
  lastSent: Partial<Record<ReminderKey, string>>;
  waterReminder?: WaterReminderSettings;
  waterRemindersSent?: Record<string, number>; // dateKey → количество отправленных
}

export type { ReminderKey, ReminderSetting, WaterReminderSettings };
