export type AudioTrack =
  | 'Hindi Dubbed'
  | 'Dual Audio (Hindi + Jap)'
  | 'Japanese (Hindi Subs)'
  | 'Tamil Dubbed'
  | 'Telugu Dubbed'
  | 'English Dubbed';

export type StreamingQuality = '4K Ultra HD' | '1080p FHD' | '720p HD' | '480p SD';

export interface StreamingServer {
  id: string;
  name: string;
  badge: string;
  isFast: boolean;
  loadLatency: string;
}

export interface DownloadLink {
  quality: StreamingQuality;
  size: string;
  url: string;
  directDownload: boolean;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  duration: string;
  thumbnail: string;
  hindiDubbed: boolean;
  releaseDate: string;
  synopsis: string;
  progressPercentage?: number;
  downloadLinks: DownloadLink[];
}

export interface Season {
  seasonNumber: number;
  seasonName: string;
  totalEpisodes: number;
  episodes: Episode[];
}

export interface AnimeComment {
  id: string;
  user: string;
  avatar: string;
  timeAgo: string;
  rating: number;
  content: string;
  likes: number;
  userLiked?: boolean;
}

export interface Anime {
  id: string;
  title: string;
  originalTitle?: string;
  hindiTitle?: string;
  releaseYear: number;
  releaseDate: string;
  poster: string;
  backdrop: string;
  videoPreviewUrl?: string;
  rating: number; // e.g. 8.9
  votesCount: string; // e.g. "68K votes"
  likesCount: number;
  userLiked?: boolean;
  userSaved?: boolean;
  duration: string;
  genres: string[];
  type: 'Series' | 'Movie' | 'OVA' | 'Cartoon';
  ageRating: string;
  qualityBadge: string;
  audioTracks: AudioTrack[];
  defaultAudio: AudioTrack;
  synopsis: string;
  isTrending?: boolean;
  isPopular?: boolean;
  isForYou?: boolean;
  isNew?: boolean;
  isMovie?: boolean;
  isOnAir?: boolean;
  airSchedule?: string;
  isCartoon?: boolean;
  isFreshCartoonFilm?: boolean;
  primaryLanguage?: 'Hindi' | 'Tamil' | 'Telugu' | 'Japanese' | 'English';
  languagesSupported?: string[];
  seasons: Season[];
  servers: StreamingServer[];
  comments?: AnimeComment[];
}

export interface LatestEpisodeItem {
  id: string;
  animeId: string;
  animeSlug?: string;
  animeTitle: string;
  title?: string;
  episodeTitle?: string;
  episodeNumber: number;
  seasonNumber?: number;
  displayEpisode?: string;
  thumbnail: string;
  poster?: string;
  quality?: string;
  duration: string;
  releaseDate: string;
  isHindiDubbed: boolean;
  videoPreviewUrl?: string;
  anime?: Anime;
}

export interface StreamResolutionResult {
  streamUrl: string;
  directHlsUrl?: string;
  fallbackUrl?: string;
  type?: string;
  isDirect?: boolean;
  audioLanguage?: string;
  languageLabel?: string;
  serverName?: string;
  quality?: string;
  directDownloadUrl?: string;
  captions?: Array<{ label: string; language: string; url: string }>;
}

