import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { parseTgUser } from '../_lib/tgValidate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData, post_id } = (req.body ?? {}) as Record<string, string>;

  const user = parseTgUser(initData ?? '');
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  await supabase.from('reports').upsert(
    { post_id, reporter_tg_id: user.tg_id },
    { onConflict: 'post_id,reporter_tg_id' },
  );

  const { count } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post_id);

  if ((count ?? 0) >= 3) {
    await supabase.from('posts').update({ is_hidden: true }).eq('id', post_id);
  }

  return res.status(200).json({ ok: true });
}
