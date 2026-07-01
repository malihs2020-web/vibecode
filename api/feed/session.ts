import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_lib/supabase.js';
import { parseTgUser } from '../_lib/tgValidate.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { initData } = (req.body ?? {}) as { initData?: string };
  const user = parseTgUser(initData ?? '');
  if (!user) return res.status(200).json({ ok: true });

  await supabase.from('sessions').upsert(
    { tg_id: user.tg_id, last_seen_at: new Date().toISOString() },
    { onConflict: 'tg_id' },
  );

  return res.status(200).json({ ok: true });
}
