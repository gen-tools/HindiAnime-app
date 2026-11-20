import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  Platform,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
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

// ─── Prevent native splash from auto-hiding BEFORE React renders ───────────
// Must be called at module level for it to work reliably.
try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {}

// ─── App Content ──────────────────────────────────────────────────────────────
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
  const [isAnyFullscreen, setIsAnyFullscreen] = useState(false);

  // ── Orientation + Nav bar setup ───────────────────────────────────────────
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null);
    if (Platform.OS === 'android') {
      NavigationBar.setStyle('dark');
    }
  }, []);

  // ── Homepage network fetch (RTK Query) ────────────────────────────────────
  const { data: homepageData } = useGetHomepageQuery();

  // ── Storage hydration + native splash dismissal ───────────────────────────
  // Hydrates storage instantly from disk cache, then dismisses the single native splash.
  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const dismissSplash = () => {
      try {
        SplashScreen.hideAsync().catch(() => null);
      } catch {}
    };

    // Failsafe: guarantee native splash is dismissed even if disk I/O stalls
    fallbackTimer = setTimeout(dismissSplash, 800);

    LocalStorageService.init()
      .then(() => {
        if (cancelled) return;

        const storedWatchlist = LocalStorageService.getWatchlist();
        const storedFavorites = LocalStorageService.getFavorites();
        const snapshot = LocalStorageService.getHomepageSnapshot();
        const history = LocalStorageService.getWatchHistory();

        dispatch(
          hydrateStorage({
            savedAnimeIds: storedWatchlist || [],
            favoriteAnimeIds: storedFavorites || [],
            cachedList: snapshot?.animeList,
            cachedLatest: snapshot?.latestEpisodes,
            watchHistory: history || [],
          })
        );
      })
      .catch((err) => {
        console.warn('Storage hydration error:', err);
      })
      .finally(() => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        dismissSplash();
      });

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [dispatch]);

  // ── Synchronize live network data into Redux + storage ────────────────────
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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleSave = useCallback(
    (animeId: string) => { dispatch(toggleSaveAnime(animeId)); },
    [dispatch]
  );

  const handleToggleFavorite = useCallback(
    (animeId: string) => { dispatch(toggleFavoriteAnime(animeId)); },
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
    setIsAnyFullscreen(false);
    setAnimeHistory([]);
    dispatch(setSelectedAnime(null));
    setCurrentTab('home');
  }, [dispatch]);

  const handleOpenCategory = useCallback((category: CategoryPageType) => {
    setActiveCategory(category);
  }, []);

  const handleTabChange = useCallback(
    (tab: NavTab) => {
      setIsAnyFullscreen(false);
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
      setIsAnyFullscreen(false);
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
    if (selectedAnime) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeCategory) {
        setActiveCategory(null);
        return true;
      }
      if (currentTab !== 'home') {
        setCurrentTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [selectedAnime, activeCategory, currentTab]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={isAnyFullscreen ? [] : ['top']}>
        <StatusBar style="light" />

        <View style={styles.screenContainer}>
          {/* Main Tab Screens — Kept mounted to preserve scroll/state */}
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
              onFullscreenChange={setIsAnyFullscreen}
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
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </GestureHandlerRootView>
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
});
