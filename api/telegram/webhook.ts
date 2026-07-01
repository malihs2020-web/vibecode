import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID ?? '';
const SECRET = process.env.CRON_SECRET ?? '';

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function getStats(): Promise<string> {
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const results = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_hidden', false),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_hidden', false).gte('created_at', weekAgo),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_generated', false).eq('is_hidden', false),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_hidden', true),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).gte('last_seen_at', dayAgo),
    supabase.from('sessions').select('*', { count: 'exact', head: true }).gte('last_seen_at', monthAgo),
  ]);

  const [totalPosts, weekPosts, ugcPosts, hiddenPosts, dau, mau] = results.map((r) => r.count ?? 0);

  return `📊 <b>Статистика</b>

📝 Постов: ${totalPosts} всего / ${weekPosts} за неделю
👤 От пользователей: ${ugcPosts}
🚩 Скрыто жалобами: ${hiddenPosts}

👥 DAU: ${dau}
👥 MAU: ${mau}`;
}

interface TgUpdate {
  message?: {
    from?: { id: number };
    chat: { id: number };
    text?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  if (SECRET && req.headers['x-telegram-bot-api-secret-token'] !== SECRET) {
    return res.status(401).end();
  }

  const { message } = (req.body ?? {}) as TgUpdate;
  if (!message?.text || !message.from) return res.status(200).end();

  const fromId = String(message.from.id);
  const chatId = message.chat.id;
  const cmd = message.text.split('@')[0].trim();

  if (cmd === '/stats') {
    if (fromId !== ADMIN_ID) {
      await sendMessage(chatId, '⛔ Нет доступа');
    } else {
      await sendMessage(chatId, await getStats());
    }
  }

  return res.status(200).end();
}
