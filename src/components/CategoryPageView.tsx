import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { Anime } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { EpisodeRowCard } from './EpisodeRowCard';
import { useGetCatalogQuery } from '../store/api/animeApi';

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

/** Page types that use backend pagination instead of the homepage animeList */
const PAGINATED_TYPES = new Set<CategoryPageType>(['series', 'movies', 'cartoons']);

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

/** Map CategoryPageType → catalog kind for the API */
function toCatalogKind(pageType: CategoryPageType): 'series' | 'movies' | 'cartoons' {
  if (pageType === 'movies') return 'movies';
  if (pageType === 'cartoons') return 'cartoons';
  return 'series';
}

// ─── Memoized card for the grid ─────────────────────────────────────────────
interface GridItemProps {
  anime: Anime;
  rank?: number;
  onSelect: (anime: Anime) => void;
}

const GridItem = React.memo<GridItemProps>(({ anime, rank, onSelect }) => (
  <View style={styles.cardCol}>
    <AnimeCard anime={anime} rank={rank} onSelect={onSelect} size="fill" />
  </View>
));

// ─── Paginated catalog hook ──────────────────────────────────────────────────
function usePaginatedCatalog(kind: 'series' | 'movies' | 'cartoons') {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<Anime[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const seenIds = useRef(new Set<string>());

  const { data, isFetching, isError } = useGetCatalogQuery({ kind, page });

  // Append new page items without duplicates
  useEffect(() => {
    if (!data) return;
    const fresh = data.items.filter((a) => !seenIds.current.has(a.id));
    fresh.forEach((a) => seenIds.current.add(a.id));
    if (fresh.length > 0) {
      setAllItems((prev) => [...prev, ...fresh]);
    }
    setHasMore(data.hasMore);
  }, [data]);

  const loadNextPage = useCallback(() => {
    if (isFetching || !hasMore) return;
    setPage((p) => p + 1);
  }, [isFetching, hasMore]);

  return { allItems, isFetching, isError, hasMore, page, loadNextPage };
}

// ─── Paginated catalog view ──────────────────────────────────────────────────
const PaginatedCatalogView: React.FC<{
  pageType: CategoryPageType;
  onSelectAnime: (anime: Anime) => void;
}> = ({ pageType, onSelectAnime }) => {
  const kind = toCatalogKind(pageType);
  const { allItems, isFetching, isError, hasMore, page, loadNextPage } = usePaginatedCatalog(kind);
  const isTrending = pageType === 'trending';

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Anime>) => (
      <GridItem
        anime={item}
        rank={isTrending ? index + 1 : undefined}
        onSelect={onSelectAnime}
      />
    ),
    [isTrending, onSelectAnime]
  );

  const keyExtractor = useCallback((item: Anime) => item.id, []);

  const footer = useMemo(() => {
    if (isFetching && page > 1) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#22c55e" />
        </View>
      );
    }
    if (!hasMore && allItems.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>All titles loaded</Text>
        </View>
      );
    }
    return undefined;
  }, [isFetching, page, hasMore, allItems.length]);

  if (isError) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>Failed to load catalog. Pull to retry.</Text>
      </View>
    );
  }

  if (isFetching && page === 1 && allItems.length === 0) {
    return (
      <View style={styles.initialLoader}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={allItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={3}
      onEndReached={loadNextPage}
      onEndReachedThreshold={0.3}
      ListFooterComponent={footer}
      contentContainerStyle={styles.scrollContent}
      columnWrapperStyle={styles.columnWrapper}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      windowSize={7}
      maxToRenderPerBatch={9}
      initialNumToRender={12}
    />
  );
};

// ─── Static filtered catalog view (for homepage-data-based pages) ────────────
const StaticCatalogView: React.FC<{
  pageType: CategoryPageType;
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
}> = ({ pageType, animeList, onSelectAnime }) => {
  const displayedAnime = useMemo(() => {
    switch (pageType) {
      case 'trending':
        return animeList.filter((a) => a.isTrending || a.rating >= 8.5);
      case 'popular':
        return animeList.filter((a) => a.isPopular || a.rating >= 8.8);
      case 'on-air':
        return animeList.filter((a) => a.isOnAir);
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

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Anime>) => (
      <GridItem
        anime={item}
        rank={pageType === 'trending' ? index + 1 : undefined}
        onSelect={onSelectAnime}
      />
    ),
    [pageType, onSelectAnime]
  );

  const keyExtractor = useCallback((item: Anime) => item.id, []);

  if (pageType === 'latest') {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, styles.episodesList]}
      >
        {latestEpisodes.map(({ ep, anime }) => (
          <EpisodeRowCard
            key={`cat-ep-${ep.id}`}
            episode={ep}
            anime={anime}
            onSelect={() => onSelectAnime(anime)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={displayedAnime}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={3}
      contentContainerStyle={styles.scrollContent}
      columnWrapperStyle={styles.columnWrapper}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      windowSize={7}
      maxToRenderPerBatch={9}
      initialNumToRender={12}
    />
  );
};

// ─── Main CategoryPageView ───────────────────────────────────────────────────
const CategoryPageView_: React.FC<CategoryPageViewProps> = ({
  pageType,
  animeList,
  onBack,
  onSelectAnime,
  onToggleSave,
  savedAnimeIds,
}) => {
  const meta = PAGE_META[pageType] || { title: 'Anime Category', tag: 'Category' };
  const isPaginated = PAGINATED_TYPES.has(pageType);

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
          {!isPaginated && (
            <Text style={styles.headerCount}>
              {animeList.length} Titles available
            </Text>
          )}
        </View>
        <View style={styles.tagBadge}>
          <Text style={styles.tagBadgeText}>{meta.tag}</Text>
        </View>
      </View>

      {/* Content */}
      {isPaginated ? (
        <PaginatedCatalogView
          pageType={pageType}
          onSelectAnime={onSelectAnime}
        />
      ) : (
        <StaticCatalogView
          pageType={pageType}
          animeList={animeList}
          onSelectAnime={onSelectAnime}
        />
      )}
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
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardCol: {
    width: '31.5%',
    marginBottom: 10,
  },
  episodesList: {
    gap: 2,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerEnd: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerEndText: {
    fontSize: 11,
    color: '#7e8b83',
  },
  initialLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#7e8b83',
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
  },
});
