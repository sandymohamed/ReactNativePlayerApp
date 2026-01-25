import React from 'react';
import {View, StyleSheet, Text, ScrollView, Image} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from '../navigation/AppNavigator';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurlplayer} from '../utils/constants';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import Button from '../components/Button';
import FastImage from 'react-native-fast-image';

const MovieDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'MovieDetail'>>();
  const route = useRoute();
  const {movie} = route.params as any;
  const {profile} = useGlobalContext();

  const handlePlay = () => {
    if (!profile || !movie) return;

    const streamId = movie.stream_id || movie.movie_data?.stream_id;
    const url = generateurlplayer('movie', streamId, 'mp4', profile);

    navigation.navigate('Player', {
      url,
      title: movie.name || movie.movie_data?.name || 'Movie',
      type: 'movie',
    });
  };

  const movieInfo = movie.movie_data || movie.info || movie;
  const cover = movieInfo.cover || movie.stream_icon;

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.background}>
        {cover && (
          <FastImage
            source={{uri: cover}}
            style={styles.cover}
            resizeMode={FastImage.resizeMode.cover}
          />
        )}
        <LinearGradient
          colors={[colors.overlay, colors.background]}
          style={styles.overlay}>
          <View style={styles.content}>
            <Text style={styles.title}>
              {movieInfo.name || movie.name || 'Movie'}
            </Text>
            {movieInfo.plot && (
              <Text style={styles.plot}>{movieInfo.plot}</Text>
            )}
            <View style={styles.meta}>
              {movieInfo.genre && (
                <Text style={styles.metaText}>Genre: {movieInfo.genre}</Text>
              )}
              {movieInfo.releaseDate && (
                <Text style={styles.metaText}>
                  Year: {movieInfo.releaseDate}
                </Text>
              )}
              {movieInfo.rating && (
                <Text style={styles.metaText}>
                  Rating: {movieInfo.rating}
                </Text>
              )}
            </View>
            <Button
              title="Play"
              onPress={handlePlay}
              style={styles.playButton}
            />
          </View>
        </LinearGradient>
      </LinearGradient>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  cover: {
    width: '100%',
    height: 400,
  },
  overlay: {
    marginTop: -100,
    paddingTop: 120,
    minHeight: '100%',
  },
  content: {
    padding: spacing.xl,
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
  meta: {
    marginBottom: spacing.xl,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  playButton: {
    marginTop: spacing.lg,
  },
});

export default MovieDetailScreen;
