import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'kerabie:sdk:';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const StorageService = {
  async set(key: string, value: unknown): Promise<void> {
    const entry = { value, ts: Date.now() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  },

  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw);
      if (Date.now() - entry.ts > SESSION_TTL_MS) {
        await AsyncStorage.removeItem(PREFIX + key);
        return null;
      }
      return entry.value as T;
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(PREFIX + key);
  },

  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const sdkKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (sdkKeys.length > 0) await (AsyncStorage as any).multiRemove(sdkKeys);
  },
};
