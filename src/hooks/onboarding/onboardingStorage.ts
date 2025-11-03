import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../lib/errors';

const ONBOARDING_KEY = '@europa_onboarding_completed';

export async function hasCompletedOnboarding(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === 'true';
    } catch (error) {
        logger.error('Error reading onboarding status', error);
        return false;
    }
}

export async function setOnboardingCompleted(): Promise<void> {
    try {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (err) {
        logger.error('Error setting onboarding status', err);
    }
}