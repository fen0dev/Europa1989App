import { supabase } from '../lib/supabase';
import { Notification, NotificationPreferences, NotificationType } from '../lib/notifiations/notificationTypes';
import { handleApiError } from '../lib/errors';

export interface CreatenotificationInput {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, any>;
}

export interface PushtokenInput {
    token: string;
    platform: 'ios' | 'android';
    device_id?: string;
}

/**
 * Get all notifications for current user
*/
export async function getNotifications(
    options?: {
        limit?: number;
        offset?: number;
        unreadOnly?: boolean;
    }
): Promise<{ notifications: Notification[]; total: number }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (options?.unreadOnly) {
        query = query.eq('read', false);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error, count } = await query;
    if (error) throw handleApiError(error);

    return {
        notifications: (data ?? []) as Notification[],
        total: count ?? 0,
    };
}

/**
 * get unread notifications count
*/
export async function getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

    if (error) throw handleApiError(error);

    return count ?? 0;
}

/**
 * msrk notifications as read
*/
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

    if (error) throw handleApiError(error);
}

/**
 * mark all notifications as read
*/
export async function markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

    if (error) throw handleApiError(error);
}

/**
 * Delete notification
*/
export async function deleteNotification(notificationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

    if (error) throw handleApiError(error);
}

/**
 * get notification preferences
*/
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
    const { data: { user} } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    const { data, error } = await supabase 
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') throw handleApiError(error);

    if (!data) {
        // return default preferences
        // if no data is found
        return {
            push_enabled: true,
            in_app_enabled: true,
            note_reactions: true,
            note_replies: true,
            manual_completions: true,
            question_answers: true,
            team_activities: true,
        };
    }

    return {
        push_enabled: data.push_enabled ?? true,
        in_app_enabled: data.in_app_enabled ?? true,
        note_reactions: data.note_reactions ?? true,
        note_replies: data.note_replies ?? true,
        manual_completions: data.manual_completions ?? true,
        question_answers: data.question_answers ?? true,
        team_activities: data.team_activities ?? true,
    };
}

/**
 * Update notification preferences
*/
export async function updateNotificationPreferences(
    preferences: Partial<NotificationPreferences>
): Promise<void> {
    const { data: { user} } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('notification_preferences')
        .upsert({
            user_id: user.id,
            ...preferences,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id', // unique constraint on user_id
        });

    if (error) throw handleApiError(error);
}

/**
 * register push token
*/
export async function registerPushToken(input: PushtokenInput): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('push_tokens')
        .upsert({
            user_id: user.id,
            token: input.token,
            platform: input.platform,
            device_id: input.device_id,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'token'
        });

    if (error) throw handleApiError(error);
}

/**
 * unregister push token
*/
export async function unregisterPushToken(token: string): Promise<void> {
    const { data:  { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized user');

    const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('token', token)
        .eq('user_id', user.id);

    if (error) throw handleApiError(error);
}