import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
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
import { vods } from '@/context/arrays';

type MoviesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Movies'
>;

type FocusZone = 'sidebar' | 'grid';

const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<MoviesScreenNavigationProp>();
  const isScreenFocused = useIsFocused();

  const { profile, listVod, listVodFav, listVodRecent, catVod } =
    useGlobalContext();

  const layout = useLandscapeLayout();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [focusZone, setFocusZone] = useState<FocusZone>('grid');

  const navigatingToMovieRef = useRef(false);

  // Categories
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

  // Filter movies
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

  // Reset navigation guard when returning to Movies
  useFocusEffect(
    useCallback(() => {
      navigatingToMovieRef.current = false;
    }, []),
  );

  // Handle hardware / TV Back
  // useEffect(() => {
  //   if (!isScreenFocused) {
  //     return;
  //   }

  //   const subscription = BackHandler.addEventListener(
  //     'hardwareBackPress',
  //     () => {
  //               console.log(" [BACK TEST] from MoviesScreeen")

  //       if (!isScreenFocused) {
  //         return false;
  //       }

  //       if (navigation.canGoBack()) {
  //         navigation.goBack();
  //       } else {
  //         navigation.navigate('Main');
  //       }

  //       return true;
  //     },
  //   );

  //   return () => subscription.remove();
  // }, [isScreenFocused, navigation]);



  useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      console.log("🎯 [SUCCESS] BACK PRESSED INSIDE MOVIES SCREEN");

      if (navigation.canGoBack()) {
        navigation.goBack(); 
      } else {
        navigation.navigate('Main');
      }
      return true;
    };

    // إعداد المستمع
    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    // تنظيف المستمع عند الخروج
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [navigation])
);

  // Change category
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  // Focus zone handlers
  const handleSidebarFocus = useCallback(() => {
    setFocusZone(current => (current === 'sidebar' ? current : 'sidebar'));
  }, []);

  const handleGridFocus = useCallback(() => {
    setFocusZone(current => (current === 'grid' ? current : 'grid'));
  }, []);

  // Open movie
  const handleMoviePress = useCallback(
    (movie: Stream) => {
      if (!movie || navigatingToMovieRef.current) {
        return;
      }

      navigatingToMovieRef.current = true;

      navigation.navigate('MovieDetail', { movie });
    },
    [navigation],
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
  // Render movie
  const renderItem = useCallback(
    ({ item }: { item: Stream }) => (
      <Card
        title={item.name}
        image={item?.cover ?? item?.stream_icon}
        style={cardStyle}
        onFocus={handleGridFocus}
        onPress={() => handleMoviePress(item)}
      />
    ),
    [cardStyle, handleGridFocus, handleMoviePress],
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
            onFocusChange={handleSidebarFocus}
            sidebarWidth={{ width: sidebarWidth }}
          />

          <View style={styles.content}>
            <TVFocusGuideView autoFocus style={styles.focusGuide}>
              <FlatList
                data={filteredList}
                renderItem={renderItem}
                keyExtractor={item => String(item.stream_id)}
                numColumns={numColumns}
                contentContainerStyle={styles.list}
                columnWrapperStyle={
                  numColumns > 1 ? { gap: gridGap } : undefined
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
});

export default MoviesScreen;
