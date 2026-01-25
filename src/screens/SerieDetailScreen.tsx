import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Text, ScrollView, FlatList} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurl} from '../utils/constants';
import {fetchJson} from '../utils/api';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import Card from '../components/Card';
import {SerieInfo, Season} from '../models/model';

const SerieDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'SerieDetail'>>();
  const route = useRoute();
  const {serie: routeSerie} = route.params as any;
  const {profile, changeSerie} = useGlobalContext();
  const [serie, setSerie] = useState<SerieInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSerieDetails();
  }, [profile, routeSerie]);

  const loadSerieDetails = async () => {
    if (!profile || !routeSerie) return;

    setLoading(true);
    try {
      const url = generateurl(
        `get_series_info&series_id=${routeSerie.series_id || routeSerie.stream_id}`,
        profile,
      );
      const data = await fetchJson<SerieInfo>(url);

      if (data.info) {
        // Extract season numbers from episodes object (web app pattern)
        if (data.episodes && !data.sea) {
          data.sea = Object.keys(data.episodes).sort((a, b) => 
            parseInt(a) - parseInt(b)
          );
        }
        setSerie(data);
        changeSerie(data);
      }
    } catch (error) {
      console.error('Error loading serie details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonPress = (season: {season_number: number; id: string}) => {
    navigation.navigate('Season', {serie: serie || routeSerie, season});
  };

  if (loading || !serie) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const serieInfo = serie.info || {};

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.background}>
        <View style={styles.content}>
          <Text style={styles.title}>
            {serieInfo.name || routeSerie.name || 'Series'}
          </Text>
          {serieInfo.plot && (
            <Text style={styles.plot}>{serieInfo.plot}</Text>
          )}
          <View style={styles.meta}>
            {serieInfo.genre && (
              <Text style={styles.metaText}>Genre: {serieInfo.genre}</Text>
            )}
            {serieInfo.releaseDate && (
              <Text style={styles.metaText}>
                Year: {serieInfo.releaseDate}
              </Text>
            )}
          </View>
          {(() => {
            const seasonsList: Array<{seasonNum: string; episodeCount: number; cover?: string}> = [];
            if (serie.sea && serie.sea.length > 0) {
              serie.sea.forEach((seasonNum: string) => {
                seasonsList.push({
                  seasonNum,
                  episodeCount: serie.episodes?.[seasonNum]?.length || 0,
                  cover: serie.info?.cover,
                });
              });
            } else if (serie.seasons && serie.seasons.length > 0) {
              serie.seasons.forEach((s) => {
                const seasonNum = String(s.season_number);
                seasonsList.push({
                  seasonNum,
                  episodeCount: serie.episodes?.[seasonNum]?.length || s.episode_count || 0,
                  cover: s.cover || serie.info?.cover,
                });
              });
            }
            return seasonsList.length > 0 ? (
              <View style={styles.seasonsContainer}>
                <Text style={styles.sectionTitle}>Seasons</Text>
                <FlatList
                  data={seasonsList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  renderItem={({item}) => (
                    <Card
                      title={`Season ${item.seasonNum}`}
                      subtitle={`${item.episodeCount} episodes`}
                      image={item.cover}
                      onPress={() => handleSeasonPress({season_number: parseInt(item.seasonNum), id: item.seasonNum} as any)}
                      style={styles.seasonCard}
                    />
                  )}
                  keyExtractor={(item) => item.seasonNum}
                />
              </View>
            ) : null;
          })()}
        </View>
      </LinearGradient>
    </ScrollView>
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
  content: {
    padding: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  plot: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  meta: {
    marginBottom: spacing.xl,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  seasonsContainer: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  seasonCard: {
    width: 200,
    marginRight: spacing.md,
  },
});

export default SerieDetailScreen;
