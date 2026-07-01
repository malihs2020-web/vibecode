import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { parseTgUser } from '../_lib/tgValidate.js';

const ALLOWED = new Set(['❤️', '👏', '💪']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData, post_id, emoji } = (req.body ?? {}) as Record<string, string>;

  const user = parseTgUser(initData ?? '');
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!ALLOWED.has(emoji)) return res.status(400).json({ error: 'Invalid emoji' });

  const { error } = await supabase.from('reactions').upsert(
    { post_id, user_tg_id: user.tg_id, emoji },
    { onConflict: 'post_id,user_tg_id' },
  );

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
