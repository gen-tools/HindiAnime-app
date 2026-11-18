import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Compass, Search, Bookmark, User } from 'lucide-react-native';

export type NavTab = 'home' | 'browse' | 'search' | 'list' | 'profile';

interface FloatingDockProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  favoritesCount?: number;
}

export const FloatingDock: React.FC<FloatingDockProps> = React.memo(({
  currentTab,
  onTabChange,
  favoritesCount = 0,
}) => {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom + 8, Platform.OS === 'ios' ? 24 : 14);
  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <View style={styles.dockContainer}>
        {/* 1. Home */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTabChange('home')}
          style={styles.tabButton}
        >
          <Home
            size={20}
            color={currentTab === 'home' ? '#22c55e' : '#7e8b83'}
            strokeWidth={currentTab === 'home' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'home' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Home
          </Text>
          {currentTab === 'home' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* 2. Browse */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTabChange('browse')}
          style={styles.tabButton}
        >
          <Compass
            size={20}
            color={currentTab === 'browse' ? '#22c55e' : '#7e8b83'}
            strokeWidth={currentTab === 'browse' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'browse' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Browse
          </Text>
          {currentTab === 'browse' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* 3. Center Elevated Search Button (Green signature style) */}
        <View style={styles.centerButtonWrapper}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onTabChange('search')}
            style={[
              styles.centerButton,
              currentTab === 'search' && styles.centerButtonActive,
            ]}
          >
            <Search size={22} color="#000000" strokeWidth={2.8} />
          </TouchableOpacity>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'search' ? styles.tabLabelActive : styles.tabLabelInactive,
              { fontWeight: '700' },
            ]}
          >
            Search
          </Text>
        </View>

        {/* 4. List / Watchlist */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTabChange('list')}
          style={styles.tabButton}
        >
          <View style={styles.iconWrapper}>
            <Bookmark
              size={20}
              color={currentTab === 'list' ? '#22c55e' : '#7e8b83'}
              strokeWidth={currentTab === 'list' ? 2.5 : 2}
            />
            {favoritesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{favoritesCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'list' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            List
          </Text>
          {currentTab === 'list' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* 5. You / Profile */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTabChange('profile')}
          style={styles.tabButton}
        >
          <User
            size={20}
            color={currentTab === 'profile' ? '#22c55e' : '#7e8b83'}
            strokeWidth={currentTab === 'profile' ? 2.5 : 2}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'profile' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            You
          </Text>
          {currentTab === 'profile' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>
    </View>
  );
});

FloatingDock.displayName = 'FloatingDock';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 14, // Fallback; overridden dynamically from useSafeAreaInsets in render
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 90,
    paddingHorizontal: 16,
  },
  dockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(10, 16, 13, 0.96)',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: '#1d3025',
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    paddingHorizontal: 6,
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#050807',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
  },
  centerButtonActive: {
    borderWidth: 3,
    borderColor: '#86efac',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: '#86efac',
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#7e8b83',
    fontWeight: '500',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#22c55e',
    marginTop: 2,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 2,
    backgroundColor: '#22c55e',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#000000',
  },
});

