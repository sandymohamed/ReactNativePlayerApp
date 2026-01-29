import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {useGlobalContext} from '../context/GlobalContext';
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
  const {
    profile,
    listVod,
    listVodFav,
    listVodRecent,
    catVod,
  } = useGlobalContext();
  const layout = useLandscapeLayout();

  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const [gridFocusIndex, setGridFocusIndex] = useState(0);
  const [focusZone, setFocusZone] = useState<'sidebar' | 'grid'>('sidebar');
  const gridRef = useRef<FlatList>(null);

  const categories: CategoryItem[] = useMemo(() => {
    const raw = (catVod || []) as {category_id?: string; category_name?: string}[];
    return raw.map(c => ({
      category_id: String(c.category_id ?? ''),
      category_name: String(c.category_name ?? ''),
    }));
  }, [catVod]);

  const items = categories;
  const selectedCategoryId = items[Math.min(sidebarFocusIndex, Math.max(0, items.length - 1))]?.category_id ?? '0';

  const filteredList = useMemo(() => {
    if (!listVod.length) return [];
    if (selectedCategoryId === '0' || selectedCategoryId === '') return listVod;
    if (selectedCategoryId === '-1') {
      return listVod.filter(m => (listVodFav || []).includes(String(m.stream_id)));
    }
    if (selectedCategoryId === '-2') {
      return listVod.filter(m => (listVodRecent || []).includes(String(m.stream_id)));
    }
    return listVod.filter(m => String(m.category_id) === selectedCategoryId);
  }, [listVod, listVodFav, listVodRecent, selectedCategoryId]);

  useEffect(() => {
    setGridFocusIndex(0);
  }, [filteredList.length, selectedCategoryId]);

  useEffect(() => {
    const cols = layout.numColumns;
    if (cols <= 0 || filteredList.length === 0) return;
    gridRef.current?.scrollToIndex({
      index: Math.min(gridFocusIndex, filteredList.length - 1),
      animated: true,
      viewPosition: 0.25,
    });
  }, [gridFocusIndex, layout.numColumns, filteredList.length]);

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
          Math.min(Math.max(0, filteredList.length - 1), i + cols),
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
      if (focusZone === 'sidebar' && filteredList.length > 0) {
        setFocusZone('grid');
        setGridFocusIndex(0);
      } else if (focusZone === 'grid') {
        setGridFocusIndex(i =>
          Math.min(Math.max(0, filteredList.length - 1), i + 1),
        );
      }
    },
    onSelect: () => {
      if (focusZone === 'grid' && filteredList[gridFocusIndex]) {
        handleMoviePress(filteredList[gridFocusIndex]);
      }
    },
  });

  const handleCategorySelect = (categoryId: string) => {
    const idx = items.findIndex(it => it.category_id === categoryId);
    if (idx >= 0) setSidebarFocusIndex(idx);
  };

  const handleMoviePress = useCallback((movie: Stream) => {
    navigation.navigate('MovieDetail', {movie});
  }, [navigation]);

  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;

  const renderItem = useCallback(
    ({item, index}: {item: Stream; index: number}) => {
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
    },
    [focusZone, gridFocusIndex, cardWidth, handleMoviePress],
  );

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No profile.</Text>
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
            {filteredList.length} title{filteredList.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.body}>
          <CategorySidebar
            title="Categories"
            categories={items}
            selectedId={selectedCategoryId}
            onSelect={handleCategorySelect}
            focusedIndex={sidebarFocusIndex}
            onFocusChange={setSidebarFocusIndex}
            focusInSidebar={focusZone === 'sidebar'}
          />
          <View style={styles.content}>
            <FlatList
              ref={gridRef}
              data={filteredList}
              renderItem={renderItem}
              keyExtractor={item => String(item.stream_id)}
              numColumns={numColumns}
              contentContainerStyle={styles.list}
              columnWrapperStyle={styles.row}
              key={numColumns}
              initialNumToRender={numColumns * 4}
              maxToRenderPerBatch={numColumns * 3}
              windowSize={7}
              removeClippedSubviews={true}
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
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
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
