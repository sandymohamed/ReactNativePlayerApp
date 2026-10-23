import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGlobalContext } from '../context/GlobalContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import Card from '../components/Card';
import CategorySidebar, {
  type CategoryItem,
} from '../components/CategorySidebar';
import { useLandscapeLayout } from '../utils/layout';
import { Stream } from '../models/model';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

const SeriesScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Series'>>();
  const { profile, listSerie, listSerieFav, listSerieRecent, catSerie } =
    useGlobalContext();
 
  const layout = useLandscapeLayout();

  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const [gridFocusIndex, setGridFocusIndex] = useState(0);
  const [focusZone, setFocusZone] = useState<'sidebar' | 'grid'>('sidebar');
  const gridRef = useRef<FlatList>(null);

  const categories: CategoryItem[] = useMemo(() => {
    const raw = (catSerie || []) as {
      category_id?: string;
      category_name?: string;
    }[];
    return raw.map(c => ({
      category_id: String(c.category_id ?? ''),
      category_name: String(c.category_name ?? ''),
    }));
  }, [catSerie]);

  const items = categories;
  const selectedCategoryId =
    items[Math.min(sidebarFocusIndex, Math.max(0, items.length - 1))]
      ?.category_id ?? '0';

  const filteredList = useMemo(() => {
    if (!listSerie.length) return [];
    if (selectedCategoryId === '0' || selectedCategoryId === '')
      return listSerie;
    if (selectedCategoryId === '-1') {
      return listSerie.filter(s =>
        (listSerieFav || []).includes(String(s.stream_id)),
      );
    }
    if (selectedCategoryId === '-2') {
      return listSerie.filter(s =>
        (listSerieRecent || []).includes(String(s.stream_id)),
      );
    }
    return listSerie.filter(s => String(s.category_id) === selectedCategoryId);
  }, [listSerie, listSerieFav, listSerieRecent, selectedCategoryId]);


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
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  useTVEventHandler({
    onBack: () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
    },
    // onUp: () => {
    //   if (focusZone === 'sidebar') {
    //     setSidebarFocusIndex(i => Math.max(0, i - 1));
    //   } else {
    //     const cols = layout.numColumns;
    //     setGridFocusIndex(i => Math.max(0, i - cols));
    //   }
    // },
    // onDown: () => {
    //   if (focusZone === 'sidebar') {
    //     setSidebarFocusIndex(i => Math.min(items.length - 1, i + 1));
    //   } else {
    //     const cols = layout.numColumns;
    //     setGridFocusIndex(i =>
    //       Math.min(Math.max(0, filteredList.length - 1), i + cols),
    //     );
    //   }
    // },
    // onLeft: () => {
    //   if (focusZone === 'grid') {
    //     setFocusZone('sidebar');
    //     return;
    //   }
    //   if (navigation.canGoBack()) {
    //     navigation.goBack();
    //   } else {
    //     navigation.navigate('Main');
    //   }
    // },
    // onRight: () => {
    //   if (focusZone === 'sidebar' && filteredList.length > 0) {
    //     setFocusZone('grid');
    //     setGridFocusIndex(0);
    //   } else if (focusZone === 'grid') {
    //     setGridFocusIndex(i =>
    //       Math.min(Math.max(0, filteredList.length - 1), i + 1),
    //     );
    //   }
    // },
    // onSelect: () => {
    //   if (focusZone === 'grid' && filteredList[gridFocusIndex]) {
    //     handleSeriePress(filteredList[gridFocusIndex]);
    //   }
    // },
  });

  const handleCategorySelect = (categoryId: string) => {
    const idx = items.findIndex(it => it.category_id === categoryId);
    if (idx >= 0) setSidebarFocusIndex(idx);
  };

  const handleSeriePress = useCallback(
    (serie: Stream) => {
      console.log("******** serie:",serie)
      navigation.navigate('SerieDetail', { serie });
    },
    [navigation],
  );

  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;

 
const renderItem = useCallback(
  ({ item, index }: { item: Stream; index: number }) => {
    const focused =
      focusZone === 'grid' && gridFocusIndex === index;

    return (
      <TouchableOpacity
        // focusable={true}
        key={index}
        hasTVPreferredFocus={focused && index === 0}
        style={[
          styles.cardContainer,
          { width: cardWidth },
          focused && styles.focusedCard,
        ]}
        onFocus={() => {
          setFocusZone('grid');
          setGridFocusIndex(index);
        }}
        onPress={() => handleSeriePress(item)}
        activeOpacity={0.85}
      >
        <Card
          title={item.name}
          image={item.cover}
          focused={focused}
          style={{ width: cardWidth }}
        />
      </TouchableOpacity>
    );
  },
  [focusZone, gridFocusIndex, cardWidth, handleSeriePress],
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
      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        <View style={styles.header}>
          <Text style={styles.title}>Series</Text>
          <Text style={styles.subtitle}>
            {filteredList.length} serie{filteredList.length !== 1 ? 's' : ''}
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
              onScrollToIndexFailed={({ index }) => {
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
    // paddingBottom: spacing.xxl,
  },
  row: {
    justifyContent: 'flex-start',
    gap: spacing.md,
    // marginBottom: spacing.md,
  },
  cardContainer: {
    marginBottom: spacing.lg,
  },
  focusedCard: {
  transform: [{ scale: 1.03 }],
  zIndex: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
},
});

export default SeriesScreen;
