import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import {useTVEventHandler} from '../hooks/useTVEventHandler';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurlplayer} from '../utils/constants';
import {Episode} from '../models/model';

const {width, height} = Dimensions.get('window');

const PlayerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {url, title, type} = route.params as any;
  const {profile, serie, changeSerie} = useGlobalContext();
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const videoRef = useRef<any>(null);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.goBack();
        return true;
      },
    );

    return () => backHandler.remove();
  }, [navigation]);

  useTVEventHandler({
    onPlayPause: () => {
      setPaused(!paused);
      showControlsTemporarily();
    },
    onBack: () => {
      navigation.goBack();
    },
  });

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      if (!paused) {
        setShowControls(false);
      }
    }, 5000);
  };

  const handlePlayPause = () => {
    setPaused(!paused);
    showControlsTemporarily();
  };

  const handleSkipBackward = () => {
    if (videoRef.current && currentTime > 0) {
      const newTime = Math.max(0, currentTime - 10);
      videoRef.current.seek(newTime);
      setCurrentTime(newTime);
      showControlsTemporarily();
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current && duration > 0) {
      const newTime = Math.min(duration, currentTime + 10);
      videoRef.current.seek(newTime);
      setCurrentTime(newTime);
      showControlsTemporarily();
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    showControlsTemporarily();
  };

  const getCurrentEpisode = (): Episode | null => {
    if (type !== 'serie' || !serie || !serie.epi) return null;
    return serie.epi;
  };

  const getNextEpisode = (): Episode | null => {
    if (type !== 'serie' || !serie || !serie.episodes || !serie.epi) return null;
    
    const currentEpi = serie.epi;
    const currentSeason = String(currentEpi.season || '1');
    const currentEpisodeNum = Number(currentEpi.episode_num || 0);
    
    const seasonEpisodes = serie.episodes[currentSeason] || [];
    const currentIndex = seasonEpisodes.findIndex(
      (ep: Episode) => Number(ep.episode_num) === currentEpisodeNum
    );
    
    if (currentIndex >= 0 && currentIndex < seasonEpisodes.length - 1) {
      return seasonEpisodes[currentIndex + 1];
    }
    
    // Try next season
    const seasons = serie.sea || [];
    const currentSeasonIndex = seasons.indexOf(currentSeason);
    if (currentSeasonIndex >= 0 && currentSeasonIndex < seasons.length - 1) {
      const nextSeason = seasons[currentSeasonIndex + 1];
      const nextSeasonEpisodes = serie.episodes[nextSeason] || [];
      if (nextSeasonEpisodes.length > 0) {
        return nextSeasonEpisodes[0];
      }
    }
    
    return null;
  };

  const getPreviousEpisode = (): Episode | null => {
    if (type !== 'serie' || !serie || !serie.episodes || !serie.epi) return null;
    
    const currentEpi = serie.epi;
    const currentSeason = String(currentEpi.season || '1');
    const currentEpisodeNum = Number(currentEpi.episode_num || 0);
    
    const seasonEpisodes = serie.episodes[currentSeason] || [];
    const currentIndex = seasonEpisodes.findIndex(
      (ep: Episode) => Number(ep.episode_num) === currentEpisodeNum
    );
    
    if (currentIndex > 0) {
      return seasonEpisodes[currentIndex - 1];
    }
    
    // Try previous season
    const seasons = serie.sea || [];
    const currentSeasonIndex = seasons.indexOf(currentSeason);
    if (currentSeasonIndex > 0) {
      const prevSeason = seasons[currentSeasonIndex - 1];
      const prevSeasonEpisodes = serie.episodes[prevSeason] || [];
      if (prevSeasonEpisodes.length > 0) {
        return prevSeasonEpisodes[prevSeasonEpisodes.length - 1];
      }
    }
    
    return null;
  };

  const handleNextEpisode = () => {
    if (!profile) return;
    const nextEpi = getNextEpisode();
    if (!nextEpi) return;
    
    const streamId = nextEpi.id || nextEpi.stream_id || nextEpi.movie_data?.stream_id;
    if (!streamId) return;
    
    const ext = nextEpi.container_extension || 'mp4';
    const nextUrl = generateurlplayer('series', String(streamId), ext, profile);
    const nextTitle = nextEpi.title || nextEpi.movie_data?.name || `Episode ${nextEpi.episode_num}`;
    
    // Update serie context with next episode
    if (serie) {
      changeSerie({...serie, epi: nextEpi});
    }
    
    // Navigate to next episode
    navigation.replace('Player', {
      url: nextUrl,
      title: nextTitle,
      type: 'serie',
    });
  };

  const handlePreviousEpisode = () => {
    if (!profile) return;
    const prevEpi = getPreviousEpisode();
    if (!prevEpi) return;
    
    const streamId = prevEpi.id || prevEpi.stream_id || prevEpi.movie_data?.stream_id;
    if (!streamId) return;
    
    const ext = prevEpi.container_extension || 'mp4';
    const prevUrl = generateurlplayer('series', String(streamId), ext, profile);
    const prevTitle = prevEpi.title || prevEpi.movie_data?.name || `Episode ${prevEpi.episode_num}`;
    
    // Update serie context with previous episode
    if (serie) {
      changeSerie({...serie, epi: prevEpi});
    }
    
    // Navigate to previous episode
    navigation.replace('Player', {
      url: prevUrl,
      title: prevTitle,
      type: 'serie',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const hasNextEpisode = type === 'serie' && getNextEpisode() !== null;
  const hasPreviousEpisode = type === 'serie' && getPreviousEpisode() !== null;

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{uri: url}}
        style={styles.video}
        paused={paused}
        rate={playbackRate}
        resizeMode="contain"
        onLoad={() => setLoading(false)}
        onProgress={(data: {currentTime: number; seekableDuration?: number}) => {
          setCurrentTime(data.currentTime);
          if (data.seekableDuration != null && data.seekableDuration > 0) {
            setDuration(data.seekableDuration);
          }
        }}
        onEnd={() => {
          setPaused(true);
          setShowControls(true);
          // Auto-play next episode if available
          if (hasNextEpisode) {
            setTimeout(() => {
              handleNextEpisode();
            }, 2000);
          }
        }}
      />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {showControls && (
        <TouchableOpacity
          style={styles.controlsOverlay}
          activeOpacity={1}
          onPress={showControlsTemporarily}>
          <LinearGradient
            colors={['transparent', colors.overlay]}
            style={styles.controlsGradient}>
            <View style={styles.topControls}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}>
                <Text style={styles.controlText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            </View>

            <View style={styles.centerControls}>
              <View style={styles.mainControlsRow}>
                {/* Previous Episode (series only) */}
                {type === 'serie' && (
                  <TouchableOpacity
                    onPress={handlePreviousEpisode}
                    disabled={!hasPreviousEpisode}
                    style={[
                      styles.episodeNavButton,
                      !hasPreviousEpisode && styles.episodeNavButtonDisabled,
                    ]}>
                    <Text style={styles.episodeNavText}>⏮ Prev</Text>
                  </TouchableOpacity>
                )}

                {/* Skip Backward */}
                <TouchableOpacity
                  onPress={handleSkipBackward}
                  style={styles.skipButton}>
                  <Text style={styles.skipButtonText}>⏪ -10s</Text>
                </TouchableOpacity>

                {/* Play/Pause */}
                <TouchableOpacity
                  onPress={handlePlayPause}
                  style={styles.playButton}>
                  <Text style={styles.playButtonText}>
                    {paused ? '▶' : '⏸'}
                  </Text>
                </TouchableOpacity>

                {/* Skip Forward */}
                <TouchableOpacity
                  onPress={handleSkipForward}
                  style={styles.skipButton}>
                  <Text style={styles.skipButtonText}>+10s ⏩</Text>
                </TouchableOpacity>

                {/* Next Episode (series only) */}
                {type === 'serie' && (
                  <TouchableOpacity
                    onPress={handleNextEpisode}
                    disabled={!hasNextEpisode}
                    style={[
                      styles.episodeNavButton,
                      !hasNextEpisode && styles.episodeNavButtonDisabled,
                    ]}>
                    <Text style={styles.episodeNavText}>Next ⏭</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Speed Controls */}
              <View style={styles.speedControls}>
                <Text style={styles.speedLabel}>Speed:</Text>
                <View style={styles.speedButtons}>
                  {speedOptions.map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      onPress={() => handleSpeedChange(speed)}
                      style={[
                        styles.speedButton,
                        playbackRate === speed && styles.speedButtonActive,
                      ]}>
                      <Text
                        style={[
                          styles.speedButtonText,
                          playbackRate === speed && styles.speedButtonTextActive,
                        ]}>
                        {speed}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.bottomControls}>
              <Text style={styles.timeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`},
                  ]}
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  video: {
    width: width,
    height: height,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlsGradient: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  backButton: {
    padding: spacing.md,
    marginRight: spacing.md,
  },
  controlText: {
    ...typography.body,
    color: colors.text,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  centerControls: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  skipButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.playerControl,
    minWidth: 80,
    alignItems: 'center',
  },
  skipButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 32,
    color: colors.text,
  },
  episodeNavButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.playerControl,
    minWidth: 70,
    alignItems: 'center',
  },
  episodeNavButtonDisabled: {
    opacity: 0.3,
  },
  episodeNavText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
  },
  speedControls: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  speedLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  speedButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  speedButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 50,
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  speedButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  speedButtonTextActive: {
    color: colors.text,
    fontWeight: 'bold',
  },
  bottomControls: {
    marginBottom: spacing.xxl,
  },
  timeText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
});

export default PlayerScreen;
