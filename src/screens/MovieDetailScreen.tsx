import React, { useEffect, useState, useCallback } from 'react';
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useGlobalContext } from '../context/GlobalContext';
import { deleterow, generateurlplayer, insertData } from '../utils/constants';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import Button from '../components/Button';
import FastImage from 'react-native-fast-image';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

const MovieDetailScreen: React.FC = () => {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<RootStackParamList, 'MovieDetail'>
    >();
  const route = useRoute();
  const isScreenFocused = useIsFocused();
  const { width, height } = useWindowDimensions();
  const { movie } = route.params as any;
  const { profile, listVodFav, changeListVodFav } = useGlobalContext();
  const [isFav, setIsFav] = useState<boolean>(false);
  const [focusedButton, setFocusedButton] = useState<'fav' | 'play'>('fav');

  const handlePressFav = () => {
    var streamId = String(movie.stream_id);
    const arrayFav = [...listVodFav];
    if (listVodFav.includes(streamId)) {
      let arr = arrayFav.filter(el => el !== streamId);
      console.log('arr : ', arr);
      profile ? deleterow(streamId, 'serie', profile) : null;

      changeListVodFav(arr);
    } else {
      arrayFav.push(streamId);
      console.log('arrayFav : ', arrayFav);
      profile ? insertData(streamId, 'serie', profile) : null;
      changeListVodFav(arrayFav);
    }
    setIsFav(isFav => !isFav);
  };

  // useEffect(() => {
  //   console.log('MovieDetailScreen: movie =', movie);
  //   /**
  //    * replace this with   useTVEventHandler({
  //        onBack: () => {
  //    */
  //   const sub = BackHandler.addEventListener('hardwareBackPress', () => {
  //     console.log('baaaaaaaaaaack');
  //     navigation.goBack();
  //     return true;
  //   });
  //   return () => sub.remove();
  // }, [navigation]);

  useEffect(() => {
    setIsFav(listVodFav.includes(String(movie?.stream_id)));
  }, [listVodFav, movie?.stream_id]);

  useTVEventHandler({
    onBack: () => {
      if (!isScreenFocused) return;

      console.log('[MovieDetail] Back');
      navigation.goBack();
    },

    onSelect: () => {
      if (!isScreenFocused) return;

      console.log('[MovieDetail] Select:', focusedButton);
      
      if (focusedButton === 'fav') {
        console.log('[MovieDetail] [fav]:', );

        // handlePressFav();
      } else if (focusedButton === 'play') {
        handlePlay();
      }
    },
  });

  const handlePlay = () => {
    if (!profile || !movie) return;

    const streamId = movie?.stream_id || movie?.movie_data?.stream_id;
    const ext = movie.container_extension || 'mp4';
    const url = generateurlplayer('movie', streamId, ext, profile);

    navigation.navigate('Player', {
      url,
      title: movie?.name || movie?.movie_data?.name || 'Movie',
      type: 'movie',
      streamId: String(streamId),
    });
  };

  const movieInfo = movie?.movie_data || movie?.info || movie;
  const cover = movieInfo?.cover || movie?.stream_icon;

  const contentBlock = (
    <View style={[styles.content, styles.contentWide]}>
      <Text style={styles.title}>
        {movieInfo.name || movie.name || 'Movie'}
      </Text>
      {movieInfo.plot && <Text style={styles.plot}>{movieInfo.plot}</Text>}

      <View style={styles.row}>
        <View style={styles.meta}>
          {movieInfo.genre && (
            <Text style={styles.metaText}>Genre: {movieInfo.genre}</Text>
          )}
          {movieInfo.releaseDate && (
            <Text style={styles.metaText}>Year: {movieInfo.releaseDate}</Text>
          )}
          {movieInfo.rating && (
            <Text style={styles.metaText}>Rating: {movieInfo.rating}</Text>
          )}
        </View>
        <Button
          title={isFav ? '❤ ' : '🤍'}
          onPress={handlePressFav}
          onFocus={() => setFocusedButton('fav')}
          textStyle={styles.favoriteIcon}
        />
      </View>

      <Button
        title="Play"
        onFocus={() => setFocusedButton('play')}
        onPress={handlePlay}
        style={styles.playButton}
      />
    </View>
  );

  return (
    <ScrollView style={[styles.container]}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={[styles.background]}>
        <FastImage
          source={{ uri: cover || '' }}
          style={[styles.cover, { height, opacity: 0.7 }]}
          resizeMode={FastImage.resizeMode.cover}>
          <LinearGradient
            colors={colors.gradients.dark}
            style={[styles.backgroundWide, { opacity: 1 }]}>
            {cover && (
              <FastImage
                source={{ uri: cover }}
                style={[styles.coverWide]}
                resizeMode={FastImage.resizeMode.cover}
              />
            )}
            <LinearGradient
              colors={[colors.overlay, colors.background]}
              style={[styles.overlayWide, { opacity: 1 }]}>
              {contentBlock}
            </LinearGradient>
          </LinearGradient>
        </FastImage>
      </LinearGradient>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
  },
  backgroundWide: {
    flex: 1,
    flexDirection: 'row',
  },
  cover: {
    width: '100%',
    height: 400,
  },
  coverWide: {
    width: 380,
    height: '100%',
    minHeight: 320,
  },
  overlay: {
    marginTop: -100,
    paddingTop: 120,
    minHeight: '100%',
  },
  overlayWide: {
    flex: 1,
    marginTop: 0,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xl,
  },
  contentWide: {
    padding: 0,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.md,
  },
  plot: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  row: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    paddingHorizontal: 15,
  },
  meta: {
    flex: 1,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },

  favoriteIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(124, 108, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(124, 108, 246, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteIcon: {
    fontSize: 22,
  },
  playButton: {
    marginTop: spacing.lg,
  },
});

export default MovieDetailScreen;
