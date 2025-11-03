import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../api/notifications';
import { NotificationPreferences } from '../../lib/notifiations/notificationTypes';

export function useNotificationPreferences() {
    const queryClient = useQueryClient();

    const { data: preferences, isLoading } = useQuery({
        queryKey: ['notification-preferences'],
        queryFn: getNotificationPreferences,
    });

    const { mutate: updatePreferences, isPending } = useMutation({
        mutationFn: updateNotificationPreferences,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
        },
    });

    return {
        preferences: preferences ?? {
            push_enabled: true,
            in_app_enabled: true,
            note_reactions: true,
            note_replies: true,
            manual_completions: true,
            question_answers: true,
            team_activities: true,
        } as NotificationPreferences,
        isLoading,
        updatePreferences,
        isUpdating: isPending,
    };
}