import { supabase } from '../lib/supabase';
import { handleApiError } from '../lib/errors';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as DocumentPicker from 'expo-document-picker';
import type { Manual, Section, Article } from './manuals';
import type { ManualQuestion } from './quiz';
import type { ManualNote } from './notes';

export type AdminRole = 'user' | 'admin' | 'manager';

export type CreateManualInput = {
    title: string;
    description?: string | null;
    cover_url?: string | null;
    pdf_path?: string | null;
    published?: boolean;
};

export type UpdateManualInput = {
  title?: string;
  description?: string | null;
  cover_url?: string | null;
  pdf_path?: string | null;
  published?: boolean;
  manual_version?: number;
};

export type CreateSectionInput = {
    manual_id: string;
    title: string;
    order_index: number;
};

export type UpdateSectionInput = {
    title?: string;
    order_index?: number;
};

export type CreateArticleInput = {
    section_id: string;
    title: string;
    content_html?: string | null;
    content_text?: string | null;
    order_index: number;
};

export type UpdateArticleInput = {
    title?: string;
    content_html?: string | null;
    content_text?: string | null;
    order_index?: number;
};

export type CreateQuestionInput = {
    manual_id: string;
    idx: number;
    question: string;
    option_a: string;
    option_b: string;
};

export type UpdateQuestionInput = {
    idx?: number;
    question?: string;
    option_a?: string;
    option_b?: string;
};

export type ManualAdminStats = {
    total_section: number;
    total_articles: number;
    total_questions: number;
    total_notes: number;
    total_completions: number;
    published: boolean;
    version: number | null;
};

/**
 * verify if current user is admin
*/
export async function isUserAdmin(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        adminCheckCache = null;
        return false
    };

    if (adminCheckCache &&
        adminCheckCache.userId === user.id &&
        Date.now() - adminCheckCache.timestamp < ADMIN_CHECK_CACHE_TTL
    ) {
        return adminCheckCache.isAdmin;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
        adminCheckCache = null;
        return false;
    }

    if (!data) {
        adminCheckCache = null;
        return false;
    }

    const isAdmin = data.role?.toLowerCase() === 'admin';
    adminCheckCache = { userId: user.id, isAdmin, timestamp: Date.now() };

    return isAdmin;
}

/**
 * gets current user's role
*/
export async function getUserRole(): Promise<AdminRole> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'user';

    if (adminCheckCache &&
        adminCheckCache.userId === user.id &&
        Date.now() - adminCheckCache.timestamp < ADMIN_CHECK_CACHE_TTL
    ) {
        return adminCheckCache.isAdmin ? 'admin' : 'user';
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (error || !data || !data.role) return 'user';

    const roleLower = data.role.toLowerCase();
    const role = roleLower === 'admin' ? 'admin' : roleLower === 'manager' ? 'manager' : 'user';
    const isAdmin = role === 'admin';

    adminCheckCache = { userId: user.id, isAdmin, timestamp: Date.now() };
    return role;
}

function getPublicUrl(path: string): string | null {
    const { data } = supabase.storage.from('manuals').getPublicUrl(path);
    return data.publicUrl ?? null;
}

// File Uploading
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 50 * 1024 *1024;
const MAX_IMAGE_DIMENSION = 2048;
// validation limits
const VALIDATION_LIMITS = {
    MANUAL_TITLE_MIN: 3,
    MANUAL_TITLE_MAX: 200,
    MANUAL_DESCRIPTION_MAX: 2000,
    SECTION_TITLE_MIN: 3,
    SECTION_TITLE_MAX: 200,
    ARTICLE_TITLE_MIN: 3,
    ARTICLE_TITLE_MAX: 200,
    QUESTION_TEXT_MIN: 10,
    QUESTION_TEXT_MAX: 500,
    OPTION_TEXT_MAX: 200,
    ORDER_INDEX_MIN: 0,
    ORDER_INDEX_MAX: 10000,
} as const;

// cache for admin checks
let adminCheckCache: { userId: string; isAdmin: boolean; timestamp: number } | null = null;
const ADMIN_CHECK_CACHE_TTL = 5 * 60 * 1000;

async function clearAdminCache() {
    adminCheckCache = null;
}

export { clearAdminCache };

function validateManualTitle(title: string): void {
    if (!title || typeof title !== 'string') {
        throw new Error('Try to give a valid name for the manual');
    }

    const trimmed = title.trim();
    if (trimmed.length < VALIDATION_LIMITS.MANUAL_TITLE_MIN) {
        throw new Error(`Manual title must be at least ${VALIDATION_LIMITS.MANUAL_TITLE_MIN} characters long`);
    }
    if (trimmed.length > VALIDATION_LIMITS.MANUAL_TITLE_MAX) {
        throw new Error(`Manual title must be less than ${VALIDATION_LIMITS.MANUAL_TITLE_MAX} characters long`);
    }
}

