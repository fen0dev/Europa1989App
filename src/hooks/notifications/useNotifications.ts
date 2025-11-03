import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
  } from '../../api/notifications';
import { Notification } from '../../lib/notifiations/notificationTypes';

export function useNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['notifications', options?.unreadOnly ? 'unread': 'all'],
        queryFn: () => getNotifications({
            limit: options?.limit ?? 20,
            unreadOnly: options?.unreadOnly,
        }),
        staleTime: 30 * 1000,   // 30 sec stale time
    });

    const { mutate: markAsRead } = useMutation({
        mutationFn: markNotificationAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        },
    });

    const { mutate: markAllRead } = useMutation({
        mutationFn: markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        },
    });

    const { mutate: deleteNotif } = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        },
    });

    return {
        notifications: data?.notifications ?? [],
        total: data?.total ?? 0,
        isLoading,
        error,
        refetch,
        markAsRead,
        markAllRead,
        deleteNotification: deleteNotif,
    };
}

export function useUnreadCount() {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: getUnreadCount,
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000, // Refetch every minute
    });
}