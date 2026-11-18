import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Share,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import {
  Star,
  ThumbsUp,
  Share2,
  X,
  Info,
  ChevronDown,
  Check,
} from 'lucide-react-native';
import { Anime, Episode } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { NativeAnimePlayer } from './player/NativeAnimePlayer';
import { getImageSource } from '../utils/imageHelper';
import { getRecommendedAnime } from '../utils/recommendationHelper';
import { LocalStorageService } from '../services/storage';
import { useAppDispatch, useAppSelector } from '../store';
import { resolveStream } from '../store/animeSlice';
import { useGetAnimeDetailsQuery, useGetSeasonEpisodesQuery } from '../store/api/animeApi';

interface WatchPageProps {
  anime: Anime;
  onBack: () => void;
  onSelectAnime: (anime: Anime) => void;
  allAnime: Anime[];
  onToggleSave?: (animeId: string) => void;
  isSaved?: boolean;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WatchPage: React.FC<WatchPageProps> = ({
  anime,
  onBack,
  onSelectAnime,
  allAnime,
  onFullscreenChange,
}) => {
  const dispatch = useAppDispatch();
  const streamCache = useAppSelector((s) => s.anime.streamCache);
  const fallbackCache = useAppSelector((s) => s.anime.fallbackCache);
  const isResolvingStream = useAppSelector((s) => s.anime.streamLoading);
  const streamError = useAppSelector((s) => s.anime.streamError);

  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);
  const [detailedAnime, setDetailedAnime] = useState<Anime>(anime);

  const isMovie = Boolean(
    detailedAnime.isMovie ||
    detailedAnime.type === 'Movie' ||
    anime.isMovie ||
    anime.type === 'Movie'
  );

  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState<boolean>(false);

  const handleFullscreenChange = useCallback(
    (fs: boolean) => {
      setIsPlayerFullscreen(fs);
      onFullscreenChange?.(fs);
    },
    [onFullscreenChange]
  );

  // RTK Query: single fetch path for anime details; automatic deduplication & 30 min cache
  const { data: remoteDetails } = useGetAnimeDetailsQuery(detailedAnime.id, {
    skip: isMovie,
  });
  const [selectedEpisode, setSelectedEpisode] = useState<Episode>(
    anime.seasons?.[0]?.episodes?.[0] || {
      id: `ep-${anime.id}-1-1`,
      episodeNumber: 1,
      title: 'Episode 1: The Beginning',
      duration: anime.isMovie ? '1h 50m' : '24:15',
      thumbnail: anime.poster,
      hindiDubbed: true,
      releaseDate: anime.releaseDate || '2024',
      synopsis: `Episode 1 of ${anime.title} in Hindi audio.`,
      downloadLinks: [],
    }
  );

  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState<boolean>(false);
  const seasonButtonRef = useRef<any>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleToggleSeasonDropdown = useCallback(() => {
    if (showSeasonDropdown) {
      setShowSeasonDropdown(false);
    } else {
      seasonButtonRef.current?.measureInWindow((x, y, width, height) => {
        setDropdownCoords({ x, y, width, height });
        setShowSeasonDropdown(true);
      });
    }
  }, [showSeasonDropdown]);

  // Engagement states
  const [likesCount, setLikesCount] = useState<number>(anime.likesCount || 18450);
  const [userLiked, setUserLiked] = useState<boolean>(!!anime.userLiked);

  // Hydrate with RTK Query cached details when available
  useEffect(() => {
    if (remoteDetails) {
      setDetailedAnime((prev) => ({
        ...prev,
        synopsis: remoteDetails.synopsis || prev.synopsis,
        backdrop: remoteDetails.backdrop || prev.backdrop,
        seasons:
          remoteDetails.seasons && remoteDetails.seasons.length > 0
            ? (remoteDetails.seasons as any)
            : prev.seasons,
      }));
    }
  }, [remoteDetails]);

  // Available seasons list
  const seasonList = useMemo(() => {
    if (detailedAnime.seasons && detailedAnime.seasons.length > 0) {
      return detailedAnime.seasons;
    }
    return [
      {
        seasonNumber: 1,
        seasonName: 'Season 1',
        totalEpisodes: detailedAnime.isMovie ? 1 : 24,
        episodes: [],
      },
    ];
  }, [detailedAnime.seasons, detailedAnime.isMovie]);

