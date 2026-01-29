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
import {useNavigation, useRoute, StackActions} from '@react-navigation/native';
import Video from 'react-native-video';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import {useTVEventHandler} from '../hooks/useTVEventHandler';
import {useGlobalContext} from '../context/GlobalContext';
import {generateurlplayer, insertDatarecent} from '../utils/constants';
import {Episode} from '../models/model';

const {width, height} = Dimensions.get('window');

const PlayerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {url, title, type, streamId} = route.params as any;
  const {profile, serie, changeSerie, changeListLiveRecent, changeListVodRecent, changeListSerieRecent, listLiveRecent, listVodRecent, listSerieRecent} = useGlobalContext();
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const videoRef = useRef<any>(null);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isLive = type === 'live';

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

  const recentRecorded = useRef(false);
  useEffect(() => {
    if (!profile || !streamId || !type || recentRecorded.current) return;
    recentRecorded.current = true;
    insertDatarecent(streamId, type, profile);
    const add = (arr: string[]) => Array.from(new Set([...arr, streamId]));
    if (type === 'live') changeListLiveRecent(add(listLiveRecent || []));
    else if (type === 'movie') changeListVodRecent(add(listVodRecent || []));
    else if (type === 'serie') changeListSerieRecent(add(listSerieRecent || []));
  }, [profile, streamId, type]);

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
    navigation.dispatch(
      StackActions.replace('Player', {
        url: nextUrl,
        title: nextTitle,
        type: 'serie',
        streamId: String(streamId),
      }),
    );
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
    navigation.dispatch(
      StackActions.replace('Player', {
        url: prevUrl,
        title: prevTitle,
        type: 'serie',
        streamId: String(streamId),
      }),
    );
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
        live={isLive}
        // HLS configuration for live streams
        hlsConfig={{
          enableWorker: false,
          lowLatencyMode: isLive,
          backBufferLength: isLive ? 1 : 90,
          maxBufferLength: isLive ? 10 : 30,
          maxMaxBufferLength: isLive ? 20 : 60,
          maxBufferSize: isLive ? 10 * 1000 * 1000 : 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLoadingTimeOut: 20000,
          maxLoadingDelay: 4,
          minAutoBitrate: 0,
          maxStarvationDelay: 4,
        }}
        // Android-specific configuration
        bufferConfig={{
          minBufferMs: isLive ? 1000 : 15000,
          maxBufferMs: isLive ? 10000 : 50000,
          bufferForPlaybackMs: isLive ? 1000 : 2500,
          bufferForPlaybackAfterRebufferMs: isLive ? 1000 : 5000,
        }}
        onLoad={() => {
          setLoading(false);
          setError(null);
        }}
        onLoadStart={() => {
          setLoading(true);
          setBuffering(true);
        }}
        onBuffer={({isBuffering}: {isBuffering: boolean}) => {
          setBuffering(isBuffering);
          if (!isBuffering) {
            setLoading(false);
          }
        }}
        onError={(error: any) => {
          console.error('Video player error:', error);
          setLoading(false);
          setBuffering(false);
          setError(error?.error?.localizedDescription || error?.error?.code || 'Failed to load video');
        }}
        onProgress={(data: {currentTime: number; seekableDuration?: number}) => {
          setCurrentTime(data.currentTime);
          if (data.seekableDuration != null && data.seekableDuration > 0 && !isLive) {
            setDuration(data.seekableDuration);
          }
        }}
        onEnd={() => {
          if (!isLive) {
            setPaused(true);
            setShowControls(true);
            // Auto-play next episode if available
            if (hasNextEpisode) {
              setTimeout(() => {
                handleNextEpisode();
              }, 2000);
            }
          }
        }}
        // Ignore seek for live streams
        seek={isLive ? undefined : undefined}
        // Disable controls for live streams that don't support seeking
        controls={!isLive}
        // Play immediately for live streams
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        pictureInPicture={false}
      />

      {(loading || buffering) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          {buffering && (
            <Text style={styles.loadingText}>Buffering...</Text>
          )}
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              setLoading(true);
              // Force reload by updating the key
              if (videoRef.current) {
                videoRef.current.seek(0);
              }
            }}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Always-present tap overlay: tap anywhere to show controls */}
      <TouchableOpacity
        style={styles.tapArea}
        activeOpacity={1}
        onPress={showControlsTemporarily}
      />

      {showControls && (
        <>
          {/* Minimal top bar: back + title */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>

          {/* Bottom control bar – compact, smaller buttons */}
          <View style={styles.bottomBar}>
            {!isLive && (
              <View style={styles.progressRow}>
                <Text style={styles.timeText}>
                  {formatTime(currentTime)}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`},
                    ]}
                  />
                </View>
                <Text style={styles.timeText}>
                  {formatTime(duration)}
                </Text>
              </View>
            )}
            {isLive && (
              <View style={styles.progressRow}>
                <Text style={styles.liveBadge}>● LIVE</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {width: '100%'}]} />
                </View>
              </View>
            )}

            <View style={styles.mainControlsRow}>
              {type === 'serie' && (
                <TouchableOpacity
                  onPress={handlePreviousEpisode}
                  disabled={!hasPreviousEpisode}
                  style={[
                    styles.iconBtn,
                    !hasPreviousEpisode && styles.iconBtnDisabled,
                  ]}>
                  <Text style={styles.iconBtnText}>⏮</Text>
                </TouchableOpacity>
              )}
              {!isLive && (
                <TouchableOpacity
                  onPress={handleSkipBackward}
                  style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>-10</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handlePlayPause}
                style={styles.playButton}>
                <Text style={styles.playButtonText}>
                  {paused ? '▶' : '⏸'}
                </Text>
              </TouchableOpacity>
              {!isLive && (
                <TouchableOpacity
                  onPress={handleSkipForward}
                  style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>+10</Text>
                </TouchableOpacity>
              )}
              {type === 'serie' && (
                <TouchableOpacity
                  onPress={handleNextEpisode}
                  disabled={!hasNextEpisode}
                  style={[
                    styles.iconBtn,
                    !hasNextEpisode && styles.iconBtnDisabled,
                  ]}>
                  <Text style={styles.iconBtnText}>⏭</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isLive && (
              <View style={styles.speedRow}>
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
            )}
          </View>
        </>
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
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  backText: {
    fontSize: 18,
    color: colors.text,
  },
  title: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    fontSize: 14,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  timeText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    minWidth: 36,
    textAlign: 'center',
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  mainControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
  iconBtnText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 20,
    color: colors.text,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  speedButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    minWidth: 42,
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: colors.primary,
  },
  speedButtonText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  speedButtonTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorContainer: {
    position: 'absolute',
    top: '50%',
    left: spacing.md,
    right: spacing.md,
    transform: [{translateY: -50}],
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  liveBadge: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '700',
    fontSize: 12,
    minWidth: 60,
  },
});

export default PlayerScreen;
