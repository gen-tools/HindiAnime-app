import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Anime, LatestEpisodeItem } from '../types/anime';
import { getImageSource } from '../utils/imageHelper';
import { PlayCircleButton } from './PlayCircleButton';

interface LatestEpisodeCardProps {
  item: LatestEpisodeItem;
  onSelect: () => void;
}

export const LatestEpisodeCard: React.FC<LatestEpisodeCardProps> = React.memo(({
  item,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      style={styles.card}
    >
      {/* Left Thumbnail with NEW badge */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={getImageSource(item.thumbnail || item.poster)}
          style={styles.thumbnail}
          resizeMode="cover"
          fadeDuration={150}
        />

        {/* NEW Badge matching screenshot */}
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>

        {/* Standardized Play Button */}
        <View style={styles.playOverlay}>
          <PlayCircleButton size={26} iconSize={12} />
        </View>
      </View>

      {/* Right Details */}
      <View style={styles.infoCol}>
        <Text numberOfLines={1} style={styles.titleText}>
          {item.animeTitle || item.title}
        </Text>
        <Text numberOfLines={1} style={styles.episodeText}>
          EP {item.episodeNumber} · S{item.seasonNumber}
        </Text>
        <View style={styles.durationRow}>
          <Clock size={11} color="#7e8b83" />
          <Text style={styles.durationText}>{item.duration || '24m'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

LatestEpisodeCard.displayName = 'LatestEpisodeCard';

const styles = StyleSheet.create({
  card: {
    width: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
    gap: 10,
  },
  thumbnailContainer: {
    width: 95,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0d1611',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  newBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: 'rgba(22, 163, 74, 0.35)',
    borderWidth: 0.5,
    borderColor: '#22c55e',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    zIndex: 10,
  },
  newBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#86efac',
    letterSpacing: 0.5,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  episodeText: {
    fontSize: 10.5,
    color: '#b7c1ba',
    marginTop: 2,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  durationText: {
    fontSize: 10,
    color: '#7e8b83',
  },
});
