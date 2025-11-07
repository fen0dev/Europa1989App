export type NotificationType = 
    | 'note_reaction'
    | 'note_reply'
    | 'manual_completed'
    | 'question_answer'
    | 'team_activity'
    | 'new_manual'
    | 'streak_reminder'
    | 'achievement_unlocked'
    | 'team_challenge'
    | 'note_reported'
;

export interface NotificationData {
    noteId?: string;
    manualId?: string;
    articleId?: string;
    userId?: string;
    [key: string]: any;
}

export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    body: string;
    data: NotificationData | null;
    read: boolean;
    created_at: string;
    updated_at: string;
}

export interface NotificationPreferences {
    push_enabled: boolean;
    in_app_enabled: boolean;
    note_reactions: boolean;
    note_replies: boolean;     
    manual_completions: boolean; 
    question_answers: boolean;
    team_activities: boolean;
}

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
    note_reaction: 'heart',
    note_reply: 'chatbubble',
    manual_completed: 'checkmark-circle',
    question_answer: 'help-circle',
    team_activity: 'people',
    new_manual: 'document-text',
    streak_reminder: 'flame',
    achievement_unlocked: 'trophy',
    team_challenge: 'flag',
    note_reported: 'flag',
};

export const NOTIFICATION_COLORS: Record<NotificationType, string> = {
    note_reaction: '#FF6B6B',
    note_reply: '#4f8cff',
    manual_completed: '#4CAF50',
    question_answer: '#9C27B0',
    team_activity: '#FFC107',
    new_manual: '#2196F3',
    streak_reminder: '#FF9800',
    achievement_unlocked: '#FFD700',
    team_challenge: '#E91E63',
    note_reported: '#FF6B6B',
};