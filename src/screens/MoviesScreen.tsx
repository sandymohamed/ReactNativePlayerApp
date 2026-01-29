import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
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
import CategorySidebar, {type CategoryItem} from '../components/CategorySidebar';
import {useLandscapeLayout} from '../utils/layout';
import {RootStackParamList} from '../navigation/AppNavigator';
import {Stream} from '../models/model';
import {useTVEventHandler} from '../hooks/useTVEventHandler';

type MoviesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Movies'
>;

const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<MoviesScreenNavigationProp>();
  const route = useRoute();
  const {
    profile,
    listVod,
    changeListVod,
    catVod,
    changeCatVod,
  } = useGlobalContext();
  const layout = useLandscapeLayout();

  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const [gridFocusIndex, setGridFocusIndex] = useState(0);
  const [focusZone, setFocusZone] = useState<'sidebar' | 'grid'>('sidebar');
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const gridRef = useRef<FlatList>(null);

  const categories: CategoryItem[] = useMemo(() => {
    const raw = (catVod || []) as {category_id?: string; category_name?: string}[];
    return raw.map(c => ({
      category_id: String(c.category_id ?? ''),
      category_name: String(c.category_name ?? ''),
    }));
  }, [catVod]);

  const items = useMemo(
    () => [
      {category_id: '', category_name: 'All'},
      ...categories,
    ],
    [categories],
  );
  const selectedCategoryId = items[sidebarFocusIndex]?.category_id ?? '';

  useEffect(() => {
    if (profile) loadCategories();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    loadMovies(selectedCategoryId);
  }, [profile, selectedCategoryId]);

  useEffect(() => {
    setGridFocusIndex(0);
  }, [listVod.length]);

  useEffect(() => {
    const cols = layout.numColumns;
    if (cols <= 0 || listVod.length === 0) return;
    const row = Math.floor(gridFocusIndex / cols);
    gridRef.current?.scrollToIndex({
      index: Math.min(gridFocusIndex, listVod.length - 1),
      animated: true,
      viewPosition: 0.25,
    });
  }, [gridFocusIndex, layout.numColumns, listVod.length]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  useTVEventHandler({
    onBack: () => navigation.goBack(),
    onUp: () => {
      if (focusZone === 'sidebar') {
        setSidebarFocusIndex(i => Math.max(0, i - 1));
      } else {
        const cols = layout.numColumns;
        setGridFocusIndex(i => Math.max(0, i - cols));
      }
    },
    onDown: () => {
      if (focusZone === 'sidebar') {
        setSidebarFocusIndex(i => Math.min(items.length - 1, i + 1));
      } else {
        const cols = layout.numColumns;
        setGridFocusIndex(i =>
          Math.min(Math.max(0, listVod.length - 1), i + cols),
        );
      }
    },
    onLeft: () => {
      if (focusZone === 'grid') {
        setFocusZone('sidebar');
        return;
      }
      navigation.goBack();
    },
    onRight: () => {
      if (focusZone === 'sidebar' && listVod.length > 0) {
        setFocusZone('grid');
        setGridFocusIndex(0);
      } else if (focusZone === 'grid') {
        setGridFocusIndex(i =>
          Math.min(Math.max(0, listVod.length - 1), i + 1),
        );
      }
    },
    onSelect: () => {
      if (focusZone === 'grid' && listVod[gridFocusIndex]) {
        handleMoviePress(listVod[gridFocusIndex]);
      }
    },
  });

  const loadCategories = async () => {
    if (!profile) return;
    setLoadingCategories(true);
    try {
      const url = generateurl('get_vod_categories', profile);
      const data = await fetchJson<{categories?: {category_id: string; category_name: string}[]}>(url);
      if (data.categories?.length) {
        changeCatVod(data.categories);
      }
    } catch (e) {
      console.error('Error loading movie categories:', e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadMovies = async (categoryId: string) => {
    if (!profile) return;
    setLoading(true);
    try {
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
      } else {
        changeListVod([]);
      }
    } catch (error) {
      console.error('Error loading movies:', error);
      changeListVod([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (categoryId: string) => {
    const idx = items.findIndex(it => it.category_id === categoryId);
    if (idx >= 0) setSidebarFocusIndex(idx);
  };

  const handleMoviePress = (movie: Stream) => {
    navigation.navigate('MovieDetail', {movie});
  };

  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;

  const renderItem = ({item, index}: {item: Stream; index: number}) => {
    const focused = focusZone === 'grid' && gridFocusIndex === index;
    return (
      <TouchableOpacity
        style={[styles.cardContainer, {width: cardWidth}]}
        onPress={() => handleMoviePress(item)}
        activeOpacity={0.85}>
        <Card
          title={item.name}
          image={item.stream_icon}
          onPress={() => handleMoviePress(item)}
          focused={focused}
          style={{width: cardWidth}}
        />
      </TouchableOpacity>
    );
  };

  if (loadingCategories && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading categories...</Text>
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
          <Text style={styles.subtitle}>
            {listVod.length} title{listVod.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.body}>
          <CategorySidebar
            title="Categories"
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={handleCategorySelect}
            focusedIndex={sidebarFocusIndex}
            onFocusChange={setSidebarFocusIndex}
            focusInSidebar={focusZone === 'sidebar'}
          />
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingInner}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <FlatList
                ref={gridRef}
                data={listVod}
                renderItem={renderItem}
                keyExtractor={item => String(item.stream_id)}
                numColumns={numColumns}
                contentContainerStyle={styles.list}
                columnWrapperStyle={styles.row}
                key={numColumns}
                onScrollToIndexFailed={({index}) => {
                  setTimeout(() => {
                    const row = Math.floor(index / numColumns);
                    gridRef.current?.scrollToOffset({
                      offset: row * (cardWidth * 0.6 + spacing.lg),
                      animated: true,
                    });
                  }, 100);
                }}
              />
            )}
          </View>
        </View>
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
  loadingInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  row: {
    justifyContent: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardContainer: {
    marginBottom: spacing.lg,
  },
});

export default MoviesScreen;
