import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@europa_onboarding_completed';

export async function hasCompletedOnboarding(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(ONBOARDING_KEY);
        return value === 'true';
    } catch (error) {
        console.error('Error reading onboarding status:', error);
        return false;
    }
}

export async function setOnboardingCompleted(): Promise<void> {
    try {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (err) {
        console.error('Error setting onboarding status:', err);
    }
}