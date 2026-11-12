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
  Pressable,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useGlobalContext } from '../../context/GlobalContext';
import { Stream } from '../../models/model';
import { useLandscapeLayout } from '../../utils/layout';
import { generateurlplayer } from '../../utils/constants';
import { getVideoPositions, getSeriePositions } from '../../utils/storage';
import { SvgUri } from 'react-native-svg';
import BackButton from '../../components/BackButton';

type RecentTab = 'live' | 'movies' | 'series';

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

const TABS: { key: RecentTab; label: string }[] = [
  { key: 'live', label: 'Live TV' },
  { key: 'movies', label: 'Movies' },
  { key: 'series', label: 'Series' },
];

const RecentScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const {
    profile,
    listVodRecent,
    listLive,
    listSerieRecent,
    listSerie,
    listLiveRecent,
    listVod,
  } = useGlobalContext();

  const layout = useLandscapeLayout();

  const [activeTab, setActiveTab] = useState<RecentTab>('live');
  const [listLives, setListLives] = useState<Stream[]>([]);
  const [listVods, setListVods] = useState<Stream[]>([]);
  const [listSeries, setListSeries] = useState<Stream[]>([]);

  const [seriePositions, setSeriePositions] = useState<SeriesPositions>({});
  const [vodPositions, setVodPositions] = useState<VideoPositions>({});

  // const [focusedTab, setFocusedTab] = useState<RecentTab | null>(null);
  const [focusedItemKey, setFocusedItemKey] = useState<string | null>(null);

  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;

  const getId = useCallback((item: any, type: RecentTab) => {
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
          getSeriePositions(profile),
          getVideoPositions(profile),
        ]);

        if (!mounted) {
          return;
        }

        setSeriePositions((savedSeries || {}) as SeriesPositions);
        setVodPositions((savedVideos || {}) as VideoPositions);
      } catch (error) {
        console.warn(
          '[RecentScreen] Failed to load playback positions:',
          error,
        );
      }
    };

    loadPositions();

    return () => {
      mounted = false;
    };
  }, [profile]);

  // Resolve recent IDs to the matching items while preserving recent order.
  const resolveRecent = (
    source: any[],
    recentIds: unknown[],
    type: RecentTab,
  ): Stream[] => {
    if (!Array.isArray(source) || !Array.isArray(recentIds)) {
      return [];
    }

    return source.filter(item =>
      recentIds.includes(
        String(type === 'series' ? item.series_id : item.stream_id),
      ),
    );
  };

  useEffect(() => {
    setListLives(resolveRecent(listLive ?? [], listLiveRecent ?? [], 'live'));

    setListVods(resolveRecent(listVod ?? [], listVodRecent ?? [], 'movies'));

    setListSeries(
      resolveRecent(listSerie ?? [], listSerieRecent ?? [], 'series'),
    );
  }, [
    listLive,
    listLiveRecent,
    listVod,
    listVodRecent,
    listSerie,
    listSerieRecent,
  ]);

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
          navigation.navigate('SerieDetail', { serie: item });
          return;
        }

        const savedEpisode = seriePositions[seriesId];
        const episodeId = savedEpisode?.episodeId
          ? String(savedEpisode.episodeId)
          : '';

        // If no episode has been saved, open the series details as usual.
        if (!episodeId) {
          navigation.navigate('SerieDetail', { serie: item });
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
      return (
        <View
          style={{
            margin: layout.isTV ? spacing.sm : 0,
          }}>
          <Pressable
            focusable
            key={itemKey}
            onPress={() => handleNavigateItem(item, routeType)}
            style={({ focused }) => ({
              ...styles.cardContainer,
              width: cardWidth,
              marginRight: 12,
              borderColor: focused ? colors.focus : 'transparent',
              borderWidth: focused ? 2 : 0,
              borderRadius: 15,
              transform: focused ? [{ scale: 1.035 }] : [{ scale: 1.0 }],
              zIndex: 6,
              elevation: 8,
            })}
            accessibilityRole="button"
            accessibilityLabel={`Open ${itemData.name || 'item'}`}>
            <View style={[styles.posterWrapper]}>
              {imageUri ? (
                <>
                  {imageUri?.toLowerCase().split('?')[0].endsWith('.svg') ? (
                    <SvgUri uri={imageUri} width="100%" height="100%" />
                  ) : (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.poster}
                      resizeMode="cover"
                    />
                  )}
                </>
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
          </Pressable>
        </View>
      );
    },
    [
      activeTab,
      cardWidth,
      getId,
      handleNavigateItem,
      seriePositions,
      focusedItemKey,
    ],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>◷</Text>
      </View>

      <Text style={styles.emptyTitle}>Nothing here yet</Text>

      <Text style={styles.emptyDescription}>
        {activeTab === 'live'
          ? 'Your recently watched channels will appear here.'
          : activeTab === 'movies'
            ? 'Movies you watch will show up here.'
            : 'Your recently watched series will appear here.'}
      </Text>

      <Text style={styles.emptyHint}>
        Start watching to build your history.
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
            <View
              style={[
                styles.header,
                {
                  paddingTop: layout.isTV ? spacing.lg : spacing.sm,
                  paddingBottom: layout.isTV ? spacing.sm : spacing.xs,
                },
              ]}>
              <View
                style={[
                  styles.headerTitle,
                  { gap: layout.isTV ? spacing.md : 1 },
                ]}>
                <BackButton />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.eyebrow}>YOUR LIBRARY</Text>
                  <Text style={styles.title}>Recently Watched</Text>
                  <Text style={styles.subtitle}>
                    Pick up where you left off.
                  </Text>
                </View>
                <View style={styles.historyIconContainer}>
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: layout.isTV ? 36 : 29,
                      margin: 'auto',
                    }}>
                    ◷
                  </Text>
                </View>
              </View>
            </View>

            {/* Category tabs */}
            <View style={styles.tabsContainer}>
              {TABS.map(tab => {
                const selected = activeTab === tab.key;

                return (
                  <Pressable
                    focusable
                    key={tab.key}
                    hasTVPreferredFocus={tab.key === 'live'}
                    onPress={() => setActiveTab(tab.key)}
                    style={({ focused }) => ({
                      ...styles.tab,
                      borderWidth: focused ? 2 : 0,
                      borderColor: focused ? colors.focus : 'transparent',
                      backgroundColor: focused
                        ? colors.backgroundTertiary
                        : selected
                          ? colors.primary
                          : 'transparent',
                    })}
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
                  </Pressable>
                );
              })}
            </View>

            {/* Section heading */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>
                  {activeTab === 'live'
                    ? 'Recent Channels'
                    : activeTab === 'movies'
                      ? 'Recent Movies'
                      : 'Recent Series'}
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
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  eyebrow: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    ...typography.h1,
    color: colors.white,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
  },
  historyIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    padding: 5,
    borderRadius: 16,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.border,
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
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: colors.white,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 7,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCountBadge: {
    backgroundColor: colors.backgroundTertiary,
  },
  countText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '800',
  },
  activeCountText: {
    color: colors.white,
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
    backgroundColor: colors.secondary,
    marginRight: 10,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  itemCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: {
    color: colors.textSecondary,
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
    backgroundColor: colors.error,
    gap: 5,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 0.8,
  },
  playButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: colors.white,
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
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  posterSubtitle: {
    color: colors.textSecondary,
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
    borderColor: colors.border,
    backgroundColor: colors.backgroundTertiary,
  },
  emptyIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSecondary,
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 39,
    color: colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '800',
    marginBottom: 9,
  },
  emptyDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.accent,
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
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
});

export default RecentScreen;