  const activeSeason = seasonList[selectedSeasonIndex] || seasonList[0];
  const activeSeasonNumber = activeSeason?.seasonNumber || (selectedSeasonIndex + 1);

  // RTK Query: fetch season episodes dynamically when user views Season 2+
  const { data: seasonEpisodesData } = useGetSeasonEpisodesQuery(
    { slug: detailedAnime.id, season: activeSeasonNumber },
    { skip: isMovie || Boolean(activeSeason?.episodes && activeSeason.episodes.length > 0) }
  );

  // Update detailedAnime.seasons when season episodes data arrives
  useEffect(() => {
    if (seasonEpisodesData && seasonEpisodesData.length > 0) {
      setDetailedAnime((prev) => {
        const nextSeasons = (prev.seasons || []).map((s) => {
          if (s.seasonNumber === activeSeasonNumber) {
            return {
              ...s,
              episodes: seasonEpisodesData,
              totalEpisodes: seasonEpisodesData.length,
            };
          }
          return s;
        });
        return {
          ...prev,
          seasons: nextSeasons,
        };
      });
      setSelectedEpisode((prev) => {
        const match = seasonEpisodesData.find((e) => e.episodeNumber === prev.episodeNumber);
        return match || seasonEpisodesData[0] || prev;
      });
    }
  }, [seasonEpisodesData, activeSeasonNumber]);

  // Episode numbers list (1..totalEpisodes)
  // Deps are individual fields, not the full detailedAnime object, so this memo
  // doesn't re-run when unrelated fields like synopsis or backdrop update.
  const episodesList = useMemo(() => {
    const existing = activeSeason?.episodes || [];
    const totalCount = Math.max(activeSeason?.totalEpisodes || 12, existing.length, 12);
    const result: Episode[] = [];
    for (let i = 1; i <= totalCount; i++) {
      const match = existing.find((e) => e.episodeNumber === i);
      if (match) {
        result.push(match);
      } else {
        result.push({
          id: `ep-${detailedAnime.id}-${activeSeason?.seasonNumber || 1}-${i}`,
          episodeNumber: i,
          title: `Episode ${i}`,
          duration: '24:15',
          thumbnail: detailedAnime.poster,
          hindiDubbed: true,
          releaseDate: detailedAnime.releaseDate || '2024',
          synopsis: `Episode ${i} of ${detailedAnime.title} with full Hindi audio.`,
          downloadLinks: [],
        });
      }
    }
    return result;
  }, [
    activeSeason?.episodes,
    activeSeason?.seasonNumber,
    activeSeason?.totalEpisodes,
    detailedAnime.id,
    detailedAnime.poster,
    detailedAnime.title,
    detailedAnime.releaseDate,
  ]);

  const handleSelectSeason = useCallback((idx: number) => {
    setSelectedSeasonIndex(idx);
    setShowSeasonDropdown(false);
    const targetSeason = seasonList[idx] || seasonList[0];
    if (targetSeason?.episodes && targetSeason.episodes.length > 0) {
      setSelectedEpisode(targetSeason.episodes[0]);
    } else {
      setSelectedEpisode({
        id: `ep-${detailedAnime.id}-${targetSeason?.seasonNumber || idx + 1}-1`,
        episodeNumber: 1,
        title: 'Episode 1',
        duration: detailedAnime.isMovie ? '1h 50m' : '24:15',
        thumbnail: detailedAnime.poster,
        hindiDubbed: true,
        releaseDate: detailedAnime.releaseDate || '2024',
        synopsis: `Episode 1 of ${detailedAnime.title} in Hindi audio.`,
        downloadLinks: [],
      });
    }
  }, [seasonList, detailedAnime]);

  const sNum = isMovie ? 1 : (activeSeason?.seasonNumber || 1);
  const epNum = isMovie ? 1 : (selectedEpisode.episodeNumber || 1);
  const currentCacheKey = isMovie ? `${detailedAnime.id}_movie` : `${detailedAnime.id}_s${sNum}_ep${epNum}`;
  const activeStreamUrl = streamCache[currentCacheKey] || '';
  const activeFallbackUrl = (fallbackCache && fallbackCache[currentCacheKey]) || '';

