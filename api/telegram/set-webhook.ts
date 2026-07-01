import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const adminId = process.env.ADMIN_TELEGRAM_ID ?? '';
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const secret = process.env.CRON_SECRET ?? '';

  // Только администратор может вызвать этот эндпоинт
  const { id } = req.query as Record<string, string>;
  if (!adminId || id !== adminId) return res.status(403).json({ error: 'Forbidden' });

  const webhookUrl = `https://${req.headers.host}/api/telegram/webhook`;

  const r = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ['message'],
    }),
  });

  const data = await r.json();
  return res.status(200).json(data);
}
