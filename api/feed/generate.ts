import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM = `Ты генерируешь мотивационные посты для приложения отслеживания питания и веса.
Тон: тёплый, поддерживающий, от первого лица — как пишет реальный человек, не корпоративный текст.

ПООЩРЯЕМ:
- маленькие победы и последовательность, а не результат
- не-весовые улучшения: энергия, сон, самочувствие, старая одежда
- самосострадание после срыва
- процесс важнее цифры

СТРОГО ЗАПРЕЩЕНО:
- конкретные целевые цифры калорий или веса («ем 1200 ккал», «похудела до 55кг»)
- голодовки и экстремальный дефицит
- стыд за тело или срыв
- токсичные сравнения с другими
- очистительные практики

Для goal_tag "lose": здоровый темп, устойчивые привычки, энергия.
Для goal_tag "gain": сила, восстановление, регулярность питания.
Для goal_tag "universal": вода, сон, привычки, последовательность.

Верни JSON-массив без пояснений:
[{"text":"текст до 300 символов","goal_tag":"lose|gain|universal"}]`;

async function generateBatch(): Promise<Array<{ text: string; goal_tag: string }>> {
  const key = process.env.VITE_GROQ_API_KEY ?? '';
  if (!key) throw new Error('VITE_GROQ_API_KEY not set');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.85,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: 'Сгенерируй 10 постов: 3 lose, 3 gain, 4 universal. Разные истории, не повторяйся.',
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const raw = ((data.choices[0].message.content as string) ?? '').trim()
    .replace(/^```json\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(raw);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  try {
    const posts = await generateBatch();

    const { error } = await supabase.from('posts').insert(
      posts.map((p) => ({
        text: p.text,
        goal_tag: p.goal_tag,
        author_name: 'Команда приложения',
        author_tg_id: null,
        is_generated: true,
      })),
    );

    if (error) return res.status(500).json({ error: error.message });

    // Ротация: удаляем старые сгенерированные посты сверх лимита 60
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_generated', true);

    if ((count ?? 0) > 60) {
      const excess = (count ?? 0) - 60;
      const { data: oldest } = await supabase
        .from('posts')
        .select('id')
        .eq('is_generated', true)
        .order('created_at', { ascending: true })
        .limit(excess);
      if (oldest?.length) {
        await supabase.from('posts').delete().in('id', oldest.map((p) => p.id));
      }
    }

    return res.status(200).json({ ok: true, generated: posts.length });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
