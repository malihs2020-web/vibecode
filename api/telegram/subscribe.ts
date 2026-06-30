import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, SUBSCRIBERS_SET, subscriberKey } from '../_lib/redis.js';
import type { ReminderKey, ReminderSetting, Subscriber } from '../_lib/types.js';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidReminders(input: unknown): input is Partial<Record<ReminderKey, ReminderSetting>> {
  if (typeof input !== 'object' || input === null) return false;
  return Object.values(input as Record<string, unknown>).every((r) => {
    if (typeof r !== 'object' || r === null) return false;
    const setting = r as Record<string, unknown>;
    if (typeof setting.enabled !== 'boolean') return false;
    if (setting.enabled && (typeof setting.time !== 'string' || !TIME_RE.test(setting.time))) return false;
    return true;
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { chatId, timezone, reminders } = (req.body ?? {}) as {
    chatId?: unknown;
    timezone?: unknown;
    reminders?: unknown;
  };

  if (typeof chatId !== 'number' || !Number.isFinite(chatId)) {
    res.status(400).json({ error: 'chatId required' });
    return;
  }
  if (typeof timezone !== 'string' || !timezone) {
    res.status(400).json({ error: 'timezone required' });
    return;
  }
  if (!isValidReminders(reminders)) {
    res.status(400).json({ error: 'invalid reminders' });
    return;
  }

  const hasAnyEnabled = Object.values(reminders).some((r) => r?.enabled);

  if (!hasAnyEnabled) {
    await getRedis().srem(SUBSCRIBERS_SET, chatId);
    await getRedis().del(subscriberKey(chatId));
    res.status(200).json({ subscribed: false });
    return;
  }

  const existing = await getRedis().get<Subscriber>(subscriberKey(chatId));

  const subscriber: Subscriber = {
    chatId,
    timezone,
    reminders,
    lastSent: existing?.lastSent ?? {},
  };

  await getRedis().set(subscriberKey(chatId), subscriber);
  await getRedis().sadd(SUBSCRIBERS_SET, chatId);

  res.status(200).json({ subscribed: true });
}