function validateManualDescription(description: string | null | undefined): void {
    if (description && description.length > VALIDATION_LIMITS.MANUAL_DESCRIPTION_MAX) {
        throw new Error(`Manual description must be less than ${VALIDATION_LIMITS.MANUAL_DESCRIPTION_MAX} characters long`);
    }
}

function validateSectionTitle(title: string): void {
    if (!title || typeof title !== 'string') {
        throw new Error('Section title is required');
    }
    const trimmed = title.trim();
    if (trimmed.length < VALIDATION_LIMITS.SECTION_TITLE_MIN) {
        throw new Error(`Section title must be at least ${VALIDATION_LIMITS.SECTION_TITLE_MIN} characters long`);
    }
    if (trimmed.length > VALIDATION_LIMITS.SECTION_TITLE_MAX) {
        throw new Error(`Section title must be less than ${VALIDATION_LIMITS.SECTION_TITLE_MAX} characters long`);
    }
}

function validateArticleTitle(title: string): void {
    if (!title || typeof title !== 'string') {
        throw new Error('Article title is required');
    }
    const trimmed = title.trim();
    if (trimmed.length < VALIDATION_LIMITS.ARTICLE_TITLE_MIN) {
        throw new Error(`Article title must be at least ${VALIDATION_LIMITS.ARTICLE_TITLE_MIN} characters long`);
    }
    if (trimmed.length > VALIDATION_LIMITS.ARTICLE_TITLE_MAX) {
        throw new Error(`Article title must be less than ${VALIDATION_LIMITS.ARTICLE_TITLE_MAX} characters long`);
    }
}

function validateQuestionText(question: string): void {
    if (!question || typeof question !== 'string') {
        throw new Error('Question body is required');
    }
    const trimmed = question.trim();
    if (trimmed.length < VALIDATION_LIMITS.QUESTION_TEXT_MIN) {
        throw new Error(`Question body must be at least ${VALIDATION_LIMITS.QUESTION_TEXT_MIN} characters long`);
    }
    if (trimmed.length > VALIDATION_LIMITS.QUESTION_TEXT_MAX) {
        throw new Error(`Question body must be less than ${VALIDATION_LIMITS.QUESTION_TEXT_MAX} characters long`);
    }
}

function validateOptionText(option: string): void {
    if (!option || typeof option !== 'string') {
        throw new Error('Option text is required');
    }
    const trimmed = option.trim();
    if (trimmed.length === 0) {
        throw new Error('Option text cannot be empty');
    }
    if (trimmed.length > VALIDATION_LIMITS.OPTION_TEXT_MAX) {
        throw new Error(`Option text must be less than ${VALIDATION_LIMITS.OPTION_TEXT_MAX} characters long`);
    }
}

function validateOrderIndex(orderIndex: number): void {
    if (typeof orderIndex !== 'number' || isNaN(orderIndex)) {
        throw new Error('Order index must be a number');
    }
    if (orderIndex < VALIDATION_LIMITS.ORDER_INDEX_MIN || orderIndex > VALIDATION_LIMITS.ORDER_INDEX_MAX) {
        throw new Error(`Order index must be between ${VALIDATION_LIMITS.ORDER_INDEX_MIN} and ${VALIDATION_LIMITS.ORDER_INDEX_MAX}`);
    }
}

function validateUrl(url: string | null | undefined, fieldName: string): void {
    if (!url) return;
    try {
        new URL(url);
    } catch {
        throw new Error(`${fieldName} must be a valid URL`);
    }
}


