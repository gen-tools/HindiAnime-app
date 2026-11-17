import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  BackHandler,
  Keyboard,
} from 'react-native';
import {
  ChevronRight,
  Search,
  ArrowLeft,
  X,
} from 'lucide-react-native';
import { Anime, LatestEpisodeItem } from '../types/anime';
import { CATEGORIES } from '../data/sampleAnime';
import { HindiAnimeLogo } from './HindiAnimeLogo';
import { HeroCoverflow } from './HeroCoverflow';
import { AnimeCard } from './AnimeCard';
import { LatestEpisodeCard } from './LatestEpisodeCard';
import { PlayCircleButton } from './PlayCircleButton';
import { CategoryPageType } from './CategoryPageView';
import { getImageSource } from '../utils/imageHelper';
import { useSearchAnimeQuery } from '../store/api/animeApi';

interface HomeViewProps {
  animeList: Anime[];
  latestEpisodesList?: LatestEpisodeItem[];
  onSelectAnime: (anime: Anime) => void;
  onOpenCategoryPage: (page: CategoryPageType) => void;
  onSearchNavigate?: (query: string) => void;
}

const ALPHABET = [
  'All', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

const POPULAR_GENRES = [
  'Shonen', 'Dark Fantasy', 'Action', 'Cyberpunk', 'Mecha',
  'Supernatural', 'Isekai', 'Romance', 'Adventure', 'Sci-Fi'
];

const HomeView_: React.FC<HomeViewProps> = ({
  animeList,
  latestEpisodesList = [],
  onSelectAnime,
  onOpenCategoryPage,
  onSearchNavigate,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('trending');
  const [selectedAZLetter, setSelectedAZLetter] = useState<string>('All');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [topSearchQuery, setTopSearchQuery] = useState<string>('');
  const [debouncedTopQuery, setDebouncedTopQuery] = useState<string>('');

  const handleKeyboardSubmit = () => {
    const q = topSearchQuery.trim();
    if (q.length > 0) {
      Keyboard.dismiss();
      setIsSearchActive(false);
      setTopSearchQuery('');
      onSearchNavigate?.(q);
    }
  };

  // Debounce search input by 300ms, normalize by trimming and lowercasing
  useEffect(() => {
    const trimmed = topSearchQuery.trim().toLowerCase().replace(/\s+/g, ' ');
    if (trimmed.length < 2) {
      setDebouncedTopQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedTopQuery(trimmed);
    }, 300);
    return () => clearTimeout(timer);
  }, [topSearchQuery]);

  // Handle hardware back button to dismiss search overlay
  useEffect(() => {
    if (!isSearchActive) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsSearchActive(false);
      setTopSearchQuery('');
      return true;
    });
    return () => sub.remove();
  }, [isSearchActive]);

  // RTK Query: deduplicated, cached search against Cloudflare Worker / AnimeSalt
  const { data: remoteResults, isFetching: isSearching } = useSearchAnimeQuery(
    debouncedTopQuery,
    {
      skip: !debouncedTopQuery || debouncedTopQuery.length < 2,
    }
  );

  // Top search results: merges local catalog items with remote search matches
  // Depends only on debouncedTopQuery (not raw topSearchQuery) so the expensive
  // filter+merge runs at most once per 300ms, not on every keystroke.
  const topSearchResults = useMemo(() => {
    const q = debouncedTopQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    let pool = animeList;
    if (remoteResults && remoteResults.length > 0) {
      const idSet = new Set(remoteResults.map((a) => a.id));
      const localMatches = animeList.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.hindiTitle?.toLowerCase().includes(q)
      );
      pool = [...remoteResults, ...localMatches.filter((a) => !idSet.has(a.id))];
    }

    return pool
      .filter((anime) => {
        return (
          anime.title.toLowerCase().includes(q) ||
          anime.originalTitle?.toLowerCase().includes(q) ||
          anime.hindiTitle?.toLowerCase().includes(q) ||
          (anime.genres || []).some((g) => g.toLowerCase().includes(q))
        );
      })
      .slice(0, 15);
  }, [animeList, debouncedTopQuery, remoteResults]);

  // Section data: Real Trending, Popular, On-Air, Series, Movies
  const heroItems = useMemo(
    () => animeList.filter((a) => a.isTrending || a.rating >= 8.8).slice(0, 7),
    [animeList]
  );
  const trendingAnime = useMemo(
    () => animeList.filter((a) => a.isTrending).slice(0, 15),
    [animeList]
  );
  const popularAnime = useMemo(
    () => animeList.filter((a) => a.isPopular || a.rating >= 8.7).slice(0, 15),
    [animeList]
  );
  const onAirAnime = useMemo(
    () => animeList.filter((a) => a.isOnAir).slice(0, 8),
    [animeList]
  );
  const seriesAnime = useMemo(
    () => animeList.filter((a) => a.type === 'Series' && !a.isCartoon).slice(0, 15),
    [animeList]
  );
  const moviesAnime = useMemo(
    () => animeList.filter((a) => a.isMovie && !a.isCartoon).slice(0, 15),
    [animeList]
  );
  const cartoonSeriesAnime = useMemo(
    () => animeList.filter((a) => a.isCartoon && !a.isMovie).slice(0, 15),
    [animeList]
  );
  const freshCartoonFilms = useMemo(
    () => animeList.filter((a) => a.isCartoon && a.isMovie).slice(0, 15),
    [animeList]
  );

  // Fallback if latestEpisodesList is empty: construct from animeList
  const effectiveLatestEpisodes: LatestEpisodeItem[] = useMemo(() => {
    if (latestEpisodesList && latestEpisodesList.length > 0) {
      return latestEpisodesList.slice(0, 12);
    }
    return animeList.slice(0, 8).map((anime, idx) => ({
      id: `fallback-ep-${anime.id}-${idx + 1}`,
      animeId: anime.id,
      animeSlug: anime.id,
      animeTitle: anime.title,
      title: `Episode 1`,
      episodeNumber: 1,
      seasonNumber: 1,
      displayEpisode: 'EP 1',
      thumbnail: anime.poster,
      poster: anime.poster,
      duration: anime.duration || '24m',
      releaseDate: 'Just Now',
      isHindiDubbed: true,
      anime,
    }));
  }, [latestEpisodesList, animeList]);

  // A to Z filtered titles (capped to 24 for ultra-smooth scrolling on low-end devices)
  const azFilteredAnime = useMemo(() => {
    let filtered = animeList;
    if (selectedAZLetter === '#') {
      filtered = animeList.filter((a) => /^[0-9]/.test(a.title));
    } else if (selectedAZLetter !== 'All') {
      filtered = animeList.filter((a) =>
        a.title.toUpperCase().startsWith(selectedAZLetter)
      );
    }
    return filtered.slice(0, 24);
  }, [animeList, selectedAZLetter]);

  const handleCategoryClick = (catId: string) => {
    setActiveCategory(catId);
    if (catId === 'trending') {
      onOpenCategoryPage('trending');
    } else if (catId === 'new') {
      onOpenCategoryPage('latest');
    } else if (catId === 'movies') {
      onOpenCategoryPage('movies');
    } else if (catId === 'serials' || catId === 'tv_shows') {
      onOpenCategoryPage('series');
    } else if (catId === 'hindi_exclusive') {
      onOpenCategoryPage('popular');
    } else if (catId === 'tamil') {
      onOpenCategoryPage('tamil');
    } else if (catId === 'telugu') {
      onOpenCategoryPage('telugu');
    } else if (catId === 'japanese') {
      onOpenCategoryPage('japanese');
    } else if (catId === 'cartoons') {
      onOpenCategoryPage('cartoons');
    }
  };

  const handleSelectLatestEpisode = (item: LatestEpisodeItem) => {
    if (item.anime) {
      onSelectAnime(item.anime);
    } else {
      const match = animeList.find((a) => a.id === item.animeId || a.id === item.animeSlug);
      if (match) {
        onSelectAnime(match);
      } else {
        onSelectAnime({
          id: item.animeSlug || item.animeId,
          title: item.animeTitle || item.title,
          poster: item.poster || item.thumbnail,
          rating: 8.8,
          synopsis: `Watch ${item.animeTitle} in HD Hindi Dub.`,
          duration: '24m',
          genres: ['Action', 'Fantasy'],
          type: 'Series',
        } as any);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── Top Header: Logo + Search Bar ─── */}
      <View style={styles.header}>
        {isSearchActive ? (
          <View style={styles.searchActiveRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setIsSearchActive(false);
                setTopSearchQuery('');
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={18} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.searchInputContainer}>
              <TextInput
                value={topSearchQuery}
                onChangeText={setTopSearchQuery}
                placeholder="Search anime, Hindi titles..."
                placeholderTextColor="#7e8b83"
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={handleKeyboardSubmit}
              />
              {topSearchQuery.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setTopSearchQuery('')}
                    style={styles.clearSearchButton}
                  >
                    <X size={14} color="#7e8b83" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={handleKeyboardSubmit}
                    style={{ padding: 4 }}
                  >
                    <Search size={16} color="#22c55e" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.headerRow}>
            <HindiAnimeLogo size="md" />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsSearchActive(true)}
              style={styles.searchIconButton}
            >
              <Search size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Live Search Results Overlay */}
        {isSearchActive && topSearchQuery.trim().length > 0 && (
          <ScrollView
            style={styles.searchResultsDropdown}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsCount}>
                MATCHING TITLES ({topSearchResults.length})
              </Text>
            </View>

            {topSearchResults.map((anime) => (
              <TouchableOpacity
                key={anime.id}
                activeOpacity={0.8}
                onPress={() => {
                  setIsSearchActive(false);
                  setTopSearchQuery('');
                  onSelectAnime(anime);
                }}
                style={styles.searchResultItem}
              >
                <Image
                  source={getImageSource(anime.poster)}
                  style={styles.searchResultThumb}
                />
                <View style={styles.searchResultInfo}>
                  <Text numberOfLines={1} style={styles.searchResultTitle}>
                    {anime.title}
                  </Text>
                  <Text numberOfLines={1} style={styles.searchResultSub}>
                    {anime.originalTitle} • {anime.type}
                  </Text>
                  <View style={styles.searchResultBadges}>
                    <View style={styles.hindiPill}>
                      <Text style={styles.hindiPillText}>HINDI DUB</Text>
                    </View>
                    <Text style={styles.starText}>★ {anime.rating}</Text>
                  </View>
                </View>
                <PlayCircleButton size={28} iconSize={12} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Category Navigation Bar (Matching website https://hindi-anime.com/) */}
        {!isSearchActive && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => handleCategoryClick(cat.id)}
                  style={styles.categoryTab}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      isActive ? styles.categoryTabTextActive : styles.categoryTabTextInactive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  {isActive && <View style={styles.categoryActiveLine} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* ─── Main Scrollable Content ─── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        removeClippedSubviews={true}
      >
        {/* Hero Section with Solid Coverflow Cards */}
        <HeroCoverflow items={heroItems} onSelectAnime={onSelectAnime} />

        {/* ─── 1. Latest Episodes (Real fresh drops) ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Episodes</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCategoryPage('latest')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>View all</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>

          {/* Horizontal scroll of landscape episode cards with NEW badge */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
            removeClippedSubviews={true}
          >
            {effectiveLatestEpisodes.map((item) => (
              <LatestEpisodeCard
                key={`latest-${item.id}`}
                item={item}
                onSelect={() => handleSelectLatestEpisode(item)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── 2. Trending Now (Ranked 01, 02, 03... real ranking) ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Now</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCategoryPage('trending')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
            removeClippedSubviews={true}
          >
            {trendingAnime.map((anime, idx) => (
              <AnimeCard
                key={`trending-${anime.id}-${idx}`}
                anime={anime}
                rank={idx + 1}
                onSelect={onSelectAnime}
                size="normal"
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── 3. Popular Anime (Real data) ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Anime</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCategoryPage('popular')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
            removeClippedSubviews={true}
          >
            {popularAnime.map((anime, idx) => (
              <AnimeCard
                key={`pop-${anime.id}-${idx}`}
                anime={anime}
                onSelect={onSelectAnime}
                size="normal"
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── 4. On Air & Upcoming (Real on-air) ─── */}
        {onAirAnime.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>On Air & Upcoming</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onOpenCategoryPage('on-air')}
                style={styles.seeAllButton}
              >
                <Text style={styles.seeAllText}>View all</Text>
                <ChevronRight size={14} color="#86efac" />
              </TouchableOpacity>
            </View>

            <View style={styles.onAirList}>
              {onAirAnime.map((anime) => (
                <TouchableOpacity
                  key={`onair-${anime.id}`}
                  activeOpacity={0.8}
                  onPress={() => onSelectAnime(anime)}
                  style={styles.onAirCard}
                >
                  <Image
                    source={getImageSource(anime.poster)}
                    style={styles.onAirPoster}
                  />
                  <View style={styles.onAirInfo}>
                    <View style={styles.onAirBadgeRow}>
                      <View style={styles.onAirBadge}>
                        <Text style={styles.onAirBadgeText}>ON AIR</Text>
                      </View>
                      <Text numberOfLines={1} style={styles.onAirSchedule}>
                        {anime.airSchedule || 'Weekly Simuldub'}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.onAirTitle}>
                      {anime.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.onAirSynopsis}>
                      {anime.synopsis}
                    </Text>
                    <Text style={styles.onAirDubMeta}>
                      {anime.genres?.[0]} • <Text style={{ color: '#86efac' }}>Hindi 5.1 Dubbed</Text>
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── 5. Series ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Series</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCategoryPage('series')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
            removeClippedSubviews={true}
          >
            {seriesAnime.map((anime, idx) => (
              <AnimeCard
                key={`series-${anime.id}-${idx}`}
                anime={anime}
                onSelect={onSelectAnime}
                size="normal"
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── 6. Movies ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Movies</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCategoryPage('movies')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
            removeClippedSubviews={true}
          >
            {moviesAnime.map((anime, idx) => (
              <AnimeCard
                key={`movie-${anime.id}-${idx}`}
                anime={anime}
                onSelect={onSelectAnime}
                size="normal"
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── 7. Cartoon Series ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cartoon Series</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCategoryPage('cartoon-series')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
            removeClippedSubviews={true}
          >
            {cartoonSeriesAnime.map((anime, idx) => (
              <AnimeCard
                key={`cartoonseries-${anime.id}-${idx}`}
                anime={anime}
                onSelect={onSelectAnime}
                size="normal"
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── 8. Fresh Cartoon Films ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fresh Cartoon Films</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenCategoryPage('fresh-cartoon-films')}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight size={14} color="#86efac" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalCardList}
            removeClippedSubviews={true}
          >
            {freshCartoonFilms.map((anime, idx) => (
              <AnimeCard
                key={`cartoonfilm-${anime.id}-${idx}`}
                anime={anime}
                onSelect={onSelectAnime}
                size="normal"
              />
            ))}
          </ScrollView>
        </View>

        {/* ─── 9. Browse by Language ─── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Browse by Language</Text>

          <View style={styles.languagesGrid}>
            {[
              { id: 'hindi', label: 'Hindi Dubbed Anime', count: '850+ Series', page: 'series' as CategoryPageType },
              { id: 'tamil', label: 'Tamil Dubbed Anime', count: '180+ Titles', page: 'tamil' as CategoryPageType },
              { id: 'telugu', label: 'Telugu Dubbed Anime', count: '140+ Titles', page: 'telugu' as CategoryPageType },
              { id: 'japanese', label: 'Japanese (Org + Subs)', count: '1,200+ Episodes', page: 'japanese' as CategoryPageType },
              { id: 'cartoons', label: 'Cartoons in Hindi', count: '350+ Toons', page: 'cartoons' as CategoryPageType },
              { id: 'dual', label: 'Dual Audio (Hindi+Jap)', count: '410+ Multi-Audio', page: 'popular' as CategoryPageType },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => onOpenCategoryPage(item.page)}
                style={styles.languageCard}
              >
                <View style={styles.languageCardHeader}>
                  <Text numberOfLines={1} style={styles.languageCardTitle}>
                    {item.label}
                  </Text>
                  <ChevronRight size={14} color="#7e8b83" />
                </View>
                <Text style={styles.languageCardCount}>{item.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── 10. Browse by Genre ─── */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Browse by Genre</Text>
          <View style={styles.genrePillsContainer}>
            {POPULAR_GENRES.map((g) => (
              <TouchableOpacity
                key={g}
                activeOpacity={0.7}
                onPress={() => onOpenCategoryPage('series')}
                style={styles.genrePill}
              >
                <Text style={styles.genrePillText}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ─── 11. Navigate A to Z ─── */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Navigate A to Z</Text>
            <Text style={styles.azCountText}>{azFilteredAnime.length} Titles</Text>
          </View>

          {/* Alphabet Horizontal Scroller */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alphabetScroll}
          >
            {ALPHABET.map((letter) => {
              const isSelected = selectedAZLetter === letter;
              return (
                <TouchableOpacity
                  key={letter}
                  activeOpacity={0.7}
                  onPress={() => setSelectedAZLetter(letter)}
                  style={[
                    styles.alphabetButton,
                    isSelected ? styles.alphabetButtonActive : styles.alphabetButtonInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.alphabetButtonText,
                      isSelected ? styles.alphabetButtonTextActive : styles.alphabetButtonTextInactive,
                    ]}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 3 cards per row grid */}
          <View style={styles.azGrid}>
            {azFilteredAnime.map((anime, idx) => (
              <View key={`az-${anime.id}-${idx}`} style={styles.azCardWrapper}>
                <AnimeCard
                  anime={anime}
                  onSelect={onSelectAnime}
                  size="fill"
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export const HomeView = React.memo(HomeView_);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050807',
  },
  header: {
    backgroundColor: 'rgba(5, 8, 7, 0.98)',
    borderBottomWidth: 1,
    borderBottomColor: '#1d3025',
    zIndex: 50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  searchResultsDropdown: {
    maxHeight: 350,
    backgroundColor: '#080d0a',
    borderTopWidth: 1,
    borderTopColor: '#1d3025',
    padding: 12,
  },
  searchResultsHeader: {
    marginBottom: 8,
  },
  searchResultsCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7e8b83',
    letterSpacing: 0.5,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  searchResultThumb: {
    width: 40,
    height: 56,
    borderRadius: 6,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchResultSub: {
    fontSize: 10,
    color: '#7e8b83',
    marginTop: 2,
  },
  searchResultBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  hindiPill: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  hindiPillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#000000',
  },
  starText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#facc15',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 18,
  },
  categoryTab: {
    position: 'relative',
    paddingVertical: 2,
  },
  categoryTabText: {
    fontSize: 12.5,
  },
  categoryTabTextActive: {
    color: '#22c55e',
    fontWeight: '800',
  },
  categoryTabTextInactive: {
    color: '#7e8b83',
    fontWeight: '500',
  },
  categoryActiveLine: {
    position: 'absolute',
    bottom: -10,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionContainer: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f5f7f6',
    letterSpacing: -0.3,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    color: '#86efac',
    fontWeight: '600',
  },
  horizontalCardList: {
    paddingRight: 16,
  },
  onAirList: {
    gap: 10,
  },
  onAirCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  onAirPoster: {
    width: 60,
    height: 84,
    borderRadius: 8,
  },
  onAirInfo: {
    flex: 1,
    gap: 4,
  },
  onAirBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onAirBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  onAirBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#000000',
  },
  onAirSchedule: {
    fontSize: 10.5,
    color: '#7e8b83',
  },
  onAirTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f5f7f6',
  },
  onAirSynopsis: {
    fontSize: 11,
    color: '#7e8b83',
  },
  onAirDubMeta: {
    fontSize: 10,
    color: '#7e8b83',
  },
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  languageCard: {
    width: '48.5%',
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  languageCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageCardTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#f5f7f6',
    flex: 1,
  },
  languageCardCount: {
    fontSize: 10,
    color: '#7e8b83',
  },
  genrePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  genrePillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#b7c1ba',
  },
  azCountText: {
    fontSize: 11.5,
    color: '#7e8b83',
    fontWeight: '600',
  },
  alphabetScroll: {
    gap: 6,
    paddingBottom: 12,
  },
  alphabetButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetButtonActive: {
    backgroundColor: '#22c55e',
  },
  alphabetButtonInactive: {
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  alphabetButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alphabetButtonTextActive: {
    color: '#000000',
  },
  alphabetButtonTextInactive: {
    color: '#7e8b83',
  },
  azGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  azCardWrapper: {
    width: '31.5%',
    marginBottom: 10,
  },
});
