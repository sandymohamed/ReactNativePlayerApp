import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurl, selectall, selectrecentAll} from '../utils/constants';
import {fetchJson, normalizeCategories, normalizeStreams} from '../utils/api';
import type {Stream} from '../models/model';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {typography} from '../theme/typography';
import Card from '../components/Card';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useTVEventHandler} from '../hooks/useTVEventHandler';
import {getMainGridNumColumns, getMainCardWidth} from '../utils/layout';

type MainScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

const MainScreen: React.FC = () => {
  const navigation = useNavigation<MainScreenNavigationProp>();
  const {width} = useWindowDimensions();
  const numColumns = getMainGridNumColumns(width);
  const cardWidth = getMainCardWidth(width, numColumns);

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

  const [focusedIndex, setFocusedIndex] = useState(0);

  const nav = navigation as any;
  const cards = [
    {
      id: 'live',
      title: 'Live TV',
      subtitle: 'Watch live channels',
      image: 'https://via.placeholder.com/400x225/6366F1/FFFFFF?text=Live+TV',
      onPress: () => nav.navigate('Live'),
    },
    {
      id: 'movies',
      title: 'Movies',
      subtitle: 'Browse movies',
      image: 'https://via.placeholder.com/400x225/EC4899/FFFFFF?text=Movies',
      onPress: () => nav.navigate('Movies'),
    },
    {
      id: 'series',
      title: 'Series',
      subtitle: 'Watch series',
      image: 'https://via.placeholder.com/400x225/10B981/FFFFFF?text=Series',
      onPress: () => nav.navigate('Series'),
    },
    {
      id: 'search',
      title: 'Search',
      subtitle: 'Find content',
      image: 'https://via.placeholder.com/400x225/3B82F6/FFFFFF?text=Search',
      onPress: () => nav.navigate('Search'),
    },
    {
      id: 'favorite',
      title: 'Favorites',
      subtitle: 'Your favorites',
      image: 'https://via.placeholder.com/400x225/F59E0B/FFFFFF?text=Favorites',
      onPress: () => nav.navigate('Favorite'),
    },
    {
      id: 'recent',
      title: 'Recent',
      subtitle: 'Recently watched',
      image: 'https://via.placeholder.com/400x225/EF4444/FFFFFF?text=Recent',
      onPress: () => nav.navigate('Recent'),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Language, parental, stream format & more',
      image: 'https://via.placeholder.com/400x225/64748B/FFFFFF?text=Settings',
      onPress: () => nav.navigate('Settings'),
    },
  ];

  useTVEventHandler({
    onBack: () => navigation.goBack(),
    onSelect: () => handleCardPress(focusedIndex),
    onUp: () => {
      setFocusedIndex(prev => Math.max(0, prev - numColumns));
    },
    onDown: () => {
      setFocusedIndex(prev => Math.min(cards.length - 1, prev + numColumns));
    },
    onLeft: () => {
      setFocusedIndex(prev => Math.max(0, prev - 1));
    },
    onRight: () => {
      setFocusedIndex(prev => Math.min(cards.length - 1, prev + 1));
    },
  });

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  const prependAllFavRecent = (arr: {category_id?: string; category_name?: string}[]) => [
    {category_id: '0', category_name: 'all', parent_id: 0},
    {category_id: '-1', category_name: 'favorite', parent_id: 0},
    {category_id: '-2', category_name: 'recent', parent_id: 0},
    ...arr,
  ];

  const loadData = async () => {
    if (!profile) return;

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
      changeListLive(normalizeStreams(liveRes.value).map(mapStream) as Stream[]);
    } else console.error('Live streams:', liveRes.reason);
    if (vodRes.status === 'fulfilled') {
      changeListVod(normalizeStreams(vodRes.value).map(mapStream) as Stream[]);
    } else console.error('VOD streams:', vodRes.reason);
    if (seriesRes.status === 'fulfilled') {
      changeListSerie(normalizeStreams(seriesRes.value).map(mapStream) as Stream[]);
    } else console.error('Series:', seriesRes.reason);

    try {
      const [favLive, favVod, favSerie] = await Promise.all([
        selectall('live', profile),
        selectall('movie', profile),
        selectall('serie', profile),
      ]);
      changeListLiveFav(Array.isArray(favLive) ? favLive.map((i: any) => String(i?.streamid ?? i)) : []);
      changeListVodFav(Array.isArray(favVod) ? favVod.map((i: any) => String(i?.streamid ?? i)) : []);
      changeListSerieFav(Array.isArray(favSerie) ? favSerie.map((i: any) => String(i?.streamid ?? i)) : []);

      const recent = await selectrecentAll(profile);
      if (recent && typeof recent === 'object' && !Array.isArray(recent)) {
        const r = recent as {live?: {streamid?: string}[]; movie?: {streamid?: string}[]; serie?: {streamid?: string}[]};
        changeListLiveRecent(Array.isArray(r.live) ? r.live.map((i: any) => String(i?.streamid ?? i)) : []);
        changeListVodRecent(Array.isArray(r.movie) ? r.movie.map((i: any) => String(i?.streamid ?? i)) : []);
        changeListSerieRecent(Array.isArray(r.serie) ? r.serie.map((i: any) => String(i?.streamid ?? i)) : []);
      }
    } catch (e) {
      console.error('Error loading fav/recent:', e);
    }
  };

  const handleCardPress = (index: number) => {
    cards[index].onPress();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>IPTV Player</Text>
            <Text style={styles.headerSubtitle}>
              Welcome back, {profile?.profile_name || 'User'}
            </Text>
          </View>

          <View style={[styles.grid, {gap: spacing.sm}]}>
            {cards.map((card, index) => (
              <View
                key={card.id}
                style={[styles.cardWrapper, {width: cardWidth}]}>
                <Card
                  title={card.title}
                  subtitle={card.subtitle}
                  image={card.image}
                  onPress={() => handleCardPress(index)}
                  focused={focusedIndex === index}
                />
              </View>
            ))}
          </View>
        </ScrollView>
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
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
  },
  cardWrapper: {},
});

export default MainScreen;
