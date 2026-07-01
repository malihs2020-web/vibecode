import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { parseTgUser } from '../_lib/tgValidate.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MOD_SYSTEM = `Ты модератор приложения для отслеживания питания и веса.
Проверь текст поста на опасный контент.

ЗАПРЕЩЕНО (верни {"ok":false,"reason":"..."}):
- конкретные целевые цифры веса или калорий как «цель» (например «похудей до 45кг», «ешь 500 ккал»)
- пропаганда голодовок и экстремального дефицита
- упоминание очистительных практик
- стыд за тело, оскорбления
- токсичные сравнения с другими людьми

РАЗРЕШЕНО (верни {"ok":true}):
- личный опыт и маленькие победы
- поддержка и мотивация
- не-весовые улучшения (энергия, сон, самочувствие)
- самосострадание после срыва

Верни ТОЛЬКО JSON без пояснений: {"ok":true} или {"ok":false,"reason":"краткое объяснение на русском"}`;

async function moderate(text: string): Promise<{ ok: boolean; reason?: string }> {
  const key = process.env.VITE_GROQ_API_KEY ?? '';
  if (!key) return { ok: true };
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        messages: [
          { role: 'system', content: MOD_SYSTEM },
          { role: 'user', content: text },
        ],
      }),
    });
    const data = await res.json();
    const raw = ((data.choices?.[0]?.message?.content as string) ?? '').trim()
      .replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(raw);
  } catch {
    return { ok: true };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData, text, goal_tag, author_name } = (req.body ?? {}) as Record<string, string>;

  const user = parseTgUser(initData ?? '');
  if (!user) return res.status(401).json({ error: 'Требуется открыть в Telegram' });

  if (!text || text.length > 500) return res.status(400).json({ error: 'Текст 1–500 символов' });
  if (!['lose', 'gain', 'universal'].includes(goal_tag))
    return res.status(400).json({ error: 'Неверная тема' });

  const { ok, reason } = await moderate(text);
  if (!ok) return res.status(422).json({ error: reason ?? 'Пост не прошёл модерацию' });

  const { error } = await supabase.from('posts').insert({
    text,
    goal_tag,
    author_tg_id: user.tg_id,
    author_name: (author_name || user.name).slice(0, 50),
    is_generated: false,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ ok: true });
}
