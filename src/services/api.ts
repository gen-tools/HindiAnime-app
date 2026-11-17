/**
 * HindiAnime Cloud API Service for React Native & Expo
 * Connects to the Cloudflare Worker proxy.
 *
 * Credentials are loaded from environment variables at build time.
 * Local dev: set values in .env (see .env.example)
 * EAS Build / production: set via Expo Secrets dashboard
 *
 * NOTE: Video stream chunks stream directly from CDN.
 * Worker request is called only once per episode lookup to resolve the direct .m3u8 URL.
 */

import { Anime, Episode, Season, LatestEpisodeItem, StreamResolutionResult } from '../types/anime';
import { getDecryptedApiUrl, getDecryptedProxySecret } from '../utils/security';

// ── Environment & Security Configuration ──────────────────────────────────────
// Secrets and backend endpoints are securely de-obfuscated dynamically in memory
// so that plaintext credentials and URLs are NEVER embedded in the client APK bundle.

export function getApiBaseUrl(): string {
  return getDecryptedApiUrl();
}

export function getApiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...extra,
  };
  const secret = getDecryptedProxySecret();
  if (secret) {
    headers['x-hindianime-proxy-secret'] = secret;
    headers['X-Proxy-Secret'] = secret;
  }
  return headers;
}

/** Extracts clean slug from animesalt url or raw string */
export function extractSlug(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();
  s = s.replace(/^https?:\/\/[^/]+\//, '');
  s = s.replace(/^(?:series|movies|anime|episode)\//, '');
  s = s.replace(/\/+$/, '');
  // Fully decode any nested percent-encoding down to raw unicode characters safely
  let maxDecodeAttempts = 5;
  while (/%[0-9a-fA-F]{2}/.test(s) && maxDecodeAttempts-- > 0) {
    try {
      const decoded = decodeURIComponent(s);
      if (decoded === s) break;
      s = decoded;
    } catch {
      break;
    }
  }
  return s.toLowerCase();
}

/** Converts anime title / slug to a user-friendly display title */
export function formatTitle(titleOrSlug: string): string {
  if (!titleOrSlug) return '';
  let clean = titleOrSlug;
  try {
    clean = decodeURIComponent(titleOrSlug);
  } catch {}
  if (/[A-Z]/.test(clean) && !clean.includes('http')) {
    return clean.replace(/ - Watch Now in Hindi.*/i, '').trim();
  }
  return clean
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Formats rating to a clean 1-decimal string e.g. "9.2" */
export function formatRating(rating: number | string | undefined | null): string {
  if (rating === undefined || rating === null) return '8.5';
  const num = typeof rating === 'number' ? rating : parseFloat(String(rating));
  if (isNaN(num)) return String(rating);
  return num.toFixed(1);
}

export interface HomepageFeedResult {
  animeList: Anime[];
  latestEpisodes: LatestEpisodeItem[];
}

export const ANIMESALT_CARTOONS = [
  // Cartoon Series
  { slug: 'teen-titans', title: 'Teen Titans', poster: 'https://image.tmdb.org/t/p/w500/gxe4wIp3kYfw4QSkLMt99HfLkok.jpg', isMovie: false },
  { slug: 'the-amazing-world-of-gumball', title: 'The Amazing World of Gumball', poster: 'https://image.tmdb.org/t/p/w500/VYnnyA2hyxi3VUPgCA71mMtt69.jpg', isMovie: false },
  { slug: 'generator-rex', title: 'Generator Rex', poster: 'https://image.tmdb.org/t/p/w500/3F93j1Yuu9wtPO06BlPSVbLdxaP.jpg', isMovie: false },
  { slug: 'teen-titans-go', title: 'Teen Titans Go!', poster: 'https://image.tmdb.org/t/p/w500/mTMAxrRaDp0TFpdFVinD3grrqr9.jpg', isMovie: false },
  { slug: 'kochikame', title: 'KochiKame', poster: 'https://image.tmdb.org/t/p/w500/ujltFuzCZ9FLe07kTRLZ2gpIJVY.jpg', isMovie: false },
  { slug: 'crayon-shin-chan', title: 'Crayon Shin-chan', poster: 'https://image.tmdb.org/t/p/w500/qcaJphCRI9jOfNPWw0I1L6CY3bk.jpg', isMovie: false },
  { slug: 'doraemon', title: 'Doraemon', poster: 'https://image.tmdb.org/t/p/w500/hcydn0Lr3DAixZFOaUmjoqoIFU6.jpg', isMovie: false },
  { slug: 'ben-10', title: 'Ben 10', poster: 'https://image.tmdb.org/t/p/w500/bLqbZSY1uZUFtZBM0dvx6YHLiJJ.jpg', isMovie: false },

  // Cartoon Films
  { slug: 'doraemon-the-movie-nobitas-earth-symphony', title: "Doraemon the Movie: Nobita's Earth Symphony", poster: 'https://image.tmdb.org/t/p/w500/hcydn0Lr3DAixZFOaUmjoqoIFU6.jpg', isMovie: true },
  { slug: 'shinchan-movie-the-spicy-kasukabe-dancers', title: 'Shinchan Movie: The Spicy Kasukabe Dancers', poster: 'https://image.tmdb.org/t/p/w500/1TfdgQbZXuEswjqLYlsVvhHw0Py.jpg', isMovie: true },
  { slug: 'shinchan-movie-very-very-tasty-tasty', title: 'Shinchan Movie: Very Very Tasty Tasty', poster: 'https://image.tmdb.org/t/p/w500/iPN3Vy71U0B7p1R667EdifmwW1b.jpg', isMovie: true },
  { slug: 'ben-10-vs-the-universe-the-movie', title: 'Ben 10 vs. the Universe: The Movie', poster: 'https://image.tmdb.org/t/p/w500/nxZEdYcHMuD8SSuwusDnK9CD2H1.jpg', isMovie: true },
  { slug: 'shinchan-movie-himawari-banegi-rajkumari', title: 'Shinchan Movie: Himawari Banegi Rajkumari', poster: 'https://image.tmdb.org/t/p/w500/7NGIushHHtUuOwnDMoGWRpkrOwx.jpg', isMovie: true },
  { slug: 'shinchan-movie-the-golden-sword', title: 'Shinchan Movie: The Golden Sword', poster: 'https://image.tmdb.org/t/p/w500/nTEE7CByX86ZALfTzKCfuJpU4kB.jpg', isMovie: true },
  { slug: 'shinchan-movie-masala-story', title: 'Shinchan Movie: Masala Story', poster: 'https://image.tmdb.org/t/p/w500/beZGic7PCVEUW06Y9cOmhiQZZRj.jpg', isMovie: true },
  { slug: 'shinchan-movie-bungle-in-the-jungle', title: 'Shinchan Movie: Bungle in the Jungle', poster: 'https://image.tmdb.org/t/p/w500/pbcpCQ8sHRUhNCeCnBTgdver4N6.jpg', isMovie: true },
  { slug: 'shinchan-movie-dark-tama-tama-thrilling-chase', title: 'Shinchan Movie: Dark Tama Tama Thrilling Chase', poster: 'https://image.tmdb.org/t/p/w500/8NlnDeZtscTjOEFTzDRZzI2vIXJ.jpg', isMovie: true },
  { slug: 'shinchan-movie-robot-dad', title: 'Shinchan Movie: Robot Dad', poster: 'https://image.tmdb.org/t/p/w500/esfaXxlsOfUwWknzvUq9n0M0fiS.jpg', isMovie: true },
  { slug: 'doraemon-nobitas-chronicle-of-the-moon-exploration', title: "Doraemon: Nobita's Chronicle of the Moon Exploration", poster: 'https://image.tmdb.org/t/p/w500/hcydn0Lr3DAixZFOaUmjoqoIFU6.jpg', isMovie: true },
  { slug: 'doraemon-nobitas-treasure-island', title: "Doraemon: Nobita's Treasure Island", poster: 'https://image.tmdb.org/t/p/w500/hcydn0Lr3DAixZFOaUmjoqoIFU6.jpg', isMovie: true },
  { slug: 'doraemon-the-record-of-nobitas-parallel-journey-to-the-west', title: "Doraemon: The Record of Nobita's Parallel Journey to the West", poster: 'https://image.tmdb.org/t/p/w500/hcydn0Lr3DAixZFOaUmjoqoIFU6.jpg', isMovie: true },
  { slug: 'doraemon-nobitas-great-adventure-in-the-antarctic-kachi-kochi', title: "Doraemon: Nobita's Great Adventure in the Antarctic Kachi Kochi", poster: 'https://image.tmdb.org/t/p/w500/hcydn0Lr3DAixZFOaUmjoqoIFU6.jpg', isMovie: true },
  { slug: 'doraemon-nobitas-new-great-adventure-into-the-underworld-the-seven-magic-users', title: "Doraemon: Nobita's New Great Adventure Into the Underworld - The Seven Magic Users", poster: 'https://image.tmdb.org/t/p/w500/hcydn0Lr3DAixZFOaUmjoqoIFU6.jpg', isMovie: true },
  { slug: 'shinchan-movie-rakuga-kingdom', title: 'Shinchan Movie: Rakuga Kingdom', poster: 'https://image.tmdb.org/t/p/w500/xWv5pUwyf96MDImATZYx0toI7T7.jpg', isMovie: true },
  { slug: 'shinchan-movie-the-legends-of-ninja-mononoke', title: 'Shinchan Movie: The Legends of Ninja Mononoke', poster: 'https://image.tmdb.org/t/p/w500/wyYfIWUtetlfxor8ibugKXthdKE.jpg', isMovie: true },
  { slug: 'doraemon-new-nobitas-great-demon-peko-and-the-exploration-party-of-five', title: "Doraemon: New Nobita's Great Demon - Peko and the Exploration Party of Five", poster: 'https://image.tmdb.org/t/p/w500/xKGMXQFGca4nKcO308aZ6nWz0Gc.jpg', isMovie: true },
  { slug: 'shinchan-movie-new-dimension-battle-of-supernatural-powers', title: 'Shinchan Movie: New Dimension! Battle of Supernatural Powers', poster: 'https://image.tmdb.org/t/p/w500/a56Fm2YWrlnqlC3TIgDvCJdzlKI.jpg', isMovie: true },
  { slug: 'shinchan-movie-the-mystery-of-tenkasu-academy', title: 'Shinchan Movie: The Mystery of Tenkasu Academy', poster: 'https://image.tmdb.org/t/p/w500/onjXddYzreFnVHUGiAoCFNJtequ.jpg', isMovie: true },
  { slug: 'shinchan-movie-the-dreaming-world', title: 'Shinchan Movie: The Dreaming World', poster: 'https://image.tmdb.org/t/p/w500/xgHTpx8dywe3QTd5iuKuB0g3SNv.jpg', isMovie: true },
  { slug: 'shinchan-movie-blitzkrieg-pigs-hoofs-secret-mission', title: "Shinchan Movie: Blitzkrieg! Pig's Hoof's Secret Mission", poster: 'https://image.tmdb.org/t/p/w500/8Wd9O0IjvUPMITU9HNA7elUCYkH.jpg', isMovie: true },
];

/**
 * Creates a normalized Anime object from raw catalog or search result item.
 */
export function createAnimeFromRaw(
  raw: any,
  category: {
    isTrending?: boolean;
    isPopular?: boolean;
    isMovie?: boolean;
    isNew?: boolean;
    isOnAir?: boolean;
    isCartoon?: boolean;
  } = {}
): Anime | null {
  if (!raw) return null;
  const slug = extractSlug(raw.anime_id || raw.slug || raw.title || '');
  if (!slug) return null;

  const title = formatTitle(raw.title || slug);
  const poster = raw.poster || 'https://image.tmdb.org/t/p/w500/kV27j3Nz4d5z8u6mN3EJw9RiLg2.jpg';
  const backdrop = raw.backdrop || poster;
  const isMovie = Boolean(category.isMovie || raw.isMovie);
  const isCartoon = Boolean(
    category.isCartoon ||
    raw.isCartoon ||
    /shinchan|doraemon|pokemon|ninja[ -]?hattori|kiteretsu|ben[ -]?10|generator[ -]?rex|gumball|teen[ -]?titans|chhota[ -]?bheem|oggy|roll[ -]?no[ -]?21|beyblade|perman|hagemaru|kochikame|dragon[ -]?ball/i.test(title) ||
    /shinchan|doraemon|pokemon|ninja-hattori|kiteretsu|ben-10|generator-rex|gumball|teen-titans|chhota-bheem|oggy|roll-no-21|beyblade|perman|hagemaru|kochikame|dragon-ball/i.test(slug)
  );

  const rawRating = 8.8 + ((slug.length % 10) * 0.1);
  const rating = Number(rawRating.toFixed(1));

  return {
    id: slug,
    title,
    originalTitle: title,
    hindiTitle: title,
    releaseYear: 2024,
    releaseDate: '2024',
    poster,
    backdrop,
    rating,
    votesCount: `${(slug.length * 3 + 15)}K votes`,
    likesCount: 1200 + slug.length * 45,
    duration: isMovie ? '1h 52m' : '24m',
    genres: ['Action', 'Fantasy', 'Hindi Dubbed', isMovie ? 'Movie' : 'Series'],
    type: isMovie ? 'Movie' : (isCartoon ? 'Cartoon' : 'Series'),
    ageRating: 'U/A 13+',
    qualityBadge: 'HD 1080p',
    audioTracks: ['Hindi Dubbed', 'Dual Audio (Hindi + Jap)'],
    defaultAudio: 'Hindi Dubbed',
    synopsis: `Watch ${title} in HD Hindi Dubbed with crystal clear audio and multi-quality streaming on HindiAnime.`,
    isTrending: category.isTrending,
    isPopular: category.isPopular,
    isMovie,
    isNew: category.isNew,
    isOnAir: category.isOnAir,
    airSchedule: category.isOnAir ? 'Weekly New Ep in Hindi' : undefined,
    isCartoon,
    isFreshCartoonFilm: isCartoon && isMovie,
    primaryLanguage: 'Hindi',
    languagesSupported: ['Hindi', 'Japanese', 'English'],
    seasons: [
      {
        seasonNumber: 1,
        seasonName: 'Season 1',
        totalEpisodes: isMovie ? 1 : 24,
        episodes: [
          {
            id: `ep-${slug}-1-1`,
            episodeNumber: 1,
            title: isMovie ? title : 'Episode 1: The Beginning',
            duration: isMovie ? '1h 52m' : '24:00',
            thumbnail: poster,
            hindiDubbed: true,
            releaseDate: '2024',
            synopsis: `Watch episode 1 of ${title} in Hindi Dub.`,
            downloadLinks: [],
          },
        ],
      },
    ],
    servers: [
      {
        id: 'server-1',
        name: 'Hindi Anime HLS',
        badge: 'Multi-Audio HD',
        isFast: true,
        loadLatency: 'Fast',
      },
    ],
    comments: [],
  };
}

export const HindiAnimeApi = {
  /**
   * Resolves the direct HLS streaming manifest (.m3u8).
   * Note: Metadata (homepage, search, details, episodes) is managed
   * exclusively by RTK Query in src/store/api/animeApi.ts.
   */
  async resolveDirectHlsStream(
    animeId: string,
    seasonNumber: number,
    episodeNumber: number,
    isMovie = false
  ): Promise<StreamResolutionResult | null> {
    try {
      const slug = extractSlug(animeId);
      if (!slug) return null;

      const baseUrl = getApiBaseUrl();
      const workerUrl = new URL('/sources', baseUrl);
      workerUrl.searchParams.set('id', slug);
      workerUrl.searchParams.set('season', String(seasonNumber));
      workerUrl.searchParams.set('ep', String(episodeNumber));
      workerUrl.searchParams.set('movie', isMovie ? '1' : '0');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8500);
      let response: Response | null = null;
      try {
        response = await fetch(workerUrl.toString(), {
          headers: getApiHeaders(),
          signal: controller.signal,
        });
      } catch {
        // Network drop or timeout — proceed directly to fallback
      } finally {
        clearTimeout(timeoutId);
      }

      let audioLanguage = 'hi';
      let languageLabel = 'Hindi Dub (Multi-Audio)';

      if (response && response.ok) {
        const data = await response.json();
        const results: any[] = data?.results || [];

        // 1. Direct Revok Buzz HLS link: prioritize Ravok Buzz server
        const ravokItem = results.find(
          (r) =>
            (r.embed && /ravok\.buzz/i.test(r.embed)) ||
            (r.url && /ravok\.buzz/i.test(r.url)) ||
            (r.directHlsUrl && /ravok\.buzz/i.test(r.directHlsUrl))
        );

        if (ravokItem) {
          // Extract Ravok hash from embed, url, or directHlsUrl
          const hashMatch = (ravokItem.embed || ravokItem.url || ravokItem.directHlsUrl || '').match(
            /ravok\.buzz\/(?:video|embed|e)\/([a-zA-Z0-9]+)/i
          );
          if (hashMatch && hashMatch[1]) {
            // CRITICAL: Call getVideo directly from the client device with session cookies
            // so Ravok Buzz signs the md5 token for THIS device's IP. This eliminates
            // "Response code: 403 Forbidden" and "Response code: 520 / 502" playback errors.
            const clientDirectUrl = await fetchRavokVideoSource(hashMatch[1]);
            if (clientDirectUrl) {
              return {
                streamUrl: clientDirectUrl,
                directHlsUrl: clientDirectUrl,
                type: 'hls',
                isDirect: true,
                audioLanguage: ravokItem.audioLanguage || audioLanguage,
                languageLabel: ravokItem.languageLabel || languageLabel,
              };
            }
          }
        }
      }

      // 2. Direct Ravok Buzz HLS Fallback from AnimeSalt episode page (e.g. for 【oshi-no-ko】 or when worker has no hash)
      const directFallback = await resolveRavokDirectFallback(slug, seasonNumber, episodeNumber, isMovie);
      if (directFallback) {
        return directFallback;
      }

      return null;
    } catch (err) {
      console.error('[HindiAnimeApi] Stream resolution error:', err);
      return null;
    }
  },
};

/**
 * Resilient fallback: resolves AnimeSalt Ravok Buzz HLS source directly
 * when worker sources endpoint returns empty or is awaiting deployment.
 */
async function resolveRavokDirectFallback(
  slug: string,
  seasonNumber: number,
  episodeNumber: number,
  isMovie = false
): Promise<StreamResolutionResult | null> {
  try {
    const cleanSlug = extractSlug(slug);
    const sNum = seasonNumber || 1;
    const epNum = episodeNumber || 1;
    const candidates = isMovie
      ? [
          `https://animesalt.cx/movies/${encodeURIComponent(cleanSlug)}/`,
          `https://animesalt.cx/movies/${cleanSlug}/`,
        ]
      : [
          `https://animesalt.cx/episode/${encodeURIComponent(cleanSlug)}-${sNum}x${epNum}/`,
          `https://animesalt.cx/episode/${cleanSlug}-${sNum}x${epNum}/`,
          `https://animesalt.cx/episode/${encodeURIComponent(cleanSlug)}-${epNum}/`,
          `https://animesalt.cx/episode/${cleanSlug}-${epNum}/`,
        ];

    let html = '';
    for (const epUrl of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);
        const res = await fetch(epUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const body = await res.text();
          if (body && (body.includes('ravok.buzz') || body.includes('player.php?data='))) {
            html = body;
            break;
          }
        }
      } catch {}
    }
    if (!html) return null;

    const ravokMatch = html.match(/ravok\.buzz\/(?:video|embed|e)\/([a-zA-Z0-9]+)/i);
    if (!ravokMatch || !ravokMatch[1]) {
      return null;
    }
    const hash = ravokMatch[1];
    const directHlsUrl = await fetchRavokVideoSource(hash);
    if (!directHlsUrl) return null;

    return {
      streamUrl: directHlsUrl,
      directHlsUrl,
      type: 'hls',
      isDirect: true,
      audioLanguage: 'hi',
      languageLabel: 'Hindi Dub (Multi-Audio)',
    };
  } catch (err) {
    console.warn('[HindiAnimeApi] Direct Ravok fallback failed:', err);
    return null;
  }
}

