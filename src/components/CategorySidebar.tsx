
import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ListRenderItemInfo,
  FlatList,
  Platform,
} from 'react-native';

import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

export type CategoryItem = {
  category_id: string;
  category_name: string;
};

interface CategoryRowProps {
  item: CategoryItem;
  selected: boolean;
  focusedIndex: number;
  index: number;
  useNativeFocus: boolean;
  onSelect: (categoryId: string) => void;
  onFocusChange?: (index: number) => void;
}

const ROW_HEIGHT = 52;

const CategoryRow: React.FC<CategoryRowProps> = ({
  item,
  selected,
  focusedIndex,
  index,
  useNativeFocus,
  onSelect,
  onFocusChange,
}) => {
  const [nativeFocused, setNativeFocused] = useState(false);

  const isFocused = useNativeFocus
    ? nativeFocused
    : focusedIndex === index;

  return (
    <TouchableOpacity
      style={[
        styles.item,
        selected && styles.itemSelected,
        isFocused && styles.itemFocused,
      ]}
      onFocus={() => {
        setNativeFocused(true);
        onFocusChange?.(index);
      }}
      onBlur={() => setNativeFocused(false)}
      onPress={
        Platform.isTV
          ? undefined
          : () => {
              onSelect(item.category_id);
              onFocusChange?.(index);
            }
      }
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={item.category_name}
      accessibilityState={{ selected }}
    >
      {isFocused && <View style={styles.itemAccent} />}

      <Text
        style={[
          styles.itemText,
          selected && styles.itemTextSelected,
          isFocused && styles.itemTextFocused,
        ]}
        numberOfLines={1}
      >
        {item.category_name}
      </Text>
    </TouchableOpacity>
  );
};

interface CategorySidebarProps {
  title: string;
  categories: CategoryItem[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  focusedIndex: number;
  onFocusChange?: (index: number) => void;
  focusInSidebar?: boolean;
  listRef?: React.RefObject<FlatList<CategoryItem> | null>;
  useNativeFocus?: boolean;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  title,
  categories,
  selectedId,
  onSelect,
  focusedIndex,
  onFocusChange,
  focusInSidebar = true,
  listRef: externalListRef,
  useNativeFocus = false,
}) => {
  const internalListRef = useRef<FlatList<CategoryItem>>(null);
  const listRef = externalListRef ?? internalListRef;

  const safeFocusIndex =
    categories.length === 0
      ? 0
      : Math.min(Math.max(0, focusedIndex), categories.length - 1);

  useEffect(() => {
    if (
      categories.length === 0 ||
      safeFocusIndex < 0 ||
      safeFocusIndex >= categories.length
    ) {
      return;
    }

    listRef.current?.scrollToIndex({
      index: safeFocusIndex,
      animated: false,
      viewPosition: 0.5,
    });
  }, [safeFocusIndex, categories.length, listRef]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CategoryItem>) => (
      <CategoryRow
        item={item}
        index={index}
        selected={selectedId === item.category_id}
        focusedIndex={safeFocusIndex}
        useNativeFocus={useNativeFocus}
        onSelect={onSelect}
        onFocusChange={onFocusChange}
      />
    ),
    [
      selectedId,
      safeFocusIndex,
      useNativeFocus,
      onSelect,
      onFocusChange,
    ],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        ref={listRef}
        data={categories}
        renderItem={renderItem}
        keyExtractor={item => String(item.category_id)}
        extraData={{
          selectedId,
          focusedIndex: safeFocusIndex,
          focusInSidebar,
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={({ index }) => {
          const safeIndex = Math.min(
            Math.max(0, index),
            Math.max(0, categories.length - 1),
          );

          listRef.current?.scrollToOffset({
            offset: safeIndex * ROW_HEIGHT,
            animated: false,
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    backgroundColor: colors.backgroundSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT - 4,
    marginHorizontal: spacing.sm,
    marginVertical: 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  itemSelected: {
    backgroundColor: colors.backgroundTertiary,
  },
  itemFocused: {
    backgroundColor: colors.backgroundTertiary,
    borderColor: colors.borderLight,
  },
  itemAccent: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  itemText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  itemTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  itemTextFocused: {
    color: colors.primaryLight,
  },
});

export default CategorySidebar;
