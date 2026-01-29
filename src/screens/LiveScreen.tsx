import React, {useState, useEffect, useRef, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurlplayer} from '../utils/constants';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import {Stream} from '../models/model';
import FastImage from 'react-native-fast-image';
import {useTVEventHandler} from '../hooks/useTVEventHandler';
import CategorySidebar, {type CategoryItem} from '../components/CategorySidebar';

const ROW_HEIGHT = 56;
const LOGO_SIZE = 36;

const LiveScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Live'>>();
  const {profile, listLive, listLiveFav, listLiveRecent, catLive} = useGlobalContext();
  const [sidebarFocusIndex, setSidebarFocusIndex] = useState(0);
  const [listFocusIndex, setListFocusIndex] = useState(0);
  const [focusZone, setFocusZone] = useState<'sidebar' | 'list'>('sidebar');
  const listRef = useRef<FlatList>(null);

  const categories: CategoryItem[] = useMemo(() => {
    const raw = (catLive || []) as {category_id?: string; category_name?: string}[];
    return raw.map(c => ({
      category_id: String(c.category_id ?? ''),
      category_name: String(c.category_name ?? ''),
    }));
  }, [catLive]);

  const items = categories;
  const selectedCategoryId = items[Math.min(sidebarFocusIndex, Math.max(0, items.length - 1))]?.category_id ?? '0';

  const filteredList = useMemo(() => {
    if (!listLive.length) return [];
    if (selectedCategoryId === '0' || selectedCategoryId === '') return listLive;
    if (selectedCategoryId === '-1') {
      return listLive.filter(c => (listLiveFav || []).includes(String(c.stream_id)));
    }
    if (selectedCategoryId === '-2') {
      return listLive.filter(c => (listLiveRecent || []).includes(String(c.stream_id)));
    }
    return listLive.filter(c => String(c.category_id) === selectedCategoryId);
  }, [listLive, listLiveFav, listLiveRecent, selectedCategoryId]);

  useEffect(() => {
    setListFocusIndex(0);
  }, [filteredList.length, selectedCategoryId]);

  useEffect(() => {
    if (filteredList.length > 0 && listFocusIndex >= 0 && listFocusIndex < filteredList.length) {
      listRef.current?.scrollToIndex({
        index: listFocusIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [listFocusIndex, filteredList.length]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  useTVEventHandler({
    onBack: () => navigation.goBack(),
    onUp: () => {
      if (focusZone === 'sidebar') {
        setSidebarFocusIndex(i => Math.max(0, i - 1));
      } else {
        setListFocusIndex(i => Math.max(0, i - 1));
      }
    },
    onDown: () => {
      if (focusZone === 'sidebar') {
        setSidebarFocusIndex(i => Math.min(items.length - 1, i + 1));
      } else {
        setListFocusIndex(i => Math.min(filteredList.length - 1, i + 1));
      }
    },
    onLeft: () => {
      if (focusZone === 'list') {
        setFocusZone('sidebar');
        return;
      }
      navigation.goBack();
    },
    onRight: () => {
      if (focusZone === 'sidebar' && filteredList.length > 0) {
        setFocusZone('list');
        setListFocusIndex(0);
      }
    },
    onSelect: () => {
      if (focusZone === 'list' && filteredList[listFocusIndex]) {
        handleChannelPress(filteredList[listFocusIndex]);
      }
    },
  });

  const handleCategorySelect = (categoryId: string) => {
    const idx = items.findIndex(it => it.category_id === categoryId);
    if (idx >= 0) setSidebarFocusIndex(idx);
  };

  const handleChannelPress = (channel: Stream) => {
    if (!profile) return;
    const url = generateurlplayer('live', channel.stream_id, 'm3u8', profile);
    navigation.navigate('Player', {
      url,
      title: channel.name,
      type: 'live',
      streamId: String(channel.stream_id),
    });
  };

  const renderChannelRow = ({item, index}: {item: Stream; index: number}) => {
    const isFocused = focusZone === 'list' && listFocusIndex === index;
    const isFav = Array.isArray(listLiveFav) && listLiveFav.includes(String(item.stream_id));

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setListFocusIndex(index);
          handleChannelPress(item);
        }}
        onLongPress={() => setListFocusIndex(index)}
        style={[styles.row, isFocused && styles.rowFocused]}>
        {isFocused && <View style={styles.rowAccent} />}
        <View style={styles.rowContent}>
          <Text style={[styles.channelNum, isFocused && styles.channelNumFocused]}>
            {index + 1}
          </Text>
          {item.stream_icon ? (
            <FastImage
              source={{uri: item.stream_icon, priority: FastImage.priority.low}}
              style={styles.logo}
              resizeMode={FastImage.resizeMode.contain}
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>TV</Text>
            </View>
          )}
          <Text
            style={[styles.channelName, isFocused && styles.channelNameFocused]}
            numberOfLines={1}>
            {item.name}
          </Text>
          {isFav && <Text style={styles.favBadge}>♥</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const getItemLayout = (_: any, index: number) => ({
    length: ROW_HEIGHT + 2,
    offset: (ROW_HEIGHT + 2) * index,
    index,
  });

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No profile.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.background}>
        <View style={styles.header}>
          <Text style={styles.title}>Live TV</Text>
          <Text style={styles.subtitle}>
            {filteredList.length} channel{filteredList.length !== 1 ? 's' : ''}
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
              ref={listRef}
              data={filteredList}
              renderItem={renderChannelRow}
              keyExtractor={item => String(item.stream_id)}
              getItemLayout={getItemLayout}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={true}
              onScrollToIndexFailed={({index}) => {
                setTimeout(() => {
                  listRef.current?.scrollToOffset({
                    offset: index * (ROW_HEIGHT + 2),
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
    paddingBottom: spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    marginHorizontal: spacing.sm,
    marginVertical: 1,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  rowFocused: {
    backgroundColor: colors.backgroundTertiary,
    borderColor: colors.borderLight,
  },
  rowAccent: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.md,
    gap: spacing.md,
  },
  channelNum: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
  channelNumFocused: {
    color: colors.primaryLight,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: borderRadius.sm,
  },
  logoPlaceholder: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    ...typography.labelSmall,
    color: colors.textTertiary,
  },
  channelName: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  channelNameFocused: {
    color: colors.text,
    fontWeight: '600',
  },
  favBadge: {
    fontSize: 14,
    color: colors.secondary,
  },
});

export default LiveScreen;
