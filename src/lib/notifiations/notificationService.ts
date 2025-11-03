import { AppState, AppStateStatus } from "react-native";
import { 
    registerForPushNotificationsAsync, 
    setupNotificationListeners,
    unregisterPushNotificationsAsync 
  } from './pushNotifications';
import { getUnreadCount } from '../../api/notifications';
import { QueryClient } from '@tanstack/react-query';
import { logger } from '../errors';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

export interface NotificationServiceConfig {
    onNotificationReceived?: (notification: Notifications.Notification) => void;
    onNotificationTapped?: (notification: Notifications.NotificationResponse) => void;
    onUnreadCountChanged?: (count: number) => void;
}

let pushToken: string | null = null;

export class NotificationService {
    private queryClient: QueryClient | null = null;
    private config: NotificationServiceConfig = {};
    private unsubscribeListeners: (() => void) | null = null;
    private appStateSubscription: { remove: () => void } | null = null;

    async initialize(queryClient: QueryClient, config: NotificationServiceConfig = {}) {
        this.queryClient = queryClient;
        this.config = config;

        try {
            pushToken = await registerForPushNotificationsAsync();
            
            // setup listeners
            this.unsubscribeListeners = setupNotificationListeners(
                (notification) => {
                    logger.info('Notification received', { id: notification.request.identifier });
                    this.handleNotificationReceived(notification);
                },
                (response) => {
                    logger.info('Notification tapped', { id: response.notification.request.identifier });
                    this.handleNotificationTapped(response);
                }
            );

            // refresh unread count
            await this.refreshUnreadCount();
            //setup app state listener to refresh on foreground
            this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
            logger.info('Notification service initialized');
        } catch (error) {
            logger.error('Error initializing notification service', error);
        }
    }

    private handleNotificationReceived = (notification: Notifications.Notification) => {
        // Refresh unread count
        this.refreshUnreadCount();
    
        // Call custom handler
        this.config.onNotificationReceived?.(notification);
    };

    private handleNotificationTapped = async (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data as any;
    
        // Refresh queries
        this.queryClient?.invalidateQueries({ queryKey: ['notifications'] });
        await this.refreshUnreadCount();
    
        // Handle deep linking
        if (data?.manualId) {
          Linking.openURL(`europa://manual/${data.manualId}`);
        } else if (data?.noteId && data?.manualId) {
          Linking.openURL(`europa://manual/${data.manualId}?noteId=${data.noteId}`);
        } else if (data?.articleId) {
          Linking.openURL(`europa://article/${data.articleId}`);
        }
    
        // Call custom handler
        this.config.onNotificationTapped?.(response);
    };


    private handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          await this.refreshUnreadCount();
          this.queryClient?.invalidateQueries({ queryKey: ['notifications'] });
        }
    };

    private async refreshUnreadCount() {
        try {
            const count = await getUnreadCount();
            this.config.onUnreadCountChanged?.(count);
            this.queryClient?.setQueryData(['notifications', 'unread-count'], count);
        } catch (error) {
            logger.error('Error refreshing unread count', error);
        }
    }

    async cleanup() {
        if (pushToken) {
          await unregisterPushNotificationsAsync(pushToken);
        }
    
        if (this.unsubscribeListeners) {
          this.unsubscribeListeners();
        }
    
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }
    
        logger.info('Notification service cleaned up');
    }
    
    getPushToken(): string | null {
        return pushToken;
    }
}

export const notificationService = new NotificationService();