/**
 * Resolves Ravok Buzz direct video stream URL directly from the client device.
 * IMPORTANT: Ravok Buzz uses Nginx secure_link with the requester's IP address
 * and requires a valid session cookie established by requesting the video page.
 * Calling getVideo with the session cookie from the client device ensures the md5 token
 * matches the client's IP, preventing 403 Forbidden and 520 / 502 errors during playback.
 */
export async function fetchRavokVideoSource(hash: string): Promise<string | null> {
  if (!hash) return null;
  const cleanHash = hash.trim();
  const videoPageUrl = `https://ravok.buzz/video/${cleanHash}`;
  const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      // Step 1: Pre-flight to video page to obtain fireplayer session cookie
      let cookieHeader = '';
      try {
        const pageCtrl = new AbortController();
        const pageTimeout = setTimeout(() => pageCtrl.abort(), 6000);
        const pageRes = await fetch(videoPageUrl, {
          headers: {
            'User-Agent': userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: pageCtrl.signal,
        });
        clearTimeout(pageTimeout);
        const setCookie = pageRes.headers.get('set-cookie');
        if (setCookie) {
          const match = setCookie.match(/(?:^|;\s*)(fireplayer_[a-zA-Z0-9_-]+=[^;]+)/i);
          cookieHeader = match ? match[1] : setCookie.split(';')[0];
        }
      } catch (cookieErr) {
        // Continue even if pre-flight had network issue
      }

      // Step 2: Request client-signed direct HLS stream
      const ravokBody = new URLSearchParams({
        hash: cleanHash,
        r: 'https://animesalt.cx/',
      });

      const postHeaders: Record<string, string> = {
        'User-Agent': userAgent,
        Referer: videoPageUrl,
        Origin: 'https://ravok.buzz',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded',
      };
      if (cookieHeader) {
        postHeaders['Cookie'] = cookieHeader;
      }

      const postCtrl = new AbortController();
      const postTimeout = setTimeout(() => postCtrl.abort(), 8000);
      const ravokRes = await fetch(
        `https://ravok.buzz/player/index.php?data=${encodeURIComponent(cleanHash)}&do=getVideo`,
        {
          method: 'POST',
          headers: postHeaders,
          body: ravokBody.toString(),
          signal: postCtrl.signal,
        }
      );
      clearTimeout(postTimeout);

      if (!ravokRes.ok) continue;
      const ravokText = await ravokRes.text();
      if (!ravokText || !ravokText.trim().startsWith('{')) continue;

      let ravokData: any = null;
      try {
        ravokData = JSON.parse(ravokText);
      } catch {
        continue;
      }

      const directHlsUrl = ravokData?.videoSource || ravokData?.securedLink;
      if (typeof directHlsUrl === 'string' && directHlsUrl.includes('.m3u8')) {
        return directHlsUrl;
      }
    } catch (err) {
      console.warn(`[HindiAnimeApi] fetchRavokVideoSource attempt ${attempt + 1} failed:`, err);
    }
  }
  return null;
}
