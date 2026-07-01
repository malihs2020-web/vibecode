import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRedis, SUBSCRIBERS_SET, subscriberKey } from '../_lib/redis.js';
import { supabase } from '../_lib/supabase.js';
import type { Subscriber } from '../_lib/types.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';

async function sendMessage(chatId: number, text: string, appUrl: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [[{ text: '💧 Открыть дневник', web_app: { url: appUrl } }]],
      },
    }),
  });
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function localMinutes(timezone: string): number | null {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
    const parts = fmt.formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    return h * 60 + m;
  } catch {
    return null;
  }
}

function localDateKey(timezone: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return null;
  }
}

function nudgeText(count: number, goal: number, hour: number): string {
  const left = goal - count;
  const timeHint = hour < 12 ? 'Утро — хорошее время' : hour < 17 ? 'День в самом разгаре' : 'До вечера ещё успеем';
  return `💧 ${timeHint}. Выпито ${count} из ${goal} стак., осталось ${left} — момент для воды!`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const secret = process.env.CRON_SECRET ?? '';
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).end();
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? '';
  const appUrl = `https://${host}`;

  const chatIds = (await getRedis().smembers(SUBSCRIBERS_SET)) as (string | number)[];
  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;

  for (const rawId of chatIds) {
    const chatId = Number(rawId);
    const subscriber = await getRedis().get<Subscriber>(subscriberKey(chatId));
    if (!subscriber?.waterReminder?.enabled) continue;

    const { wakeStart, wakeEnd, maxPerDay } = subscriber.waterReminder;
    const tz = subscriber.timezone;

    const nowMin = localMinutes(tz);
    const dateKey = localDateKey(tz);
    if (nowMin === null || dateKey === null) continue;

    const startMin = parseTimeToMinutes(wakeStart);
    const endMin = parseTimeToMinutes(wakeEnd);
    if (nowMin < startMin || nowMin >= endMin) continue;

    const sentToday = subscriber.waterRemindersSent?.[dateKey] ?? 0;
    if (sentToday >= maxPerDay) continue;

    // Получаем счётчик воды за сегодня
    const { data: waterRow } = await supabase
      .from('water_sync')
      .select('count, goal')
      .eq('tg_id', String(chatId))
      .eq('date', today)
      .maybeSingle();

    const count = waterRow?.count ?? 0;
    const goal = waterRow?.goal ?? 8;

    // Ожидаемый прогресс на текущий момент
    const windowLen = endMin - startMin;
    const elapsed = Math.max(0, nowMin - startMin);
    const expected = goal * (elapsed / windowLen);

    if (count >= expected * 0.75) continue;

    const hour = Math.floor(nowMin / 60);
    await sendMessage(chatId, nudgeText(count, goal, hour), appUrl);
    sent++;

    // Обновляем счётчик отправленных
    const updatedSub: Subscriber = {
      ...subscriber,
      waterRemindersSent: {
        ...subscriber.waterRemindersSent,
        [dateKey]: sentToday + 1,
      },
    };
    await getRedis().set(subscriberKey(chatId), updatedSub);
  }

  return res.status(200).json({ ok: true, sent, checked: chatIds.length });
}
