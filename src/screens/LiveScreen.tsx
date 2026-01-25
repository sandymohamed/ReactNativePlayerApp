import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  Dimensions,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurl, generateurlplayer} from '../utils/constants';
import {fetchJson} from '../utils/api';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {typography} from '../theme/typography';
import Card from '../components/Card';
import {Stream} from '../models/model';

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.xl * 3) / 2;

const LiveScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Live'>>();
  const route = useRoute();
  const {profile, listLive, changeListLive} = useGlobalContext();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveChannels();
  }, [profile, route.params]);

  const loadLiveChannels = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const categoryId = (route.params as any)?.categoryId;
      const action = categoryId
        ? `get_live_streams&category_id=${categoryId}`
        : 'get_live_streams';
      const url = generateurl(action, profile);
      const data = await fetchJson<{streams?: Stream[]} | Stream[]>(url);
      const raw = Array.isArray(data) ? data : (data as {streams?: Stream[]})?.streams;
      if (raw?.length) {
        const list = raw.map((s: any) => ({
          ...s,
          stream_id: String(s.stream_id ?? s.num ?? ''),
        })) as Stream[];
        changeListLive(list);
      }
    } catch (error) {
      console.error('Error loading live channels:', error);
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

  const renderItem = ({item, index}: {item: Stream; index: number}) => {
    return (
      <View style={styles.cardContainer}>
        <Card
          title={item.name}
          image={item.stream_icon}
          onPress={() => handleChannelPress(item)}
          focused={focusedIndex === index}
          style={{width: CARD_WIDTH}}
          badge="LIVE"
        />
      </View>
    );
  };

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
        </View>
        <FlatList
          data={listLive}
          renderItem={renderItem}
          keyExtractor={item => String(item.stream_id)}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
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
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  list: {
    padding: spacing.xl,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    marginBottom: spacing.lg,
  },
});

export default LiveScreen;
