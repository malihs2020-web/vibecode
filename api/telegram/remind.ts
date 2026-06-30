import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, SUBSCRIBERS_SET, subscriberKey } from '../_lib/redis.js';
import type { ReminderKey, Subscriber } from '../_lib/types.js';

const WINDOW_MINUTES = 7;

const REMINDER_TEXT: Record<ReminderKey, string> = {
  breakfast: '🌅 Не забудь записать завтрак в дневник',
  breakfast2: '🥐 Время второго завтрака — запиши, что съел',
  lunch: '☀️ Не забудь записать обед в дневник',
  afternoon: '🍵 Время полдника — запиши приём пищи',
  dinner: '🌙 Не забудь записать ужин в дневник',
  dinner2: '🌛 Время второго ужина — запиши, что съел',
  snack: '🍎 Не забудь записать перекус',
  water: '💧 Не забудь выпить воды и отметить это в дневнике',
};

function localTimeParts(timezone: string): { minutes: number; dateKey: string } | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const hour = parseInt(get('hour'), 10);
    const minute = parseInt(get('minute'), 10);
    return { minutes: hour * 60 + minute, dateKey: `${get('year')}-${get('month')}-${get('day')}` };
  } catch {
    return null;
  }
}

function parseTimeToMinutes(time: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function withinWindow(now: number, target: number): boolean {
  const diff = Math.abs(now - target);
  return diff <= WINDOW_MINUTES || diff >= 1440 - WINDOW_MINUTES;
}

async function sendTelegramMessage(chatId: number, text: string, appUrl: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[{ text: 'Открыть дневник', web_app: { url: appUrl } }]],
      },
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!process.env.CRON_SECRET || req.query.secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;
  const appUrl = `https://${host}`;

  const redis = getRedis();
  const chatIds = (await redis.smembers(SUBSCRIBERS_SET)) as (string | number)[];
  let sent = 0;

  for (const rawId of chatIds) {
    const chatId = Number(rawId);
    const subscriber = await redis.get<Subscriber>(subscriberKey(chatId));
    if (!subscriber) continue;

    const local = localTimeParts(subscriber.timezone);
    if (!local) continue;

    let changed = false;

    for (const [key, setting] of Object.entries(subscriber.reminders) as [ReminderKey, Subscriber['reminders'][ReminderKey]][]) {
      if (!setting?.enabled) continue;
      const target = parseTimeToMinutes(setting.time);
      if (target == null) continue;
      if (!withinWindow(local.minutes, target)) continue;
      if (subscriber.lastSent[key] === local.dateKey) continue;

      await sendTelegramMessage(chatId, REMINDER_TEXT[key], appUrl);
      subscriber.lastSent[key] = local.dateKey;
      changed = true;
      sent++;
    }

    if (changed) {
      await redis.set(subscriberKey(chatId), subscriber);
    }
  }

  res.status(200).json({ ok: true, sent, checked: chatIds.length });
}
