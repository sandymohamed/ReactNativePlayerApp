
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useGlobalContext } from '../context/GlobalContext';
import { Stream } from '../models/model';
import Card from '../components/Card';
import { generateurlplayer } from '../utils/constants';

type SearchCategory = 'all' | 'live' | 'movies' | 'series';

type SearchItem = Stream & {
  stream_id: string | number;
  name: string;
  stream_icon?: string;
};

type SearchSectionProps = {
  title: string;
  data: SearchItem[];
  cardWidth: number;
  onItemPress: (item: SearchItem) => void;
};

const DEBOUNCE_MS = 300;

const normalize = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();

const matchesQuery = (item: SearchItem, query: string): boolean =>
  normalize(item.name).includes(query);

const SearchSection = memo<SearchSectionProps>(
  ({ title, data, cardWidth, onItemPress }) => {
    const renderItem = useCallback(
      ({ item }: { item: SearchItem }) => (
        <View style={[styles.cardContainer, { width: cardWidth }]}>
          <Card
            title={item.name}
            image={item.stream_icon}
            onPress={() => onItemPress(item)}
            style={{ width: cardWidth }}
          />
        </View>
      ),
      [cardWidth, onItemPress],
    );

    const keyExtractor = useCallback(
      (item: SearchItem, index: number) =>
        `${String(item.stream_id)}-${index}`,
      [],
    );

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.resultCount}>{data.length}</Text>
        </View>

        <FlatList
          horizontal
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </View>
    );
  },
);

SearchSection.displayName = 'SearchSection';

const SearchScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { width } = useWindowDimensions();
  const { listSerie, listVod, listLive, profile } = useGlobalContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [searchFocused, setSearchFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const normalizedQuery = normalize(searchQuery);

  // Debounce: only update the query used for filtering after typing pauses.
  useEffect(() => {
    if (!normalizedQuery) {
      setDebouncedQuery('');
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [normalizedQuery]);

  // This indicates that a newer query is waiting for the debounce.
  const isSearching =
    normalizedQuery.length > 0 &&
    normalizedQuery !== debouncedQuery;

  const isLargeScreen = width >= 700;

  const cardWidth = Math.min(
    isLargeScreen ? 190 : 145,
    Math.max(120, width * (isLargeScreen ? 0.18 : 0.38)),
  );

  // Filter without sorting the entire results on each query.
  // Original playlist order is preserved.
  const liveResults = useMemo<SearchItem[]>(() => {
    if (!debouncedQuery) return [];

    return ((listLive ?? []) as SearchItem[]).filter(item =>
      matchesQuery(item, debouncedQuery),
    );
  }, [listLive, debouncedQuery]);

  const movieResults = useMemo<SearchItem[]>(() => {
    if (!debouncedQuery) return [];

    return ((listVod ?? []) as SearchItem[]).filter(item =>
      matchesQuery(item, debouncedQuery),
    );
  }, [listVod, debouncedQuery]);

  const seriesResults = useMemo<SearchItem[]>(() => {
    if (!debouncedQuery) return [];

    return ((listSerie ?? []) as SearchItem[]).filter(item =>
      matchesQuery(item, debouncedQuery),
    );
  }, [listSerie, debouncedQuery]);

  const totalResults =
    liveResults.length + movieResults.length + seriesResults.length;

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setSearchFocused(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setSearchFocused(false);
  }, []);

  const handleSeriePress = useCallback(
    (serie: SearchItem) => {
      Keyboard.dismiss();
      navigation.navigate('SerieDetail', { serie } as never);
    },
    [navigation],
  );

  const handleMoviePress = useCallback(
    (movie: SearchItem) => {
      Keyboard.dismiss();
      navigation.navigate('MovieDetail' as never, { movie } as never);
    },
    [navigation],
  );

  const handleLivePress = useCallback(
    (channel: SearchItem) => {
      Keyboard.dismiss();

      if (!profile) {
        return;
      }

      const url = generateurlplayer(
        'live',
        channel.stream_id,
        'm3u8',
        profile,
      );

      if (!url) {
        return;
      }

      navigation.navigate('Player', {
        url,
        title: channel.name,
        type: 'live',
        streamId: String(channel.stream_id),
      });
    },
    [navigation, profile],
  );

  const categories: {
    label: string;
    value: SearchCategory;
    count: number;
  }[] = [
    { label: 'All', value: 'all', count: totalResults },
    { label: 'Live TV', value: 'live', count: liveResults.length },
    { label: 'Movies', value: 'movies', count: movieResults.length },
    { label: 'Series', value: 'series', count: seriesResults.length },
  ];

  const renderCategory = useCallback(
    (item: (typeof categories)[number]) => {
      const selected = category === item.value;

      return (
        <TouchableOpacity
          key={item.value}
          focusable
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => setCategory(item.value)}
          activeOpacity={0.8}
          style={[
            styles.categoryButton,
            selected && styles.categoryButtonSelected,
          ]}>
          <Text
            style={[
              styles.categoryText,
              selected && styles.categoryTextSelected,
            ]}>
            {item.label}
          </Text>

          {normalizedQuery.length > 0 && (
            <Text
              style={[
                styles.categoryCount,
                selected && styles.categoryTextSelected,
              ]}>
              {isSearching ? '…' : item.count}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [category, normalizedQuery, isSearching, categories],
  );

  const hasResultsForCategory =
    category === 'all'
      ? totalResults > 0
      : category === 'live'
        ? liveResults.length > 0
        : category === 'movies'
          ? movieResults.length > 0
          : seriesResults.length > 0;

  return (
    <LinearGradient
      colors={colors.gradients.dark}
      style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <Text style={styles.subtitle}>
            Find channels, movies and series
          </Text>

          <View
            style={[
              styles.searchBar,
              searchFocused && styles.searchBarFocused,
            ]}>
            <Text style={styles.searchIcon}>⌕</Text>

            <TextInput
              ref={inputRef}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              placeholder="Search for anything..."
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              showSoftInputOnFocus
              accessibilityLabel="Search channels, movies and series"
              accessibilityHint="Enter a title to find matching content"
              underlineColorAndroid="transparent"
            />

            {isSearching ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.searchSpinner}
              />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                focusable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={clearSearch}
                style={styles.clearButton}
                hitSlop={8}>
                <Text style={styles.clearText}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.categoryList}>
            {categories.map(renderCategory)}
          </ScrollView>
        </View>

        {!normalizedQuery ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageIcon}>⌕</Text>
            <Text style={styles.messageTitle}>Search your library</Text>
            <Text style={styles.messageText}>
              Type a channel, movie or series name to see results.
            </Text>

            {Platform.isTV && (
              <Text style={styles.remoteHint}>
                Select the search field with your remote to start typing.
              </Text>
            )}
          </View>
        ) : isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Searching your library…</Text>
          </View>
        ) : !hasResultsForCategory ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageTitle}>
              {totalResults === 0 ? 'No results found' : 'No matches in this category'}
            </Text>
            <Text style={styles.messageText}>
              {totalResults === 0
                ? 'Try another title or check the spelling.'
                : 'Try another category to see more results.'}
            </Text>

            {totalResults === 0 && (
              <TouchableOpacity
                focusable
                onPress={clearSearch}
                style={styles.tryAgainButton}>
                <Text style={styles.tryAgainText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.results}>
            <Text style={styles.summary}>
              {totalResults} {totalResults === 1 ? 'result' : 'results'}
            </Text>

            {(category === 'all' || category === 'live') &&
              liveResults.length > 0 && (
                <SearchSection
                  title="Live TV"
                  data={liveResults}
                  cardWidth={cardWidth}
                  onItemPress={handleLivePress}
                />
              )}

            {(category === 'all' || category === 'movies') &&
              movieResults.length > 0 && (
                <SearchSection
                  title="Movies"
                  data={movieResults}
                  cardWidth={cardWidth}
                  onItemPress={handleMoviePress}
                />
              )}

            {(category === 'all' || category === 'series') &&
              seriesResults.length > 0 && (
                <SearchSection
                  title="Series"
                  data={seriesResults}
                  cardWidth={cardWidth}
                  onItemPress={handleSeriePress}
                />
              )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  searchBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  searchIcon: {
    color: colors.textSecondary,
    fontSize: 26,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    color: colors.text,
    ...typography.body,
    paddingVertical: spacing.sm,
  },
  searchSpinner: {
    marginHorizontal: spacing.sm,
  },
  clearButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  categoryList: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  categoryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
    gap: spacing.sm,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  categoryCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  results: {
    paddingTop: spacing.sm,
  },
  summary: {
    ...typography.body,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  resultCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  horizontalList: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  cardContainer: {
    marginRight: spacing.md,
  },
  messageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl * 2,
  },
  messageIcon: {
    fontSize: 48,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  messageTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  messageText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  remoteHint: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  tryAgainButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  tryAgainText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default SearchScreen;
