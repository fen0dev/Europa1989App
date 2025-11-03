import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerPushToken, unregisterPushToken } from '../../api/notifications';
import { logger } from '../errors';

// configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    if (!Device.isDevice) {
        logger.warn('Must use physical device for Push Notifications');
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            logger.warn('Permission for push notifications not granted');
            return null;
        }

        token = (await Notifications.getExpoPushTokenAsync({
            projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        })).data;

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        await registerPushToken({
            token,
            platform,
            device_id: Device.modelId,
        });

        logger.info('Push notification token registered', { token: token.substring(0, 10) + '...' });

        // Configure Android channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
  
      return token;

    } catch (error) {
        logger.error('Error registering for push notifications', { error });
        return null;
    }
}

export async function unregisterPushNotificationsAsync(token: string): Promise<void> {
    try {
        await unregisterPushToken(token);
        logger.info('Push notification token unregistered');
    } catch (error) {
        logger.error('Error unregistering push notifications', error);
    }
}

export function setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (notification: Notifications.NotificationResponse) => void,
) {
    // listener for notifications received while app is in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
    // listener for notifications received while app is in background
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

    return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
    };
}