  // Stream resolver: dispatches Redux resolveStream action (uses Redux cache first)
  const resolveCurrentStream = useCallback((forceRefresh = false) => {
    dispatch(
      resolveStream({
        animeId: detailedAnime.id,
        season: isMovie ? 1 : sNum,
        episode: isMovie ? 1 : epNum,
        isMovie,
        forceRefresh,
      })
    );
  }, [dispatch, detailedAnime.id, isMovie, sNum, epNum]);

  useEffect(() => {
    if (!streamCache[currentCacheKey]) {
      resolveCurrentStream();
    }
  }, [currentCacheKey, streamCache, resolveCurrentStream]);

  // Track watch progress (throttled to 5 seconds to prevent AsyncStorage I/O bottlenecks)
  const lastProgressSaveRef = useRef<number>(0);
  const handleTimeUpdate = useCallback((currentSec: number, totalDurationSec: number) => {
    const now = Date.now();
    if (currentSec > 5 && now - lastProgressSaveRef.current > 5000) {
      lastProgressSaveRef.current = now;
      LocalStorageService.updateWatchProgress({
        animeId: detailedAnime.id,
        animeTitle: detailedAnime.title,
        poster: detailedAnime.poster,
        seasonNumber: activeSeason?.seasonNumber || 1,
        episodeNumber: selectedEpisode.episodeNumber,
        episodeTitle: selectedEpisode.title,
        progressSeconds: Math.floor(currentSec),
        durationSeconds: Math.floor(totalDurationSec),
      });
    }
  }, [detailedAnime.id, detailedAnime.title, detailedAnime.poster, activeSeason?.seasonNumber, selectedEpisode.episodeNumber, selectedEpisode.title]);

