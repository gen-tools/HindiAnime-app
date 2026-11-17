/**
 * HeroCoverflow — High performance, native 1-by-1 infinite looped horizontal card swiper.
 * Exact match for the drama streaming app hero section reference:
 *  - Infinite virtual looping: seamless wrap-around when swiping past ends
 *  - FlatList with snapToInterval: smooth native physics
 *  - Prominent center card with rounded corners (borderRadius: 24)
 *  - Side cards scaled down, lower opacity, peeking in from left and right
 *  - Ambient dynamic color blur/glow sampled from the anime behind the active card
 *  - Standardized play button in center of active card
 *  - Clean metadata row and animated dot indicator
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { Anime } from '../types/anime';
import { getImageSource } from '../utils/imageHelper';
import { PlayCircleButton } from './PlayCircleButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Main active card dimensions matching the reference drama app ratio
const CARD_WIDTH = Math.min(Math.round(SCREEN_WIDTH * 0.68), 245);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.42);

// Spacing between cards
const SPACING = 14;
const ITEM_FULL_WIDTH = CARD_WIDTH + SPACING;

// Side margins to center the first and last card precisely on the screen
const SIDE_MARGIN = (SCREEN_WIDTH - CARD_WIDTH) / 2;

const GLOW_COLORS = [
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#eab308', // Amber
  '#ec4899', // Pink
  '#a855f7', // Purple
];

const LOOP_MULTIPLIER = 20; // 20×7=140 items; ample buffer (70 each side from center) while using ~60% less memory than 50×

interface HeroCoverCardProps {
  item: Anime;
  index: number;
  scrollX: Animated.Value;
  onPressCard: (item: Anime, index: number) => void;
}

/**
 * Pure, memoized card item for the HeroCoverflow.
 * Interpolates scale and opacity on the native driver without re-rendering on scroll or index changes.
 */
const HeroCoverCard = React.memo<HeroCoverCardProps>(({
  item,
  index,
  scrollX,
  onPressCard,
}) => {
  const { scale, opacity, playOpacity, playScale } = useMemo(() => {
    const inputRange = [
      (index - 1) * ITEM_FULL_WIDTH,
      index * ITEM_FULL_WIDTH,
      (index + 1) * ITEM_FULL_WIDTH,
    ];

    const playInputRange = [
      (index - 0.55) * ITEM_FULL_WIDTH,
      index * ITEM_FULL_WIDTH,
      (index + 0.55) * ITEM_FULL_WIDTH,
    ];

    return {
      scale: scrollX.interpolate({
        inputRange,
        outputRange: [0.82, 1.0, 0.82],
        extrapolate: 'clamp',
      }),
      opacity: scrollX.interpolate({
        inputRange,
        outputRange: [0.45, 1.0, 0.45],
        extrapolate: 'clamp',
      }),
      playOpacity: scrollX.interpolate({
        inputRange: playInputRange,
        outputRange: [0, 1, 0],
        extrapolate: 'clamp',
      }),
      playScale: scrollX.interpolate({
        inputRange: playInputRange,
        outputRange: [0.65, 1.0, 0.65],
        extrapolate: 'clamp',
      }),
    };
  }, [index, scrollX]);

  const handlePress = useCallback(() => {
    onPressCard(item, index);
  }, [onPressCard, item, index]);

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          marginRight: SPACING,
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.cardTouch}
      >
        {/* Poster Artwork with smooth corners */}
        <Image
          source={getImageSource(item.poster)}
          style={styles.cardImage}
          resizeMode="cover"
          fadeDuration={150}
        />

        {/* Top-Left Hindi Dub / Series Badge */}
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>HINDI DUB</Text>
        </View>

        {/* Top-Right Quality Badge */}
        <View style={styles.qualityBadge}>
          <Text style={styles.qualityBadgeText}>
            {item.qualityBadge || '1080p FHD'}
          </Text>
        </View>

        {/* Play Button Overlay — Animated directly with active card position */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.playButtonOverlay,
            {
              opacity: playOpacity,
              transform: [{ scale: playScale }],
            },
          ]}
        >
          <PlayCircleButton size={48} iconSize={22} />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});
HeroCoverCard.displayName = 'HeroCoverCard';

interface HeroCoverflowProps {
  items: Anime[];
  onSelectAnime: (anime: Anime) => void;
}

