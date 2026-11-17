import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Heart, Trash2, CheckCircle2 } from 'lucide-react-native';
import { Anime } from '../types/anime';
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

interface WatchlistViewProps {
  animeList: Anime[];
  savedAnimeIds: string[];
  onSelectAnime: (anime: Anime) => void;
  onToggleSave: (animeId: string) => void;
}

const WatchlistView_: React.FC<WatchlistViewProps> = ({
  animeList,
  savedAnimeIds,
  onSelectAnime,
  onToggleSave,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'continue' | 'offline'>('saved');
  const [continueWatching, setContinueWatching] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    setContinueWatching(LocalStorageService.getWatchHistory());
  }, []);

  const savedAnime = useMemo(
    () => animeList.filter((a) => savedAnimeIds.includes(a.id)),
    [animeList, savedAnimeIds]
  );

  const handleSelectHistoryItem = (animeId: string) => {
    const target = animeList.find((a) => a.id === animeId);
    if (target) {
      onSelectAnime(target);
    } else {
      const fallback = animeList.find((a) => a.id.includes(animeId) || animeId.includes(a.id)) || animeList[0];
      if (fallback) onSelectAnime(fallback);
    }
  };

  const [offlineEpisodes, setOfflineEpisodes] = useState([
    {
      id: 'off-1',
      animeTitle: 'Cyber Hunter: Nightfall',
      episodeTitle: 'Episode 1: The Dark Daggers Awaken',
      size: '780 MB',
      quality: '1080p FHD (Hindi Dub)',
      thumbnail: '/src/assets/images/anime_solo_hunter_1793651181145.jpg',
      duration: '24:15',
    },
    {
      id: 'off-2',
      animeTitle: 'Flame Blade Chronicles',
      episodeTitle: 'Episode 1: The Mountain of Embers',
      size: '740 MB',
      quality: '1080p FHD (Hindi Dub)',
      thumbnail: '/src/assets/images/anime_demon_blade_1793651053360.jpg',
      duration: '23:50',
    },
  ]);

  const handleDeleteOffline = (id: string) => {
    setOfflineEpisodes((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Library</Text>
        <Text style={styles.subtitle}>Saved series, progress, and offline downloads</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('saved')}
          style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'saved' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
            ]}
          >
            Watchlist ({savedAnime.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('continue')}
          style={[styles.tabButton, activeTab === 'continue' && styles.tabButtonActive]}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'continue' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
            ]}
          >
            Continue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('offline')}
          style={[styles.tabButton, activeTab === 'offline' && styles.tabButtonActive]}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'offline' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
            ]}
          >
            Downloads ({offlineEpisodes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on Active Tab */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'saved' && (
          <View>
            {savedAnime.length > 0 ? (
              <View style={styles.gridContainer}>
                {savedAnime.map((anime) => (
                  <View key={anime.id} style={styles.cardCol}>
                    <AnimeCard
                      anime={anime}
                      onSelect={onSelectAnime}
                      size="fill"
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Heart size={36} color="#7e8b83" />
                <Text style={styles.emptyTitle}>Watchlist is empty</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the heart icon on any anime poster to save it here.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'continue' && (
          <View style={styles.continueList}>
            {continueWatching.length > 0 ? (
              continueWatching.map((item) => {
                const pct =
                  item.durationSeconds > 0
                    ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
                    : 0;
                const timeStr = `${fmtSecs(item.progressSeconds)} / ${fmtSecs(item.durationSeconds)}`;
                const epLabel = item.episodeTitle || `Episode ${item.episodeNumber}`;

                return (
                  <TouchableOpacity
                    key={`cw-${item.animeId}-${item.episodeNumber}`}
                    activeOpacity={0.8}
                    onPress={() => handleSelectHistoryItem(item.animeId)}
                    style={styles.continueCard}
                  >
                    <Image
                      source={getImageSource(item.poster)}
                      style={styles.continueThumb}
                    />
                    <View style={styles.continueInfo}>
                      <Text numberOfLines={1} style={styles.continueTitle}>
                        {item.animeTitle}
                      </Text>
                      <Text style={styles.continueEp}>
                        S{item.seasonNumber || 1} E{item.episodeNumber}: {epLabel} • {timeStr}
                      </Text>
                      <View style={styles.continueProgressBarBg}>
                        <View
                          style={[
                            styles.continueProgressBarFill,
                            { width: `${pct}%` },
                          ]}
                        />
                      </View>
                    </View>
                    <PlayCircleButton size={32} iconSize={13} />
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <CheckCircle2 size={36} color="#7e8b83" />
                <Text style={styles.emptyTitle}>No watch progress yet</Text>
                <Text style={styles.emptySubtitle}>
                  Episodes you start watching will automatically appear here.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'offline' && (
          <View style={styles.offlineList}>
            {offlineEpisodes.map((item) => (
              <View key={item.id} style={styles.offlineItem}>
                <Image
                  source={getImageSource(item.thumbnail)}
                  style={styles.offlineThumb}
                />
                <View style={styles.offlineInfo}>
                  <Text numberOfLines={1} style={styles.offlineTitle}>
                    {item.animeTitle}
                  </Text>
                  <Text numberOfLines={1} style={styles.offlineEp}>
                    {item.episodeTitle}
                  </Text>
                  <Text style={styles.offlineMeta}>
                    {item.size} • {item.quality}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteOffline(item.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export const WatchlistView = React.memo(WatchlistView_);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050807',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f5f7f6',
  },
  subtitle: {
    fontSize: 12,
    color: '#7e8b83',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    backgroundColor: '#0f1713',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1d3025',
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#22c55e',
  },
  tabButtonText: {
    fontSize: 11.5,
  },
  tabButtonTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  tabButtonTextInactive: {
    color: '#7e8b83',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardCol: {
    width: '31.5%',
    marginBottom: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f5f7f6',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#7e8b83',
    textAlign: 'center',
  },
  continueList: {
    gap: 10,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  continueThumb: {
    width: 60,
    height: 75,
    borderRadius: 8,
  },
  continueInfo: {
    flex: 1,
  },
  continueTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  continueEp: {
    fontSize: 11,
    color: '#7e8b83',
    marginTop: 4,
  },
  continueProgressBarBg: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  continueProgressBarFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  continuePlayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineList: {
    gap: 10,
  },
  offlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  offlineThumb: {
    width: 60,
    height: 75,
    borderRadius: 8,
  },
  offlineInfo: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  offlineEp: {
    fontSize: 11,
    color: '#b7c1ba',
    marginTop: 2,
  },
  offlineMeta: {
    fontSize: 9.5,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
});
