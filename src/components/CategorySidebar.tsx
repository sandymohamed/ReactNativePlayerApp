import React, {useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ListRenderItemInfo,
  FlatList,
} from 'react-native';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';

export type CategoryItem = {category_id: string; category_name: string};

interface CategorySidebarProps {
  title: string;
  categories: CategoryItem[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  focusedIndex: number;
  onFocusChange?: (index: number) => void;
  /** When true, D-pad up/down move focus in sidebar only. */
  focusInSidebar?: boolean;
  listRef?: React.RefObject<FlatList<CategoryItem> | null>;
}

const ROW_HEIGHT = 52;

const CategorySidebar: React.FC<CategorySidebarProps> = ({
  title,
  categories,
  selectedId,
  onSelect,
  focusedIndex,
  onFocusChange,
  focusInSidebar = true,
  listRef: externalListRef,
}) => {
  const internalListRef = useRef<FlatList>(null);
  const listRef = externalListRef ?? internalListRef;

  const items: CategoryItem[] = categories;

  useEffect(() => {
    if (items.length === 0) return;
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      listRef.current?.scrollToIndex({
        index: focusedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [focusedIndex, items.length]);

  const safeFocusIndex = items.length === 0 ? 0 : Math.min(Math.max(0, focusedIndex), items.length - 1);

  const renderItem = ({item, index}: ListRenderItemInfo<CategoryItem>) => {
    const isSelected = selectedId === item.category_id;
    const isFocused = focusInSidebar && safeFocusIndex === index;
    return (
      <TouchableOpacity
        style={[
          styles.item,
          isSelected && styles.itemSelected,
          isFocused && styles.itemFocused,
        ]}
        onPress={() => {
          onSelect(item.category_id);
          onFocusChange?.(index);
        }}
        activeOpacity={0.8}>
        {isFocused && <View style={styles.itemAccent} />}
        <Text
          style={[
            styles.itemText,
            isSelected && styles.itemTextSelected,
            isFocused && styles.itemTextFocused,
          ]}
          numberOfLines={1}>
          {item.category_name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        ref={listRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={item => String(item.category_id)}
        extraData={{selectedId, focusedIndex: safeFocusIndex}}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={true}
        getItemLayout={(_: any, index: number) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        onScrollToIndexFailed={({index}) => {
          setTimeout(() => {
            (listRef as any).current?.scrollToOffset({
              offset: index * ROW_HEIGHT,
              animated: true,
            });
          }, 100);
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
