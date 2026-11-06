import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';

import {
  View,
  StyleSheet,
  Text,
  FlatList,
  BackHandler,
  Pressable,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useGlobalContext } from '../context/GlobalContext';

import { insertData, deleterow, generateurlplayer } from '../utils/constants';

import { getSetting, SETTINGS_KEYS } from '../utils/storage';

import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

import { Stream } from '../models/model';

import CategorySidebar, {
  type CategoryItem,
} from '../components/CategorySidebar';

import LiveEmbeddedPlayer from '../components/LiveEmbeddedPlayer';
import BackButton from '../components/BackButton';
import { useLandscapeLayout } from '../utils/layout';

const ROW_HEIGHT = 56;
const LOGO_SIZE = 36;
const SIDEBAR_WIDTH = 220;
const CHANNELS_WIDTH = '30%';

type LayoutType = 'list' | 'grid';

interface LiveChannelRowProps {
  item: Stream;
  index: number;
  onPress: () => void;
  selectedChannel: Stream | null;
}

const liveRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    marginHorizontal: spacing.xs,
    marginVertical: 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  rowFocused: {
    backgroundColor: colors.backgroundTertiary,
    borderColor: colors.primary,
    elevation: 5,
    color: colors.primaryLight,
  },

  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.md,
    gap: spacing.md,
  },
  channelNum: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
  channelNumFocused: {
    color: colors.primaryLight,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: borderRadius.sm,
  },
  logoPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    ...typography.labelSmall,
    color: colors.textTertiary,
  },
  channelName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  channelNameFocused: {
    color: colors.text,
    fontWeight: '600',
  },
});

