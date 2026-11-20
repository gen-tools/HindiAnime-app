import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Anime, LatestEpisodeItem } from '../types/anime';
import { SAMPLE_ANIME_DATA } from '../data/sampleAnime';
import { HindiAnimeApi } from '../services/api';
import { LocalStorageService, WatchHistoryItem } from '../services/storage';

export interface AnimeState {
  animeList: Anime[];
  latestEpisodes: LatestEpisodeItem[];
  selectedAnime: Anime | null;
  // Stream URL cache: `${animeId}_s${season}_ep${ep}` -> direct/signed HLS URL
  streamCache: Record<string, string>;
  fallbackCache: Record<string, string>;
  savedAnimeIds: string[];
  favoriteAnimeIds: string[];
  watchHistory: WatchHistoryItem[];
  homepageLoaded: boolean;
  streamLoading: boolean;
  streamError: string | null;
}

const initialState: AnimeState = {
  animeList: SAMPLE_ANIME_DATA,
  latestEpisodes: [],
  selectedAnime: null,
  streamCache: {},
  fallbackCache: {},
  savedAnimeIds: ['naruto-shippuden', 'jujutsu-kaisen', 'solo-leveling'],
  favoriteAnimeIds: ['naruto-shippuden', 'one-piece', 'jujutsu-kaisen'],
  watchHistory: [],
  homepageLoaded: false,
  streamLoading: false,
  streamError: null,
};

// Async thunk to resolve stream URL (cached in streamCache; video/playback resolution)
export const resolveStream = createAsyncThunk(
  'anime/resolveStream',
  async (
    payload: { animeId: string; season: number; episode: number; isMovie?: boolean; forceRefresh?: boolean },
    { getState, rejectWithValue }
  ) => {
    const { animeId, season, episode, isMovie = false, forceRefresh = false } = payload;
    const cacheKey = isMovie ? `${animeId}_movie` : `${animeId}_s${season}_ep${episode}`;
    const state = getState() as { anime: AnimeState };

    if (!forceRefresh && state.anime.streamCache[cacheKey]) {
      return {
        cacheKey,
        streamUrl: state.anime.streamCache[cacheKey],
        fallbackUrl: state.anime.fallbackCache?.[cacheKey] || '',
      };
    }

    try {
      const res = await HindiAnimeApi.resolveDirectHlsStream(animeId, season, episode, isMovie);
      if (res && res.streamUrl) {
        return {
          cacheKey,
          streamUrl: res.streamUrl,
          fallbackUrl: res.fallbackUrl || '',
        };
      }
      return rejectWithValue('Check your internet connection');
    } catch (err: any) {
      return rejectWithValue('Check your internet connection');
    }
  }
);

export const animeSlice = createSlice({
  name: 'anime',
  initialState,
  reducers: {
    hydrateStorage: (
      state,
      action: PayloadAction<{
        savedAnimeIds: string[];
        favoriteAnimeIds: string[];
        cachedList?: Anime[];
        cachedLatest?: LatestEpisodeItem[];
        watchHistory?: WatchHistoryItem[];
      }>
    ) => {
      if (action.payload.savedAnimeIds?.length) {
        state.savedAnimeIds = action.payload.savedAnimeIds;
      }
      if (action.payload.favoriteAnimeIds?.length) {
        state.favoriteAnimeIds = action.payload.favoriteAnimeIds;
      }
      if (action.payload.cachedList?.length) {
        state.animeList = action.payload.cachedList;
      }
      if (action.payload.cachedLatest?.length) {
        state.latestEpisodes = action.payload.cachedLatest;
      }
      if (action.payload.watchHistory) {
        state.watchHistory = action.payload.watchHistory;
      }
    },
    setHomepageFeed: (
      state,
      action: PayloadAction<{
        animeList: Anime[];
        latestEpisodes: LatestEpisodeItem[];
      }>
    ) => {
      state.homepageLoaded = true;
      // Merge homepage items into canonical pool while preserving any paginated additions
      const map = new Map<string, Anime>();
      action.payload.animeList.forEach((a) => map.set(a.id, a));
      state.animeList.forEach((a) => {
        if (!map.has(a.id)) map.set(a.id, a);
      });
      state.animeList = Array.from(map.values());
      state.latestEpisodes = action.payload.latestEpisodes;
    },
    mergeIntoCatalog: (state, action: PayloadAction<Anime[]>) => {
      const map = new Map<string, Anime>();
      state.animeList.forEach((a) => map.set(a.id, a));
      action.payload.forEach((a) => map.set(a.id, a));
      state.animeList = Array.from(map.values());
    },
    updateWatchHistory: (state, action: PayloadAction<WatchHistoryItem>) => {
      const existingIdx = state.watchHistory.findIndex((h) => h.animeId === action.payload.animeId);
      if (existingIdx !== -1) {
        state.watchHistory = [action.payload, ...state.watchHistory.filter((_, i) => i !== existingIdx)];
      } else {
        state.watchHistory = [action.payload, ...state.watchHistory];
      }
      if (state.watchHistory.length > 100) {
        state.watchHistory = state.watchHistory.slice(0, 100);
      }
    },
    removeWatchHistory: (state, action: PayloadAction<string>) => {
      state.watchHistory = state.watchHistory.filter((h) => h.animeId !== action.payload);
    },
    clearWatchHistory: (state) => {
      state.watchHistory = [];
    },
    setSelectedAnime: (state, action: PayloadAction<Anime | null>) => {
      state.selectedAnime = action.payload;
      state.streamError = null;
    },
    toggleSaveAnime: (state, action: PayloadAction<string>) => {
      const animeId = action.payload;
      const { list } = LocalStorageService.toggleWatchlist(animeId);
      state.savedAnimeIds = list;
    },
    toggleFavoriteAnime: (state, action: PayloadAction<string>) => {
      const animeId = action.payload;
      const { list } = LocalStorageService.toggleFavorite(animeId);
      state.favoriteAnimeIds = list;
    },
    clearStreamError: (state) => {
      state.streamError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Stream resolve
      .addCase(resolveStream.pending, (state) => {
        state.streamLoading = true;
        state.streamError = null;
      })
      .addCase(resolveStream.fulfilled, (state, action) => {
        state.streamLoading = false;
        state.streamCache[action.payload.cacheKey] = action.payload.streamUrl;
        if (action.payload.fallbackUrl) {
          state.fallbackCache[action.payload.cacheKey] = action.payload.fallbackUrl;
        }
        // Cap stream cache at 12 entries to prevent unbounded RAM growth across a session.
        const cacheKeys = Object.keys(state.streamCache);
        if (cacheKeys.length > 12) {
          const toRemove = cacheKeys.slice(0, cacheKeys.length - 12);
          toRemove.forEach((k) => {
            delete state.streamCache[k];
            delete state.fallbackCache[k];
          });
        }
      })
      .addCase(resolveStream.rejected, (state, action) => {
        state.streamLoading = false;
        state.streamError = (action.payload as string) || 'Check your internet connection';
      });
  },
});

export const {
  hydrateStorage,
  setHomepageFeed,
  mergeIntoCatalog,
  updateWatchHistory,
  removeWatchHistory,
  clearWatchHistory,
  setSelectedAnime,
  toggleSaveAnime,
  toggleFavoriteAnime,
  clearStreamError,
} = animeSlice.actions;

export default animeSlice.reducer;
