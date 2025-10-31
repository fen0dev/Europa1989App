import * as SecureStore from 'expo-secure-store';

const KEY_PREFIX = 'sb-'; // separa namespace

export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(KEY_PREFIX + key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(KEY_PREFIX + key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(KEY_PREFIX + key),
};