const LiveChannelRow = memo(
  ({ item, index, onPress, selectedChannel = null }: LiveChannelRowProps) => {

    return (
      <Pressable
        focusable
        hasTVPreferredFocus
        onPress={onPress}
        style={({ focused }) => [
          liveRowStyles.row,
          focused && liveRowStyles.rowFocused,
          (selectedChannel?.stream_id === item?.stream_id) && {backgroundColor: colors.primary},
        ]}>
        <View style={liveRowStyles.rowContent}>
          <Text style={[liveRowStyles.channelNum]}>{index + 1} </Text>

          {item.stream_icon ? (
            <FastImage
              source={{
                uri: item.stream_icon,
                priority: FastImage.priority.low,
              }}
              style={liveRowStyles.logo}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <View style={liveRowStyles.logoPlaceholder}>
              <Text style={liveRowStyles.logoPlaceholderText}>TV</Text>
            </View>
          )}

          <Text style={[liveRowStyles.channelName]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
      </Pressable>
    );
  },
);

const LiveScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Live'>>();

  const {
    profile,
    listLive,
    listLiveFav,
    listLiveRecent,
    catLive,
    changeListLiveFav,
  } = useGlobalContext();

  const [layoutType, setLayoutType] = useState<LayoutType>('list');
  const [selectedCategoryId, setSelectedCategoryId] = useState('0');

  const [selectedChannel, setSelectedChannel] = useState<Stream | null>(null);

  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);

  const layout = useLandscapeLayout();

  // Load saved layout
  useEffect(() => {
    let mounted = true;

    const loadLayout = async () => {
      try {
        const savedLayout = await getSetting(SETTINGS_KEYS.LIST_TYPE);

        if (mounted && (savedLayout === 'grid' || savedLayout === 'list')) {
          setLayoutType(savedLayout);
        }
      } catch (error) {
        console.warn('Unable to load live layout setting:', error);
      }
    };

    loadLayout();

    return () => {
      mounted = false;
    };
  }, []);

  // Categories
  const categories: CategoryItem[] = useMemo(() => {
    const raw = (catLive || []) as {
      category_id?: string;
      category_name?: string;
    }[];

    return raw.map(category => ({
      category_id: String(category.category_id ?? ''),
      category_name: String(category.category_name ?? ''),
    }));
  }, [catLive]);

  // Filter channels
  const filteredList = useMemo(() => {
    if (!listLive?.length) {
      return [];
    }

    if (selectedCategoryId === '0' || selectedCategoryId === '') {
      return listLive;
    }

    if (selectedCategoryId === '-1') {
      const favoriteIds = new Set((listLiveFav || []).map(String));

      return listLive.filter(channel =>
        favoriteIds.has(String(channel.stream_id)),
      );
    }

    if (selectedCategoryId === '-2') {
      const recentIds = new Set((listLiveRecent || []).map(String));

      return listLive.filter(channel =>
        recentIds.has(String(channel.stream_id)),
      );
    }

    return listLive.filter(
      channel => String(channel.category_id) === selectedCategoryId,
    );
  }, [listLive, listLiveFav, listLiveRecent, selectedCategoryId]);

  // Current channel favorite status
  const isFavorite = useMemo(() => {
    if (!selectedChannel) {
      return false;
    }

    return (listLiveFav || [])
      .map(String)
      .includes(String(selectedChannel.stream_id));
  }, [listLiveFav, selectedChannel]);



  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        console.log('LIVE SCREEN BACK PRESSED');

        if (isPlayerFullscreen) {
          setIsPlayerFullscreen(false);
          return true;
        }

        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [navigation, isPlayerFullscreen]);

  // // Android back button
  // useEffect(() => {
  //   const subscription = BackHandler.addEventListener(
  //     'hardwareBackPress',
  //     () => {
  //       if (isPlayerFullscreen) {
  //         setIsPlayerFullscreen(false);
  //         return true;
  //       }

  //       if (navigation.canGoBack()) {
  //         navigation.goBack();
  //       } else {
  //         navigation.navigate('Main');
  //       }

  //       return true;
  //     },
  //   );

  //   return () => subscription.remove();
  // }, [navigation, isPlayerFullscreen]);

  const handleChannelSelect = useCallback(
    (channel: Stream) => {
      if (layoutType === 'grid') {
        console.log('Grid layout: selecting channel', channel);
        setSelectedChannel(channel);
        return;
      }

      if (!profile) {
        return;
      }

      const url = generateurlplayer('live', channel.stream_id, 'm3u8', profile);

      navigation.navigate('Player', {
        url,
        title: channel.name,
        type: 'live',
        streamId: String(channel.stream_id),
      });
    },
    [layoutType, profile, navigation],
  );

  // Toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!profile || !selectedChannel) {
      return;
    }

    const streamId = String(selectedChannel.stream_id);
    const currentFavorites = (listLiveFav || []).map(String);

    const alreadyFavorite = currentFavorites.includes(streamId);

    const nextFavorites = alreadyFavorite
      ? currentFavorites.filter(id => id !== streamId)
      : [...currentFavorites, streamId];

    // Update local state immediately
    changeListLiveFav(nextFavorites);

    try {
      if (alreadyFavorite) {
        await deleterow(streamId, 'live', profile);
      } else {
        await insertData(streamId, 'live', profile);
      }
    } catch (error) {
      console.warn('Unable to update live favorite:', error);
    }
  }, [profile, selectedChannel, listLiveFav, changeListLiveFav]);

  // Select category
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
  }, []);

  // Render channel row
  const renderChannelRow = useCallback(
    ({ item, index }: { item: Stream; index: number }) => (
      <LiveChannelRow
        item={item}
        index={index}
        selectedChannel={selectedChannel}
        onPress={() => handleChannelSelect(item)}
      />
    ),
    [handleChannelSelect],
  );

  // Fullscreen
  const handleFullscreenChange = useCallback((value: boolean) => {
    setIsPlayerFullscreen(value);
  }, []);

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        {!isPlayerFullscreen && (
          <>
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
                <View>
                  <Text style={styles.title}>Live TV</Text>

                  <Text style={styles.subtitle}>
                    {filteredList.length} channel
                    {filteredList.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Main body */}
            <View style={styles.body}>
              {/* Categories column */}
              <View style={styles.categoriesColumn}>
                <CategorySidebar
                  title="Categories"
                  categories={categories}
                  selectedId={selectedCategoryId}
                  onSelect={handleCategorySelect}
                  sidebarWidth={{ width: SIDEBAR_WIDTH }}
                />
              </View>

              {/* Channels column */}
              <View
                style={[
                  styles.channelsColumn,
                  layoutType === 'list' && styles.channelsColumnList,
                ]}>
                <FlatList
                  data={filteredList}
                  renderItem={renderChannelRow}
                  keyExtractor={item => String(item.stream_id)}
                  contentContainerStyle={styles.list}
                  showsVerticalScrollIndicator={false}
                  initialNumToRender={14}
                  maxToRenderPerBatch={12}
                  windowSize={7}
                  removeClippedSubviews={false}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyListText}>
                        No channels found
                      </Text>
                    </View>
                  }
                />
              </View>

              {/* Player column - Grid only */}
              {layoutType === 'grid' && (
                <View style={styles.playerColumn}>
                  <LiveEmbeddedPlayer
                    channel={selectedChannel}
                    profile={profile}
                    isFullscreen={isPlayerFullscreen}
                    onFullscreenChange={handleFullscreenChange}
                    isFavorite={isFavorite}
                    onToggleFavorite={handleToggleFavorite}
                  />
                </View>
              )}
            </View>
          </>
        )}

        {/* Fullscreen player */}
        {isPlayerFullscreen && selectedChannel && (
          <View style={styles.fullscreenPlayer}>
            <LiveEmbeddedPlayer
              channel={selectedChannel}
              profile={profile}
              isFullscreen
              onFullscreenChange={handleFullscreenChange}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
            />
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  background: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },

  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  layoutSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  layoutButton: {
    minWidth: 90,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.backgroundCard,
  },

  layoutButtonActive: {
    backgroundColor: colors.backgroundTertiary,
    borderColor: colors.primary,
  },

  layoutButtonFocused: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.backgroundTertiary,
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },

  layoutButtonText: {
    ...typography.label,
    color: colors.textSecondary,
  },

  layoutButtonTextActive: {
    color: colors.primaryLight,
  },

  layoutButtonTextFocused: {
    color: colors.text,
    fontWeight: '700',
  },

  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    minHeight: 0,
  },

  categoriesColumn: {
    width: SIDEBAR_WIDTH,
    minWidth: SIDEBAR_WIDTH,
    overflow: 'hidden',
  },

  channelsColumn: {
    width: CHANNELS_WIDTH,
    minWidth: 220,
    flexShrink: 0,
    minHeight: 0,
  },

  channelsColumnList: {
    flex: 1,
    width: undefined,
    minWidth: 0,
  },

  playerColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },

  fullscreenPlayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },

  list: {
    paddingBottom: spacing.xxl,
  },

  emptyList: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },

  emptyListText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default LiveScreen;
