import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export const SkeletonShimmer: React.FC<{ style?: any }> = ({ style }) => {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.7,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animatedValue]);

  return (
    <Animated.View
      style={[
        styles.shimmerBase,
        { opacity: animatedValue },
        style,
      ]}
    />
  );
};

export const AnimeCardSkeleton: React.FC<{ size?: 'compact' | 'normal' | 'wide' | 'fill' }> = ({
  size = 'normal',
}) => {
  const cardWidth =
    size === 'compact' ? 100 : size === 'normal' ? 114 : size === 'wide' ? 160 : undefined;

  return (
    <View style={[styles.cardContainer, cardWidth ? { width: cardWidth } : { flex: 1 }]}>
      <View style={styles.cardImagePlaceholder}>
        <SkeletonShimmer style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.cardInfo}>
        <SkeletonShimmer style={styles.titlePlaceholder} />
        <SkeletonShimmer style={styles.subtitlePlaceholder} />
      </View>
    </View>
  );
};

export const EpisodeRowSkeleton: React.FC = () => {
  return (
    <View style={styles.episodeRow}>
      <View style={styles.episodeThumb}>
        <SkeletonShimmer style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.episodeDetails}>
        <SkeletonShimmer style={styles.titlePlaceholder} />
        <SkeletonShimmer style={[styles.subtitlePlaceholder, { width: '50%' }]} />
      </View>
    </View>
  );
};

export const HomeViewSkeleton: React.FC = () => {
  return (
    <View style={styles.homeSkeletonContainer}>
      <View style={styles.heroSkeleton}>
        <SkeletonShimmer style={StyleSheet.absoluteFill} />
      </View>
      <View style={styles.sectionSkeleton}>
        <SkeletonShimmer style={{ width: 140, height: 18, borderRadius: 4, marginBottom: 10 }} />
        <View style={styles.rowSkeleton}>
          <AnimeCardSkeleton size="normal" />
          <AnimeCardSkeleton size="normal" />
          <AnimeCardSkeleton size="normal" />
        </View>
      </View>
    </View>
  );
};

export const WatchPageSkeleton: React.FC = () => {
  return (
    <View style={styles.watchSkeletonContainer}>
      <View style={styles.videoSkeleton}>
        <SkeletonShimmer style={StyleSheet.absoluteFill} />
      </View>
      <View style={{ padding: 16 }}>
        <SkeletonShimmer style={{ width: '40%', height: 14, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonShimmer style={{ width: '80%', height: 24, borderRadius: 4, marginBottom: 12 }} />
        <SkeletonShimmer style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 16 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerBase: {
    backgroundColor: '#1d3025',
  },
  cardContainer: {
    marginRight: 8,
  },
  cardImagePlaceholder: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    backgroundColor: '#0d1611',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  cardInfo: {
    paddingTop: 6,
    gap: 4,
  },
  titlePlaceholder: {
    width: '80%',
    height: 12,
    borderRadius: 4,
  },
  subtitlePlaceholder: {
    width: '60%',
    height: 10,
    borderRadius: 4,
  },
  episodeRow: {
    flexDirection: 'row',
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1d3025',
    backgroundColor: '#0f1713',
    padding: 10,
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  episodeThumb: {
    width: 120,
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#0d1611',
    overflow: 'hidden',
  },
  episodeDetails: {
    flex: 1,
    gap: 8,
  },
  homeSkeletonContainer: {
    padding: 16,
    gap: 20,
  },
  heroSkeleton: {
    height: 280,
    borderRadius: 20,
    backgroundColor: '#0f1713',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1d3025',
  },
  sectionSkeleton: {
    gap: 8,
  },
  rowSkeleton: {
    flexDirection: 'row',
    gap: 8,
  },
  watchSkeletonContainer: {
    flex: 1,
    backgroundColor: '#050807',
  },
  videoSkeleton: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0d1611',
    overflow: 'hidden',
  },
});
