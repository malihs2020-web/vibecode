import { createHmac } from 'crypto';

export interface TgUser {
  tg_id: string;
  name: string;
}

export function parseTgUser(initData: string): TgUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  if (!botToken || !initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const checkString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expected = createHmac('sha256', secretKey).update(checkString).digest('hex');
    if (expected !== hash) return null;

    const userStr = params.get('user');
    if (!userStr) return null;
    const u = JSON.parse(userStr) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };

    return {
      tg_id: String(u.id),
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Аноним',
    };
  } catch {
    return null;
  }
}
