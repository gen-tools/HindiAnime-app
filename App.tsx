import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, BackHandler, Image, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store, useAppDispatch, useAppSelector } from './src/store';
import {
  hydrateStorage,
  setHomepageFeed,
  setSelectedAnime,
  toggleSaveAnime,
  toggleFavoriteAnime,
} from './src/store/animeSlice';
import { useGetHomepageQuery } from './src/store/api/animeApi';
import { Anime } from './src/types/anime';
import { HomeView } from './src/components/HomeView';
import { ExploreView } from './src/components/ExploreView';
import { WatchlistView } from './src/components/WatchlistView';
import { ProfileView } from './src/components/ProfileView';
import { CategoryPageView, CategoryPageType } from './src/components/CategoryPageView';
import { WatchPage } from './src/components/WatchPage';
import { FloatingDock, NavTab } from './src/components/FloatingDock';
import { LocalStorageService } from './src/services/storage';

function AppContent() {
  const dispatch = useAppDispatch();
  const animeList = useAppSelector((state) => state.anime.animeList);
  const latestEpisodesList = useAppSelector((state) => state.anime.latestEpisodes);
  const selectedAnime = useAppSelector((state) => state.anime.selectedAnime);
  const savedAnimeIds = useAppSelector((state) => state.anime.savedAnimeIds);
  const favoriteAnimeIds = useAppSelector((state) => state.anime.favoriteAnimeIds);

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [activeCategory, setActiveCategory] = useState<CategoryPageType | null>(null);
  const [searchInitialQuery, setSearchInitialQuery] = useState<string>('');
  const [animeHistory, setAnimeHistory] = useState<Anime[]>([]);

  // Launch Screen State
  const [showLaunchScreen, setShowLaunchScreen] = useState(true);
  const launchOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Elegant launch screen presentation that fades out smoothly once ready
    const timer = setTimeout(() => {
      Animated.timing(launchOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowLaunchScreen(false);
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [launchOpacity]);

  // Single network-fetch path for homepage data via RTK Query (cached & deduplicated)
  const { data: homepageData } = useGetHomepageQuery();

  // Load persisted user data & cached snapshot after first JS frame.
  // setTimeout(0) defers AsyncStorage reads past the initial render pass,
  // keeping first-frame time fast on low-end devices.
  useEffect(() => {
    const timer = setTimeout(() => {
      LocalStorageService.init().then(() => {
        const storedWatchlist = LocalStorageService.getWatchlist();
        const storedFavorites = LocalStorageService.getFavorites();
        const snapshot = LocalStorageService.getHomepageSnapshot();

        dispatch(
          hydrateStorage({
            savedAnimeIds: storedWatchlist || [],
            favoriteAnimeIds: storedFavorites || [],
            cachedList: snapshot?.animeList,
            cachedLatest: snapshot?.latestEpisodes,
          })
        );
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Synchronize live RTK Query homepage data into Redux and persistent storage
  useEffect(() => {
    if (homepageData && homepageData.animeList && homepageData.animeList.length > 0) {
      LocalStorageService.saveHomepageSnapshot(homepageData.animeList, homepageData.latestEpisodes);
      dispatch(
        setHomepageFeed({
          animeList: homepageData.animeList,
          latestEpisodes: homepageData.latestEpisodes || [],
        })
      );
    }
  }, [homepageData, dispatch]);

  const handleToggleSave = useCallback(
    (animeId: string) => {
      dispatch(toggleSaveAnime(animeId));
    },
    [dispatch]
  );

  const handleToggleFavorite = useCallback(
    (animeId: string) => {
      dispatch(toggleFavoriteAnime(animeId));
    },
    [dispatch]
  );

  const handleSelectAnime = useCallback(
    (anime: Anime) => {
      if (selectedAnime && selectedAnime.id !== anime.id) {
        setAnimeHistory((prev) => [...prev, selectedAnime]);
      }
      dispatch(setSelectedAnime(anime));
    },
    [dispatch, selectedAnime]
  );

  const handleBackFromWatch = useCallback(() => {
    if (animeHistory.length > 0) {
      const prevAnime = animeHistory[animeHistory.length - 1];
      setAnimeHistory((prev) => prev.slice(0, -1));
      dispatch(setSelectedAnime(prevAnime));
    } else {
      dispatch(setSelectedAnime(null));
    }
  }, [dispatch, animeHistory]);

  const handleOpenCategory = useCallback((category: CategoryPageType) => {
    setActiveCategory(category);
  }, []);

  const handleTabChange = useCallback(
    (tab: NavTab) => {
      setAnimeHistory([]);
      dispatch(setSelectedAnime(null));
      setActiveCategory(null);
      if (tab !== 'browse') {
        setSearchInitialQuery('');
      }
      setCurrentTab(tab);
    },
    [dispatch]
  );

  const handleSearchNavigate = useCallback(
    (query: string) => {
      setAnimeHistory([]);
      dispatch(setSelectedAnime(null));
      setActiveCategory(null);
      setSearchInitialQuery(query);
      setCurrentTab('browse');
    },
    [dispatch]
  );

  // Top-level Android hardware back button handler
  useEffect(() => {
    if (selectedAnime) return; // Handled by WatchPage
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeCategory) {
        setActiveCategory(null);
        return true;
      }
      if (currentTab !== 'home') {
        setCurrentTab('home');
        return true;
      }
      return false; // Let OS exit/minimize app when on Home root
    });
    return () => sub.remove();
  }, [selectedAnime, activeCategory, currentTab]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="light" />

        <View style={styles.screenContainer}>
          {/* Main Tab Screens — Kept mounted to preserve scroll positions, images, and search state */}
          <View
            style={[
              styles.tabScene,
              { display: !selectedAnime && !activeCategory && currentTab === 'home' ? 'flex' : 'none' },
            ]}
          >
            <HomeView
              animeList={animeList}
              latestEpisodesList={latestEpisodesList}
              onSelectAnime={handleSelectAnime}
              onOpenCategoryPage={handleOpenCategory}
              onSearchNavigate={handleSearchNavigate}
            />
          </View>

          <View
            style={[
              styles.tabScene,
              {
                display:
                  !selectedAnime && !activeCategory && (currentTab === 'browse' || currentTab === 'search')
                    ? 'flex'
                    : 'none',
              },
            ]}
          >
            <ExploreView
              animeList={animeList}
              onSelectAnime={handleSelectAnime}
              onToggleSave={handleToggleSave}
              savedAnimeIds={savedAnimeIds}
              initialQuery={searchInitialQuery}
            />
          </View>

          <View
            style={[
              styles.tabScene,
              { display: !selectedAnime && !activeCategory && currentTab === 'list' ? 'flex' : 'none' },
            ]}
          >
            <WatchlistView
              animeList={animeList}
              savedAnimeIds={savedAnimeIds}
              onSelectAnime={handleSelectAnime}
              onToggleSave={handleToggleSave}
            />
          </View>

          <View
            style={[
              styles.tabScene,
              { display: !selectedAnime && !activeCategory && currentTab === 'profile' ? 'flex' : 'none' },
            ]}
          >
            <ProfileView
              animeList={animeList}
              onSelectAnime={handleSelectAnime}
              savedAnimeIds={savedAnimeIds}
              onToggleSave={handleToggleSave}
              favoriteAnimeIds={favoriteAnimeIds}
              onToggleFavorite={handleToggleFavorite}
            />
          </View>

          {/* Category Overlay Screen */}
          {activeCategory && !selectedAnime && (
            <CategoryPageView
              pageType={activeCategory}
              animeList={animeList}
              onBack={() => setActiveCategory(null)}
              onSelectAnime={handleSelectAnime}
              onToggleSave={handleToggleSave}
              savedAnimeIds={savedAnimeIds}
            />
          )}

          {/* Watch Page / Video Player */}
          {selectedAnime && (
            <WatchPage
              key={selectedAnime.id}
              anime={selectedAnime}
              onBack={handleBackFromWatch}
              onSelectAnime={handleSelectAnime}
              allAnime={animeList}
              onToggleSave={handleToggleSave}
              isSaved={savedAnimeIds.includes(selectedAnime.id)}
            />
          )}
        </View>

        {/* Floating Pill Dock (hidden when watching video) */}
        {!selectedAnime && (
          <FloatingDock
            currentTab={currentTab}
            onTabChange={handleTabChange}
            favoritesCount={savedAnimeIds.length}
          />
        )}
      </SafeAreaView>

      {/* Edge-to-Edge Launch / Splash Screen Overlay */}
      {showLaunchScreen && (
        <Animated.View
          style={[
            styles.launchOverlay,
            { opacity: launchOpacity },
          ]}
          pointerEvents="none"
        >
          <Image
            source={require('./assets/splash.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </Animated.View>
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050807',
  },
  screenContainer: {
    flex: 1,
    position: 'relative',
  },
  tabScene: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  launchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 9999999,
  },
});
