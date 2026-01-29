import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurl, generateurlplayer} from '../utils/constants';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import {Stream} from '../models/model';
import FastImage from 'react-native-fast-image';
import {useTVEventHandler} from '../hooks/useTVEventHandler';


const ROW_HEIGHT = 56;
const LOGO_SIZE = 36;

const LiveScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Live'>>();
  const route = useRoute();
  const {profile, listLive, changeListLive, listLiveFav} = useGlobalContext();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadLiveChannels();
  }, [profile, route.params]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [listLive.length]);

  useEffect(() => {
    if (listLive.length > 0 && focusedIndex >= 0 && focusedIndex < listLive.length) {
      listRef.current?.scrollToIndex({
        index: focusedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [focusedIndex, listLive.length]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  useTVEventHandler({
    onUp: () => {
      if (listLive.length === 0) return;
      setFocusedIndex(i => Math.max(0, i - 1));
    },
    onDown: () => {
      if (listLive.length === 0) return;
      setFocusedIndex(i => Math.min(listLive.length - 1, i + 1));
    },
    onSelect: () => {
      if (listLive.length > 0 && listLive[focusedIndex]) {
        handleChannelPress(listLive[focusedIndex]);
      }
    },
    onBack: () => navigation.goBack(),
  });

  const loadLiveChannels = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const categoryId = (route.params as any)?.categoryId;
      const action = categoryId
        ? `get_live_streams&category_id=${categoryId}`
        : 'get_live_streams';
      const url = generateurl(action, profile);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        var res = await fetch(url, {signal: controller.signal});
      } finally {
        clearTimeout(timeoutId);
      }
      const text = await res.text();
      const t = (text && text.trim()) || '';
      if (!t) {
        changeListLive([]);
        setLoading(false);
        return;
      }
      const first = t.charAt(0);
      if (first !== '[' && first !== '{') {
        console.warn('Live API unexpected response:', t.slice(0, 80));
        changeListLive([]);
        setLoading(false);
        return;
      }
      let data: {streams?: Stream[]} | Stream[];
      try {
        data = JSON.parse(text) as {streams?: Stream[]} | Stream[];
      } catch {
        console.warn('Live API invalid JSON:', text.slice(0, 80));
        changeListLive([]);
        setLoading(false);
        return;
      }
      const raw = Array.isArray(data) ? data : (data as {streams?: Stream[]})?.streams;
      if (raw?.length) {
        const list = raw.map((s: any) => ({
          ...s,
          stream_id: String(s.stream_id ?? s.num ?? ''),
        })) as Stream[];
        changeListLive(list);
      } else {
        changeListLive([]);
      }
    } catch (error) {
      console.error('Error loading live channels:', error);
      changeListLive([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChannelPress = (channel: Stream) => {
    if (!profile) return;

    const url = generateurlplayer('live', channel.stream_id, 'm3u8', profile);

    navigation.navigate('Player', {
      url,
      title: channel.name,
      type: 'live',
    });
  };

  const renderChannelRow = ({item, index}: {item: Stream; index: number}) => {
    const isFocused = focusedIndex === index;
    const isFav = Array.isArray(listLiveFav) && listLiveFav.includes(String(item.stream_id));

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setFocusedIndex(index);
          handleChannelPress(item);
        }}
        onLongPress={() => setFocusedIndex(index)}
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading channels...</Text>
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
            {listLive.length} channel{listLive.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <FlatList
          ref={listRef}
          data={listLive}
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
  list: {
    paddingHorizontal: spacing.xl,
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
