import { supabase } from '../lib/supabase';
import type { Manual } from './manuals';

export type Achievement = {
  manual: Manual;
  ack_version: number;
  acked_at?: string;
};

// src/api/achievements.ts
export async function getAchievements(): Promise<Achievement[]> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return [];
  
    const { data: acks, error: aErr } = await supabase
      .from('manual_acks')
      .select('manual_id, ack_version, acked_at')
      .eq('user_id', userId)
      .order('ack_version', { ascending: false })
      .order('acked_at', { ascending: false });
  
    if (aErr) throw aErr;
  
    const latest = new Map<string, { ack_version: number; acked_at?: string | null }>();
    for (const a of acks ?? []) {
      if (!latest.has(a.manual_id)) latest.set(a.manual_id, { ack_version: a.ack_version, acked_at: (a as any).acked_at });
    }
  
    const ids = Array.from(latest.keys());
    if (ids.length === 0) return [];
  
    const { data: manuals, error: mErr } = await supabase
      .from('manuals')
      .select('id,title,description,cover_url,updated_at,manual_version')
      .in('id', ids)
      .eq('published', true);
  
    if (mErr) throw mErr;
  
    const byId = new Map((manuals ?? []).map((m) => [m.id, m as Manual]));
    return ids.reduce<Achievement[]>((acc, id) => {
      const m = byId.get(id);
      const a = latest.get(id)!;
      if (m && (a.ack_version ?? 0) >= (m.manual_version ?? 1)) {
        acc.push({ manual: m, ack_version: a.ack_version, acked_at: a.acked_at ?? undefined });
      }
      return acc;
    }, []);
}