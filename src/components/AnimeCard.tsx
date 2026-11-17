import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { Anime } from '../types/anime';
import { getImageSource } from '../utils/imageHelper';

interface AnimeCardProps {
  anime: Anime;
  onSelect: (anime: Anime) => void;
  rank?: number;
  size?: 'compact' | 'normal' | 'wide' | 'fill';
}

export const AnimeCard: React.FC<AnimeCardProps> = React.memo(({
  anime,
  onSelect,
  rank,
  size = 'normal',
}) => {
  const cardWidth =
    size === 'compact' ? 100 : size === 'normal' ? 114 : size === 'wide' ? 160 : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onSelect(anime)}
      style={[
        styles.cardContainer,
        cardWidth ? { width: cardWidth } : { flex: 1, minWidth: 0 },
      ]}
    >
      {/* Poster Image Container */}
      <View style={styles.posterContainer}>
        <Image
          source={getImageSource(anime.poster)}
          style={styles.posterImage}
          resizeMode="cover"
          fadeDuration={150}
        />

        {/* Top Badges */}
        <View style={styles.topLeftBadge}>
          <Text style={styles.badgeText}>{anime.type}</Text>
        </View>

        {/* Top Right: Rating */}
        <View style={styles.topRightContainer}>
          <View style={styles.ratingBadge}>
            <Star size={8} color="#eab308" fill="#eab308" />
            <Text style={styles.ratingText}>{anime.rating}</Text>
          </View>
        </View>

        {/* Bottom metadata snippet */}
        <View style={styles.bottomOverlay}>
          <Text style={styles.bottomMetaText}>{anime.releaseYear}</Text>
          <Text style={styles.bottomMetaDub}>Hindi Dub</Text>
        </View>
      </View>

      {/* Stylized Ranked Number for Trending Rows */}
      {rank !== undefined && (
        <Text style={styles.rankNumber}>
          {String(rank).padStart(2, '0')}
        </Text>
      )}

      {/* Card Info Below Poster - Clean, no quality badge in title */}
      <View style={styles.infoContainer}>
        <Text numberOfLines={1} style={styles.titleText}>
          {anime.title}
        </Text>
        <Text numberOfLines={1} style={styles.genreText}>
          Hindi • {anime.genres?.[0] || 'Anime'}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

AnimeCard.displayName = 'AnimeCard';

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
    marginRight: 8,
  },
  posterContainer: {
    aspectRatio: 2 / 3,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0d1611',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  topLeftBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  topRightContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
  },
  bottomMetaText: {
    fontSize: 8.5,
    color: '#ffffff',
    fontWeight: '600',
  },
  bottomMetaDub: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  rankNumber: {
    position: 'absolute',
    left: -4,
    top: -8,
    fontSize: 34,
    fontWeight: '900',
    color: '#22c55e',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 3,
    zIndex: 20,
  },
  infoContainer: {
    paddingTop: 5,
    width: '100%',
  },
  titleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f5f7f6',
    letterSpacing: -0.2,
  },
  genreText: {
    fontSize: 9.5,
    color: '#7e8b83',
    marginTop: 2,
  },
});
