import type { ReminderKey, ReminderSetting } from '../../src/lib/types';

export interface Subscriber {
  chatId: number;
  timezone: string;
  reminders: Partial<Record<ReminderKey, ReminderSetting>>;
  lastSent: Partial<Record<ReminderKey, string>>;
}

export type { ReminderKey, ReminderSetting };
