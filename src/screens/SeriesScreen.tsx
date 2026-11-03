import React, { useState, useMemo, useCallback, useRef } from 'react';

import {
  View,
  StyleSheet,
  Text,
  FlatList,
  BackHandler,
  TVFocusGuideView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
import BackButton from '../components/BackButton';

type SeriesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Series'
>;

const SeriesScreen: React.FC = () => {
  const navigation = useNavigation<SeriesScreenNavigationProp>();

  const { profile, listSerie, listSerieFav, listSerieRecent, catSerie } =
    useGlobalContext();

  const layout = useLandscapeLayout();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const navigatingToSerieRef = useRef(false);

  // Normalize categories.
  const categories = useMemo<CategoryItem[]>(() => {
    const raw = (catSerie || []) as {
      category_id?: string;
      category_name?: string;
    }[];

    return raw.map(category => ({
      category_id: String(category.category_id ?? ''),
      category_name: String(category.category_name ?? ''),
    }));
  }, [catSerie]);

  // Resolve the currently selected category.
  const selectedCategoryId =
    selectedCategory ?? categories[0]?.category_id ?? '0';

  // Filter series based on the selected category.
  const filteredList = useMemo<SeriesWithInfo[]>(() => {
    if (!listSerie?.length) {
      return [];
    }

    // All series.
    if (selectedCategoryId === '0' || selectedCategoryId === '') {
      return listSerie as SeriesWithInfo[];
    }

    // Favorites.
    if (selectedCategoryId === '-1') {
      return listSerie.filter(serie =>
        (listSerieFav || []).includes(String(serie.series_id)),
      ) as SeriesWithInfo[];
    }

    // Recently watched.
    if (selectedCategoryId === '-2') {
      return listSerie.filter(serie =>
        (listSerieRecent || []).includes(String(serie.series_id)),
      ) as SeriesWithInfo[];
    }

    // Normal category.
    return listSerie.filter(
      serie => String(serie.category_id) === selectedCategoryId,
    ) as SeriesWithInfo[];
  }, [listSerie, listSerieFav, listSerieRecent, selectedCategoryId]);

  // Reset navigation guard and handle Back while this screen is active.
  useFocusEffect(
    useCallback(() => {
      navigatingToSerieRef.current = false;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          console.log(' [BACK TEST] from SerieScreen');

          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Main');
          }

          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [navigation]),
  );

  // Category selection.
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  // Open series details.
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

      navigation.navigate('SerieDetail', { serie });
    },
    [filteredList, navigation],
  );

  // Grid layout
  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;
  const sidebarWidth = layout.sidebarWidth;
  const gridGap = layout.gridGap;

  const cardStyle = useMemo(
    () => ({ width: cardWidth, margin: layout.isTV ? spacing.xs : 0 }),
    [cardWidth],
  );

  // Render each series card.
  const renderItem = useCallback(
    ({ item }: { item: SeriesWithInfo }) => {
      return (
        <Card
          title={item.name}
          image={
            item?.cover ?? (item?.backdrop_path ? item.backdrop_path[0] : '')
          }
          style={cardStyle}
          onPress={() => handleSeriePress(item)}
        />
      );
    },
    [layout.cardWidth, handleSeriePress],
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
        <View
          style={[
            styles.header,
            {
              paddingTop: layout.isTV ? spacing.lg : spacing.sm,
              paddingBottom: layout.isTV ? spacing.sm : spacing.xs,
            },
          ]}>
          <View
            style={[styles.headerTitle, { gap: layout.isTV ? spacing.md : 1 }]}>
            <BackButton />
            <Text style={styles.title}>Series</Text>
          </View>

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
            sidebarWidth={{ width: sidebarWidth }}
          />

          <View style={styles.content}>
            <TVFocusGuideView autoFocus style={styles.focusGuide}>
              <FlatList
                data={filteredList}
                renderItem={renderItem}
                keyExtractor={item => String(item.series_id)}
                numColumns={layout.numColumns}
                contentContainerStyle={styles.list}
                columnWrapperStyle={
                  numColumns > 1 ? { gap: gridGap } : undefined
                }
                key={layout.numColumns}
                initialNumToRender={layout.numColumns * 4}
                maxToRenderPerBatch={layout.numColumns * 3}
                windowSize={7}
                removeClippedSubviews={false}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No series found.</Text>
                  </View>
                }
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
    paddingHorizontal: spacing.xs,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    padding: 0,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    padding: 0,
  },
  focusGuide: {
    width: '100%',
    padding: 0,
    flex: 1,
    alignItems: 'center',
  },
  list: {
    width: '100%',
    paddingBottom: spacing.xxl,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },

  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default SeriesScreen;
