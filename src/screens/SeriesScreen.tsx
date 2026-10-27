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
  BackHandler,
  Platform,
  TVFocusGuideView,
} from 'react-native';
import {
  useNavigation,
  useFocusEffect,
  useIsFocused,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';

import { useGlobalContext } from '../context/GlobalContext';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import Card from '../components/Card';
import CategorySidebar, {
  type CategoryItem,
} from '../components/CategorySidebar';
import { useLandscapeLayout } from '../utils/layout';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SeriesWithInfo } from '../models/model';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

type SeriesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Series'
>;

const SeriesScreen: React.FC = () => {
  const navigation = useNavigation<SeriesScreenNavigationProp>();
  const isScreenFocused = useIsFocused();

  const { profile, listSerie, listSerieFav, listSerieRecent, catSerie } =
    useGlobalContext();

  const layout = useLandscapeLayout();

  useEffect(() => {
    console.log('listSerie', listSerie[0]);
    console.log('listSerie', listSerie[0]?.backdrop_path[0]);
  }, [listSerie]);
  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSerieId, setSelectedSerieId] = useState<string | null>(null);
  const [focusZone, setFocusZone] = useState<'sidebar' | 'grid'>('grid');

  const navigatingToSerieRef = useRef(false);

  const categories: CategoryItem[] = useMemo(() => {
    const raw = (catSerie || []) as {
      category_id?: string;
      category_name?: string;
    }[];

    return raw.map(category => ({
      category_id: String(category.category_id ?? ''),
      category_name: String(category.category_name ?? ''),
    }));
  }, [catSerie]);

  const selectedCategoryId =
    selectedCategory ?? categories[0]?.category_id ?? '0';

  const filteredList = useMemo<SeriesWithInfo[]>(() => {
    if (!listSerie.length) {
      return [];
    }

    if (selectedCategoryId === '0' || selectedCategoryId === '') {
      return listSerie as SeriesWithInfo[];
    }

    if (selectedCategoryId === '-1') {
      return listSerie.filter(serie =>
        (listSerieFav || []).includes(String(serie.series_id)),
      ) as SeriesWithInfo[];
    }

    if (selectedCategoryId === '-2') {
      return listSerie.filter(serie =>
        (listSerieRecent || []).includes(String(serie.series_id)),
      ) as SeriesWithInfo[];
    }

    return listSerie.filter(
      serie => String(serie.category_id) === selectedCategoryId,
    ) as SeriesWithInfo[];
  }, [listSerie, listSerieFav, listSerieRecent, selectedCategoryId]);

  useEffect(() => {
    if (categories.length === 0) {
      setSidebarFocusIndex(0);
      return;
    }

    setSidebarFocusIndex(index =>
      Math.min(Math.max(0, index), categories.length - 1),
    );
  }, [categories.length]);

  // Keep the selected series valid after changing categories.
  useEffect(() => {
    if (filteredList.length === 0) {
      setSelectedSerieId(null);
      return;
    }

    const selectionStillExists = filteredList.some(
      serie => String(serie.series_id) === selectedSerieId,
    );

    if (!selectionStillExists) {
      setSelectedSerieId(String(filteredList[0].series_id));
    }
  }, [filteredList, selectedSerieId]);

  // Reset the navigation guard when returning to Series.
  useFocusEffect(
    useCallback(() => {
      navigatingToSerieRef.current = false;
      return undefined;
    }, []),
  );

  // Handle hardware Back only while this screen is active.
  useEffect(() => {
    if (!isScreenFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!isScreenFocused) {
          return false;
        }

        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Main');
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [isScreenFocused, navigation]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSerieId(null);

    // Keep the logical zone aligned with native focus.
    // The first series card's onFocus will switch the zone to "grid".
    setFocusZone('sidebar');
  }, []);

  const handleSeriePress = useCallback(
    (serie?: SeriesWithInfo) => {
      if (!serie || navigatingToSerieRef.current) {
        return;
      }

      const serieId = String(serie.series_id);
      const serieStillExists = filteredList.some(
        item => String(item.series_id) === serieId,
      );

      if (!serieStillExists) {
        console.warn('[SeriesScreen] Series is not in the current list', {
          serieId,
        });
        return;
      }

      navigatingToSerieRef.current = true;
      setSelectedSerieId(serieId);

      navigation.navigate('SerieDetail', { serie });
    },
    [filteredList, navigation],
  );

  useTVEventHandler({
    onBack: () => {
      if (!isScreenFocused) {
        return;
      }

      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
    },

    onSelect: () => {
      if (!isScreenFocused || navigatingToSerieRef.current) {
        return;
      }

      if (focusZone === 'sidebar') {
        const category = categories[sidebarFocusIndex];

        if (category) {
          handleCategorySelect(category.category_id);
        } else {
          console.warn(
            '[SeriesScreen] No category at the focused index',
            sidebarFocusIndex,
          );
        }

        return;
      }

      if (!selectedSerieId) {
        return;
      }

      const serie = filteredList.find(
        item => String(item.series_id) === selectedSerieId,
      );

      if (serie) {
        handleSeriePress(serie);
      }
    },
  });

  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;

  const renderItem = useCallback(
    ({ item }: { item: SeriesWithInfo }) => {
      const serieId = String(item.series_id);
      const isSelected = selectedSerieId === serieId;

      return (
        <Card
          title={item.name}
          image={item?.cover ?? item?.backdrop_path[0]}
          style={{ width: cardWidth }}
          focused={focusZone === 'grid' && isSelected}
          onFocus={() => {
            setSelectedSerieId(serieId);
            setFocusZone('grid');
          }}
          // On TV, TVEventHandler is the only Select handler.
          // On touch devices, Card handles the press.
          onPress={Platform.isTV ? undefined : () => handleSeriePress(item)}
        />
      );
    },
    [focusZone, selectedSerieId, cardWidth, handleSeriePress],
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
            {filteredList.length} serie
            {filteredList.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <View style={styles.body}>
          <CategorySidebar
            title="Categories"
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={handleCategorySelect}
            focusedIndex={sidebarFocusIndex}
            onFocusChange={index => {
              setSidebarFocusIndex(index);
              setFocusZone('sidebar');
            }}
            focusInSidebar={focusZone === 'sidebar'}
          />

          <View style={styles.content}>
            <TVFocusGuideView autoFocus style={styles.focusGuide}>
              <FlatList
                data={filteredList}
                renderItem={renderItem}
                keyExtractor={item => String(item.series_id)}
                numColumns={numColumns}
                contentContainerStyle={styles.list}
                columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
                key={numColumns}
                initialNumToRender={numColumns * 4}
                maxToRenderPerBatch={numColumns * 3}
                windowSize={7}
                removeClippedSubviews={false}
              />
            </TVFocusGuideView>
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
  focusGuide: {
    flex: 1,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  row: {
    justifyContent: 'flex-start',
    gap: spacing.md,
  },
});

export default SeriesScreen;
