import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { View, StyleSheet, Text, FlatList, BackHandler } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import {  SeriesWithInfo } from '../models/model';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

const SeriesScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'Series'>>();

  const { profile, listSerie, listSerieFav, listSerieRecent, catSerie } =
    useGlobalContext();

  const layout = useLandscapeLayout();

  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Remember the focused series by ID, not by array position.
  const [selectedSerieId, setSelectedSerieId] = useState<string | null>(null);

  const sidebarRef = useRef<FlatList<CategoryItem>>(null);
  const seriesListRef = useRef<FlatList<SeriesWithInfo>>(null);

  const navigatingToSerieRef = useRef(false);
  const restorePositionRef = useRef(false);

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

  // Keep the saved series selection valid when the list/category changes.
  useEffect(() => {
    if (filteredList.length === 0) {
      setSelectedSerieId(null);
      return;
    }

    const selectionExists = filteredList.some(
      serie => String(serie.series_id) === selectedSerieId,
    );

    console.log('filteredList[0]', filteredList[0]);
    if (!selectionExists) {
      setSelectedSerieId(String(filteredList[0].series_id));
    }
  }, [filteredList, selectedSerieId]);

  // Keep the focused sidebar item visible.
  useEffect(() => {
    if (sidebarFocusIndex < 0 || sidebarFocusIndex >= categories.length) {
      return;
    }

    sidebarRef.current?.scrollToIndex({
      index: sidebarFocusIndex,
      animated: false,
      viewPosition: 0.5,
    });
  }, [sidebarFocusIndex, categories.length]);

  // Restore the saved series position when returning from SerieDetail.
  useFocusEffect(
    useCallback(() => {
      navigatingToSerieRef.current = false;

      if (!restorePositionRef.current || !selectedSerieId) {
        return;
      }

      restorePositionRef.current = false;

      const index = filteredList.findIndex(
        serie => String(serie.series_id) === selectedSerieId,
      );

      if (index < 0) {
        return;
      }

      // Wait until the screen/list has regained focus and laid out.
      requestAnimationFrame(() => {
        seriesListRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.3,
        });
      });
    }, [filteredList, selectedSerieId]),
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Main');
        }

        return true;
      },
    );

    return () => subscription.remove();
  }, [navigation]);

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      const index = categories.findIndex(
        category => category.category_id === categoryId,
      );

      setSelectedCategory(categoryId);
      setSelectedSerieId(null);

      if (index >= 0) {
        setSidebarFocusIndex(index);
      }
    },
    [categories],
  );

  const handleSeriePress = useCallback(
    (serie?: SeriesWithInfo) => {
      // if (!serie || navigatingToSerieRef.current) {
      //   return;
      // }

      navigatingToSerieRef.current = true;

      const serieId = String(serie?.series_id);
      setSelectedSerieId(serieId);
      restorePositionRef.current = true;

      navigation.navigate('SerieDetail', { serie });
    },
    [navigation],
  );

  // Native TV focus handles directional navigation.
  // Enter opens the series currently selected by its stream_id.
  useTVEventHandler({
    onBack: () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
    },
    onSelect: () => {
      if (navigatingToSerieRef.current) {
        return;
      }

      const selectedSerie = filteredList.find(
        serie => String(serie.series_id) === selectedSerieId,
      );
      console.log('selectedSerie', selectedSerie);

      handleSeriePress(selectedSerie);
    },
  });

  const renderItem = useCallback(
    ({ item }: { item: SeriesWithInfo }) => (
      <Card
        title={item.name}
        image={item.cover}
        style={{ width: layout.cardWidth }}
        onFocus={() => setSelectedSerieId(String(item.series_id))}
        onPress={() => handleSeriePress(item)}
      />
    ),
    [layout.cardWidth, handleSeriePress],
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      // Fallback for virtualized lists when the requested item isn't measured.
      seriesListRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index),
        animated: false,
      });

      setTimeout(() => {
        seriesListRef.current?.scrollToIndex({
          index: info.index,
          animated: false,
          viewPosition: 0.3,
        });
      }, 100);
    },
    [],
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
            onFocusChange={setSidebarFocusIndex}
            listRef={sidebarRef}
            useNativeFocus
          />

          <View style={styles.content}>
            <FlatList
              ref={seriesListRef}
              data={filteredList}
              renderItem={renderItem}
              keyExtractor={item => String(item.series_id)}
              numColumns={layout.numColumns}
              key={layout.numColumns}
              contentContainerStyle={styles.list}
              columnWrapperStyle={styles.row}
              initialNumToRender={Math.max(layout.numColumns * 4, 8)}
              maxToRenderPerBatch={Math.max(layout.numColumns * 3, 6)}
              windowSize={9}
              removeClippedSubviews={false}
              extraData={selectedSerieId}
              onScrollToIndexFailed={handleScrollToIndexFailed}
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
  },
});

export default SeriesScreen;
