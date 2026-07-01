import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const goal = String(req.query.goal ?? 'universal');
  const limit = Math.min(parseInt(String(req.query.limit ?? '20')), 50);
  const offset = parseInt(String(req.query.offset ?? '0'));

  const tags = goal === 'universal' ? ['universal'] : [goal, 'universal'];

  const { data, error } = await supabase
    .from('posts')
    .select('id, text, goal_tag, author_name, created_at, is_generated')
    .eq('is_hidden', false)
    .in('goal_tag', tags)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(500).json({ error: error.message });

  const postIds = (data ?? []).map((p) => p.id);
  const { data: rxns } = postIds.length
    ? await supabase.from('reactions').select('post_id, emoji').in('post_id', postIds)
    : { data: [] as { post_id: string; emoji: string }[] };

  const reactionMap: Record<string, Record<string, number>> = {};
  for (const r of rxns ?? []) {
    reactionMap[r.post_id] ??= {};
    reactionMap[r.post_id][r.emoji] = (reactionMap[r.post_id][r.emoji] ?? 0) + 1;
  }

  res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  return res.status(200).json({
    posts: (data ?? []).map((p) => ({ ...p, reactions: reactionMap[p.id] ?? {} })),
  });
}
