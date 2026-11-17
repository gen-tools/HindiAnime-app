import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Anime, LatestEpisodeItem } from '../types/anime';
import { SAMPLE_ANIME_DATA } from '../data/sampleAnime';
import { HindiAnimeApi } from '../services/api';
import { LocalStorageService } from '../services/storage';

export interface AnimeState {
  animeList: Anime[];
  latestEpisodes: LatestEpisodeItem[];
  selectedAnime: Anime | null;
  // Stream URL cache: `${animeId}_s${season}_ep${ep}` -> direct/signed HLS URL
  streamCache: Record<string, string>;
  fallbackCache: Record<string, string>;
  savedAnimeIds: string[];
  favoriteAnimeIds: string[];
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
      return rejectWithValue('Stream currently unavailable.');
    } catch (err: any) {
      return rejectWithValue(err.message || 'Stream connection error');
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
    },
    setHomepageFeed: (
      state,
      action: PayloadAction<{
        animeList: Anime[];
        latestEpisodes: LatestEpisodeItem[];
      }>
    ) => {
      state.homepageLoaded = true;
      state.animeList = action.payload.animeList;
      state.latestEpisodes = action.payload.latestEpisodes;
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
        // HLS URLs are IP-signed and ephemeral anyway — no value keeping large history.
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
        state.streamError = (action.payload as string) || 'Stream currently unavailable.';
      });
  },
});

export const {
  hydrateStorage,
  setHomepageFeed,
  setSelectedAnime,
  toggleSaveAnime,
  toggleFavoriteAnime,
  clearStreamError,
} = animeSlice.actions;

export default animeSlice.reducer;
