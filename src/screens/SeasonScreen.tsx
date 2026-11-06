import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';

import {
  View,
  StyleSheet,
  Text,
  FlatList,
  BackHandler,
  Pressable,
  useWindowDimensions,
  TVFocusGuideView,
} from 'react-native';

import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import LinearGradient from 'react-native-linear-gradient';

import { useGlobalContext } from '../context/GlobalContext';
import { generateurlplayer } from '../utils/constants';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

import Card from '../components/Card';

import { RootStackParamList } from '../navigation/AppNavigator';
import { Episode } from '../models/model';
import BackButton from '../components/BackButton';
import { useLandscapeLayout } from '../utils/layout';

type SeasonScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Season'
>;

interface SeasonButtonProps {
  season: string;
  selected: boolean;
  onPress: (season: string) => void;
}

// Each season button manages its own native focus.
const SeasonButton = memo(
  ({ season, selected, onPress }: SeasonButtonProps) => {
    const [isFocused, setIsFocused] = useState(false);

    const handlePress = useCallback(() => {
      onPress(season);
    }, [onPress, season]);

    return (
      <Pressable
        focusable
        onPress={handlePress}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.seasonButton,
          selected && styles.seasonButtonActive,
          isFocused && styles.seasonButtonFocused,
        ]}>
        <Text
          style={[
            styles.seasonButtonText,
            selected && styles.seasonButtonTextActive,
          ]}>
          S{season}
        </Text>
      </Pressable>
    );
  },
);

SeasonButton.displayName = 'SeasonButton';

