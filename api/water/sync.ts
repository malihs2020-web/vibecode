import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { parseTgUser } from '../_lib/tgValidate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData, count, goal } = (req.body ?? {}) as {
    initData?: unknown;
    count?: unknown;
    goal?: unknown;
  };

  if (typeof initData !== 'string') return res.status(400).json({ error: 'initData required' });
  if (typeof count !== 'number' || count < 0) return res.status(400).json({ error: 'count invalid' });
  if (typeof goal !== 'number' || goal < 1) return res.status(400).json({ error: 'goal invalid' });

  const user = parseTgUser(initData);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const today = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from('water_sync').upsert(
    { tg_id: user.tg_id, date: today, count, goal },
    { onConflict: 'tg_id,date' },
  );

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