  const handleToggleLike = useCallback(() => {
    if (userLiked) {
      setLikesCount((prev) => prev - 1);
      setUserLiked(false);
    } else {
      setLikesCount((prev) => prev + 1);
      setUserLiked(true);
    }
  }, [userLiked]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: `${detailedAnime.title} - Hindi Anime`,
        message: `Watch ${detailedAnime.title} in HD Hindi Dubbed on HindiAnime! https://hindi-anime.com/`,
      });
    } catch {
      // ignore
    }
  }, [detailedAnime.title]);

  // Handle Android hardware back button
  useEffect(() => {
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isPlayerFullscreen) {
        handleFullscreenChange(false);
        return true;
      }
      onBack();
      return true;
    });
    return () => backSub.remove();
  }, [onBack, isPlayerFullscreen, handleFullscreenChange]);

  const relatedAnime = useMemo(
    // Use only the stable id, not the full detailedAnime object, so this memo
    // doesn't re-run every time synopsis/backdrop/seasons arrive from RTK Query.
    () => getRecommendedAnime(detailedAnime, allAnime, 10),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailedAnime.id, allAnime]
  );

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={[styles.playerContainer, isPlayerFullscreen && styles.playerContainerFullscreen]}>
        {activeStreamUrl ? (
          <NativeAnimePlayer
            key={activeStreamUrl}
            src={activeStreamUrl}
            fallbackSrc={activeFallbackUrl}
            isFullscreen={isPlayerFullscreen}
            title={detailedAnime.title}
            subtitle={`EP ${selectedEpisode.episodeNumber}: ${selectedEpisode.title}`}
            poster={selectedEpisode.thumbnail || detailedAnime.backdrop || detailedAnime.poster}
            season={activeSeason?.seasonNumber ?? 1}
            episode={selectedEpisode.episodeNumber ?? 1}
            isMovie={Boolean(detailedAnime.isMovie)}
            autoPlay={true}
            onTimeUpdate={handleTimeUpdate}
            onFullscreenChange={handleFullscreenChange}
            onBack={onBack}
          />
        ) : (
          <View style={styles.emptyPlayerContainer}>
            {isResolvingStream ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Connecting direct HLS stream...</Text>
              </View>
            ) : streamError ? (
              <View style={styles.loadingBox}>
                <Text style={styles.errorText}>{streamError}</Text>
                <TouchableOpacity onPress={() => resolveCurrentStream(true)} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry Stream</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Main Content Area (hidden in fullscreen) */}
      {!isPlayerFullscreen && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={!showSeasonDropdown}
        >
        <View style={styles.metaSection}>
          {/* Release Date, Title & Info Button */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.releaseDateText}>{detailedAnime.releaseDate || '2024'}</Text>
              <Text style={styles.animeTitleText}>{detailedAnime.title}</Text>
              {detailedAnime.hindiTitle ? (
                <Text style={styles.hindiTitleText}>{detailedAnime.hindiTitle}</Text>
              ) : null}
            </View>

            {/* Restored Info Button with details popup */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowInfoModal(true)}
              style={styles.infoButton}
            >
              <Info size={13} color="#86efac" />
              <Text style={styles.infoButtonText}>Info</Text>
            </TouchableOpacity>
          </View>

          {/* Clean Rating and Engagement Row (No download button, no emojis) */}
          <View style={styles.engagementRow}>
            {/* Star Rating on Left */}
            <View style={styles.ratingBox}>
              <Star size={16} color="#eab308" fill="#eab308" />
              <Text style={styles.ratingNumberText}>{detailedAnime.rating}/10</Text>
              <Text style={styles.votesText}>{detailedAnime.votesCount || '45K votes'}</Text>
            </View>

            {/* Like and Share on Right */}
            <View style={styles.actionsRight}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleToggleLike}
                style={[styles.likeButton, userLiked && styles.likeButtonActive]}
              >
                <ThumbsUp
                  size={14}
                  color={userLiked ? '#ffffff' : '#b7c1ba'}
                  fill={userLiked ? '#ffffff' : 'transparent'}
                />
                <Text style={styles.likeCountText}>
                  {likesCount.toLocaleString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleShare}
                style={styles.actionCircleButton}
              >
                <Share2 size={16} color="#b7c1ba" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Clean Episodes Box (Hidden for Movies, visible for Series) */}
          {!isMovie && (
            <View style={styles.episodesContainer}>
              {/* Episodes Header + Single Season Dropdown Pill */}
              <View style={styles.episodesHeaderRow}>
                <View style={styles.episodesTitleGroup}>
                  <Text style={styles.episodesMainHeading}>Episodes</Text>
                  <View style={styles.episodesCountBadge}>
                    <Text style={styles.episodesCountBadgeText}>
                      {episodesList.length} Episodes
                    </Text>
                  </View>
                </View>

                {/* Season Dropdown Selector Container */}
                <View style={styles.seasonSelectorWrapper}>
                  <TouchableOpacity
                    ref={seasonButtonRef}
                    activeOpacity={0.7}
                    onPress={handleToggleSeasonDropdown}
                    style={[
                      styles.seasonDropdownButton,
                      showSeasonDropdown && styles.seasonDropdownButtonActive,
                    ]}
                  >
                    <Text style={styles.seasonDropdownText}>
                      {activeSeason?.seasonName || `Season ${activeSeason?.seasonNumber || 1}`}
                    </Text>
                    <ChevronDown
                      size={14}
                      color={showSeasonDropdown ? '#22c55e' : '#86efac'}
                      style={{
                        marginLeft: 6,
                        transform: [{ rotate: showSeasonDropdown ? '180deg' : '0deg' }],
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Numbered Episode Buttons Grid (01, 02, 03... with active glowing outline) */}
              <View style={styles.episodeButtonsGrid}>
                {episodesList.map((ep) => {
                  const isActive = selectedEpisode.episodeNumber === ep.episodeNumber;
                  return (
                    <TouchableOpacity
                      key={ep.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedEpisode(ep)}
                      style={[
                        styles.epNumberButton,
                        isActive && styles.epNumberButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.epNumberText,
                          isActive && styles.epNumberTextActive,
                        ]}
                      >
                        {String(ep.episodeNumber).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Playing Episode Status Bar */}
              <View style={styles.playingBar}>
                <View style={styles.playingBarDot} />
                <Text numberOfLines={1} style={styles.playingBarTitle}>
                  Playing Episode {selectedEpisode.episodeNumber}: {selectedEpisode.title}
                </Text>
                <Text style={styles.playingBarDuration}>
                  {selectedEpisode.duration}
                </Text>
              </View>
            </View>
          )}

          {/* Recommended For You Section */}
          <View style={styles.recommendedSection}>
            <Text style={styles.recommendedTitle}>Recommended For You</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendedCardsList}
            >
              {relatedAnime.slice(0, 10).map((item) => (
                <AnimeCard
                  key={`rec-${item.id}`}
                  anime={item}
                  onSelect={onSelectAnime}
                  size="normal"
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
      )}

      {/* Real Native Isolated Season Dropdown Modal — 100% immune to parent ScrollView scrolling */}
      {showSeasonDropdown && (
        <Modal
          visible={showSeasonDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSeasonDropdown(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowSeasonDropdown(false)}
            style={styles.dropdownModalBackdrop}
          >
            <View
              style={[
                styles.seasonDropdownMenuModal,
                dropdownCoords
                  ? {
                      top: dropdownCoords.y + dropdownCoords.height + 4,
                      right: Math.max(16, SCREEN_WIDTH - (dropdownCoords.x + dropdownCoords.width)),
                    }
                  : { top: 220, right: 16 },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <ScrollView
                style={{ maxHeight: 220 }}
                showsVerticalScrollIndicator={true}
                bounces={false}
                nestedScrollEnabled={true}
              >
                {seasonList.map((season, idx) => {
                  const isSelected = selectedSeasonIndex === idx;
                  return (
                    <TouchableOpacity
                      key={`dropdown-season-${season.seasonNumber || idx + 1}`}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleSelectSeason(idx);
                        setShowSeasonDropdown(false);
                      }}
                      style={[
                        styles.seasonDropdownItem,
                        isSelected && styles.seasonDropdownItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.seasonDropdownItemText,
                          isSelected && styles.seasonDropdownItemTextActive,
                        ]}
                      >
                        {season.seasonName || `Season ${season.seasonNumber || idx + 1}`}
                      </Text>
                      {isSelected && <Check size={14} color="#22c55e" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Details Popup Modal (Triggered by Info button) */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowInfoModal(false)}
          style={styles.modalOverlay}
        >
          <View
            style={styles.infoModalCard}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Anime Details</Text>
              <TouchableOpacity
                onPress={() => setShowInfoModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={18} color="#b7c1ba" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Poster and Title summary */}
              <View style={styles.infoAnimeSummary}>
                <Image
                  source={getImageSource(detailedAnime.poster)}
                  style={styles.infoAnimePoster}
                />
                <View style={styles.infoAnimeTextCol}>
                  <Text style={styles.infoModalAnimeTitle}>{detailedAnime.title}</Text>
                  {detailedAnime.hindiTitle ? (
                    <Text style={styles.infoModalAnimeHindi}>
                      {detailedAnime.hindiTitle}
                    </Text>
                  ) : null}
                  <View style={styles.infoModalScoreRow}>
                    <Star size={12} color="#eab308" fill="#eab308" />
                    <Text style={styles.infoModalRating}>{detailedAnime.rating}/10</Text>
                    <Text style={styles.infoModalDot}>•</Text>
                    <Text style={styles.infoModalYear}>{detailedAnime.releaseYear || '2024'}</Text>
                    <Text style={styles.infoModalDot}>•</Text>
                    <Text style={styles.infoModalType}>{detailedAnime.type}</Text>
                  </View>
                </View>
              </View>

              {/* Synopsis */}
              <View style={styles.infoSectionBlock}>
                <Text style={styles.infoSectionLabel}>SYNOPSIS</Text>
                <Text style={styles.infoSynopsisText}>{detailedAnime.synopsis}</Text>
              </View>

              {/* Genres */}
              <View style={styles.infoSectionBlock}>
                <Text style={styles.infoSectionLabel}>GENRES</Text>
                <View style={styles.infoGenrePills}>
                  {(detailedAnime.genres || []).map((genre) => (
                    <View key={genre} style={styles.infoGenrePill}>
                      <Text style={styles.infoGenrePillText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Technical & Audio Info */}
              <View style={styles.infoSectionBlock}>
                <Text style={styles.infoSectionLabel}>AUDIO & BROADCAST</Text>
                <View style={styles.specsGrid}>
                  <View style={styles.specBox}>
                    <Text style={styles.specBoxLabel}>Primary Audio</Text>
                    <Text style={styles.specBoxValue}>
                      {detailedAnime.defaultAudio || 'Hindi Dubbed'}
                    </Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specBoxLabel}>Supported Audio</Text>
                    <Text style={styles.specBoxValue}>
                      {(detailedAnime.audioTracks || ['Hindi', 'Japanese']).join(', ')}
                    </Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specBoxLabel}>Quality</Text>
                    <Text style={styles.specBoxValue}>
                      {detailedAnime.qualityBadge || '1080p FHD'}
                    </Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specBoxLabel}>Age Rating</Text>
                    <Text style={styles.specBoxValue}>
                      {detailedAnime.ageRating || '16+'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050807',
  },
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
  },
  playerContainerFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    aspectRatio: undefined,
    zIndex: 999999,
    borderBottomWidth: 0,
  },
  emptyPlayerContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#050807',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#86efac',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#050807',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  metaSection: {
    padding: 16,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  releaseDateText: {
    fontSize: 12,
    color: '#7e8b83',
    fontWeight: '500',
  },
  animeTitleText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#f5f7f6',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  hindiTitleText: {
    fontSize: 12.5,
    color: '#b7c1ba',
    marginTop: 3,
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    marginTop: 4,
  },
  infoButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#86efac',
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1d3025',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f5f7f6',
  },
  votesText: {
    fontSize: 11,
    color: '#7e8b83',
  },
  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  likeButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  likeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f5f7f6',
  },
  actionCircleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodesContainer: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0a100d',
    borderWidth: 1,
    borderColor: '#1d3025',
    gap: 12,
    overflow: 'visible',
    zIndex: 50,
  },
  episodesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    zIndex: 60,
  },
  episodesTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episodesMainHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  episodesCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  episodesCountBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86efac',
  },
  seasonSelectorWrapper: {
    position: 'relative',
    zIndex: 9999,
    elevation: 30,
  },
  dropdownModalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  seasonDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1510',
    borderWidth: 1.5,
    borderColor: '#1d3326',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 9999,
  },
  seasonDropdownButtonActive: {
    borderColor: '#22c55e',
    backgroundColor: '#142019',
  },
  seasonDropdownText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  seasonDropdownMenuModal: {
    position: 'absolute',
    minWidth: 140,
    maxWidth: 200,
    borderRadius: 10,
    backgroundColor: '#0b140f',
    borderWidth: 1.5,
    borderColor: '#1d3326',
    paddingVertical: 4,
    elevation: 45,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 14,
  },
  seasonDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  seasonDropdownItemActive: {
    backgroundColor: '#142019',
  },
  seasonDropdownItemText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#b7c1ba',
  },
  seasonDropdownItemTextActive: {
    color: '#22c55e',
    fontWeight: '800',
  },
  episodeButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  epNumberButton: {
    width: (SCREEN_WIDTH - 32 - 28 - 40) / 6,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epNumberButtonActive: {
    borderColor: '#22c55e',
    borderWidth: 1.5,
    backgroundColor: '#142019',
  },
  epNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7e8b83',
  },
  epNumberTextActive: {
    color: '#22c55e',
    fontWeight: '900',
  },
  playingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    gap: 6,
  },
  playingBarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  playingBarTitle: {
    flex: 1,
    fontSize: 11,
    color: '#f5f7f6',
    fontWeight: '600',
  },
  playingBarDuration: {
    fontSize: 11,
    color: '#22c55e',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  recommendedSection: {
    marginTop: 4,
    gap: 10,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f5f7f6',
  },
  recommendedCardsList: {
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  infoModalCard: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: '#0a100d',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1d3025',
    padding: 18,
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
  },
  infoModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 4,
  },
  infoAnimeSummary: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoAnimePoster: {
    width: 60,
    height: 84,
    borderRadius: 8,
  },
  infoAnimeTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  infoModalAnimeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  infoModalAnimeHindi: {
    fontSize: 11.5,
    color: '#b7c1ba',
    marginTop: 2,
  },
  infoModalScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  infoModalRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoModalDot: {
    fontSize: 10,
    color: '#7e8b83',
  },
  infoModalYear: {
    fontSize: 11,
    color: '#7e8b83',
  },
  infoModalType: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
  },
  infoSectionBlock: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7e8b83',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  infoSynopsisText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#b7c1ba',
  },
  infoGenrePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  infoGenrePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  infoGenrePillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#86efac',
  },
  specsGrid: {
    gap: 8,
  },
  specBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1d3025',
  },
  specBoxLabel: {
    fontSize: 11,
    color: '#7e8b83',
  },
  specBoxValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f5f7f6',
  },
});
