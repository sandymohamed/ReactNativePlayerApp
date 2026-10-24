
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
import { Stream } from '../models/model';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

type MoviesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Movies'
>;

const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<MoviesScreenNavigationProp>();
  const isScreenFocused = useIsFocused();

  const { profile, listVod, listVodFav, listVodRecent, catVod } =
    useGlobalContext();

  const layout = useLandscapeLayout();

  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [focusZone, setFocusZone] = useState<'sidebar' | 'grid'>('grid');

  const navigatingToMovieRef = useRef(false);

  const categories: CategoryItem[] = useMemo(() => {
    const raw = (catVod || []) as {
      category_id?: string;
      category_name?: string;
    }[];

    return raw.map(category => ({
      category_id: String(category.category_id ?? ''),
      category_name: String(category.category_name ?? ''),
    }));
  }, [catVod]);

  const selectedCategoryId =
    selectedCategory ?? categories[0]?.category_id ?? '0';

  const filteredList = useMemo(() => {
    if (!listVod.length) {
      return [];
    }

    if (selectedCategoryId === '0' || selectedCategoryId === '') {
      return listVod;
    }

    if (selectedCategoryId === '-1') {
      return listVod.filter(movie =>
        (listVodFav || []).includes(String(movie.stream_id)),
      );
    }

    if (selectedCategoryId === '-2') {
      return listVod.filter(movie =>
        (listVodRecent || []).includes(String(movie.stream_id)),
      );
    }

    return listVod.filter(
      movie => String(movie.category_id) === selectedCategoryId,
    );
  }, [listVod, listVodFav, listVodRecent, selectedCategoryId]);

  useEffect(() => {
    if (categories.length === 0) {
      setSidebarFocusIndex(0);
      return;
    }

    setSidebarFocusIndex(index =>
      Math.min(Math.max(0, index), categories.length - 1),
    );
  }, [categories.length]);

  // Keep the selected movie valid after changing categories.
  useEffect(() => {
    if (filteredList.length === 0) {
      setSelectedMovieId(null);
      return;
    }

    const selectionStillExists = filteredList.some(
      movie => String(movie.stream_id) === selectedMovieId,
    );

    if (!selectionStillExists) {
      setSelectedMovieId(String(filteredList[0].stream_id));
    }
  }, [filteredList, selectedMovieId]);

  // Reset the navigation guard when returning to Movies.
  useFocusEffect(
    useCallback(() => {
      navigatingToMovieRef.current = false;

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
    setSelectedMovieId(null);

    // Keep the logical zone aligned with native focus.
    // The first movie's onFocus will switch the zone to "grid".
    setFocusZone('sidebar');
  }, []);

  const handleMoviePress = useCallback(
    (movie?: Stream) => {
      if (!movie || navigatingToMovieRef.current) {
        return;
      }

      const movieId = String(movie.stream_id);

      const movieStillExists = filteredList.some(
        item => String(item.stream_id) === movieId,
      );

      if (!movieStillExists) {
        console.warn('[MoviesScreen] Movie is not in the current list', {
          movieId,
        });
        return;
      }

      navigatingToMovieRef.current = true;
      setSelectedMovieId(movieId);

      console.log('[MoviesScreen] Opening movie', {
        movieId,
        title: movie.name,
      });

      navigation.navigate('MovieDetail', { movie });
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
      if (!isScreenFocused || navigatingToMovieRef.current) {
        return;
      }

      console.log('[MoviesScreen] TV Select', {
        focusZone,
        sidebarFocusIndex,
        selectedMovieId,
      });

      if (focusZone === 'sidebar') {
        const category = categories[sidebarFocusIndex];

        if (category) {
          handleCategorySelect(category.category_id);
        } else {
          console.warn(
            '[MoviesScreen] No category at the focused index',
            sidebarFocusIndex,
          );
        }

        return;
      }

      if (!selectedMovieId) {
        return;
      }

      const movie = filteredList.find(
        item => String(item.stream_id) === selectedMovieId,
      );

      if (movie) {
        handleMoviePress(movie);
      }
    },
  });

  const numColumns = layout.numColumns;
  const cardWidth = layout.cardWidth;

  const renderItem = useCallback(
    ({ item, index }: { item: Stream; index: number }) => {
      const movieId = String(item.stream_id);
      const isSelected = selectedMovieId === movieId;

      return (
        <Card
          title={item.name}
          image={item.stream_icon}
          style={{ width: cardWidth }}
          focused={focusZone === 'grid' && isSelected}
          onFocus={() => {
            setSelectedMovieId(movieId);
            setFocusZone('grid');
          }}
          // On TV, TVEventHandler is the only Select handler.
          // On touch devices, Card handles the press.
          onPress={
            Platform.isTV
              ? undefined
              : () => handleMoviePress(item)
          }
        />
      );
    },
    [focusZone, selectedMovieId, cardWidth, handleMoviePress],
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
          <Text style={styles.title}>Movies</Text>
          <Text style={styles.subtitle}>
            {filteredList.length} movie
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
            <TVFocusGuideView
              autoFocus
              style={styles.focusGuide}
            >
              <FlatList
                data={filteredList}
                renderItem={renderItem}
                keyExtractor={item => String(item.stream_id)}
                numColumns={numColumns}
                contentContainerStyle={styles.list}
                columnWrapperStyle={
                  numColumns > 1 ? styles.row : undefined
                }
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

export default MoviesScreen;
