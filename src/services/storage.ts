/**
 * Local Mobile Storage Service for React Native
 * 100% on-device storage using AsyncStorage.
 * No external database or signup required.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Anime, LatestEpisodeItem } from '../types/anime';

export interface WatchHistoryItem {
  animeId: string;
  animeTitle: string;
  poster: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeTitle?: string;
  progressSeconds: number;
  durationSeconds: number;
  updatedAt: number;
}

const STORAGE_KEYS = {
  WATCHLIST: 'hindianime_watchlist_v1',
  FAVORITES: 'hindianime_favorites_v1',
  WATCH_HISTORY: 'hindianime_history_v1',
  USER_PREFERENCES: 'hindianime_prefs_v1',
  USER_PROFILE: 'hindianime_profile_v1',
  HOMEPAGE_SNAPSHOT: 'hindianime_homepage_v1',
} as const;

export interface HomepageSnapshot {
  savedAt: number;
  animeList: Anime[];
  latestEpisodes: LatestEpisodeItem[];
}

export interface UserPreferences {
  defaultAudio: 'Hindi' | 'Japanese' | 'English' | 'Tamil' | 'Malayalam';
  autoPlayNext: boolean;
  defaultSpeed: number;
  skipIntroEnabled: boolean;
  downloadWifiOnly: boolean;
  dataSaver: boolean;
  defaultQuality: 'auto' | '1080p' | '720p' | '480p' | '360p';
}

export interface UserProfile {
  displayName: string;
  handle: string;
  bio: string;
  avatarEmoji: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultAudio: 'Hindi',
  autoPlayNext: true,
  defaultSpeed: 1,
  skipIntroEnabled: true,
  downloadWifiOnly: true,
  dataSaver: false,
  defaultQuality: 'auto',
};

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Anime Fan',
  handle: 'hindianime_user',
  bio: 'Otaku Streamer',
  avatarEmoji: '🎌',
};

// In-memory memory cache for synchronous instant access
const memCache = {
  watchlist: [] as string[],
  favorites: [] as string[],
  history: [] as WatchHistoryItem[],
  preferences: DEFAULT_PREFERENCES as UserPreferences,
  profile: DEFAULT_PROFILE as UserProfile,
  snapshot: null as HomepageSnapshot | null,
  isHydrated: false,
};

// Snapshots older than 24 hours are ignored on cold launch — RTK Query will
// fetch fresh data in the background and overwrite with new content.
const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export const LocalStorageService = {
  /**
   * Hydrates memory cache from AsyncStorage on app launch
   */
  async init(): Promise<void> {
    try {
      const [wl, fav, hist, prefs, snap, prof] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.WATCHLIST),
        AsyncStorage.getItem(STORAGE_KEYS.FAVORITES),
        AsyncStorage.getItem(STORAGE_KEYS.WATCH_HISTORY),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES),
        AsyncStorage.getItem(STORAGE_KEYS.HOMEPAGE_SNAPSHOT),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
      ]);

      const safeParse = <T>(val: string | null, fallback: T): T => {
        if (!val) return fallback;
        try {
          const parsed = JSON.parse(val);
          return parsed !== null && parsed !== undefined ? parsed : fallback;
        } catch {
          return fallback;
        }
      };

      memCache.watchlist = safeParse(wl, []);
      memCache.favorites = safeParse(fav, []);
      memCache.history = safeParse(hist, []);
      memCache.preferences = { ...DEFAULT_PREFERENCES, ...safeParse(prefs, {}) };
      memCache.profile = { ...DEFAULT_PROFILE, ...safeParse(prof, {}) };
      if (snap) {
        try {
          const parsed = JSON.parse(snap);
          if (parsed && Array.isArray(parsed.animeList) && parsed.animeList.length > 0) {
            // Reject snapshots older than 24 hours — stale data should not persist indefinitely
            const age = Date.now() - (parsed.savedAt || 0);
            if (age <= SNAPSHOT_MAX_AGE_MS) {
              memCache.snapshot = parsed;
            } else {
              AsyncStorage.removeItem(STORAGE_KEYS.HOMEPAGE_SNAPSHOT).catch(() => {});
            }
          } else {
            AsyncStorage.removeItem(STORAGE_KEYS.HOMEPAGE_SNAPSHOT).catch(() => {});
          }
        } catch {
          AsyncStorage.removeItem(STORAGE_KEYS.HOMEPAGE_SNAPSHOT).catch(() => {});
        }
      }
      memCache.isHydrated = true;
    } catch (e) {
      console.warn('[LocalStorageService] Hydration error:', e);
    }
  },

  getWatchlist(): string[] {
    return memCache.watchlist;
  },

  async saveToWatchlist(animeId: string): Promise<string[]> {
    if (!memCache.watchlist.includes(animeId)) {
      memCache.watchlist = [animeId, ...memCache.watchlist];
      await AsyncStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(memCache.watchlist)).catch(() => {});
    }
    return memCache.watchlist;
  },

  async removeFromWatchlist(animeId: string): Promise<string[]> {
    memCache.watchlist = memCache.watchlist.filter((id) => id !== animeId);
    await AsyncStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(memCache.watchlist)).catch(() => {});
    return memCache.watchlist;
  },

  toggleWatchlist(animeId: string): { isSaved: boolean; list: string[] } {
    const isSaved = memCache.watchlist.includes(animeId);
    memCache.watchlist = isSaved
      ? memCache.watchlist.filter((id) => id !== animeId)
      : [animeId, ...memCache.watchlist];

    AsyncStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(memCache.watchlist)).catch(() => {});
    return { isSaved: !isSaved, list: memCache.watchlist };
  },

  getFavorites(): string[] {
    return memCache.favorites;
  },

  toggleFavorite(animeId: string): { isFavorite: boolean; list: string[] } {
    const isFavorite = memCache.favorites.includes(animeId);
    memCache.favorites = isFavorite
      ? memCache.favorites.filter((id) => id !== animeId)
      : [animeId, ...memCache.favorites];

    AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(memCache.favorites)).catch(() => {});
    return { isFavorite: !isFavorite, list: memCache.favorites };
  },

  getWatchHistory(): WatchHistoryItem[] {
    return memCache.history;
  },

  getAnimeProgress(animeId: string): WatchHistoryItem | undefined {
    return memCache.history.find((h) => h.animeId === animeId);
  },

  updateWatchProgress(item: Omit<WatchHistoryItem, 'updatedAt'>): void {
    const existingIndex = memCache.history.findIndex((h) => h.animeId === item.animeId);
    const updatedItem: WatchHistoryItem = {
      ...item,
      updatedAt: Date.now(),
    };

    if (existingIndex !== -1) {
      memCache.history = [updatedItem, ...memCache.history.filter((_, idx) => idx !== existingIndex)];
    } else {
      memCache.history = [updatedItem, ...memCache.history];
    }

    if (memCache.history.length > 100) {
      memCache.history = memCache.history.slice(0, 100);
    }

    AsyncStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(memCache.history)).catch(() => {});
  },

  clearWatchHistory(): void {
    memCache.history = [];
    AsyncStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify([])).catch(() => {});
  },

  removeWatchHistoryItem(animeId: string): WatchHistoryItem[] {
    memCache.history = memCache.history.filter((h) => h.animeId !== animeId);
    AsyncStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(memCache.history)).catch(() => {});
    return memCache.history;
  },

  getPreferences(): UserPreferences {
    return memCache.preferences;
  },

  setPreferences(prefs: Partial<UserPreferences>): UserPreferences {
    memCache.preferences = { ...memCache.preferences, ...prefs };
    AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(memCache.preferences)).catch(() => {});
    return memCache.preferences;
  },

  getProfile(): UserProfile {
    return memCache.profile;
  },

  setProfile(updates: Partial<UserProfile>): UserProfile {
    memCache.profile = { ...memCache.profile, ...updates };
    AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(memCache.profile)).catch(() => {});
    return memCache.profile;
  },

  getHomepageSnapshot(): HomepageSnapshot | null {
    return memCache.snapshot;
  },

  saveHomepageSnapshot(animeList: Anime[], latestEpisodes: LatestEpisodeItem[]): void {
    if (!Array.isArray(animeList) || animeList.length === 0) return;
    memCache.snapshot = {
      savedAt: Date.now(),
      animeList,
      latestEpisodes: latestEpisodes || [],
    };
    AsyncStorage.setItem(STORAGE_KEYS.HOMEPAGE_SNAPSHOT, JSON.stringify(memCache.snapshot)).catch(() => {});
  },
};
