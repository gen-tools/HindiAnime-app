import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Clock } from 'lucide-react-native';
import { Episode, Anime } from '../types/anime';
import { getImageSource } from '../utils/imageHelper';
import { PlayCircleButton } from './PlayCircleButton';

interface EpisodeRowCardProps {
  episode: Episode;
  anime: Anime;
  onSelect: () => void;
}

export const EpisodeRowCard: React.FC<EpisodeRowCardProps> = React.memo(({
  episode,
  anime,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onSelect}
      style={styles.cardContainer}
    >
      {/* Landscape Thumbnail */}
      <View style={styles.thumbnailContainer}>
        <Image
          source={getImageSource(episode.thumbnail || anime.poster)}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />

        <View style={styles.playOverlay}>
          <PlayCircleButton size={28} iconSize={13} />
        </View>

        {/* Hindi Dub Badge */}
        <View style={styles.badgeHindi}>
          <Text style={styles.badgeHindiText}>HINDI</Text>
        </View>
      </View>

      {/* Episode Details */}
      <View style={styles.detailsContainer}>
        <View>
          <Text numberOfLines={1} style={styles.animeTitle}>
            {anime.title}
          </Text>
          <Text numberOfLines={1} style={styles.episodeTitle}>
            EP {episode.episodeNumber} · {episode.title.split(': ')[1] || episode.title}
          </Text>
        </View>

        <View style={styles.tagRow}>
          <Text style={styles.tagTextWhite}>Hindi Dub</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.tagTextMuted}>Dual Audio</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.durationBox}>
            <Clock size={11} color="rgba(255, 255, 255, 0.6)" />
            <Text style={styles.metaText}>{episode.duration}</Text>
          </View>
          <Text style={styles.metaText}>{episode.releaseDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

EpisodeRowCard.displayName = 'EpisodeRowCard';

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    height: 96,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1d3025',
    backgroundColor: '#0f1713',
    padding: 8,
    marginBottom: 8,
  },
  thumbnailContainer: {
    height: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0d1611',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  badgeHindi: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeHindiText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
    paddingVertical: 2,
  },
  animeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f5f7f6',
  },
  episodeTitle: {
    fontSize: 11,
    color: '#b7c1ba',
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagTextWhite: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  tagTextMuted: {
    fontSize: 9.5,
    color: '#7e8b83',
  },
  dot: {
    fontSize: 9.5,
    color: '#7e8b83',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 9.5,
    color: '#7e8b83',
  },
});
