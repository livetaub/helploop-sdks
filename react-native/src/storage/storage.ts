import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';

/**
 * Persistent storage wrapper for the SupportHub SDK.
 * Uses @react-native-async-storage/async-storage under the hood.
 */
export class SupportHubStorage {
  /**
   * Get or generate an anonymous user ID.
   * Returns an existing stored ID, or creates and persists a new UUID.
   */
  static async getAnonymousId(): Promise<string> {
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID);
      if (existing) {
        return existing;
      }

      const newId = SupportHubStorage.generateUUID();
      await AsyncStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, newId);
      return newId;
    } catch {
      // Fallback: generate but don't persist
      return SupportHubStorage.generateUUID();
    }
  }

  /**
   * Store the current user's external ID.
   */
  static async setExternalId(id: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.EXTERNAL_ID, id);
  }

  /**
   * Retrieve the stored external ID.
   */
  static async getExternalId(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_KEYS.EXTERNAL_ID);
  }

  /**
   * Store the full user identity JSON.
   */
  static async setUserIdentity(identity: Record<string, any>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_IDENTITY, JSON.stringify(identity));
  }

  /**
   * Retrieve the stored user identity.
   */
  static async getUserIdentity(): Promise<Record<string, any> | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_IDENTITY);
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * Cache project settings.
   */
  static async cacheSettings(settings: Record<string, any>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS_CACHE, JSON.stringify(settings));
  }

  /**
   * Retrieve cached project settings.
   */
  static async getCachedSettings(): Promise<Record<string, any> | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_CACHE);
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * Clear all SupportHub storage.
   */
  static async clear(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  }

  /**
   * Generate a v4-style UUID without external dependencies.
   */
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