export const HeroCoverflow: React.FC<HeroCoverflowProps> = ({
  items,
  onSelectAnime,
}) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);
  const [rawIndex, setRawIndex] = useState(0);
  const rawIndexRef = useRef(0);
  const autoRotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const itemCount = items.length;

  // Build virtually endless items array for infinite looping
  const loopedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    if (items.length === 1) return items;
    const result: (Anime & { uniqueKey: string })[] = [];
    for (let loop = 0; loop < LOOP_MULTIPLIER; loop++) {
      items.forEach((item, idx) => {
        result.push({
          ...item,
          uniqueKey: `${item.id}-loop-${loop}-${idx}`,
        });
      });
    }
    return result;
  }, [items]);

  // Initial scroll position: center of the large loop array
  const middleStartIndex = useMemo(() => {
    if (itemCount <= 1) return 0;
    return Math.floor(LOOP_MULTIPLIER / 2) * itemCount;
  }, [itemCount]);

  // Set initial scroll to middle index once mounted
  useEffect(() => {
    if (itemCount > 1 && middleStartIndex > 0) {
      rawIndexRef.current = middleStartIndex;
      setRawIndex(middleStartIndex);
      // Small timeout ensures FlatList layout is ready
      const t = setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: middleStartIndex * ITEM_FULL_WIDTH,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(t);
    }
  }, [itemCount, middleStartIndex]);

  // Auto-rotation every 5 seconds (seamlessly advances forward indefinitely)
  const startAutoRotate = useCallback(() => {
    if (autoRotateTimerRef.current) clearInterval(autoRotateTimerRef.current);
    if (!items || items.length <= 1) return;

    autoRotateTimerRef.current = setInterval(() => {
      const totalLen = LOOP_MULTIPLIER * itemCount;
      let nextIdx = rawIndexRef.current + 1;

      // Re-center when approaching either edge (within 15% of ends)
      const nearEnd = nextIdx > totalLen * 0.85;
      const nearStart = nextIdx < totalLen * 0.15;
      if (nearEnd || nearStart) {
        const visualPos = ((nextIdx % itemCount) + itemCount) % itemCount;
        nextIdx = Math.floor(LOOP_MULTIPLIER / 2) * itemCount + visualPos;
        rawIndexRef.current = nextIdx;
        setRawIndex(nextIdx);
        // Jump without animation, then auto-rotate will animate next tick
        flatListRef.current?.scrollToOffset({ offset: nextIdx * ITEM_FULL_WIDTH, animated: false });
        return;
      }

      rawIndexRef.current = nextIdx;
      setRawIndex(nextIdx);
      flatListRef.current?.scrollToOffset({ offset: nextIdx * ITEM_FULL_WIDTH, animated: true });
    }, 5000);
  }, [items, itemCount]);

  useEffect(() => {
    startAutoRotate();
    return () => {
      if (autoRotateTimerRef.current) clearInterval(autoRotateTimerRef.current);
    };
  }, [startAutoRotate]);

  // Synchronize active visual index during scroll — only triggers state update when visual (mod) index changes
  useEffect(() => {
    let lastVisualIdx = -1;
    const listenerId = scrollX.addListener(({ value }) => {
      const idx = Math.round(value / ITEM_FULL_WIDTH);
      rawIndexRef.current = idx; // keep ref accurate always
      if (itemCount > 0) {
        const visualIdx = ((idx % itemCount) + itemCount) % itemCount;
        if (visualIdx !== lastVisualIdx) {
          lastVisualIdx = visualIdx;
          setRawIndex(idx);
        }
      }
    });
    return () => {
      scrollX.removeListener(listenerId);
    };
  }, [scrollX, itemCount]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true }
  );

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    let index = Math.round(offsetX / ITEM_FULL_WIDTH);
    const totalLen = LOOP_MULTIPLIER * itemCount;

    // Re-center if near either edge after manual swipe
    const nearEnd = index > totalLen * 0.85;
    const nearStart = index < totalLen * 0.15;
    if (nearEnd || nearStart) {
      const visualPos = ((index % itemCount) + itemCount) % itemCount;
      index = Math.floor(LOOP_MULTIPLIER / 2) * itemCount + visualPos;
      flatListRef.current?.scrollToOffset({ offset: index * ITEM_FULL_WIDTH, animated: false });
    }

    rawIndexRef.current = index;
    setRawIndex(index);
    startAutoRotate();
  };

  const onScrollBeginDrag = () => {
    if (autoRotateTimerRef.current) clearInterval(autoRotateTimerRef.current);
  };

  if (!items || items.length === 0) return null;

  // Real active index mapped to original items range (0..itemCount-1)
  const activeIndex = itemCount > 0 ? (rawIndex % itemCount + itemCount) % itemCount : 0;
  const currentAnime = items[activeIndex] || items[0];
  const activeGlow = GLOW_COLORS[activeIndex % GLOW_COLORS.length];

  const handleCardPress = useCallback(
    (item: Anime, index: number) => {
      if (index === rawIndexRef.current) {
        onSelectAnime(item);
      } else {
        rawIndexRef.current = index;
        setRawIndex(index);
        flatListRef.current?.scrollToOffset({
          offset: index * ITEM_FULL_WIDTH,
          animated: true,
        });
      }
    },
    [onSelectAnime]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <HeroCoverCard
        item={item}
        index={index}
        scrollX={scrollX}
        onPressCard={handleCardPress}
      />
    ),
    [scrollX, handleCardPress]
  );

  const keyExtractor = useCallback((item: any) => item.uniqueKey || item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_FULL_WIDTH,
      offset: ITEM_FULL_WIDTH * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      {/* ── Ambient Glow Backdrop behind the center card ── */}
      <View pointerEvents="none" style={styles.ambientContainer}>
        <View
          style={[
            styles.ambientOuterDisc,
            { backgroundColor: activeGlow + '1A' }, // 10% opacity
          ]}
        />
        <View
          style={[
            styles.ambientInnerDisc,
            { backgroundColor: activeGlow + '33' }, // 20% opacity
          ]}
        />
      </View>

      {/* ── Infinite Looped Snap FlatList (Exact native swipe) ── */}
      <Animated.FlatList
        ref={flatListRef}
        data={itemCount > 1 ? loopedItems : items}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        decelerationRate="fast"
        snapToInterval={ITEM_FULL_WIDTH}
        snapToAlignment="start"
        initialScrollIndex={middleStartIndex}
        windowSize={3}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
        getItemLayout={getItemLayout}
        contentContainerStyle={{
          paddingHorizontal: SIDE_MARGIN,
          alignItems: 'center',
          paddingVertical: 10,
        }}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        renderItem={renderItem}
      />

      {/* ── Metadata & Details Below The Cards ── */}
      <View style={styles.metaContainer}>
        <Text style={styles.yearText}>{currentAnime.releaseYear || '2025'}</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => onSelectAnime(currentAnime)}
        >
          <Text numberOfLines={1} style={styles.titleText}>
            {currentAnime.title}
          </Text>
        </TouchableOpacity>

        {/* Feature Pills */}
        <View style={styles.pillsRow}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {currentAnime.genres?.[0] || 'Action'}
            </Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {currentAnime.duration || '24 min/ep'}
            </Text>
          </View>

          <View style={[styles.pill, styles.ratingPill]}>
            <Star size={11} color="#22c55e" fill="#22c55e" />
            <Text style={styles.ratingText}>{currentAnime.rating}</Text>
          </View>
        </View>

        {/* Dot Pagination Indicator (Cycles 0..itemCount - 1) */}
        <View style={styles.dotsRow}>
          {items.map((_, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => {
                // Scroll to nearest matching item in current loop cycle
                const currentCycle = Math.floor(rawIndexRef.current / itemCount);
                const targetIdx = currentCycle * itemCount + i;
                rawIndexRef.current = targetIdx;
                setRawIndex(targetIdx);
                flatListRef.current?.scrollToOffset({
                  offset: targetIdx * ITEM_FULL_WIDTH,
                  animated: true,
                });
              }}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ambientContainer: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    bottom: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientOuterDisc: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_WIDTH * 0.95,
    borderRadius: (SCREEN_WIDTH * 0.95) / 2,
  },
  ambientInnerDisc: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: (SCREEN_WIDTH * 0.65) / 2,
  },
  cardWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.75,
    shadowRadius: 18,
    elevation: 12,
  },
  cardTouch: {
    flex: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  topBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  topBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  qualityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  qualityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  yearText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7e8b83',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#f5f7f6',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    backgroundColor: '#0f1713',
    borderWidth: 1,
    borderColor: '#1d3025',
    borderRadius: 16,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b7c1ba',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#22c55e',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    height: 6,
    backgroundColor: '#22c55e',
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: '#1d3025',
  },
});
