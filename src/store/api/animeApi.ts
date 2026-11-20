import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Anime, Episode, Season, LatestEpisodeItem } from '../../types/anime';
import { mergeIntoCatalog } from '../animeSlice';
import {
  getApiBaseUrl,
  getApiHeaders,
  createAnimeFromRaw,
  formatTitle,
  extractSlug,
  ANIMESALT_CARTOONS,
} from '../../services/api';

export interface HomepageResponse {
  animeList: Anime[];
  latestEpisodes: LatestEpisodeItem[];
}

export interface CatalogQueryArgs {
  kind: 'series' | 'movies' | 'cartoons';
  page: number;
}

export interface CatalogPageResponse {
  items: Anime[];
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export const animeApi = createApi({
  reducerPath: 'animeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: getApiBaseUrl(),
    prepareHeaders: (headers) => {
      const authHeaders = getApiHeaders();
      for (const [key, value] of Object.entries(authHeaders)) {
        headers.set(key, value);
      }
      return headers;
    },
  }),
  // Cache unused data for 10 minutes by default across all endpoints
  keepUnusedDataFor: 600,
  // Do NOT refetch on reconnect globally — mobile devices switch networks frequently
  // (WiFi → 4G → 5G) and global reconnect refetch causes unnecessary traffic spikes.
  // Individual high-staleness endpoints like homepage can opt-in locally if needed.
  refetchOnReconnect: false,
  // Do NOT refetch on mount — tabs are kept mounted and simply hidden/shown via
  // display:none, so mount events are not meaningful navigation signals here.
  refetchOnMountOrArgChange: false,
  endpoints: (builder) => ({
    // ─── 1. Homepage & Catalog Feed ─────────────────────────────────────────
    getHomepage: builder.query<HomepageResponse, void>({
      query: () => '/data/homepage',
      keepUnusedDataFor: 900, // 15 minutes
      transformResponse: (json: any) => {
        const results = json?.data?.results || json?.results || {};
        const animeMap = new Map<string, Anime>();

        const processItem = (
          raw: any,
          category: {
            isTrending?: boolean;
            isPopular?: boolean;
            isMovie?: boolean;
            isNew?: boolean;
            isOnAir?: boolean;
            isCartoon?: boolean;
          }
        ) => {
          const item = createAnimeFromRaw(raw, category);
          if (!item) return;

          if (!animeMap.has(item.id)) {
            animeMap.set(item.id, item);
          } else {
            const existing = animeMap.get(item.id)!;
            if (category.isTrending) existing.isTrending = true;
            if (category.isPopular) existing.isPopular = true;
            if (category.isNew) existing.isNew = true;
            if (category.isOnAir) existing.isOnAir = true;
            if (item.isCartoon) {
              existing.isCartoon = true;
              if (existing.isMovie) existing.isFreshCartoonFilm = true;
            }
          }
        };

        // Most Watched Series (Trending / Popular)
        (results.mostWatched_Series || []).forEach((item: any) =>
          processItem(item, { isTrending: true, isPopular: true })
        );

        // On Air Series
        (results.on_air_series || []).forEach((item: any) =>
          processItem(item, { isOnAir: true, isNew: true })
        );

        // Latest Anime Movies
        (results.latest_animeMovies || []).forEach((item: any) =>
          processItem(item, { isMovie: true, isNew: true })
        );

        // Most Watched Films
        (results.mostWatched_Films || []).forEach((item: any) =>
          processItem(item, { isMovie: true, isPopular: true })
        );

        // Real Latest Episode drops
        const freshDrops = results.fresh_drops || [];
        const latestEpisodeList: LatestEpisodeItem[] = [];

        freshDrops.forEach((drop: any) => {
          const itemSlug = extractSlug(drop.anime_id || drop.slug || drop.title || '');
          if (!itemSlug) return;

          processItem(drop, { isNew: true });

          let epNum = 1;
          if (drop.episode) {
            epNum = parseInt(String(drop.episode), 10) || 1;
          } else {
            const epNumMatch = (drop.episode_title || drop.title || '').match(/Episode\s*(\d+)/i);
            if (epNumMatch) epNum = parseInt(epNumMatch[1], 10);
          }

          let seasonNum = 1;
          if (drop.season) {
            seasonNum = parseInt(String(drop.season), 10) || 1;
          } else {
            const seasonNumMatch = (drop.season_title || drop.title || '').match(/Season\s*(\d+)/i);
            if (seasonNumMatch) seasonNum = parseInt(seasonNumMatch[1], 10);
          }

          latestEpisodeList.push({
            id: `fresh-${itemSlug}-${seasonNum}-${epNum}`,
            animeId: itemSlug,
            animeSlug: itemSlug,
            animeTitle: drop.title ? formatTitle(drop.title) : formatTitle(itemSlug),
            title: `Episode ${epNum}: Season ${seasonNum}`,
            episodeNumber: epNum,
            seasonNumber: seasonNum,
            displayEpisode: `EP ${epNum}`,
            thumbnail: drop.poster || 'https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg',
            poster: drop.poster || 'https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg',
            duration: '24m',
            releaseDate: 'Just Now',
            isHindiDubbed: true,
            anime: animeMap.get(itemSlug),
          });
        });

        // Curated Cartoon Library
        ANIMESALT_CARTOONS.forEach((c) => {
          processItem(
            {
              slug: c.slug,
              title: c.title,
              poster: c.poster,
              isMovie: c.isMovie,
              isCartoon: true,
            },
            {
              isMovie: c.isMovie,
              isCartoon: true,
              isPopular: true,
            }
          );
        });

        return {
          animeList: Array.from(animeMap.values()),
          latestEpisodes: latestEpisodeList,
        };
      },
    }),

    // ─── 2. Search Anime (Deduplicated, cached by normalized query) ───────────
    searchAnime: builder.query<Anime[], string>({
      query: (rawQuery) => {
        const q = rawQuery.trim().toLowerCase().replace(/\s+/g, ' ');
        return `/data/search?q=${encodeURIComponent(q)}`;
      },
      keepUnusedDataFor: 600, // 10 minutes cache
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data && data.length > 0) {
            dispatch(mergeIntoCatalog(data));
          }
        } catch {}
      },
      transformResponse: (response: any) => {
        const rawResults: any[] = response?.results || [];
        return rawResults
          .map((item) =>
            createAnimeFromRaw(item, {
              isMovie: Boolean(item.isMovie),
            })
          )
          .filter((a): a is Anime => a !== null);
      },
    }),

    // ─── 3. Detailed Anime Metadata (Seasons, Episodes, Synopsis) ────────────
    getAnimeDetails: builder.query<Partial<Anime> | null, string>({
      query: (slug) => {
        const clean = extractSlug(slug);
        return `/data/anime?slug=${encodeURIComponent(clean)}`;
      },
      keepUnusedDataFor: 1800, // 30 minutes
      transformResponse: (data: any, _meta, slug) => {
        if (!data) return null;
        const clean = extractSlug(slug);
        const rawSeasons: number[] = Array.isArray(data.seasons) ? data.seasons : [1];
        const s1RawEpisodes: any[] = Array.isArray(data.s1Episodes) ? data.s1Episodes : [];

        const seasons: Season[] = rawSeasons.map((sNum) => {
          const isS1 = sNum === 1;
          const episodes: Episode[] =
            isS1 && s1RawEpisodes.length > 0
              ? s1RawEpisodes.map((ep, idx) => ({
                  id: `ep-${clean}-${sNum}-${idx + 1}`,
                  episodeNumber: idx + 1,
                  title: ep.title ? `Episode ${idx + 1}: ${ep.title}` : `Episode ${idx + 1}`,
                  duration: '24:00',
                  thumbnail: ep.image || '',
                  hindiDubbed: true,
                  releaseDate: '2024',
                  synopsis: `Watch episode ${idx + 1} of season ${sNum} in Hindi audio.`,
                  downloadLinks: [],
                }))
              : [];

          return {
            seasonNumber: sNum,
            seasonName: `Season ${sNum}`,
            totalEpisodes: episodes.length > 0 ? episodes.length : 12,
            episodes,
          };
        });

        const genres = Array.isArray(data.genres) && data.genres.length > 0
          ? data.genres.map((g: string) => String(g).trim()).filter(Boolean)
          : undefined;

        return {
          id: clean,
          title: data.title ? formatTitle(data.title) : undefined,
          synopsis: data.synopsis,
          backdrop: data.backdrop,
          rating: data.rating ? Number(data.rating) : undefined,
          seasons,
          genres,
        };
      },
    }),

    // ─── 4. Season Episodes (Infinite/Lazy Pagination for Seasons) ───────────
    getSeasonEpisodes: builder.query<Episode[], { slug: string; season: number }>({
      query: ({ slug, season }) => {
        const clean = extractSlug(slug);
        return `/data/episodes?slug=${encodeURIComponent(clean)}&season=${season}`;
      },
      keepUnusedDataFor: 1800,
      transformResponse: (data: any, _meta, { slug, season }) => {
        const clean = extractSlug(slug);
        const rawEpisodes = Array.isArray(data?.episodes) ? data.episodes : [];
        return rawEpisodes.map((ep: any, idx: number) => ({
          id: `ep-${clean}-${season}-${idx + 1}`,
          episodeNumber: idx + 1,
          title: ep.title || `Episode ${idx + 1}`,
          duration: '24:00',
          thumbnail: ep.image || '',
          hindiDubbed: true,
          releaseDate: '2024',
          synopsis: `Watch episode ${idx + 1} of season ${season} in Hindi audio.`,
          downloadLinks: [],
        }));
      },
    }),

    // ─── 5. Paginated Catalog (Browse series, movies, cartoons) ─────────────
    getCatalog: builder.query<CatalogPageResponse, CatalogQueryArgs>({
      query: ({ kind, page }) => `/data/catalog?kind=${kind}&page=${page}`,
      keepUnusedDataFor: 900,
      // Each {kind, page} combination is a separate cache entry
      serializeQueryArgs: ({ queryArgs }) => `${queryArgs.kind}-${queryArgs.page}`,
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.items?.length) {
            dispatch(mergeIntoCatalog(data.items));
          }
        } catch {}
      },
      transformResponse: (response: any, _meta, { kind, page }) => {
        const inner = response?.results || {};
        const rawList: any[] = Array.isArray(inner.results) ? inner.results : (Array.isArray(inner) ? inner : []);
        const totalPages: number = inner.totalPages ?? 1;
        const currentPage: number = inner.currentPage ?? page;
        const items = rawList
          .map((item: any) =>
            createAnimeFromRaw(item, {
              isMovie: kind === 'movies',
              isCartoon: kind === 'cartoons',
            })
          )
          .filter((a: any): a is Anime => a !== null);
        return {
          items,
          currentPage,
          totalPages,
          hasMore: currentPage < totalPages,
        };
      },
    }),
  }),
});

export const {
  useGetHomepageQuery,
  useSearchAnimeQuery,
  useLazySearchAnimeQuery,
  useGetAnimeDetailsQuery,
  useGetSeasonEpisodesQuery,
  useGetCatalogQuery,
} = animeApi;

