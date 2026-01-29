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
import {generateurl} from '../utils/constants';
import {fetchJson} from '../utils/api';
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

  const loadData = async () => {
    if (!profile) return;

    try {
      const liveUrl = generateurl('get_live_categories', profile);
      const liveData = await fetchJson<{categories?: unknown[]}>(liveUrl);
      if (liveData.categories) changeCatLive(liveData.categories);

      const vodUrl = generateurl('get_vod_categories', profile);
      const vodData = await fetchJson<{categories?: unknown[]}>(vodUrl);
      if (vodData.categories) changeCatVod(vodData.categories);

      const serieUrl = generateurl('get_series_categories', profile);
      const serieData = await fetchJson<{categories?: unknown[]}>(serieUrl);
      if (serieData.categories) changeCatSerie(serieData.categories);
    } catch (error) {
      console.error('Error loading data:', error);
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

          <View style={[styles.grid, {gap: spacing.md}]}>
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
  },
  cardWrapper: {},
});

export default MainScreen;
