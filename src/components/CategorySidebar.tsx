import React, { memo, useCallback, useRef, useState } from 'react';

import {
  View,
  StyleSheet,
  Text,
  Pressable,
  type ListRenderItemInfo,
  FlatList,
  StyleProp,
  ViewStyle,
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
  index: number;
  onSelect: (categoryId: string) => void;
  onFocusChange?: (index: number) => void;
}

const ROW_HEIGHT = 52;

const CategoryRow: React.FC<CategoryRowProps> = memo(
  ({ item, selected, index, onSelect, onFocusChange }) => {
    const [nativeFocused, setNativeFocused] = useState(false);

    const handleFocus = useCallback(() => {
      setNativeFocused(true);
      onFocusChange?.(index);
    }, [index, onFocusChange]);

    const handleBlur = useCallback(() => {
      setNativeFocused(false);
    }, []);

    const handlePress = useCallback(() => {
      onSelect(item.category_id);
    }, [item.category_id, onSelect]);

    return (
      <Pressable
        focusable
        style={[
          styles.item,
          selected && styles.itemSelected,
          nativeFocused && styles.itemFocused,
        ]}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={item.category_name}
        accessibilityState={{ selected }}>
        {nativeFocused && <View style={styles.itemAccent} />}

        <Text
          style={[
            styles.itemText,
            selected && styles.itemTextSelected,
            nativeFocused && styles.itemTextFocused,
          ]}
          numberOfLines={1}>
          {item.category_name}
        </Text>
      </Pressable>
    );
  },
);

interface CategorySidebarProps {
  title: string;
  categories: CategoryItem[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  onFocusChange?: (index: number) => void;
  sidebarWidth: StyleProp<ViewStyle>;
}

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  title,
  categories,
  selectedId,
  onSelect,
  onFocusChange,
  sidebarWidth,
}) => {

  const listRef = useRef<FlatList<CategoryItem>>(null);

  const handleRowFocus = useCallback(
    (index: number) => {
      listRef.current?.scrollToIndex({
        index,
        animated: false,
        viewPosition: 0.5,
      });

      onFocusChange?.(index);
    },
    [listRef, onFocusChange],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CategoryItem>) => (
      <CategoryRow
        item={item}
        index={index}
        selected={selectedId === item.category_id}
        onSelect={onSelect}
        onFocusChange={handleRowFocus}
      />
    ),
    [selectedId, onSelect, handleRowFocus],
  );

  return (
    <View style={[sidebarWidth, styles.container]}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        ref={listRef}
        data={categories}
        renderItem={renderItem}
        keyExtractor={item => String(item.category_id)}
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
    // width: 200,
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

export default memo(CategorySidebar);