const SeasonScreen: React.FC = () => {
  const navigation = useNavigation<SeasonScreenNavigationProp>();
  const route = useRoute();

  const {
    serie: routeSerie,
    season: routeSeason,
    seriesId: routeSeriesId,
  } = route.params as any;

  const { profile, serie: contextSerie, changeSerie } = useGlobalContext();

  const { width } = useWindowDimensions();
  const layout = useLandscapeLayout();

  const serie = contextSerie || routeSerie;

  const availableSeasons: string[] = useMemo(() => {
    return (serie?.sea || []).map((season: string | number) => String(season));
  }, [serie?.sea]);

  // Resolve the initial season.
  const initialSeason = useMemo(() => {
    const seasonNumber = routeSeason?.season_number
      ? String(routeSeason.season_number)
      : routeSeason?.season
        ? String(routeSeason.season)
        : availableSeasons[0] || '1';

    return seasonNumber;
  }, [routeSeason, availableSeasons]);

  const [selectedSeason, setSelectedSeason] = useState(initialSeason);

  // Keep the selected season valid if the series changes.
  useEffect(() => {
    setSelectedSeason(current => {
      if (availableSeasons.includes(current)) {
        return current;
      }

      return initialSeason;
    });
  }, [availableSeasons, initialSeason]);

  // Calculate responsive grid dimensions.
  const numColumns = width >= 1200 ? 5 : 4;

  const cardWidth = useMemo(() => {
    const horizontalPadding = spacing.xl * 2;
    const totalGaps = spacing.md * (numColumns - 1);

    return (width - horizontalPadding - totalGaps) / numColumns;
  }, [width, numColumns]);

  // Derive episodes directly instead of storing a duplicate state.
  const episodes = useMemo<Episode[]>(() => {
    if (!serie?.episodes || !selectedSeason) {
      return [];
    }

    return serie.episodes[selectedSeason] || [];
  }, [serie?.episodes, selectedSeason]);

  // Handle hardware Back while this screen is focused.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          console.log(' [BACK TEST] from seasonScreen');

          navigation.goBack();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [navigation]),
  );

  // Change selected season.
  const handleSeasonChange = useCallback((seasonNum: string) => {
    setSelectedSeason(seasonNum);
  }, []);

  // Open the selected episode.
  const handleEpisodePress = useCallback(
    (episode: Episode) => {
      console.log('handleEpisodePress epssss', episode, profile);
      if (!profile || !episode) {
        return;
      }

      // Prefer episode.id, then stream_id.
      const streamId =
        episode.id || episode.stream_id || episode.movie_data?.stream_id;

      if (!streamId) {
        console.error(
          '[SeasonScreen] No episode ID or stream ID found:',
          episode,
        );

        return;
      }

      const serie = contextSerie || routeSerie;

      const extension = episode.container_extension || 'mp4';

      const url = generateurlplayer(
        'series',
        String(streamId),
        extension,
        profile,
      );

      console.log("urlllllllllll", url)
      // Save current episode for next/previous navigation.
      if (serie) {
        changeSerie({
          ...serie,
          epi: episode,
        });
      }

      navigation.navigate('Player', {
        url,
        title:
          episode.title ||
          episode.movie_data?.name ||
          `Episode ${episode.episode_num}`,
        type: 'serie',
        streamId: String(streamId),
        seriesId: routeSeriesId,
      });

      console.log('[NAV TEST] AFTER NAVIGATE')
    },
    [profile, contextSerie, routeSerie, changeSerie, navigation, routeSeriesId],
  );

  // Stable FlatList render function.
  const renderItem = useCallback(
    ({ item, index }: { item: Episode; index: number }) => {
      const cover = item.movie_data?.cover || serie?.info?.cover || '';

      const title =
        item.title ||
        item.movie_data?.name ||
        `Episode ${item.episode_num || index + 1}`;

      const subtitle =
        item.season && item.episode_num
          ? `S${item.season} E${item.episode_num}`
          : item.episode_num
            ? `Episode ${item.episode_num}`
            : '';

      return (
        <View style={styles.cardContainer}>
          <Card
            title={title}
            subtitle={subtitle}
            image={cover}
            style={{ width: cardWidth }}
            onPress={() => {
              console.log('11111handleEpisodePress', item);
              handleEpisodePress(item);
            }}
          />
        </View>
      );
    },
    [serie?.info?.cover, cardWidth],
  );

  const keyExtractor = useCallback(
    (item: Episode, index: number) =>
      String(item.id || item.stream_id || `episode-${index}`),
    [],
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        <View
          style={[
            styles.header,
            {
              paddingTop: layout.isTV ? spacing.lg : spacing.sm,
              paddingBottom: layout.isTV ? spacing.sm : spacing.xs,
            },
          ]}>
          <View
            style={[styles.headerTitle, { gap: layout.isTV ? spacing.md : 1 }]}>
            <BackButton />
            <Text style={styles.title} numberOfLines={1}>
              {serie?.info?.name || 'Series'} - Season {selectedSeason}
            </Text>
          </View>

          {availableSeasons.length > 1 && (
            <View style={styles.seasonSelector}>
              {availableSeasons.map(seasonNum => (
                <SeasonButton
                  key={seasonNum}
                  season={seasonNum}
                  selected={selectedSeason === seasonNum}
                  onPress={handleSeasonChange}
                />
              ))}
            </View>
          )}
        </View>

        {episodes.length > 0 ? (
          <View style={styles.content}>
            <TVFocusGuideView autoFocus style={styles.focusGuide}>
              <FlatList
                data={episodes}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                numColumns={numColumns}
                contentContainerStyle={styles.list}
                columnWrapperStyle={styles.row}
                key={numColumns}
                initialNumToRender={numColumns * 2}
                maxToRenderPerBatch={numColumns * 2}
                windowSize={5}
                removeClippedSubviews={false}
                showsVerticalScrollIndicator={false}
              />
            </TVFocusGuideView>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No episodes found</Text>
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
  header: {
    paddingHorizontal: spacing.xs,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  seasonSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  seasonButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
  },

  seasonButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  seasonButtonFocused: {
    borderColor: colors.text,
    transform: [{ scale: 1.06 }],
  },

  seasonButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },

  seasonButtonTextActive: {
    color: colors.text,
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
  },

  focusGuide: {
    flex: 1,
  },

  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  row: {
    width: '100%',
    gap: spacing.md,
    justifyContent: 'flex-start',
  },

  cardContainer: {
    marginBottom: spacing.lg,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default SeasonScreen;
