import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
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
import {Stream} from '../models/model';

type MoviesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Movies'
>;

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.xl * 3) / 2;

const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<MoviesScreenNavigationProp>();
  const route = useRoute();
  const {profile, listVod, changeListVod, catVod} = useGlobalContext();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMovies();
  }, [profile, route.params]);

  const loadMovies = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const categoryId = (route.params as any)?.categoryId;
      const action = categoryId
        ? `get_vod_streams&category_id=${categoryId}`
        : 'get_vod_streams';
      const url = generateurl(action, profile);
      const data = await fetchJson<{streams?: Stream[]} | Stream[]>(url);
      const raw = Array.isArray(data) ? data : (data as {streams?: Stream[]})?.streams;
      if (raw?.length) {
        const list = raw.map((s: any) => ({
          ...s,
          stream_id: String(s.stream_id ?? s.num ?? ''),
        })) as Stream[];
        changeListVod(list);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoviePress = (movie: Stream) => {
    navigation.navigate('MovieDetail', {movie});
  };

  const renderItem = ({item, index}: {item: Stream; index: number}) => {
    return (
      <View style={styles.cardContainer}>
        <Card
          title={item.name}
          image={item.stream_icon}
          onPress={() => handleMoviePress(item)}
          focused={focusedIndex === index}
          style={{width: CARD_WIDTH}}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading movies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.background}>
        <View style={styles.header}>
          <Text style={styles.title}>Movies</Text>
        </View>
        <FlatList
          data={listVod}
          renderItem={renderItem}
          keyExtractor={item => String(item.stream_id)}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
        />
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
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  list: {
    padding: spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    marginBottom: spacing.lg,
  },
});

export default MoviesScreen;
