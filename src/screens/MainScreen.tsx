import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ImageBackground,
  useWindowDimensions,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useGlobalContext } from '../context/GlobalContext';
import { generateurl, selectall, selectrecentAll } from '../utils/constants';
import { fetchJson, normalizeCategories, normalizeStreams } from '../utils/api';
import type { Stream } from '../models/model';
import { colors } from '../theme/colors';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

type MainScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

type Destination = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  featured?: boolean;
  image?: string;
};

type ListCounts = {
  live: number;
  movies: number;
  series: number;
  liveCategories: number;
  movieCategories: number;
  seriesCategories: number;
  liveFavorites: number;
  movieFavorites: number;
  seriesFavorites: number;
  liveRecent: number;
  movieRecent: number;
  seriesRecent: number;
};

const MAIN_PROFILE_CACHE_KEY = '@uiplayer_main_data_profile_key';

const INITIAL_COUNTS: ListCounts = {
  live: 0,
  movies: 0,
  series: 0,
  liveCategories: 0,
  movieCategories: 0,
  seriesCategories: 0,
  liveFavorites: 0,
  movieFavorites: 0,
  seriesFavorites: 0,
  liveRecent: 0,
  movieRecent: 0,
  seriesRecent: 0,
};

const MainScreen: React.FC = () => {
  const navigation = useNavigation<MainScreenNavigationProp>();
  const isScreenFocused = useIsFocused();
  const { width, height } = useWindowDimensions();

  const [isLoading, setIsLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState({
    live: false,
    movies: false,
    series: false,
  });
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [counts, setCounts] = useState<ListCounts>(INITIAL_COUNTS);
  const [loadError, setLoadError] = useState(false);

  const loadRequestRef = useRef(0);
  const profileCheckKeyRef = useRef<string | null>(null);

  const {
    profile,
    isAppReady,
    listLive,
    listVod,
    listSerie,
    catLive,
    catVod,
    catSerie,
    listLiveFav,
    listVodFav,
    listSerieFav,
    listLiveRecent,
    listVodRecent,
    listSerieRecent,
    changeCatLive,
    changeListLive,
    changeCatVod,
    changeListVod,
    changeCatSerie,
    changeListSerie,
    changeListLiveFav,
    changeListVodFav,
    changeListSerieFav,
    changeListLiveRecent,
    changeListVodRecent,
    changeListSerieRecent,
  } = useGlobalContext();

  const nav = navigation as any;

  const destinations: Destination[] = [
    {
      id: 'live',
      title: 'Live TV',
      subtitle: 'Watch live channels',
      icon: '▶',
      route: 'Live',
      featured: true,
      image: 'https://via.placeholder.com/600x900/252044/FFFFFF?text=LIVE+TV',
    },
    {
      id: 'movies',
      title: 'Movies',
      subtitle: 'Explore movies',
      icon: '🎬',
      route: 'Movies',
      featured: true,
      image: 'https://via.placeholder.com/600x900/402039/FFFFFF?text=MOVIES',
    },
    {
      id: 'series',
      title: 'Series',
      subtitle: 'Your favorite shows',
      icon: '▣',
      route: 'Series',
      featured: true,
      image: 'https://via.placeholder.com/600x900/183A37/FFFFFF?text=SERIES',
    },
    {
      id: 'search',
      title: 'Search',
      subtitle: 'Find something to watch',
      icon: '⌕',
      route: 'Search',
    },
    {
      id: 'favorite',
      title: 'Favorites',
      subtitle: 'Your saved content',
      icon: '♥',
      route: 'Favorite',
    },
    {
      id: 'recent',
      title: 'Recent',
      subtitle: 'Continue watching',
      icon: '◷',
      route: 'Recent',
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Preferences and playback',
      icon: '⚙',
      route: 'Settings',
    },
  ];

  const handleCardPress = useCallback(
    (index: number) => {
      // Keep navigation available while catalog requests are running.
      const destination = destinations[index];

      if (!destination) {
        return;
      }

      console.log('[Main] handleCardPress', destination.route);
      nav.navigate(destination.route);
    },
    [nav],
  );

  const prependAllFavRecent = (
    arr: { category_id?: string; category_name?: string }[],
  ) => [
    { category_id: '0', category_name: 'all', parent_id: 0 },
    { category_id: '-1', category_name: 'favorite', parent_id: 0 },
    { category_id: '-2', category_name: 'recent', parent_id: 0 },
    ...arr,
  ];

  const getProfileCacheId = useCallback(() => {
    if (!profile) return '';

    const p = profile as any;

    return String(
      p.id ??
        p.playlist_id ??
        p.url ??
        p.server_url ??
        `${p.profile_name ?? ''}:${p.username ?? ''}:${p.password ?? ''}`,
    );
  }, [profile]);

  const clearCurrentCatalog = useCallback(() => {
    changeCatLive([]);
    changeListLive([]);
    changeCatVod([]);
    changeListVod([]);
    changeCatSerie([]);
    changeListSerie([]);
    changeListLiveFav([]);
    changeListVodFav([]);
    changeListSerieFav([]);
    changeListLiveRecent([]);
    changeListVodRecent([]);
    changeListSerieRecent([]);
    setCounts(INITIAL_COUNTS);
  }, [
    changeCatLive,
    changeListLive,
    changeCatVod,
    changeListVod,
    changeCatSerie,
    changeListSerie,
    changeListLiveFav,
    changeListVodFav,
    changeListSerieFav,
    changeListLiveRecent,
    changeListVodRecent,
    changeListSerieRecent,
  ]);
  const loadData = useCallback(async () => {
    if (!profile) return;

    const requestId = ++loadRequestRef.current;
    const activeProfileKey = getProfileCacheId();
    const isCurrentRequest = () => requestId === loadRequestRef.current;

    setIsLoading(true);
    setLoadError(false);
    setCardLoading({ live: true, movies: true, series: true });

    const mapStream = (s: any) => ({
      ...s,
      stream_id: String(s?.stream_id ?? s?.num ?? ''),
    });

    let successful = true;

    // Load categories independently.
    const categoriesTask = (async () => {
      try {
        const [liveRaw, vodRaw, serieRaw] = await Promise.all([
          fetchJson<unknown>(generateurl('get_live_categories', profile)),
          fetchJson<unknown>(generateurl('get_vod_categories', profile)),
          fetchJson<unknown>(generateurl('get_series_categories', profile)),
        ]);

        if (!isCurrentRequest()) return;

        changeCatLive(prependAllFavRecent(normalizeCategories(liveRaw)));
        changeCatVod(prependAllFavRecent(normalizeCategories(vodRaw)));
        changeCatSerie(prependAllFavRecent(normalizeCategories(serieRaw)));
      } catch (error) {
        successful = false;
        console.error('Error loading categories:', error);
      }
    })();

    const loadStreamList = async (
      type: 'live' | 'movies' | 'series',
      action: string,
      setter: (items: Stream[]) => void,
      countKey: 'live' | 'movies' | 'series',
    ) => {
      try {
        const raw = await fetchJson<unknown>(generateurl(action, profile));

        if (!isCurrentRequest()) return;

        const items = normalizeStreams(raw).map(mapStream) as Stream[];

        setter(items);

        setCounts(previous => ({
          ...previous,
          [countKey]: items.length,
        }));
      } catch (error) {
        successful = false;
        console.error(`Error loading ${type}:`, error);
      } finally {
        if (isCurrentRequest()) {
          setCardLoading(previous => ({
            ...previous,
            [type]: false,
          }));
        }
      }
    };

    const streamsTasks = [
      loadStreamList('live', 'get_live_streams', changeListLive, 'live'),
      loadStreamList('movies', 'get_vod_streams', changeListVod, 'movies'),
      loadStreamList('series', 'get_series', changeListSerie, 'series'),
    ];

    const favoritesTask = (async () => {
      try {
        const [favLive, favVod, favSerie] = await Promise.all([
          selectall('live', profile),
          selectall('movie', profile),
          selectall('serie', profile),
        ]);

        if (!isCurrentRequest()) return;

        changeListLiveFav(
          Array.isArray(favLive)
            ? favLive.map((i: any) => String(i?.streamid ?? i))
            : [],
        );

        changeListVodFav(
          Array.isArray(favVod)
            ? favVod.map((i: any) => String(i?.streamid ?? i))
            : [],
        );

        changeListSerieFav(
          Array.isArray(favSerie)
            ? favSerie.map((i: any) => String(i?.streamid ?? i))
            : [],
        );

        const recent = await selectrecentAll(profile);

        if (!isCurrentRequest()) return;

        if (recent && typeof recent === 'object' && !Array.isArray(recent)) {
          const r = recent as {
            live?: { streamid?: string }[];
            movie?: { streamid?: string }[];
            serie?: { streamid?: string }[];
          };

          changeListLiveRecent(
            Array.isArray(r.live)
              ? r.live.map((i: any) => String(i?.streamid ?? i))
              : [],
          );

          changeListVodRecent(
            Array.isArray(r.movie)
              ? r.movie.map((i: any) => String(i?.streamid ?? i))
              : [],
          );

          changeListSerieRecent(
            Array.isArray(r.serie)
              ? r.serie.map((i: any) => String(i?.streamid ?? i))
              : [],
          );
        }
      } catch (error) {
        successful = false;
        console.error('Error loading favorites/recent:', error);
      }
    })();

    try {
      await Promise.all([categoriesTask, ...streamsTasks, favoritesTask]);

      if (isCurrentRequest()) {
        setLoadError(!successful);

        if (successful) {
          try {
            await AsyncStorage.setItem(
              MAIN_PROFILE_CACHE_KEY,
              activeProfileKey,
            );
          } catch (error) {
            console.warn('Could not save catalog profile key:', error);
          }
        }
      }
    } catch (error) {
      console.error('Unexpected error loading library:', error);

      if (isCurrentRequest()) {
        setLoadError(true);
      }
    } finally {
      if (isCurrentRequest()) {
        setIsLoading(false);
      }
    }
  }, [
    profile,
    getProfileCacheId,
    changeCatLive,
    changeListLive,
    changeCatVod,
    changeListVod,
    changeCatSerie,
    changeListSerie,
    changeListLiveFav,
    changeListVodFav,
    changeListSerieFav,
    changeListLiveRecent,
    changeListVodRecent,
    changeListSerieRecent,
  ]);

  // Keep card counts synchronized with cached context data.
  useEffect(() => {
    setCounts(previous => ({
      ...previous,
      live: listLive?.length ?? 0,
      movies: listVod?.length ?? 0,
      series: listSerie?.length ?? 0,
    }));
  }, [listLive, listVod, listSerie]);

  // Check whether the saved catalog belongs to the selected profile.
  useEffect(() => {
    if (!isAppReady || !profile) return;

    const profileKey = getProfileCacheId();

    if (profileCheckKeyRef.current === profileKey) return;

    profileCheckKeyRef.current = profileKey;
    let cancelled = false;

    const prepareCatalog = async () => {
      let savedProfileKey: string | null = null;

      try {
        savedProfileKey = await AsyncStorage.getItem(MAIN_PROFILE_CACHE_KEY);
      } catch (error) {
        console.warn('Could not read catalog profile key:', error);
      }

      if (cancelled) return;

      const hasCatalog =
        (listLive?.length ?? 0) > 0 ||
        (listVod?.length ?? 0) > 0 ||
        (listSerie?.length ?? 0) > 0 ||
        (catLive?.length ?? 0) > 0 ||
        (catVod?.length ?? 0) > 0 ||
        (catSerie?.length ?? 0) > 0;

      if (savedProfileKey !== profileKey) {
        clearCurrentCatalog();
        await loadData();
      } else if (!hasCatalog) {
        await loadData();
      }
    };

    void prepareCatalog().catch(error => {
      console.error('Failed to prepare profile catalog:', error);

      if (!cancelled) {
        setLoadError(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isAppReady, profile, getProfileCacheId, clearCurrentCatalog, loadData]);
  // Handle Android TV Back only while MainScreen is focused.
  useEffect(() => {
    if (!isScreenFocused) return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        return false;
      },
    );

    return () => subscription.remove();
  }, [isScreenFocused]);

  // Do not handle Select globally. TouchableOpacity onPress
  // should be the single source of navigation actions.
  useTVEventHandler({
    onBack: () => {
      if (!isScreenFocused) return;
    },
  });

  const handleRefresh = useCallback(() => {
    if (isLoading) return;

    void loadData().catch(error => {
      console.error('Manual refresh failed:', error);
      setLoadError(true);
      setIsLoading(false);
      setCardLoading({
        live: false,
        movies: false,
        series: false,
      });
    });
  }, [isLoading, loadData]);

  const handleChangeProfile = useCallback(() => {
    navigation.navigate('Home' as never);
  }, [navigation]);

  const profileLabel = (() => {
    const p = profile as any;

    return p?.profile_name ?? p?.name ?? p?.username ?? 'Profile';
  })();

  const cardWidth = Math.min(Math.max(width * 0.25, 190), 300);

  const cardHeight = Math.min(Math.max(height * 0.42, 210), 340);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.appTitle}>UI Player</Text>
          <Text style={styles.headerSubtitle}>
            Choose what you want to watch
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.profileContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleChangeProfile}
              onFocus={() => setFocusedIndex(-1)}
              style={[
                styles.profileButton,
                focusedIndex === -1 && styles.focusedButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Current profile: ${profileLabel}`}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {String(profileLabel).charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.profileTextContainer}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {profileLabel}
                </Text>
                <Text style={styles.profileHint}>Change profile</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            // focusable
            activeOpacity={0.8}
            disabled={isLoading}
            onPress={handleRefresh}
            onFocus={() => setFocusedIndex(-2)}
            style={[
              styles.refreshButton,
              focusedIndex === -2 && styles.focusedButton,
              isLoading && styles.refreshButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Refresh content">
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Text style={styles.refreshIcon}>↻</Text>
            )}

            <Text style={styles.refreshText}>
              {isLoading ? 'Refreshing' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Some content could not be loaded. You can still browse available
            content or try Refresh.
          </Text>
        </View>
      )}

      <View style={styles.screenContent}>
        <View
          style={[
            styles.featuredGrid,
            { height: Math.min(height * 0.55, 560) },
          ]}>
          {destinations.slice(0, 3).map((destination, index) => {
            const type =
              index === 0 ? 'live' : index === 1 ? 'movies' : 'series';

            const count =
              type === 'live'
                ? counts.live
                : type === 'movies'
                  ? counts.movies
                  : counts.series;

            const countLabel = cardLoading[type]
              ? 'Loading…'
              : `${count.toLocaleString()} ${
                  type === 'live'
                    ? 'channels'
                    : type === 'movies'
                      ? 'movies'
                      : 'series'
                }`;

            return (
              <View key={destination.id} style={styles.featuredItem}>
                <MainScreenCard
                  title={destination.title}
                  countLabel={countLabel}
                  image={destination.image ?? ''}
                  focused={focusedIndex === index}
                  preferredFocus={index === 0}
                  isCountLoading={cardLoading[type]}
                  disabled={false}
                  onPress={() => handleCardPress(index)}
                  onFocus={() => setFocusedIndex(index)}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.quickGrid}>
          {destinations.slice(3).map((destination, offset) => {
            const index = offset + 3;

            return (
              <TouchableOpacity
                key={destination.id}
                // focusable
                activeOpacity={0.85}
                onPress={() => handleCardPress(index)}
                onFocus={() => setFocusedIndex(index)}
                style={[
                  styles.quickTile,
                  focusedIndex === index && styles.quickTileFocused,
                ]}
                accessibilityRole="button"
                accessibilityLabel={destination.title}>
                <Text style={styles.quickIcon}>{destination.icon}</Text>
                <Text style={styles.quickTitle} numberOfLines={1}>
                  {destination.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Some content could not be loaded.
          </Text>

          <TouchableOpacity
            // focusable
            onPress={handleRefresh}
            style={styles.retryButton}
            accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    minHeight: 80,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    zIndex: 10,
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#B9ADFF',
    fontSize: 12,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileContainer: {
    position: 'relative',
  },
  profileButton: {
    minHeight: 48,
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  focusedButton: {
    borderColor: '#8B7CFF',
    backgroundColor: 'rgba(124,108,246,0.25)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7C6CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  profileTextContainer: {
    flexShrink: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  profileHint: {
    color: '#B9ADFF',
    fontSize: 10,
    marginTop: 2,
  },
  refreshButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  refreshButtonDisabled: {
    opacity: 0.65,
  },
  refreshIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  screenContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 20,
  },
  featuredGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 14,
  },
  featuredItem: {
    flex: 1,
    minWidth: 0,
  },
  mainCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#191923',
  },
  mainCardFocused: {
    borderColor: '#8B7CFF',
    transform: [{ scale: 1.025 }],
  },
  mainCardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mainCardGradient: {
    minHeight: 120,
    justifyContent: 'flex-end',
    padding: 14,
  },
  mainCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  mainCardCount: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(10,10,18,0.78)',
  },
  mainCardCountText: {
    color: '#E1DCFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  quickTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  quickTileFocused: {
    borderColor: '#8B7CFF',
    backgroundColor: 'rgba(124,108,246,0.22)',
    transform: [{ scale: 1.03 }],
  },
  quickIcon: {
    color: '#B9ADFF',
    fontSize: 20,
    fontWeight: '800',
  },
  quickTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: '#29191D',
    zIndex: 40,
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#7C6CF6',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

type MainScreenCardProps = {
  title: string;
  countLabel: string;
  image: string;
  focused: boolean;
  preferredFocus: boolean;
  isCountLoading: boolean;
  disabled: boolean;
  onPress: () => void;
  onFocus: () => void;
};

const MainScreenCard: React.FC<MainScreenCardProps> = ({
  title,
  countLabel,
  image,
  focused,
  preferredFocus,
  isCountLoading,
  disabled,
  onPress,
  onFocus,
}) => (
  <TouchableOpacity
    activeOpacity={0.9}
    hasTVPreferredFocus={preferredFocus}
    // focusable
    disabled={disabled}
    onPress={onPress}
    onFocus={onFocus}
    accessibilityRole="button"
    accessibilityLabel={`${title}, ${countLabel}`}
    accessibilityState={{ selected: focused, disabled }}
    style={[styles.mainCard, focused && styles.mainCardFocused]}>
    <ImageBackground
      source={{ uri: image }}
      resizeMode="cover"
      style={styles.mainCardImage}
      imageStyle={{ borderRadius: 16 }}>
      <LinearGradient
        colors={['transparent', 'rgba(5,5,12,0.58)', 'rgba(5,5,12,0.97)']}
        locations={[0, 0.48, 1]}
        style={styles.mainCardGradient}>
        <Text style={styles.mainCardTitle} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.mainCardCount}>
          {isCountLoading && <ActivityIndicator size="small" color="#E1DCFF" />}

          <Text style={styles.mainCardCountText} numberOfLines={1}>
            {countLabel}
          </Text>
        </View>
      </LinearGradient>
    </ImageBackground>
  </TouchableOpacity>
);

export default MainScreen;