/**
 * uploads cover image to pdf manual and then uploads it to storage
*/
export async function uploadManualCover(): Promise<string> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') throw new Error('Permission denied to access image library');

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
    });

    if (result.canceled) throw new Error('No image selected');

    const photo = result.assets[0];

    if (photo.fileSize && photo.fileSize > MAX_IMAGE_SIZE) throw new Error(`Image size must be less than ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);

    // compression and rendering
    const manipulatedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
            { resize: { width: MAX_IMAGE_DIMENSION } },
        ],
        {
            compress: 0.85,
            format: ImageManipulator.SaveFormat.JPEG,
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found or not authenticated');

    const ext = 'jpeg';
    const fileName = `covers/${user.id}/${Date.now()}.${ext}`;

    const response = await fetch(manipulatedImage.uri);
    const blob = await response.arrayBuffer();

    const { data, error } = await supabase.storage
        .from('manuals')
        .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
        });

    if (error) throw handleApiError(error);

    const { data: { publicUrl } } = supabase.storage.from('manuals').getPublicUrl(data.path);
    return publicUrl;
}

/**
 * Uploads pdf manual to storage
*/
export async function uploadManualPDF(): Promise<string> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
    });

    if (result.canceled) throw new Error('No pdf selected');

    const file = result.assets[0];

    if (file.size && file.size > MAX_PDF_SIZE) throw new Error(`PDF size must be less than ${MAX_PDF_SIZE / 1024 / 1024}MB`);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found or not authenticated');

    const fileName = `manuals/${user.id}/${Date.now()}_${file.name}`;

    const response = await fetch(file.uri);
    const blob = await response.arrayBuffer();

    const { data, error } = await supabase.storage
        .from('manuals')
        .upload(fileName, blob, {
            contentType: 'application/pdf',
            upsert: false,
        });

    if (error) throw handleApiError(error);

    const pdfPath = data.path;

    return pdfPath;     // returns path but NOT public url
}

// MANUALS ADMIN API

/**
 * gets all manuals for admin (including those not published yet) - ONLY admin
*/
export async function getAllManualsAdmin(): Promise<Manual[]> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { data, error } = await supabase
        .from('manuals')
        .select('id,title,description,cover_url,updated_at,manual_version,pdf_path,published')
        .order('updated_at', { ascending: false });

    if (error) throw handleApiError(error);
    return (data ?? []).map((m: any) => ({
        ...m,
        pdf_url: m.pdf_path ? getPublicUrl(m.pdf_path) : null,
    })) as Manual[];
}

/**
 * creates a new manual
*/
export async function createManual(input: CreateManualInput): Promise<Manual> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    validateManualTitle(input.title);
    validateManualDescription(input.description);
    if (input.cover_url) validateUrl(input.cover_url, 'Cover URL');

    const { data, error } = await supabase
        .from('manuals')
        .insert({
            title: input.title,
            description: input.description || null,
            cover_url: input.cover_url || null,
            pdf_path: input.pdf_path || null,
            published: input.published ?? false,
            manual_version: 1,
        })
        .select()
        .single();

    if (error) throw handleApiError(error);
    return { ...data, pdf_url: data.pdf_path ? getPublicUrl(data.pdf_path) : null } as Manual;
}

/**
 * updates a manual
*/
export async function updateManual(
    manualId: string,
    updates: UpdateManualInput
): Promise<Manual> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    if (updates.title !== undefined) validateManualTitle(updates.title);
    if (updates.description !== undefined) validateManualDescription(updates.description);
    if (updates.cover_url !== undefined) validateUrl(updates.cover_url, 'Cover URL');

    const { data, error } = await supabase
        .from('manuals')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', manualId)
        .select()
        .single();

    if (error) throw handleApiError(error);
    return {...data, pdf_url: data.pdf_path ? getPublicUrl(data.pdf_path) : null} as Manual;
}

/**
 * deletes a manual
*/
export async function deleteManual(manualId: string): Promise<void> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { error } = await supabase
        .from('manuals')
        .delete()
        .eq('id', manualId);

    if (error) throw handleApiError(error);
}

/**
 * publishes/hides a manual
*/
export async function toggleManualPublish(
    manualId: string,
    published: boolean
): Promise<void> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { error } = await supabase
        .rpc('toggle_manual_publish', {
            p_manual_id: manualId,
            p_published: published,
        });

    if (error) throw handleApiError(error);
}

/**
 * increases manual version and updates published status (Ex: Version 1.0 --> 1.1)
*/
export async function incrementManualVersion(manualId: string): Promise<number> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { data, error } = await supabase.rpc('increment_manual_version', {
        p_manual_id: manualId,
    });

    if (error) throw handleApiError(error);
    return data;
}

/**
 * gets stats admin for manual
*/
export async function getManualAdminStats(manualId: string): Promise<ManualAdminStats> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { data, error } = await supabase.rpc('get_manual_admin_stats', {
        p_manual_id: manualId,
    });

    if (error) throw handleApiError(error);
    return data;
}

// SECTION ADMIN API

/**
 * creates section
*/
export async function createSection(input: CreateSectionInput): Promise<Section> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    validateSectionTitle(input.title);
    validateOrderIndex(input.order_index);

    const { data, error } = await supabase
        .from('sections')
        .insert({
            manual_id: input.manual_id,
            title: input.title,
            order_index: input.order_index,
        })
        .select()
        .single();

    if (error) throw handleApiError(error);
    return data as Section;
}

/**
 * updates a section
*/
export async function updateSection(
    sectionId: string,
    updates: UpdateSectionInput
): Promise<Section> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    if (updates.title !== undefined) validateSectionTitle(updates.title);
    if (updates.order_index !== undefined) validateOrderIndex(updates.order_index);

    const { data, error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', sectionId)
        .select()
        .single();

    if (error) throw handleApiError(error);
    return data as Section;
}

/**
 * deletes a section
*/
export async function deleteSection(sectionId: string): Promise<void> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

    if (error) throw handleApiError(error);
}

// ARTICLES ADMIN API

/**
 * creates an article
*/
export async function createArticle(input: CreateArticleInput): Promise<Article> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    validateArticleTitle(input.title);
    validateOrderIndex(input.order_index);

    const { data, error } = await supabase
        .from('articles')
        .insert({
            section_id: input.section_id,
            title: input.title,
            content_html: input.content_html || null,
            content_text: input.content_text || null,
            order_index: input.order_index,
        })
        .select()
        .single();

    if (error) throw handleApiError(error);
    return data as Article;
}

/**
 * updates an article
*/
export async function updateArticle(
    articleId: string,
    updates: UpdateArticleInput
): Promise<Article> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    if (updates.title !== undefined) validateArticleTitle(updates.title);
    if (updates.order_index !== undefined) validateOrderIndex(updates.order_index);

    const { data, error } = await supabase
        .from('articles')
        .update(updates)
        .eq('id', articleId)
        .select()
        .single();

    if (error) throw handleApiError(error);
    return data as Article;
}

/**
 * deletes an article
*/
export async function deleteArticle(articleId: string): Promise<void> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

    if (error) throw handleApiError(error);
}

// QUESTION ADMIN API

/**
 * creates a question
*/
export async function createQuestion(input: CreateQuestionInput): Promise<ManualQuestion> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    validateQuestionText(input.question);
    validateOptionText(input.option_a);
    validateOptionText(input.option_b);
    validateOrderIndex(input.idx);

    const { data, error } = await supabase
        .from('manual_questions')
        .insert({
            manual_id: input.manual_id,
            idx: input.idx,
            question: input.question,
            option_a: input.option_a,
            option_b: input.option_b,
        })
        .select()
        .single();
        
    if (error) throw handleApiError(error);
    return data as ManualQuestion;
}

/**
 * updates a question
*/
export async function updateQuestion(
    questionId: string,
    updates: UpdateQuestionInput
): Promise<ManualQuestion> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    if (updates.question !== undefined) validateQuestionText(updates.question);
    if (updates.option_a !== undefined) validateOptionText(updates.option_a);
    if (updates.option_b !== undefined) validateOptionText(updates.option_b);
    if (updates.idx !== undefined) validateOrderIndex(updates.idx);

    const { data, error } = await supabase
        .from('manual_questions')
        .update(updates)
        .eq('id', questionId)
        .select()
        .single();

    if (error) throw handleApiError(error);
    return data as ManualQuestion;
}

/**
 * deletes a question
*/
export async function deleteQuestion(questionId: string): Promise<void> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { error } = await supabase
        .from('manual_questions')
        .delete()
        .eq('id', questionId);

    if (error) throw handleApiError(error);
}

// NOTES MODERATION API

/**
 * gets all notes for a manual (including non published yet) - only admin
*/
export async function getAllNotesAdmin(manualId: string): Promise<ManualNote[]> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { data, error } = await supabase
        .from('v_manual_notes_with_stats')
        .select('*')
        .eq('manual_id', manualId)
        .order('created_at', { ascending: false });

    if (error) throw handleApiError(error);
    return (data ?? []) as ManualNote[];
}

/**
 * pin / unpin a note
*/
export async function toggleNotePin(noteId: string, pinned: boolean): Promise<void> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { error } = await supabase
        .from('manual_notes')
        .update({ is_pinned: pinned })
        .eq('id', noteId);

    if (error) throw handleApiError(error);
}

/**
 * deletes a note  (admin only can delete any notes)
*/
export async function deleteNoteAdmin(noteId: string): Promise<void> {
    if (!(await isUserAdmin())) throw new Error('Unauthorized access - Admin access required!');

    const { error } = await supabase
        .from('manual_notes')
        .delete()
        .eq('id', noteId);

    if (error) throw handleApiError(error);
}