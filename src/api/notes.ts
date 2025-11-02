import { supabase } from '../lib/supabase';

export type NoteType = 'tip' | 'warn' | 'ask' | 'clarify';

export type ManualNote = {
    id: string;
    manual_id: string;
    section_id?: string | null;
    article_id?: string | null;
    content: string;
    note_type: NoteType;
    user_id: string;
    is_public: boolean;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
    display_name?: string | null;
    avatar_url?: string | null;
    nickname?: string | null;
    helpful_content: number;
    like_count: number;
    total_reactions: number;
    current_user_reacted_helpful: boolean;
    current_user_reacted: boolean;
};

export type CreateNoteInput = {
    manual_id: string;
    section_id?: string | null;
    article_id?: string | null;
    content: string;
    note_type: NoteType;
    is_public?: boolean;
};

export type NoteReactionType = 'helpful' | 'like' | 'warning';

/**
 * Get all notes for a manual with id (with optional filters) 
*/
export async function getManualNotes(
    manual_id: string,
    options?: {
        sectionId?: string;
        articleId?: string;
        noteType?: NoteType;
        sortBy?: 'recent' | 'helpful' | 'oldest';
    }
): Promise<ManualNote[]> {
    let query = supabase
        .from('v_manual_notes_with_stats')
        .select('*')
        .eq('manual_id', manual_id);
    
    if (options?.sectionId) {
        query = query.eq('section_id', options.sectionId);
    }

    if (options?.articleId) {
        query = query.eq('article_id', options.articleId);
    }

    if (options?.noteType) {
        query = query.eq('note_type', options.noteType);
    }

    // sorting
    const sortBy = options?.sortBy || 'recent';
    if (sortBy === 'helpful') {
        query = query.order('helpful_content', { ascending: false });
        query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
    } else {
        query = query.order('is_pinned', { ascending: false });
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as ManualNote[];
}

export async function createManualNote(input: CreateNoteInput): Promise<ManualNote> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Unauthorized user');

    // length validation
    if (input.content.length < 10 || input.content.length > 500) {
        throw new Error('Content must be between 10 and 500 characters');
    }

    const { data, error } = await supabase
        .from('manual_notes')
        .insert({
            manual_id: input.manual_id,
            section_id: input.section_id || null,
            article_id: input.article_id || null,
            content: input.content,
            note_type: input.note_type,
            is_public: input.is_public ?? true,
            user_id: userId,
        })
        .select()
        .single();

    if (error) throw error;
    // charge with stats from view
    return getNoteById(data.id);
}

/**
 * Get a specific note with ID  
*/
export async function getNoteById(noteId: string): Promise<ManualNote> {
    const { data, error } = await supabase
        .from('v_manual_notes_with_stats')
        .select('*')
        .eq('id', noteId)
        .single();

    if (error) throw error;
    return data as ManualNote;
}

/**
 * Update an existing note with ID
*/
export async function updateManualNote(
    noteId: string,
    updates: Partial<Pick<CreateNoteInput, 'content' | 'note_type' | 'is_public'>>
): Promise<ManualNote> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Unauthorized user');

    // validation content if present
    if (updates.content && (updates.content.length < 10 || updates.content.length > 500)) {
        throw new Error('Content must be between 10 and 500 characters');
    }

    const { data, error } = await supabase
        .from('manual_notes')
        .update(updates)
        .eq('id', noteId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) throw error;

    return getNoteById(noteId);
}

/**
 * Delete note
*/
export async function deleteManualNote(noteId: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('manual_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);

    if (error) throw error;
}

/**
 * Add or remove reaction from note
*/
export async function toggleNoteReaction(
    noteId: string,
    reactionType: NoteReactionType
): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error('Unauthorized user');

    // check if reaction is valid or present already
    const { data: existing } = await supabase
        .from('manual_note_reactions')
        .select('id, reaction_type')
        .eq('note_id', noteId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing) {
        if (existing.reaction_type === reactionType) {
            const { error } = await supabase
                .from('manual_note_reactions')
                .delete()
                .eq('id', existing.id);
            
            if (error) throw error;
        } else {
            // update reaction type
            const { error } = await supabase
                .from('manual_note_reactions')
                .update({ reaction_type: reactionType })
                .eq('id', existing.id);
            
            if (error) throw error;
        }
    } else {
        // create new reaction
        const { error } = await supabase
            .from('manual_note_reactions')
            .insert({
                note_id: noteId,
                user_id: userId,
                reaction_type: reactionType,
            });

        if (error) throw error;
    }
}

/**
 * get stats note for a manual
*/
export async function getManualNotesStats(manualId: string): Promise<{
    total: number;
    by_type: Record<NoteType, number>;
    helpful_count: number;
}> {
    const notes = await getManualNotes(manualId);
  
    const stats = {
      total: notes.length,
      by_type: {
        tip: 0,
        warn: 0,
        ask: 0,
        clarify: 0,
      } as Record<NoteType, number>,
      helpful_count: 0,
    };
  
    notes.forEach((note) => {
      const noteType = note.note_type as NoteType;
      if (noteType === 'tip' || noteType === 'warn' || noteType === 'ask' || noteType === 'clarify') {
        stats.by_type[noteType]++;
      }
      stats.helpful_count += note.helpful_content;
    });
  
    return stats;
}