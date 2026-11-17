import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
  Switch,
  StyleSheet,
  BackHandler,
} from 'react-native';
import {
  User,
  ShieldCheck,
  History,
  Heart,
  Bookmark,
  Settings,
  ChevronRight,
  X,
  ArrowLeft,
  Search,
  Instagram,
  Twitter,
  Facebook,
  Headphones,
  HardDrive,
} from 'lucide-react-native';
import { Anime } from '../types/anime';
import { HindiAnimeLogo } from './HindiAnimeLogo';
import { AnimeCard } from './AnimeCard';
import { PlayCircleButton } from './PlayCircleButton';
import { getImageSource } from '../utils/imageHelper';
import { LocalStorageService, WatchHistoryItem } from '../services/storage';

function fmtSecs(secs: number): string {
  if (!secs || isNaN(secs) || secs < 0) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(timestamp: number): string {
  if (!timestamp) return 'Recently';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

interface ProfileViewProps {
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  savedAnimeIds: string[];
  onToggleSave: (animeId: string) => void;
  favoriteAnimeIds: string[];
  onToggleFavorite: (animeId: string) => void;
}

type SubViewType = 'mylist' | 'favorites' | 'settings' | null;

const ProfileView_: React.FC<ProfileViewProps> = ({
  animeList,
  onSelectAnime,
  savedAnimeIds,
  onToggleSave,
  favoriteAnimeIds,
  onToggleFavorite,
}) => {
  const [activeSubView, setActiveSubView] = useState<SubViewType>(null);
  const [myListSearch, setMyListSearch] = useState('');
  const [favoritesSearch, setFavoritesSearch] = useState('');

  // Settings states
  const [autoSkipIntro, setAutoSkipIntro] = useState(true);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);

  // Real on-device watch history items
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // Load persistent settings and watch history on mount
  useEffect(() => {
    const prefs = LocalStorageService.getPreferences();
    setAutoSkipIntro(prefs.skipIntroEnabled);
    setAutoPlayNext(prefs.autoPlayNext);
    setWatchHistory(LocalStorageService.getWatchHistory());
  }, []);

  // Hardware back press handler for subviews (My List, Favorites, Settings)
  useEffect(() => {
    if (!activeSubView) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setActiveSubView(null);
      return true;
    });
    return () => sub.remove();
  }, [activeSubView]);

  const handleToggleAutoSkipIntro = (val: boolean) => {
    setAutoSkipIntro(val);
    LocalStorageService.setPreferences({ skipIntroEnabled: val });
  };

  const handleToggleAutoPlayNext = (val: boolean) => {
    setAutoPlayNext(val);
    LocalStorageService.setPreferences({ autoPlayNext: val });
  };

  const savedAnime = useMemo(
    () => animeList.filter((a) => savedAnimeIds.includes(a.id)),
    [animeList, savedAnimeIds]
  );

  const favoriteAnime = useMemo(
    () => animeList.filter((a) => favoriteAnimeIds.includes(a.id)),
    [animeList, favoriteAnimeIds]
  );

  const handleRemoveHistoryItem = (animeId: string) => {
    LocalStorageService.removeWatchHistoryItem(animeId);
    setWatchHistory((prev) => prev.filter((item) => item.animeId !== animeId));
  };

  const handleClearAllHistory = () => {
    LocalStorageService.clearWatchHistory();
    setWatchHistory([]);
  };

  const handleWatchHistoryClick = (animeId: string) => {
    const target = animeList.find((a) => a.id === animeId);
    if (target) {
      onSelectAnime(target);
    } else {
      const fallback = animeList.find((a) => a.id.includes(animeId) || animeId.includes(a.id)) || animeList[0];
      if (fallback) onSelectAnime(fallback);
    }
  };

  // Subview: My List
  if (activeSubView === 'mylist') {
    return (
      <View style={styles.container}>
        <View style={styles.subviewHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveSubView(null)}
            style={styles.subviewBackButton}
          >
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subviewTitle}>My List</Text>
            <Text style={styles.subviewSubtitle}>{savedAnime.length} Titles saved</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.subviewScroll}>
          <View style={styles.subviewGrid}>
            {savedAnime.map((anime) => (
              <View key={anime.id} style={styles.subviewCardCol}>
                <AnimeCard
                  anime={anime}
                  onSelect={onSelectAnime}
                  size="fill"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Subview: Favorites
  if (activeSubView === 'favorites') {
    return (
      <View style={styles.container}>
        <View style={styles.subviewHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveSubView(null)}
            style={styles.subviewBackButton}
          >
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subviewTitle}>Favorites</Text>
            <Text style={styles.subviewSubtitle}>{favoriteAnime.length} Titles favorited</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.subviewScroll}>
          <View style={styles.subviewGrid}>
            {favoriteAnime.map((anime) => (
              <View key={anime.id} style={styles.subviewCardCol}>
                <AnimeCard
                  anime={anime}
                  onSelect={onSelectAnime}
                  size="fill"
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Subview: Settings
  if (activeSubView === 'settings') {
    return (
      <View style={styles.container}>
        <View style={styles.subviewHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveSubView(null)}
            style={styles.subviewBackButton}
          >
            <ArrowLeft size={18} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.subviewTitle}>Settings & Preferences</Text>
            <Text style={styles.subviewSubtitle}>Player & Storage Options</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.subviewScroll}>
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionHeading}>Playback</Text>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Auto-Skip Intro (+85s)</Text>
                <Text style={styles.settingHint}>Automatically skip opening songs</Text>
              </View>
              <Switch
                value={autoSkipIntro}
                onValueChange={handleToggleAutoSkipIntro}
                trackColor={{ false: '#1d3025', true: '#22c55e' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Auto-Play Next Episode</Text>
                <Text style={styles.settingHint}>Start next episode continuously</Text>
              </View>
              <Switch
                value={autoPlayNext}
                onValueChange={handleToggleAutoPlayNext}
                trackColor={{ false: '#1d3025', true: '#22c55e' }}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionHeading}>Data & Downloads</Text>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Download Over Wi-Fi Only</Text>
                <Text style={styles.settingHint}>Protect mobile data usage</Text>
              </View>
              <Switch
                value={downloadWifiOnly}
                onValueChange={setDownloadWifiOnly}
                trackColor={{ false: '#1d3025', true: '#22c55e' }}
              />
            </View>

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Data Saver Mode</Text>
                <Text style={styles.settingHint}>Save up to 45% bandwidth on cellular</Text>
              </View>
              <Switch
                value={dataSaver}
                onValueChange={setDataSaver}
                trackColor={{ false: '#1d3025', true: '#22c55e' }}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // MAIN PROFILE SCREEN
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.mainScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. USER PROFILE HEADER (Matching Screenshot 3) */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.userRow}>
          <View style={styles.avatarBox}>
            <User size={26} color="#22c55e" />
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>Arjun Verma</Text>
              <ShieldCheck size={16} color="#22c55e" />
            </View>
            <Text style={styles.userHandle}>@hindianime_pro • Otaku Streamer</Text>

            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>148 Episodes</Text>
                <Text style={styles.statPillLabel}>Watched</Text>
              </View>
              <View style={styles.statPill}>
                <Text style={styles.statPillValue}>42h</Text>
                <Text style={styles.statPillLabel}>Streamed</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.7} style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* 2. WATCH HISTORY (YouTube-Style Carousel) */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <View style={styles.historyTitleRow}>
            <History size={16} color="#22c55e" />
            <Text style={styles.historyTitle}>Watch History</Text>
            <Text style={styles.historyCount}>({watchHistory.length})</Text>
          </View>
          {watchHistory.length > 0 && (
            <TouchableOpacity onPress={handleClearAllHistory}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>

        {watchHistory.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historyScroll}
          >
            {watchHistory.map((item) => {
              const progressPercent =
                item.durationSeconds > 0
                  ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
                  : 0;
              const currentTime = fmtSecs(item.progressSeconds);
              const duration = fmtSecs(item.durationSeconds);
              const watchedAt = timeAgo(item.updatedAt);
              const epTitle = item.episodeTitle || `Episode ${item.episodeNumber}`;

              return (
                <TouchableOpacity
                  key={`wh-${item.animeId}-${item.episodeNumber}`}
                  activeOpacity={0.85}
                  onPress={() => handleWatchHistoryClick(item.animeId)}
                  style={styles.historyCard}
                >
                  {/* 16:9 Thumbnail Box */}
                  <View style={styles.historyThumbBox}>
                    <Image
                      source={getImageSource(item.poster)}
                      style={styles.historyThumbImage}
                    />

                    {/* Play Overlay */}
                    <View style={styles.historyPlayOverlay}>
                      <PlayCircleButton size={32} iconSize={14} />
                    </View>

                    {/* Remove Button */}
                    <TouchableOpacity
                      onPress={() => handleRemoveHistoryItem(item.animeId)}
                      style={styles.historyRemoveButton}
                    >
                      <X size={12} color="#ffffff" />
                    </TouchableOpacity>

                    {/* Duration Stamp */}
                    <View style={styles.historyDurationStamp}>
                      <Text style={styles.historyDurationStampText}>
                        {currentTime} / {duration}
                      </Text>
                    </View>

                    {/* Progress Bar with Green Fill */}
                    <View style={styles.historyProgressBarBg}>
                      <View
                        style={[
                          styles.historyProgressBarFill,
                          { width: `${progressPercent}%` },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Details under thumbnail */}
                  <Text numberOfLines={1} style={styles.historyEpisodeTitle}>
                    S{String(item.seasonNumber || 1).padStart(2, '0')} E{String(item.episodeNumber).padStart(2, '0')}: {epTitle}
                  </Text>
                  <Text numberOfLines={1} style={styles.historyAnimeTitle}>
                    {item.animeTitle}
                  </Text>
                  <Text style={styles.historyWatchedAt}>
                    <Text style={{ color: '#86efac', fontWeight: '600' }}>
                      {progressPercent}% watched
                    </Text>{' '}
                    • {watchedAt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyHistoryBox}>
            <Text style={styles.emptyHistoryText}>No watch history yet</Text>
          </View>
        )}
      </View>

      {/* 3. LIBRARY & PREFERENCES (Grouped Card matching Screenshot 3) */}
      <View style={styles.librarySection}>
        <Text style={styles.sectionHeading}>LIBRARY & PREFERENCES</Text>

        <View style={styles.groupedCard}>
          {/* Option 1: My List */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveSubView('mylist')}
            style={styles.groupedRow}
          >
            <View style={styles.groupedRowLeft}>
              <View style={[styles.groupedIconBox, { backgroundColor: '#142019', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                <Bookmark size={18} color="#22c55e" />
              </View>
              <View>
                <Text style={styles.groupedRowTitle}>My List</Text>
                <Text style={styles.groupedRowDesc}>
                  Your saved watchlist for binge streaming
                </Text>
              </View>
            </View>

            <View style={styles.groupedRowRight}>
              <View style={[styles.countBadge, { backgroundColor: '#142019', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                <Text style={[styles.countBadgeText, { color: '#86efac' }]}>
                  {savedAnime.length} Titles
                </Text>
              </View>
              <ChevronRight size={16} color="#7e8b83" />
            </View>
          </TouchableOpacity>

          {/* Option 2: Favorites */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveSubView('favorites')}
            style={styles.groupedRow}
          >
            <View style={styles.groupedRowLeft}>
              <View style={[styles.groupedIconBox, { backgroundColor: '#201416', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Heart size={18} color="#ef4444" fill="rgba(239, 68, 68, 0.2)" />
              </View>
              <View>
                <Text style={styles.groupedRowTitle}>Favorites</Text>
                <Text style={styles.groupedRowDesc}>
                  Your all-time favorite anime & movies
                </Text>
              </View>
            </View>

            <View style={styles.groupedRowRight}>
              <View style={[styles.countBadge, { backgroundColor: '#201416', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={[styles.countBadgeText, { color: '#fca5a5' }]}>
                  {favoriteAnime.length} Titles
                </Text>
              </View>
              <ChevronRight size={16} color="#7e8b83" />
            </View>
          </TouchableOpacity>

          {/* Option 3: Settings */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setActiveSubView('settings')}
            style={[styles.groupedRow, { borderBottomWidth: 0 }]}
          >
            <View style={styles.groupedRowLeft}>
              <View style={[styles.groupedIconBox, { backgroundColor: '#142019', borderColor: 'rgba(34, 197, 94, 0.3)' }]}>
                <Settings size={18} color="#22c55e" />
              </View>
              <View>
                <Text style={styles.groupedRowTitle}>Settings & Preferences</Text>
                <Text style={styles.groupedRowDesc}>
                  Audio track, player, downloads & storage
                </Text>
              </View>
            </View>

            <ChevronRight size={16} color="#7e8b83" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. FOLLOW US SECTION (Matching Screenshot 3) */}
      <View style={styles.followSection}>
        <View style={styles.followHeader}>
          <View style={styles.followDot} />
          <Text style={styles.followTitle}>FOLLOW US</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.followHandle}>@HindiAnime</Text>
        </View>

        <View style={styles.socialGrid}>
          {/* Instagram */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://www.instagram.com/hindi_animecom').catch(() => {})}
            style={styles.socialBox}
          >
            <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.15)', borderColor: 'rgba(236, 72, 153, 0.3)' }]}>
              <Instagram size={18} color="#f472b6" />
            </View>
            <Text style={styles.socialName}>Instagram</Text>
            <Text numberOfLines={1} style={styles.socialSub}>@hindi_animecom</Text>
          </TouchableOpacity>

          {/* X / Twitter */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://x.com/HindiAnimecom').catch(() => {})}
            style={styles.socialBox}
          >
            <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(14, 165, 233, 0.15)', borderColor: 'rgba(14, 165, 233, 0.3)' }]}>
              <Twitter size={18} color="#38bdf8" />
            </View>
            <Text style={styles.socialName}>X / Twitter</Text>
            <Text numberOfLines={1} style={styles.socialSub}>@HindiAnimecom</Text>
          </TouchableOpacity>

          {/* Facebook */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openURL('https://www.facebook.com/people/HindiAnime/61595551320116/').catch(() => {})}
            style={styles.socialBox}
          >
            <View style={[styles.socialIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
              <Facebook size={18} color="#60a5fa" />
            </View>
            <Text style={styles.socialName}>Facebook</Text>
            <Text numberOfLines={1} style={styles.socialSub}>HindiAnime</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 5. Minimal Clean Branding Footer */}
      <View style={styles.footerBranding}>
        <HindiAnimeLogo size="sm" showTagline={true} />
        <Text style={styles.footerEngineText}>Hindi-Anime.com Engine • Multi-Audio HD</Text>
      </View>
    </ScrollView>
  );
};

export const ProfileView = React.memo(ProfileView_);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050807',
  },
  mainScrollContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 20,
  },
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#142019',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  proBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#22c55e',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#000000',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  userHandle: {
    fontSize: 10.5,
    color: '#7e8b83',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  statPill: {
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statPillValue: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#86efac',
  },
  statPillLabel: {
    fontSize: 8,
    color: '#7e8b83',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#86efac',
  },
  historySection: {
    gap: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  historyCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22c55e',
  },
  clearAllText: {
    fontSize: 11,
    color: '#7e8b83',
  },
  historyScroll: {
    gap: 12,
    paddingVertical: 2,
  },
  historyCard: {
    width: 200,
  },
  historyThumbBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0d1611',
    borderWidth: 1,
    borderColor: '#1d3025',
    position: 'relative',
  },
  historyThumbImage: {
    width: '100%',
    height: '100%',
  },
  historyPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  historyPlayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDurationStamp: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  historyDurationStampText: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    color: '#ffffff',
  },
  historyProgressBarBg: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  historyProgressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  historyEpisodeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
  },
  historyAnimeTitle: {
    fontSize: 10.5,
    color: '#7e8b83',
    marginTop: 1,
  },
  historyWatchedAt: {
    fontSize: 9.5,
    color: '#7e8b83',
    marginTop: 2,
  },
  emptyHistoryBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#7e8b83',
  },
  librarySection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7e8b83',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  groupedCard: {
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  groupedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  groupedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupedRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  groupedRowDesc: {
    fontSize: 10.5,
    color: '#7e8b83',
    marginTop: 2,
  },
  groupedRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  followSection: {
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    padding: 14,
    gap: 12,
  },
  followHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  followDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  followTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  followHandle: {
    fontSize: 10.5,
    color: '#22c55e',
    fontWeight: '700',
  },
  socialGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  socialBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: '#1d3025',
    gap: 4,
  },
  socialIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  socialSub: {
    fontSize: 8.5,
    color: '#7e8b83',
  },
  footerBranding: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  footerEngineText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    color: '#7e8b83',
  },
  subviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
  },
  subviewBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subviewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  subviewSubtitle: {
    fontSize: 11,
    color: '#7e8b83',
  },
  subviewScroll: {
    padding: 16,
    paddingBottom: 90,
  },
  subviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subviewCardCol: {
    width: '31.5%',
    marginBottom: 10,
  },
  settingsSection: {
    marginBottom: 20,
    gap: 12,
  },
  settingsSectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#22c55e',
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  settingHint: {
    fontSize: 10.5,
    color: '#7e8b83',
    marginTop: 2,
  },
});
