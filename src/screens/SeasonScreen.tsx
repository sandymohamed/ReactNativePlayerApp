import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
// import FastImage from 'react-native-fast-image';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

type SeasonScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Season'
>;

const { width } = Dimensions.get('window');
const colsNum = width >= 1200 ? 5 : 4;
const CARD_WIDTH = (width - spacing.xl * 3) / colsNum;

const SeasonScreen: React.FC = () => {
  const navigation = useNavigation<SeasonScreenNavigationProp>();
  const route = useRoute();
  const {
    serie: routeSerie,
    season: routeSeason,
    seriesId: routeSeriesId,
  } = route.params as any;
  const { profile, serie: contextSerie, changeSerie } = useGlobalContext();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [focusSeason, setFocusSeason] = useState(null);

  useEffect(() => {
    loadEpisodes();
  }, [routeSerie, routeSeason, contextSerie]);

  const loadEpisodes = () => {
    const serie = contextSerie || routeSerie;
    if (!serie || !serie.episodes) return;

    const seasonNum = routeSeason?.season_number
      ? String(routeSeason.season_number)
      : routeSeason?.season ||
        (serie.sea && serie.sea.length > 0 ? serie.sea[0] : '1');

    setSelectedSeason(seasonNum);
    const seasonEpisodes = serie.episodes[seasonNum] || [];
    setEpisodes(seasonEpisodes);
  };

  const handleEpisodePress = (episode: Episode) => {
    if (!profile || !episode) return;

    // Web app uses episode.id (not stream_id) - see SeriePlayer.tsx line 258
    const streamId =
      episode.id || episode.stream_id || episode.movie_data?.stream_id;

    if (!streamId) {
      console.error('No id/stream_id found for episode:', episode);
      return;
    }

    const ext = episode.container_extension || 'mp4';
    const url = generateurlplayer('series', String(streamId), ext, profile);

    // Update serie context with current episode for next/prev navigation
    const serie = contextSerie || routeSerie;
    if (serie) {
      changeSerie({ ...serie, epi: episode });
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
  };

  const handleSeasonChange = (seasonNum: string) => {
    const serie = contextSerie || routeSerie;
    if (!serie?.episodes) return;

    setSelectedSeason(seasonNum);
    const seasonEpisodes = serie.episodes[seasonNum] || [];
    setEpisodes(seasonEpisodes);
    setFocusedIndex(0);
  };

  const [focusedButton, setFocusedButton] = useState('eps');

  useTVEventHandler({
    onBack: () => {
      navigation.goBack();
    },

    onSelect: () => {
      if (focusedButton === 'season') {
        handleSeasonChange(selectedSeason);
      } else if (focusedButton === 'eps') {
        handleEpisodePress(episodes[focusedIndex]);
      }
    },
  });

  const renderItem = ({ item, index }: { item: Episode; index: number }) => {
    const serie = contextSerie || routeSerie;
    const cover = item.movie_data?.cover || (serie as any)?.info?.cover;

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
          onPress={() => handleEpisodePress(item)}
          onFocus={() => {
            setFocusedButton('eps');
            setFocusedIndex(index);
          }}
          focused={focusedIndex === index}
          style={{ width: CARD_WIDTH }}
        />
      </View>
    );
  };

  const serie = contextSerie || routeSerie;
  const availableSeasons = serie?.sea || [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {serie?.info?.name || 'Series'} - Season {selectedSeason}
          </Text>
          {availableSeasons.length > 1 && (
            <View style={styles.seasonSelector}>
              {availableSeasons.map((seasonNum: string) => {
                return (
                  <TouchableOpacity
                    key={seasonNum}
                    style={[
                      styles.seasonButton,
                      selectedSeason === seasonNum && styles.seasonButtonActive,
                      focusSeason === seasonNum && styles.seasonButtonActive,
                    ]}
                    onPress={() => {
                      setSelectedSeason(seasonNum);
                      handleSeasonChange(seasonNum);
                    }}
                    onFocus={() => {
                      setFocusedButton('season');
                      setFocusSeason(seasonNum);
                    }}
                    onBlur={() => {
                      setFocusedButton('');
                      setFocusSeason(null);
                    }}>
                    <Text
                      style={[
                        styles.seasonButtonText,
                        selectedSeason === seasonNum &&
                          styles.seasonButtonTextActive,
                      ]}>
                      S{seasonNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
        {episodes.length > 0 ? (
          <FlatList
            data={episodes}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              String(item.id || item.stream_id || `episode-${index}`)
            }
            numColumns={colsNum}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.row}
            extraData={focusedIndex}
            initialNumToRender={colsNum * 2}
            windowSize={5}
          />
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
    padding: spacing.xs,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.body,
    color: colors.text,
    paddingRight: spacing.xl,
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
  seasonButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  seasonButtonTextActive: {
    color: colors.text,
    fontWeight: 'bold',
  },
  list: {
    padding: spacing.xl,
  },
  row: {
    width:"100%",
    gap:spacing.md,
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
