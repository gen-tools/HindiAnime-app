import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Anime } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { EpisodeRowCard } from './EpisodeRowCard';

export type CategoryPageType =
  | 'trending'
  | 'popular'
  | 'latest'
  | 'on-air'
  | 'series'
  | 'movies'
  | 'cartoon-series'
  | 'fresh-cartoon-films'
  | 'tamil'
  | 'telugu'
  | 'japanese'
  | 'cartoons';

interface CategoryPageViewProps {
  pageType: CategoryPageType;
  animeList: Anime[];
  onBack: () => void;
  onSelectAnime: (anime: Anime) => void;
  onToggleSave: (animeId: string) => void;
  savedAnimeIds: string[];
}

const PAGE_META: Record<CategoryPageType, { title: string; tag: string }> = {
  trending: { title: 'Trending Now', tag: 'Trending' },
  popular: { title: 'Popular Anime', tag: 'Popular' },
  latest: { title: 'Latest Episodes & Releases', tag: 'Latest' },
  'on-air': { title: 'On Air & Upcoming Shows', tag: 'On Air' },
  series: { title: 'Anime TV Series', tag: 'Series' },
  movies: { title: 'Blockbuster Anime Movies', tag: 'Movies' },
  'cartoon-series': { title: 'Cartoon Series', tag: 'Cartoons' },
  'fresh-cartoon-films': { title: 'Fresh Cartoon Films', tag: 'Cartoon Films' },
  tamil: { title: 'Tamil Dubbed Anime', tag: 'Tamil Dubbed' },
  telugu: { title: 'Telugu Dubbed Anime', tag: 'Telugu Dubbed' },
  japanese: { title: 'Japanese Original Anime', tag: 'Japanese (Org)' },
  cartoons: { title: 'Cartoons & Animated Films', tag: 'Cartoons' },
};

const CategoryPageView_: React.FC<CategoryPageViewProps> = ({
  pageType,
  animeList,
  onBack,
  onSelectAnime,
  onToggleSave,
  savedAnimeIds,
}) => {
  const meta = PAGE_META[pageType] || { title: 'Anime Category', tag: 'Category' };

  const displayedAnime = useMemo(() => {
    switch (pageType) {
      case 'trending':
        return animeList.filter((a) => a.isTrending || a.rating >= 8.5);
      case 'popular':
        return animeList.filter((a) => a.isPopular || a.rating >= 8.8);
      case 'on-air':
        return animeList.filter((a) => a.isOnAir);
      case 'series':
        return animeList.filter((a) => a.type === 'Series');
      case 'movies':
        return animeList.filter((a) => a.isMovie || a.type === 'Movie');
      case 'cartoon-series':
        return animeList.filter((a) => a.isCartoon && a.type !== 'Movie');
      case 'fresh-cartoon-films':
        return animeList.filter((a) => a.isFreshCartoonFilm || (Boolean(a.isCartoon) && a.type === 'Movie'));
      case 'tamil':
        return animeList.filter((a) => (a.audioTracks || []).some((t) => t.includes('Tamil')));
      case 'telugu':
        return animeList.filter((a) => (a.audioTracks || []).some((t) => t.includes('Telugu')));
      case 'japanese':
        return animeList.filter((a) => (a.audioTracks || []).some((t) => t.includes('Japanese') || t.includes('Jap')));
      case 'cartoons':
        return animeList.filter((a) => a.isCartoon);
      default:
        return animeList;
    }
  }, [animeList, pageType]);

  const latestEpisodes = useMemo(() => {
    return animeList.flatMap((anime) =>
      (anime.seasons || []).flatMap((season) =>
        (season.episodes || []).slice(0, 2).map((ep) => ({ ep, anime }))
      )
    );
  }, [animeList]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={18} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {meta.title}
          </Text>
          <Text style={styles.headerCount}>{displayedAnime.length} Titles available</Text>
        </View>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>{meta.tag}</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pageType === 'latest' ? (
          <View style={styles.episodesList}>
            {latestEpisodes.map(({ ep, anime }) => (
              <EpisodeRowCard
                key={`cat-ep-${ep.id}`}
                episode={ep}
                anime={anime}
                onSelect={() => onSelectAnime(anime)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {displayedAnime.map((anime, idx) => (
              <View key={`cat-${anime.id}`} style={styles.cardCol}>
                <AnimeCard
                  anime={anime}
                  rank={pageType === 'trending' ? idx + 1 : undefined}
                  onSelect={onSelectAnime}
                  size="fill"
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export const CategoryPageView = React.memo(CategoryPageView_);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050807',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
    backgroundColor: '#050807',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerCount: {
    fontSize: 11,
    color: '#7e8b83',
    marginTop: 2,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#142019',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  tagBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#86efac',
  },
  scrollContent: {
    padding: 16,
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
  episodesList: {
    gap: 2,
  },
});
