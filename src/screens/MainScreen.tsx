import React, { useCallback, useEffect, useState } from 'react';
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

import { useGlobalContext } from '../context/GlobalContext';
import { generateurl, selectall, selectrecentAll } from '../utils/constants';
import { fetchJson, normalizeCategories, normalizeStreams } from '../utils/api';
import type { Stream } from '../models/model';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTVEventHandler } from '../hooks/useTVEventHandler';
import { getMainGridNumColumns } from '../utils/layout';
import Button from '../components/Button';

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
  const { width, height } = useWindowDimensions();
  const isScreenFocused = useIsFocused();
  
  const numColumns = getMainGridNumColumns(width);

  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [counts, setCounts] = useState<ListCounts>(INITIAL_COUNTS);
  const [loadError, setLoadError] = useState(false);

  const {
    profile,
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

  console.log("isScreenFocused",isScreenFocused)
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
      if (isLoading || loadError) {
        return;
      }

      const destination = destinations[index];

      if (!destination) {
        return;
      }
      console.log('[Main] handleCardPress', destination.route);
      nav.navigate(destination.route);
    },
    [isLoading, loadError, nav],
  );

  const prependAllFavRecent = (
    arr: { category_id?: string; category_name?: string }[],
  ) => [
    { category_id: '0', category_name: 'all', parent_id: 0 },
    { category_id: '-1', category_name: 'favorite', parent_id: 0 },
    { category_id: '-2', category_name: 'recent', parent_id: 0 },
    ...arr,
  ];

  const loadData = async () => {
    if (!profile) return;

    setIsLoading(true);
    const mapStream = (s: any) => ({
      ...s,
      stream_id: String(s?.stream_id ?? s?.num ?? ''),
    });

    try {
      const [liveRaw, vodRaw, serieRaw] = await Promise.all([
        fetchJson<unknown>(generateurl('get_live_categories', profile)),
        fetchJson<unknown>(generateurl('get_vod_categories', profile)),
        fetchJson<unknown>(generateurl('get_series_categories', profile)),
      ]);
      changeCatLive(prependAllFavRecent(normalizeCategories(liveRaw)));
      changeCatVod(prependAllFavRecent(normalizeCategories(vodRaw)));
      changeCatSerie(prependAllFavRecent(normalizeCategories(serieRaw)));
    } catch (e) {
      console.error('Error loading categories:', e);
    }

    const liveUrl = generateurl('get_live_streams', profile);
    const vodUrl = generateurl('get_vod_streams', profile);
    const seriesUrl = generateurl('get_series', profile);
    const [liveRes, vodRes, seriesRes] = await Promise.allSettled([
      fetchJson<unknown>(liveUrl),
      fetchJson<unknown>(vodUrl),
      fetchJson<unknown>(seriesUrl),
    ]);

    if (liveRes.status === 'fulfilled') {
      const liveStreams = normalizeStreams(liveRes.value).map(
        mapStream,
      ) as Stream[];
      changeListLive(liveStreams);
      setCounts(previous => ({ ...previous, live: liveStreams.length }));
    } else console.error('Live streams:', liveRes.reason);
    if (vodRes.status === 'fulfilled') {
      const movies = normalizeStreams(vodRes.value).map(mapStream) as Stream[];
      changeListVod(movies);
      setCounts(previous => ({ ...previous, movies: movies.length }));
    } else console.error('VOD streams:', vodRes.reason);
    if (seriesRes.status === 'fulfilled') {
      const series = normalizeStreams(seriesRes.value).map(
        mapStream,
      ) as Stream[];
      changeListSerie(series);
      setCounts(previous => ({ ...previous, series: series.length }));
    } else console.error('Error fetch Series:', seriesRes.reason);

    try {
      const [favLive, favVod, favSerie] = await Promise.all([
        selectall('live', profile),
        selectall('movie', profile),
        selectall('serie', profile),
      ]);
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
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);

      console.error('Error loading fav/recent:', e);
    }
  };

  // useEffect(() => {
  //   loadData();
  // }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Home');
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [navigation]);

  useTVEventHandler({
    onBack: () => {
        if (!isScreenFocused) return;

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    },

    onSelect: () => {
        if (!isScreenFocused) return;

      console.log('MainScrees onPress focusedIndex:', focusedIndex);
      handleCardPress(focusedIndex);
    },
  });

  const renderQuickTile = (destination: Destination, index: number) => {
    const focused = focusedIndex === index;

    return (
      <TouchableOpacity
        key={destination.id}
        activeOpacity={0.85}
        disabled={isLoading || loadError}
        onPress={() => handleCardPress(index)}
        onFocus={() => setFocusedIndex(index)}
        accessibilityRole="button"
        accessibilityLabel={destination.title}
        accessibilityState={{
          selected: focused,
          disabled: isLoading || loadError,
        }}
        style={[
          styles.quickTile,
          focused && styles.quickTileFocused,
          (isLoading || loadError) && styles.disabledTile,
        ]}>
        <Text style={[styles.quickIcon, focused && styles.quickIconFocused]}>
          {destination.icon}
        </Text>
        <Text style={styles.quickTitle} numberOfLines={1}>
          {destination.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        <Button
          title="Refresh"
          loading={isLoading}
          variant="outline"
          style={styles.actionBtn}
          onPress={loadData}
          disabled={isLoading}
        />

        <View style={styles.screenContent}>
          <View
            style={[
              styles.featuredGrid,
              { height: Math.min(height * 0.55, 560) },
            ]}>
            {destinations.slice(0, 3).map((destination, index) => (
              <View key={destination.id} style={styles.featuredItem}>
                <MainScreenCard
                  title={destination.title}
                  countLabel={
                    index === 0
                      ? `${counts.live.toLocaleString()} channels`
                      : index === 1
                        ? `${counts.movies.toLocaleString()} movies`
                        : `${counts.series.toLocaleString()} series`
                  }
                  image={destination.image ?? ''}
                  focused={focusedIndex === index}
                  disabled={isLoading || loadError}
                  onPress={() => handleCardPress(index)}
                  onFocus={() => setFocusedIndex(index)}
                />
              </View>
            ))}
          </View>

          <View style={styles.quickGrid}>
            {destinations
              .slice(3)
              .map((destination, offset) =>
                renderQuickTile(destination, offset + 3),
              )}
          </View>
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingPanel}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingTitle}>Loading library</Text>
            </View>
          </View>
        )}

        {!isLoading && loadError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              Some lists could not be loaded.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadData}
              accessibilityRole="button">
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: '#0A0A0F',
  },
  background: {
    flex: 1,
  },
  actionBtn: { minWidth: 140 },

  screenContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  featuredGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: spacing.md,
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
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: '#191923',
  },
  mainCardFocused: {
    borderColor: '#8B7CFF',
    transform: [{ scale: 1.025 }],
  },
  mainCardDisabled: {
    opacity: 0.58,
  },
  mainCardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mainCardGradient: {
    minHeight: 140,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
  },
  mainCardTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  mainCardCount: {
    alignSelf: 'flex-start',
    color: '#E1DCFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,10,18,0.72)',
  },
  quickGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 55,
    maxHeight: 86,
  },
  quickTile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  quickTileFocused: {
    borderColor: '#8B7CFF',
    backgroundColor: 'rgba(124,108,246,0.2)',
    transform: [{ scale: 1.04 }],
  },
  quickIcon: {
    color: '#B9ADFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  quickIconFocused: {
    color: '#FFFFFF',
  },
  quickTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  disabledTile: {
    opacity: 0.58,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'rgba(5,5,12,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: '#151520',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  errorBanner: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: '#29191D',
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9,
    backgroundColor: '#7C6CF6',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

const MainScreenCard: React.FC<{
  title: string;
  countLabel: string;
  image: string;
  focused: boolean;
  disabled: boolean;
  onPress: () => void;
  onFocus: () => void;
}> = ({ title, countLabel, image, focused, disabled, onPress, onFocus }) => (
  <TouchableOpacity
    activeOpacity={0.9}
    disabled={disabled}
    onPress={onPress}
    onFocus={onFocus}
    accessibilityRole="button"
    accessibilityLabel={`${title}, ${countLabel}`}
    accessibilityState={{ selected: focused, disabled }}
    style={[
      styles.mainCard,
      focused && styles.mainCardFocused,
      disabled && styles.mainCardDisabled,
    ]}>
    <ImageBackground
      source={{ uri: image }}
      resizeMode="cover"
      style={styles.mainCardImage}
      imageStyle={{ borderRadius: 16 }}>
      <LinearGradient
        colors={['transparent', 'rgba(5,5,12,0.58)', 'rgba(5,5,12,0.97)']}
        locations={[0, 0.48, 1]}
        style={styles.mainCardGradient}>
        {/* <Text style={styles.mainCardTitle} numberOfLines={1}>{title}</Text> */}
        <Text style={styles.mainCardCount} numberOfLines={1}>
          {countLabel}
        </Text>
      </LinearGradient>
    </ImageBackground>
  </TouchableOpacity>
);

export default MainScreen;
