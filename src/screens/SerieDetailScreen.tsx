import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGlobalContext } from '../context/GlobalContext';
import { deleterow, generateurl, insertData } from '../utils/constants';
import { fetchJson } from '../utils/api';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import Card from '../components/Card';
import { SerieInfo, Season } from '../models/model';
import FastImage from 'react-native-fast-image';
import { useTVEventHandler } from '../hooks/useTVEventHandler';
import Button from '../components/Button';
import { SvgUri } from 'react-native-svg';

const SerieDetailScreen: React.FC = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'SerieDetail'>
    >();

  const route = useRoute();
  const { width } = useWindowDimensions();
  const { serie: routeSerie } = route.params as any;
  console.log(
    '[SERIE DETAIL] rendered:',
    routeSerie?.name,
    routeSerie?.series_id,
  );
  const { profile, changeSerie, listSerieFav, changeListSerieFav } =
    useGlobalContext();
  const [serie, setSerie] = useState<SerieInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const wide = width >= 800;
  const seasonCardWidth = wide ? 260 : 200;

  const [isFav, setIsFav] = useState<boolean>(false);
  const [focusedButton, setFocusedButton] = useState<'fav' | 'play'>('fav');
  const [focusedSeason, setFocusedSeason] = useState<null | {
    season_number: number;
    id: string;
  }>(null);

  const handlePressFav = () => {
    var streamId = String(routeSerie.series_id);
    const arrayFav = [...listSerieFav];
    if (listSerieFav.includes(streamId)) {
      let arr = arrayFav.filter(el => el !== streamId);
      console.log('arr : ', arr);
      profile ? deleterow(streamId, 'serie', profile) : null;

      changeListSerieFav(arr);
    } else {
      arrayFav.push(streamId);
      console.log('arrayFav : ', arrayFav);
      profile ? insertData(streamId, 'serie', profile) : null;
      changeListSerieFav(arrayFav);
    }
    setIsFav(isFav => !isFav);
  };

  useEffect(() => {
    setIsFav(listSerieFav.includes(String(routeSerie.series_id)));
  }, [listSerieFav]);

  useEffect(() => {
    loadSerieDetails();
  }, [profile, routeSerie]);

  const handleSeasonPress = (season: { season_number: number; id: string }) => {
    navigation.navigate('Season', {
      serie: serie || routeSerie,
      season,
      seriesId: routeSerie.series_id || routeSerie.stream_id,
    });
  };

  useTVEventHandler({
    onBack: () => {
      navigation.goBack();
    },

    onSelect: () => {
      if (focusedButton === 'fav') {
        // handlePressFav();
        console.log('faaaaaav');
      } else if (focusedButton === 'play' && focusedSeason) {
        handleSeasonPress(focusedSeason);
      }
    },
  });

  // useEffect(() => {
  //   const sub = BackHandler.addEventListener('hardwareBackPress', () => {
  //     navigation.goBack();
  //     return true;
  //   });
  //   return () => sub.remove();
  // }, [navigation]);

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
          data.sea = Object.keys(data.episodes).sort(
            (a, b) => parseInt(a) - parseInt(b),
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

  if (loading || !serie) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const serieInfo = serie.info || {};

  const renderContent = () => (
    <View
      style={[{ zIndex: 9999 }, styles.content, wide && styles.contentWide]}>
      <Text style={styles.title}>
        {serieInfo.name || routeSerie.name || 'Series'}
      </Text>
      {serieInfo.plot && <Text style={styles.plot}>{serieInfo.plot}</Text>}

      <View style={styles.row}>
        <View style={styles.meta}>
          {serieInfo.genre && (
            <Text style={styles.metaText}>Genre: {serieInfo.genre}</Text>
          )}
          {serieInfo.releaseDate && (
            <Text style={styles.metaText}>Year: {serieInfo.releaseDate}</Text>
          )}
        </View>

        <Button
          title={isFav ? '❤ ' : '🤍'}
          onPress={handlePressFav}
          onFocus={() => setFocusedButton('fav')}
          textStyle={styles.favoriteIcon}
        />
      </View>
      {(() => {
        const seasonsList: Array<{
          seasonNum: string;
          episodeCount: number;
          cover?: string;
        }> = [];
        if (serie.sea && serie.sea.length > 0) {
          serie.sea.forEach((seasonNum: string) => {
            seasonsList.push({
              seasonNum,
              episodeCount: serie.episodes?.[seasonNum]?.length || 0,
              cover: serie.info?.cover,
            });
          });
        } else if (serie.seasons && serie.seasons.length > 0) {
          serie.seasons.forEach(s => {
            const seasonNum = String(s.season_number);
            seasonsList.push({
              seasonNum,
              episodeCount:
                serie.episodes?.[seasonNum]?.length || s.episode_count || 0,
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
              renderItem={({ item }) => (
                <Card
                  title={`Season ${item.seasonNum}`}
                  subtitle={`${item.episodeCount} episodes`}
                  image={item.cover}
                  onFocus={() => {
                    setFocusedButton('play');
                    setFocusedSeason({
                      season_number: parseInt(item.seasonNum),
                      id: item.seasonNum,
                    });
                  }}
                  onPress={() =>
                    handleSeasonPress({
                      season_number: parseInt(item.seasonNum),
                      id: item.seasonNum,
                    } as any)
                  }
                  style={[styles.seasonCard, { width: seasonCardWidth }]}
                />
              )}
              keyExtractor={item => item.seasonNum}
            />
          </View>
        ) : null;
      })()}
    </View>
  );

  const image: string | undefined = Array.isArray(serieInfo?.backdrop_path)
    ? serieInfo?.backdrop_path[0]
    : serieInfo?.backdrop_path;
  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        <>
          {image?.toLowerCase().split('?')[0].endsWith('.svg') ? (
            <>
              {renderContent()}
              <SvgUri
                uri={image}
                width="100%"
                height="100%"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 0,
                  opacity: 0.5,
                }}
              />
            </>
          ) : (
            <FastImage
              source={{
                uri:
                  image || typeof serieInfo?.cover === 'string'
                    ? serieInfo?.cover
                    : undefined,
              }}
              style={[styles.cover, { opacity: 0.9 }]}
              resizeMode={FastImage.resizeMode.cover}>
              {renderContent()}
            </FastImage>
          )}
        </>
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
    // backgroundColor: '#715f5f',
  },
  contentWide: {
    paddingHorizontal: spacing.xxl,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  cover: {
    width: '100%',
    minHeight: 400,
  },
  title: {
    ...typography.h1,
    color: colors.white,
    marginBottom: spacing.md,
  },
  plot: {
    ...typography.body,
    color: colors.white,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    paddingHorizontal: 15,
  },
  meta: {
    flex: 1,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.white,
    marginBottom: spacing.sm,
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
    fontSize: 22,
    // color: colors.primaryDark,
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
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: colors.secondaryDark,
    borderRadius: borderRadius.md,
  },
});

export default SerieDetailScreen;
