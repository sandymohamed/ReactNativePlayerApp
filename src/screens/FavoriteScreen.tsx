import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useGlobalContext } from '../context/GlobalContext';
import { Stream } from '../models/model';
import { useLandscapeLayout } from '../utils/layout';
import { generateurlplayer } from '../utils/constants';
import { getVideoPositions, getSeriePositions } from '../utils/storage';

type FavoriteTab = 'live' | 'movies' | 'series';

type SavedPosition = {
  episodeId?: string;
  position?: number;
  duration?: number;
  title?: string;
};

type SavedVideoPosition = {
  position?: number;
  duration?: number;
  title?: string;
};

type SeriesPositions = Record<string, SavedPosition>;
type VideoPositions = Record<string, SavedVideoPosition>;

const TABS: { key: FavoriteTab; label: string }[] = [
  { key: 'live', label: 'Live TV' },
  { key: 'movies', label: 'Movies' },
  { key: 'series', label: 'Series' },
];

const FavoriteScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const {
    profile,
    listVodFav,
    listLive,
    listSerieFav,
    listSerie,
    listLiveFav,
    listVod,
  } = useGlobalContext();

  const layout = useLandscapeLayout();

  const [activeTab, setActiveTab] = useState<FavoriteTab>('live');
  const [listLives, setListLives] = useState<Stream[]>([]);
  const [listVods, setListVods] = useState<Stream[]>([]);
  const [listSeries, setListSeries] = useState<Stream[]>([]);

  const [seriePositions, setSeriePositions] = useState<SeriesPositions>({});
  const [vodPositions, setVodPositions] = useState<VideoPositions>({});

  const [focusedTab, setFocusedTab] = useState<FavoriteTab | null>(null);
  const [focusedItemKey, setFocusedItemKey] = useState<string | null>(null);

  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;

  const getId = useCallback((item: any, type: FavoriteTab) => {
    if (type === 'series') {
      return String(
        item.series_id ?? item.seriesId ?? item.stream_id ?? item.id ?? '',
      );
    }

    return String(item.stream_id ?? item.id ?? '');
  }, []);

  // Load saved playback positions.
  useEffect(() => {
    let mounted = true;

    const loadPositions = async () => {
      try {
        const [savedSeries, savedVideos] = await Promise.all([
          getSeriePositions(),
          getVideoPositions(),
        ]);

        if (!mounted) {
          return;
        }

        setSeriePositions((savedSeries || {}) as SeriesPositions);
        setVodPositions((savedVideos || {}) as VideoPositions);
      } catch (error) {
        console.warn(
          '[FavoriteScreen] Failed to load playback positions:',
          error,
        );
      }
    };

    loadPositions();

    return () => {
      mounted = false;
    };
  }, []);

  // Resolve favorite IDs to the matching items.
  const resolveFavorites = (
    source: any[],
    favoriteIds: unknown[],
    type: FavoriteTab,
  ): Stream[] => {
    if (!Array.isArray(source) || !Array.isArray(favoriteIds)) {
      return [];
    }

    return source.filter(item =>
      favoriteIds.includes(
        String(type === 'series' ? item.series_id : item.stream_id),
      ),
    );
  };

  useEffect(() => {
    setListLives(resolveFavorites(listLive ?? [], listLiveFav ?? [], 'live'));

    setListVods(resolveFavorites(listVod ?? [], listVodFav ?? [], 'movies'));

    setListSeries(
      resolveFavorites(listSerie ?? [], listSerieFav ?? [], 'series'),
    );
  }, [listLive, listLiveFav, listVod, listVodFav, listSerie, listSerieFav]);

  const currentItems = useMemo(() => {
    switch (activeTab) {
      case 'movies':
        return listVods;
      case 'series':
        return listSeries;
      default:
        return listLives;
    }
  }, [activeTab, listLives, listVods, listSeries]);

  const counts = useMemo(
    () => ({
      live: listLives.length,
      movies: listVods.length,
      series: listSeries.length,
    }),
    [listLives.length, listVods.length, listSeries.length],
  );

  // Navigate directly to the player and restore the saved position.
  const handleNavigateItem = useCallback(
    (item: Stream, routeType: string) => {
      if (!profile || !item) {
        return;
      }

      const itemData = item as any;

      // LIVE TV
      if (routeType === 'live') {
        const streamId = String(itemData.stream_id ?? itemData.id ?? '');

        if (!streamId) {
          return;
        }

        const url = generateurlplayer('live', streamId, 'm3u8', profile);

        navigation.navigate('Player', {
          url,
          title: itemData.name || 'Live Channel',
          type: 'live',
          streamId,
        });

        return;
      }

      // MOVIES
      if (routeType === 'MovieDetail') {
        const streamId = String(
          itemData.stream_id ??
            itemData.movie_data?.stream_id ??
            itemData.id ??
            '',
        );

        if (!streamId) {
          return;
        }

        const savedPosition = vodPositions[streamId];
        const extension = itemData.container_extension || 'mp4';

        const url = generateurlplayer('movie', streamId, extension, profile);

        navigation.navigate('Player', {
          url,
          title:
            itemData.name ??
            itemData.movie_data?.name ??
            savedPosition?.title ??
            'Movie',
          type: 'movie',
          streamId,
          resumeFromSaved: Boolean(
            savedPosition && (savedPosition.position ?? 0) > 0,
          ),
        });

        return;
      }

      // SERIES: find the last episode saved for this series.
      if (routeType === 'SeriesDetail') {
        const seriesId = String(
          itemData.series_id ?? itemData.seriesId ?? itemData.id ?? '',
        );

        if (!seriesId) {
          navigation.navigate('SeriesDetail', { serie: item });
          return;
        }

        const savedEpisode = seriePositions[seriesId];
        const episodeId = savedEpisode?.episodeId
          ? String(savedEpisode.episodeId)
          : '';

        // If no episode has been saved, open the series details as usual.
        if (!episodeId) {
          navigation.navigate('SeriesDetail', { serie: item });
          return;
        }

        const url = generateurlplayer('series', episodeId, 'mp4', profile);

        navigation.navigate('Player', {
          url,
          title: savedEpisode?.title || itemData.name || 'Episode',
          type: 'serie',
          streamId: episodeId,
          seriesId,
          resumeFromSaved: (savedEpisode.position ?? 0) > 0,
        });
      }
    },
    [navigation, profile, seriePositions, vodPositions],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Stream; index: number }) => {
      const itemData = item as any;

      const imageUri =
        itemData.stream_icon || itemData.cover || itemData.backdrop_path;

      const routeType =
        activeTab === 'live'
          ? 'live'
          : activeTab === 'movies'
            ? 'MovieDetail'
            : 'SeriesDetail';

      const seriesId = String(
        itemData.series_id ?? itemData.seriesId ?? itemData.id ?? '',
      );

      const savedEpisode = seriePositions[seriesId];

      const hasSavedEpisode = Boolean(savedEpisode?.episodeId);
      const savedPosition = Number(savedEpisode?.position ?? 0);

      const itemKey = `${activeTab}-${getId(item, activeTab) || index}`;
      const isFocused = focusedItemKey === itemKey;
      console.log('itemKey', itemKey);
      console.log('focusedItemKey', focusedItemKey);
      console.log('isFocused', isFocused);
      return (
        <TouchableOpacity
          key={itemKey}
          activeOpacity={0.9}
          onFocus={() => setFocusedItemKey(itemKey)}
          onBlur={() => setFocusedItemKey(null)}
          onPress={() => handleNavigateItem(item, routeType)}
          style={[
            styles.cardContainer,
            isFocused && styles.focusedCard,
            {
              width: cardWidth,
              marginRight: 12,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${itemData.name || 'item'}`}>
          <View
            style={[
              styles.posterWrapper,
              isFocused && styles.posterWrapperFocused,
            ]}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.poster}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.placeholderLetter}>
                  {itemData.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}

            <LinearGradient
              colors={[
                'transparent',
                'rgba(10, 10, 15, 0.25)',
                'rgba(10, 10, 15, 0.95)',
              ]}
              style={styles.posterGradient}
            />

            {activeTab === 'live' && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            )}

            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>

            <View style={styles.posterInfo}>
              <Text style={styles.posterTitle} numberOfLines={2}>
                {itemData.name || 'Untitled'}
              </Text>

              <Text style={styles.posterSubtitle} numberOfLines={1}>
                {activeTab === 'live'
                  ? 'Live channel'
                  : activeTab === 'movies'
                    ? 'Movie'
                    : hasSavedEpisode && savedPosition > 0
                      ? `Continue · ${Math.floor(savedPosition / 60)}:${String(
                          Math.floor(savedPosition % 60),
                        ).padStart(2, '0')}`
                      : 'TV Series'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [activeTab, cardWidth, getId, handleNavigateItem, seriePositions,focusedItemKey],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>♥</Text>
      </View>

      <Text style={styles.emptyTitle}>Nothing here yet</Text>

      <Text style={styles.emptyDescription}>
        {activeTab === 'live'
          ? 'Your favorited channels will appear here.'
          : activeTab === 'movies'
            ? 'Your favorite movies will appear here.'
            : 'Your favorited series will appear here.'}
      </Text>

      <Text style={styles.emptyHint}>
        Add channels, movies, and series to your favorites.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
                <Text style={styles.title}>Favorites</Text>
                <Text style={styles.subtitle}>
                  Your favorite entertainment, all in one place.
                </Text>
              </View>

              <View style={styles.favoriteIconContainer}>
                <Text style={styles.favoriteIcon}>♥</Text>
              </View>
            </View>

            {/* Category tabs */}
            <View style={styles.tabsContainer}>
              {TABS.map(tab => {
                const selected = activeTab === tab.key;

                return (
                  <TouchableOpacity
                    key={tab.key}
                    hasTVPreferredFocus={tab.key === 'live'}
                    onFocus={() => setFocusedTab(tab.key)}
                    onBlur={() => setFocusedTab(null)}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.8}
                    style={[
                      styles.tab,
                      selected && styles.activeTab,
                      focusedTab === tab.key && styles.focusedTab,
                    ]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}>
                    <Text
                      style={[
                        styles.tabText,
                        selected && styles.activeTabText,
                      ]}>
                      {tab.label}
                    </Text>

                    <View
                      style={[
                        styles.countBadge,
                        selected && styles.activeCountBadge,
                      ]}>
                      <Text
                        style={[
                          styles.countText,
                          selected && styles.activeCountText,
                        ]}>
                        {counts[tab.key]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section heading */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>
                  {activeTab === 'live'
                    ? 'Favorite Channels'
                    : activeTab === 'movies'
                      ? 'Favorite Movies'
                      : 'Favorite Series'}
                </Text>
              </View>

              <Text style={styles.itemCount}>
                {currentItems.length}{' '}
                {currentItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            {/* Content grid */}
            {currentItems.length > 0 ? (
              <FlatList
                key={`${activeTab}-${numColumns}`}
                data={currentItems}
                renderItem={renderItem}
                keyExtractor={(item, index) =>
                  `${activeTab}-${getId(item, activeTab) || index}`
                }
                numColumns={numColumns}
                scrollEnabled={false}
                columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
                contentContainerStyle={styles.gridContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              renderEmptyState()
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                YOUR ENTERTAINMENT, ALL IN ONE PLACE
              </Text>
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  eyebrow: {
    color: '#5EEAD4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    ...typography.h1,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  subtitle: {
    color: '#9696A8',
    fontSize: 14,
    marginTop: 8,
  },
  favoriteIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 108, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124, 108, 246, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 29,
    color: '#A99CFF',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 30,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 5,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#7C6CF6',
  },
  tabText: {
    color: '#9292A5',
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countText: {
    fontSize: 10,
    color: '#A4A4B5',
    fontWeight: '800',
  },
  activeCountText: {
    color: '#FFFFFF',
  },

  // Section
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionAccent: {
    width: 4,
    height: 21,
    borderRadius: 4,
    backgroundColor: '#5EEAD4',
    marginRight: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  itemCount: {
    color: '#9292A5',
    fontSize: 12,
    fontWeight: '600',
  },

  // Remote focus: Tabs
  focusedTab: {
    borderWidth: 2,
    borderColor: '#5EEAD4',
    backgroundColor: 'rgba(94, 234, 212, 0.12)',
  },

  // Remote focus: Cards
  focusedCard: {
    borderColor: '#5EEAD4',
    transform: [{ scale: 1.035 }],
    zIndex: 2,
    elevation: 8,
  },

  posterWrapperFocused: {
    borderWidth: 3,
    borderColor: '#5EEAD4',
    shadowColor: '#5EEAD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 8,
  },

  // Poster cards
  gridContent: {
    paddingBottom: 8,
  },
  gridRow: {
    justifyContent: 'flex-start',
  },
  cardContainer: {
    marginBottom: 18,
  },
  posterWrapper: {
    width: '100%',
    aspectRatio: 0.68,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#191923',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#201C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: {
    color: '#A99CFF',
    fontSize: 44,
    fontWeight: '800',
  },
  posterGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    gap: 5,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  playButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(124,108,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 3,
  },
  posterInfo: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 12,
  },
  posterTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  posterSubtitle: {
    color: '#C1C0D0',
    fontSize: 10,
    marginTop: 5,
  },

  // Empty state
  emptyContainer: {
    minHeight: 270,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 35,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  emptyIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,108,246,0.13)',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 39,
    color: '#A99CFF',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: 9,
  },
  emptyDescription: {
    color: '#9696A8',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyHint: {
    color: '#5EEAD4',
    fontSize: 12,
    marginTop: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 12,
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});

export default FavoriteScreen;
