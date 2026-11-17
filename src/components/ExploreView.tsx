import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { Anime } from '../types/anime';
import { AnimeCard } from './AnimeCard';
import { useSearchAnimeQuery } from '../store/api/animeApi';

interface ExploreViewProps {
  animeList: Anime[];
  onSelectAnime: (anime: Anime) => void;
  onToggleSave: (animeId: string) => void;
  savedAnimeIds: string[];
  initialQuery?: string;
}

const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Dark Fantasy',
  'Cyberpunk',
  'Shonen',
  'Mecha',
  'Supernatural',
  'Sci-Fi',
  'Comedy',
  'Isekai',
];

const ExploreView_: React.FC<ExploreViewProps> = ({
  animeList,
  onSelectAnime,
  onToggleSave,
  savedAnimeIds,
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(
    initialQuery.trim().toLowerCase().length >= 2 ? initialQuery.trim().toLowerCase() : ''
  );
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // Synchronize when initialQuery prop updates from external navigation
  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      const clean = initialQuery.trim().toLowerCase();
      if (clean.length >= 2) {
        setDebouncedQuery(clean);
      }
    }
  }, [initialQuery]);

  // Debounce search input by 300ms, normalize by trimming and lowercasing
  // Automatically cancels pending timeouts on rapid keystrokes to prevent flooding AnimeSalt
  useEffect(() => {
    const trimmed = searchQuery.trim().toLowerCase().replace(/\s+/g, ' ');
    if (trimmed.length < 2) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // RTK Query: deduplicates identical searches, caches results, auto-aborts obsolete queries
  const { data: remoteSearchResults, isFetching: isSearching } = useSearchAnimeQuery(
    debouncedQuery,
    {
      skip: !debouncedQuery || debouncedQuery.length < 2,
    }
  );

  const filteredAnime = useMemo(() => {
    const q = (debouncedQuery || searchQuery).toLowerCase().trim();

    // Pool from remote search results (when available) combined with local catalog items
    let pool = animeList;
    if (remoteSearchResults && remoteSearchResults.length > 0) {
      const idSet = new Set(remoteSearchResults.map((a) => a.id));
      const localMatches = animeList.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.hindiTitle?.toLowerCase().includes(q)
      );
      pool = [...remoteSearchResults, ...localMatches.filter((a) => !idSet.has(a.id))];
    }

    return pool.filter((anime) => {
      const matchesQuery =
        !q ||
        anime.title.toLowerCase().includes(q) ||
        anime.originalTitle?.toLowerCase().includes(q) ||
        anime.hindiTitle?.toLowerCase().includes(q) ||
        (anime.genres || []).some((g) => g.toLowerCase().includes(q));

      const matchesGenre =
        selectedGenre === 'All' ||
        (anime.genres || []).some(
          (g) => g.toLowerCase() === selectedGenre.toLowerCase()
        );

      return matchesQuery && matchesGenre;
    });
  }, [animeList, debouncedQuery, searchQuery, remoteSearchResults, selectedGenre]);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Catalog & Search</Text>
        <Text style={styles.subtitle}>
          Search Hindi anime series, movies, and episodes
        </Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={16} color="#7e8b83" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by anime name, genre, Hindi title..."
          placeholderTextColor="#7e8b83"
          style={styles.searchInput}
          clearButtonMode="while-editing"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isSearching && (
          <ActivityIndicator size="small" color="#22c55e" style={{ marginRight: 4 }} />
        )}
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setDebouncedQuery('');
            }}
          >
            <X size={16} color="#7e8b83" />
          </TouchableOpacity>
        )}
      </View>

      {/* Genre Filter Pills */}
      <View style={styles.genreContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreScroll}
        >
          {GENRES.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <TouchableOpacity
                key={genre}
                activeOpacity={0.7}
                onPress={() => setSelectedGenre(genre)}
                style={[
                  styles.genrePill,
                  isSelected ? styles.genrePillActive : styles.genrePillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.genrePillText,
                    isSelected ? styles.genrePillTextActive : styles.genrePillTextInactive,
                  ]}
                >
                  {genre}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          Showing {filteredAnime.length} {filteredAnime.length === 1 ? 'title' : 'titles'}
          {selectedGenre !== 'All' ? ` in ${selectedGenre}` : ''}
        </Text>
        {(searchQuery.length > 0 || selectedGenre !== 'All') && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setSelectedGenre('All');
            }}
          >
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3 cards per row grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContent}
      >
        {filteredAnime.length > 0 ? (
          <View style={styles.animeGrid}>
            {filteredAnime.map((anime) => (
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
            <Search size={36} color="#7e8b83" />
            <Text style={styles.emptyTitle}>No Anime Found</Text>
            <Text style={styles.emptySubtitle}>
              Try searching for &quot;Flame Blade&quot;, &quot;Cyber Hunter&quot;, or choose &quot;All&quot; genres.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export const ExploreView = React.memo(ExploreView_);

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
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#7e8b83',
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: '#f5f7f6',
    fontSize: 12,
  },
  genreContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  genreScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  genrePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genrePillActive: {
    backgroundColor: '#22c55e',
  },
  genrePillInactive: {
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  genrePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  genrePillTextActive: {
    color: '#000000',
  },
  genrePillTextInactive: {
    color: '#7e8b83',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  resultsCount: {
    fontSize: 11.5,
    color: '#7e8b83',
    fontWeight: '600',
  },
  resetText: {
    fontSize: 11.5,
    color: '#22c55e',
    fontWeight: '700',
  },
  gridContent: {
    paddingBottom: 90,
    paddingTop: 4,
  },
  animeGrid: {
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
    paddingVertical: 60,
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
    maxWidth: 240,
  },
});
