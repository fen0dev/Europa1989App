import { supabase } from '../lib/supabase';

export type Manual = {
    id: string;
    title: string;
    description?: string | null;
    cover_url?: string | null;
    updated_at: string;
    manual_version?: number;
    pdf_path?: string | null;
    pdf_url?: string | null;
};

export type Section = {
    id: string;
    manual_id: string;
    title: string;
    order_index: number;
};

export type Article = {
    id: string;
    section_id: string;
    title: string;
    content_html?: string | null;
    content_text?: string | null;
    order_index: number;
};

export async function getManuals(): Promise<Manual[]> {
    const { data, error } = await supabase
        .from('manuals')
        .select('id,title,description,cover_url,updated_at,manual_version,pdf_path')
        .eq('published', true)
        .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((m: any) => ({ ...m, pdf_url: toPublicUrl(m.pdf_path) })) as Manual[];
}

export async function getManual(manualId: string): Promise<Manual> {
    const { data, error } = await supabase
        .from('manuals')
        .select('id,title,description,cover_url,updated_at,manual_version,pdf_path')
        .eq('id', manualId)
        .eq('published', true)
        .single();
    if (error) throw error;
    return { ...(data as any), pdf_url: toPublicUrl((data as any).pdf_path) } as Manual;
}

function toPublicUrl(path?: string | null) {
    if (!path) return null;
    const { data } = supabase.storage.from('manuals').getPublicUrl(path);

    return data.publicUrl ?? null;
}

export async function getMyManualAcks(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('manual_acks')
      .select('manual_id, ack_version')
      .order('ack_version', { ascending: false });
  
    if (error) throw error;
    const map: Record<string, number> = {};
    (data ?? []).forEach((r: any) => {
      map[r.manual_id] = Math.max(map[r.manual_id] ?? 0, r.ack_version ?? 0);
    });
    return map;
}

export async function getSections(manualId: string): Promise<Section[]> {
    const { data, error } = await supabase
        .from('sections')
        .select('id,manual_id,title,order_index')
        .eq('manual_id', manualId)
        .order('order_index', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Section[];
}

export async function getArticles(sectionId: string): Promise<Article[]> {
    const { data, error } = await supabase
        .from('articles')
        .select('id,section_id,title,content_html,content_text,order_index')
        .eq('section_id', sectionId)
        .order('order_index', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Article[];
}

export async function getArticle(articleId: string): Promise<Article> {
    const { data, error } = await supabase
        .from('articles')
        .select('id,section_id,title,content_html,content_text,order_index')
        .eq('id', articleId)
        .single();
    if (error) throw error;
    return data as Article;
}

// ACK manuale (upsert per l'utente corrente sulla versione attuale)
export async function ackManual(manualId: string): Promise<void> {
    const [{ data: userData }, manual] = await Promise.all([
        supabase.auth.getUser(),
        getManual(manualId),
    ]);
    const userId = userData.user?.id;
    if (!userId) throw new Error('Utente non autenticato');

    const { error } = await supabase
        .from('manual_acks')
        .upsert(
            {
                user_id: userId,
                manual_id: manualId,
                ack_version: manual.manual_version ?? 1,
                // org_id viene riempito dal trigger
            },
            { onConflict: 'user_id,manual_id,ack_version' }
        );
    if (error) throw error;
}

// Verifica se l'utente ha già ack per la versione corrente
export async function getManualAck(manualId: string): Promise<{ ack_version: number } | null> {
    const { data, error } = await supabase
        .from('manual_acks')
        .select('ack_version')
        .eq('manual_id', manualId)
        .order('ack_version', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return data ?? null;
}

// Tracciamento lettura articolo (upsert)
export async function trackArticleRead(articleId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return;
    const { error } = await supabase
        .from('article_reads')
        .upsert(
            { user_id: userId, article_id: articleId },
            { onConflict: 'user_id,article_id' }
        );
    if (error) throw error;
}