import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  StackActions,
  useIsFocused,
} from '@react-navigation/native';
import Video from 'react-native-video';

import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useTVEventHandler } from '../hooks/useTVEventHandler';
import { useGlobalContext } from '../context/GlobalContext';
import { generateurlplayer, insertDatarecent } from '../utils/constants';
import { Episode } from '../models/model';
import {
  getSeriePositions,
  getVideoPositions,
  storeSeriePositions,
  storeVideoPositions,
} from '../utils/storage';

const { width, height } = Dimensions.get('window');
const CONTROLS_HIDE_DELAY = 2000;

type FocusedControl =
  | 'back'
  | 'retry'
  | 'previous'
  | 'backward'
  | 'playPause'
  | 'forward'
  | 'next'
  | `speed-${number}`;

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const PlayerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isScreenFocused = useIsFocused();

  const { url, title, type, streamId, seriesId, resumeFromSaved } =
    route.params as {
      url: string;
      title: string;
      type: 'live' | 'movie' | 'serie';
      streamId: string;
      seriesId?: string;
      resumeFromSaved?: boolean;
    };

  const {
    profile,
    serie,
    changeSerie,
    changeListLiveRecent,
    changeListVodRecent,
    changeListSerieRecent,
    listLiveRecent,
    listVodRecent,
    listSerieRecent,
  } = useGlobalContext();

  const isLive = type === 'live';

  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoKey, setVideoKey] = useState(0);
  const [focusedControl, setFocusedControl] = useState<FocusedControl | null>(
    'playPause',
  );

  const videoRef = useRef<any>(null);
  const resumePositionRef = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const resumeHandledRef = useRef(false);
  const lastSaveTimeRef = useRef(0);
  const recentRecorded = useRef(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backInProgressRef = useRef(false);
  const showControlsRef = useRef(true);
  const pausedRef = useRef(false);

  useEffect(() => {
    showControlsRef.current = showControls;
  }, [showControls]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const clearControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
  }, []);

  const showControlsTemporarily = useCallback(() => {
    showControlsRef.current = true;
    setShowControls(true);
    clearControlsTimeout();
    console.log(
      'showControlsTemporarily showControlsRef:',
      showControlsRef.current,
      showControls,
    );
    controlsTimeout.current = setTimeout(() => {
      showControlsRef.current = false;
      setShowControls(false);
      setFocusedControl(null);
      console.log(
        'showControlsTemporarily showControlsRef:',
        showControlsRef.current,
        showControls,
      );
      controlsTimeout.current = null;
    }, CONTROLS_HIDE_DELAY);
  }, [clearControlsTimeout]);

  const handleFocus = useCallback(
    (control: FocusedControl) => {
      setFocusedControl(control);
      showControlsTemporarily();
    },
    [showControlsTemporarily],
  );

  const handleBlur = useCallback((control: FocusedControl) => {
    // Don't clear a newer focus that was received by another button.
    setFocusedControl(current => (current === control ? null : current));
  }, []);

  /**
   * Native TV focus handles movement while controls are visible.
   * When the overlay has disappeared, a directional key brings it back.
   */
  const handleRemoteDirection = useCallback(() => {
    console.log('handleRemoteDirection');
    if (!showControlsRef.current) {
      setFocusedControl('playPause');
    }

    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleBack = useCallback(() => {
    if (!isScreenFocused || backInProgressRef.current) {
      return;
    }

    backInProgressRef.current = true;
    navigation.goBack();

    if (backResetTimeout.current) {
      clearTimeout(backResetTimeout.current);
    }

    backResetTimeout.current = setTimeout(() => {
      backInProgressRef.current = false;
      backResetTimeout.current = null;
    }, 350);
  }, [isScreenFocused, navigation]);

  const handlePlayPause = useCallback(() => {
    if (!showControlsRef.current) {
      setFocusedControl('playPause');
    }

    setPaused(value => !value);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  useEffect(() => {
    return () => {
      clearControlsTimeout();

      if (backResetTimeout.current) {
        clearTimeout(backResetTimeout.current);
      }
    };
  }, [clearControlsTimeout]);

  useEffect(() => {
    if (!isScreenFocused) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isScreenFocused, handleBack]);

  useTVEventHandler({
    onLeft: () => {
      console.log('TV press from onLeft ');
      handleRemoteDirection();
    },
    onRight: () => {
      console.log('TV press from onRight');
      handleRemoteDirection();
    },
    onUp: () => {
      console.log('TV press from onUp');
      handleRemoteDirection();
    },
    onDown: () => {
      console.log('TV press from onDown');
      handleRemoteDirection();
    },
    onPlayPause: handlePlayPause,
    onBack: handleBack,
  });

  // Save the last known playback position when leaving this screen.
  useEffect(() => {
    return () => {
      void saveCurrentPlaybackPosition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recent playback tracking.
  useEffect(() => {
    if (!profile || !streamId || !type || recentRecorded.current) {
      return;
    }

    recentRecorded.current = true;

    const currentID = type === 'serie' ? seriesId : streamId;

    if (!currentID) {
      return;
    }

    void Promise.resolve(insertDatarecent(currentID, type, profile)).catch(
      err => {
        console.warn('[PlayerScreen] Recent update failed:', err);
      },
    );

    const add = (items: string[]) => Array.from(new Set([...items, currentID]));

    if (type === 'live') {
      changeListLiveRecent(add(listLiveRecent || []));
    } else if (type === 'movie') {
      changeListVodRecent(add(listVodRecent || []));
    } else if (type === 'serie') {
      changeListSerieRecent(add(listSerieRecent || []));
    }
  }, [
    profile,
    streamId,
    seriesId,
    type,
    changeListLiveRecent,
    changeListVodRecent,
    changeListSerieRecent,
    listLiveRecent,
    listVodRecent,
    listSerieRecent,
  ]);

  const getNextEpisode = useCallback((): Episode | null => {
    if (type !== 'serie' || !serie?.episodes || !serie.epi) {
      return null;
    }

    const currentEpisode = serie.epi;
    const season = String(currentEpisode.season || '1');
    const episodeNumber = Number(currentEpisode.episode_num || 0);
    const episodes = serie.episodes[season] || [];

    const currentIndex = episodes.findIndex(
      (episode: Episode) => Number(episode.episode_num) === episodeNumber,
    );

    if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
      return episodes[currentIndex + 1];
    }

    const seasons = (serie.sea || []).map(String);
    const seasonIndex = seasons.indexOf(season);

    if (seasonIndex >= 0 && seasonIndex < seasons.length - 1) {
      const nextSeasonEpisodes = serie.episodes[seasons[seasonIndex + 1]] || [];

      return nextSeasonEpisodes[0] || null;
    }

    return null;
  }, [type, serie]);

  const getPreviousEpisode = useCallback((): Episode | null => {
    if (type !== 'serie' || !serie?.episodes || !serie.epi) {
      return null;
    }

    const currentEpisode = serie.epi;
    const season = String(currentEpisode.season || '1');
    const episodeNumber = Number(currentEpisode.episode_num || 0);
    const episodes = serie.episodes[season] || [];

    const currentIndex = episodes.findIndex(
      (episode: Episode) => Number(episode.episode_num) === episodeNumber,
    );

    if (currentIndex > 0) {
      return episodes[currentIndex - 1];
    }

    const seasons = (serie.sea || []).map(String);
    const seasonIndex = seasons.indexOf(season);

    if (seasonIndex > 0) {
      const previousSeasonEpisodes =
        serie.episodes[seasons[seasonIndex - 1]] || [];

      return previousSeasonEpisodes[previousSeasonEpisodes.length - 1] || null;
    }

    return null;
  }, [type, serie]);

  const hasNextEpisode = type === 'serie' && getNextEpisode() !== null;

  const hasPreviousEpisode = type === 'serie' && getPreviousEpisode() !== null;

  const navigateToEpisode = useCallback(
    (episode: Episode | null) => {
      if (!profile || !episode) {
        return;
      }

      const nextStreamId =
        episode.id ?? episode.stream_id ?? episode.movie_data?.stream_id;

      if (!nextStreamId) {
        return;
      }

      const id = String(nextStreamId);
      const extension = episode.container_extension || 'mp4';
      const nextUrl = generateurlplayer('series', id, extension, profile);
      const nextTitle =
        episode.title ||
        episode.movie_data?.name ||
        `Episode ${episode.episode_num}`;

      if (serie) {
        changeSerie({ ...serie, epi: episode });
      }

      void saveCurrentPlaybackPosition();

      navigation.dispatch(
        StackActions.replace('Player', {
          url: nextUrl,
          title: nextTitle,
          type: 'serie',
          streamId: id,
          seriesId,
          resumeFromSaved: true,
        }),
      );
    },
    [profile, serie, changeSerie, navigation, seriesId],
  );

  const handleNextEpisode = useCallback(() => {
    navigateToEpisode(getNextEpisode());
  }, [navigateToEpisode, getNextEpisode]);

  const handlePreviousEpisode = useCallback(() => {
    navigateToEpisode(getPreviousEpisode());
  }, [navigateToEpisode, getPreviousEpisode]);

  const handleSeek = useCallback(
    (offset: number) => {
      if (isLive || !videoRef.current) {
        return;
      }

      const newTime = Math.max(
        0,
        Math.min(
          durationRef.current || duration,
          currentTimeRef.current + offset,
        ),
      );

      videoRef.current.seek(newTime);
      currentTimeRef.current = newTime;
      setCurrentTime(newTime);
      showControlsTemporarily();
    },
    [isLive, duration, showControlsTemporarily],
  );

  const handleSpeedChange = useCallback(
    (rate: number) => {
      setPlaybackRate(rate);
      showControlsTemporarily();
    },
    [showControlsTemporarily],
  );

  const formatTime = (seconds: number) => {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;

    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);

    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const restorePlaybackPosition = async () => {
    if (isLive || !streamId || resumeHandledRef.current) {
      return;
    }

    resumeHandledRef.current = true;

    if (resumeFromSaved === false) {
      return;
    }

    try {
      if (type === 'movie') {
        const positions = await getVideoPositions();
        const saved = positions[String(streamId)];

        if (saved && Number.isFinite(saved.position)) {
          resumePositionRef.current = saved.position;
        }
      } else if (type === 'serie' && seriesId) {
        const positions = await getSeriePositions();
        const saved = positions[String(seriesId)];

        if (
          saved &&
          String(saved.episodeId) === String(streamId) &&
          Number.isFinite(saved.position)
        ) {
          resumePositionRef.current = saved.position;
        }
      }
    } catch (err) {
      console.warn('[PlayerScreen] Could not restore position:', err);
    }
  };

  async function saveCurrentPlaybackPosition() {
    if (
      isLive ||
      !streamId ||
      !resumeHandledRef.current ||
      currentTimeRef.current <= 0
    ) {
      return;
    }

    try {
      const position = currentTimeRef.current;
      const savedDuration = durationRef.current;

      if (type === 'movie') {
        const positions = await getVideoPositions();

        await storeVideoPositions({
          ...positions,
          [String(streamId)]: {
            position,
            duration: savedDuration,
            title,
          },
        });
      } else if (type === 'serie' && seriesId) {
        const positions = await getSeriePositions();

        await storeSeriePositions({
          ...positions,
          [String(seriesId)]: {
            episodeId: String(streamId),
            position,
            duration: savedDuration,
            title,
          },
        });
      }
    } catch (err) {
      console.warn('[PlayerScreen] Could not save position:', err);
    }
  }

  const focusedStyle = (control: FocusedControl) =>
    focusedControl === control ? styles.focusedControl : undefined;

  const videoSource = isLive
    ? { uri: url, type: 'm3u8' as const }
    : { uri: url };

  return (
    <View style={styles.container}>
      <Video
        key={videoKey}
        ref={videoRef}
        source={videoSource}
        style={styles.video}
        paused={paused}
        rate={playbackRate}
        resizeMode="contain"
        live={isLive}
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
        bufferConfig={{
          minBufferMs: isLive ? 1000 : 15000,
          maxBufferMs: isLive ? 10000 : 50000,
          bufferForPlaybackMs: isLive ? 1000 : 2500,
          bufferForPlaybackAfterRebufferMs: isLive ? 1000 : 5000,
        }}
        onLoad={async data => {
          setLoading(false);
          setBuffering(false);
          setError(null);

          if (data.duration && data.duration > 0) {
            setDuration(data.duration);
            durationRef.current = data.duration;
          }

          await restorePlaybackPosition();

          const savedPosition = resumePositionRef.current;

          if (
            savedPosition > 0 &&
            data.duration &&
            savedPosition < data.duration - 5 &&
            videoRef.current
          ) {
            videoRef.current.seek(savedPosition);
            currentTimeRef.current = savedPosition;
            setCurrentTime(savedPosition);
          }
        }}
        onLoadStart={() => {
          setLoading(true);
          setBuffering(true);
          setError(null);
        }}
        onBuffer={({ isBuffering }) => {
          setBuffering(isBuffering);

          if (!isBuffering) {
            setLoading(false);
          }
        }}
        onError={err => {
          const videoError = err?.error;
          const message =
            videoError?.localizedDescription ||
            videoError?.code ||
            'Failed to load video';

          console.error('[PlayerScreen] Video error:', err);

          setLoading(false);
          setBuffering(false);
          setError(String(message));
          setShowControls(true);
          showControlsRef.current = true;
          clearControlsTimeout();
        }}
        onProgress={(data: any) => {
          setCurrentTime(data.currentTime);
          currentTimeRef.current = data.currentTime;

          if (
            data.seekableDuration != null &&
            data.seekableDuration > 0 &&
            !isLive
          ) {
            setDuration(data.seekableDuration);
            durationRef.current = data.seekableDuration;
          }

          if (isLive || !resumeHandledRef.current || !streamId) {
            return;
          }

          const now = Date.now();

          if (now - lastSaveTimeRef.current < 5000) {
            return;
          }

          lastSaveTimeRef.current = now;
          void saveCurrentPlaybackPosition();
        }}
        onEnd={() => {
          if (isLive) {
            return;
          }

          setPaused(true);
          setShowControls(true);
          showControlsRef.current = true;
          setFocusedControl('playPause');
          clearControlsTimeout();

          if (hasNextEpisode) {
            setTimeout(handleNextEpisode, 2000);
          }
        }}
        controls={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        pictureInPicture={false}
      />

      {(loading || buffering) && (
        <View pointerEvents="none" style={styles.loadingIndicator}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Playback problem</Text>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity
            onFocus={() => handleFocus('retry')}
            onBlur={() => handleBlur('retry')}
            onPress={() => {
              setError(null);
              setLoading(true);
              setBuffering(true);
              setVideoKey(key => key + 1);
              showControlsTemporarily();
            }}
            style={[styles.retryButton, focusedStyle('retry')]}
            accessibilityRole="button"
            accessibilityLabel="Retry playback">
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/*
        Intentionally no full-screen TouchableOpacity here.
        It can take TV focus away from the actual player controls.
        Directional remote events reveal the overlay when it is hidden.
      */}

      {showControls && (
        <>
          <View style={styles.topBar}>
            <TouchableOpacity
              onFocus={() => handleFocus('back')}
              onBlur={() => handleBlur('back')}
              onPress={handleBack}
              style={[styles.backButton, focusedStyle('back')]}
              accessibilityRole="button"
              accessibilityLabel="Go back">
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.subtitle}>
                {isLive
                  ? 'LIVE CHANNEL'
                  : type === 'serie'
                    ? 'SERIES'
                    : 'MOVIE'}
              </Text>
            </View>

            {isLive && (
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>LIVE</Text>
              </View>
            )}
          </View>

          <View style={styles.bottomBar}>
            {!isLive ? (
              <View style={styles.progressRow}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          duration > 0
                            ? Math.min(100, (currentTime / duration) * 100)
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            ) : (
              <View style={styles.progressRow}>
                <Text style={styles.liveTimelineLabel}>NOW PLAYING</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, styles.liveProgressFill]}
                  />
                </View>
              </View>
            )}

            <View style={styles.mainControlsRow}>
              {type === 'serie' && (
                <TouchableOpacity
                  onFocus={() => handleFocus('previous')}
                  onBlur={() => handleBlur('previous')}
                  onPress={handlePreviousEpisode}
                  disabled={!hasPreviousEpisode}
                  style={[
                    styles.iconButton,
                    !hasPreviousEpisode && styles.disabledButton,
                    focusedStyle('previous'),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Previous episode">
                  <Text style={styles.iconButtonText}>|◀</Text>
                  <Text style={styles.buttonCaption}>PREV</Text>
                </TouchableOpacity>
              )}

              {!isLive && (
                <TouchableOpacity
                  onFocus={() => handleFocus('backward')}
                  onBlur={() => handleBlur('backward')}
                  onPress={() => handleSeek(-10)}
                  style={[styles.iconButton, focusedStyle('backward')]}
                  accessibilityRole="button"
                  accessibilityLabel="Back 10 seconds">
                  <Text style={styles.seekButtonText}>−10</Text>
                  <Text style={styles.buttonCaption}>SEC</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                hasTVPreferredFocus={
                  showControls && focusedControl === 'playPause'
                }
                onFocus={() => handleFocus('playPause')}
                onBlur={() => handleBlur('playPause')}
                onPress={handlePlayPause}
                style={[styles.playButton, focusedStyle('playPause')]}
                accessibilityRole="button"
                accessibilityLabel={paused ? 'Play' : 'Pause'}>
                <Text style={styles.playButtonText}>{paused ? '▶' : 'Ⅱ'}</Text>
              </TouchableOpacity>

              {!isLive && (
                <TouchableOpacity
                  onFocus={() => handleFocus('forward')}
                  onBlur={() => handleBlur('forward')}
                  onPress={() => handleSeek(10)}
                  style={[styles.iconButton, focusedStyle('forward')]}
                  accessibilityRole="button"
                  accessibilityLabel="Forward 10 seconds">
                  <Text style={styles.seekButtonText}>+10</Text>
                  <Text style={styles.buttonCaption}>SEC</Text>
                </TouchableOpacity>
              )}

              {type === 'serie' && (
                <TouchableOpacity
                  onFocus={() => handleFocus('next')}
                  onBlur={() => handleBlur('next')}
                  onPress={handleNextEpisode}
                  disabled={!hasNextEpisode}
                  style={[
                    styles.iconButton,
                    !hasNextEpisode && styles.disabledButton,
                    focusedStyle('next'),
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Next episode">
                  <Text style={styles.iconButtonText}>▶|</Text>
                  <Text style={styles.buttonCaption}>NEXT</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isLive && (
              <View style={styles.speedSection}>
                <Text style={styles.speedLabel}>PLAYBACK SPEED</Text>

                <View style={styles.speedRow}>
                  {SPEED_OPTIONS.map(speed => {
                    const control = `speed-${speed}` as FocusedControl;
                    const active = playbackRate === speed;

                    return (
                      <TouchableOpacity
                        key={speed}
                        onFocus={() => handleFocus(control)}
                        onBlur={() => handleBlur(control)}
                        onPress={() => handleSpeedChange(speed)}
                        style={[
                          styles.speedButton,
                          active && styles.speedButtonActive,
                          focusedStyle(control),
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Playback speed ${speed} times`}>
                        <Text
                          style={[
                            styles.speedButtonText,
                            active && styles.speedButtonTextActive,
                          ]}>
                          {speed}x
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
    backgroundColor: '#050509',
  },
  video: {
    width,
    height,
    backgroundColor: '#050509',
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 58,
    height: 58,
    marginLeft: -29,
    marginTop: -29,
    borderRadius: 29,
    backgroundColor: 'rgba(10,10,15,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(5,5,9,0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    zIndex: 2,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#191923',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 38,
    lineHeight: 42,
    marginTop: -4,
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.body,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: '#A6A6B5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginTop: 4,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(255,70,90,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,70,90,0.5)',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF465A',
    marginRight: 7,
  },
  livePillText: {
    color: '#FF6678',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(5,5,9,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    zIndex: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  timeText: {
    color: '#D9D9E4',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 42,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.17)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B7CFF',
    borderRadius: 5,
  },
  liveProgressFill: {
    width: '100%',
    backgroundColor: '#FF465A',
  },
  liveTimelineLabel: {
    color: '#FF6678',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    minWidth: 90,
  },
  mainControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: spacing.md,
  },
  iconButton: {
    width: 62,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#171720',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  disabledButton: {
    opacity: 0.3,
  },
  iconButtonText: {
    color: '#F5F5FA',
    fontSize: 20,
    fontWeight: '700',
  },
  seekButtonText: {
    color: '#F5F5FA',
    fontSize: 16,
    fontWeight: '800',
  },
  buttonCaption: {
    color: '#9292A5',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 3,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: '#8170F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A99EFF',
    elevation: 5,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },
  speedSection: {
    alignItems: 'center',
  },
  speedLabel: {
    color: '#777789',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  speedButton: {
    minWidth: 49,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#171720',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonActive: {
    backgroundColor: 'rgba(129,112,248,0.25)',
    borderColor: '#8170F8',
  },
  speedButtonText: {
    color: '#B1B1C0',
    fontSize: 11,
    fontWeight: '700',
  },
  speedButtonTextActive: {
    color: '#FFFFFF',
  },
  /*
   * Visible TV focus treatment:
   * bright mint outline + stronger background + slight enlargement.
   */
  focusedControl: {
    borderColor: '#5EEAD4',
    backgroundColor: 'rgba(94,234,212,0.24)',
    transform: [{ scale: 1.1 }],
    elevation: 12,
    shadowColor: '#5EEAD4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 9,
  },
  errorContainer: {
    position: 'absolute',
    top: '50%',
    left: spacing.lg,
    right: spacing.lg,
    transform: [{ translateY: -70 }],
    backgroundColor: 'rgba(10,10,15,0.97)',
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    zIndex: 10,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: '#FF8C99',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8170F8',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    marginTop: spacing.sm,
  },
  retryButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default PlayerScreen;
