import React, { useState, useRef, useEffect } from 'react';

import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  BackHandler,
  Alert,
} from 'react-native';

import {
  useNavigation,
  useRoute,
  StackActions,
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

const PlayerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { url, title, type, streamId, seriesId } = route.params as any;
  console.log(
    'PlayerScreen: url =',
    url,
    'title =',
    title,
    'type =',
    type,
    'streamId =',
    streamId,
  );

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

  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------

  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [playbackRate, setPlaybackRate] = useState(1.0);

  const videoRef = useRef<any>(null);
  const resumePositionRef = useRef(0);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const resumeHandledRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastTapSide = useRef<'left' | 'center' | 'right' | null>(null);

  const lastTapTime = useRef(0);

  const [videoKey, setVideoKey] = useState(0);

  const isLive = type === 'live';

  // ------------------------------------------------------------
  // Controls timeout
  // ------------------------------------------------------------

  const clearControlsTimeout = () => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
      controlsTimeout.current = null;
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);

    clearControlsTimeout();

    if (!paused) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        controlsTimeout.current = null;
      }, 2500);
    }
  };

  // ------------------------------------------------------------
  // Back handler
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // Cleanup timers
  // ------------------------------------------------------------

  // useEffect(() => {
  //   return () => {
  //     clearControlsTimeout();

  //     if (tapTimeout.current) {
  //       clearTimeout(tapTimeout.current);
  //       tapTimeout.current = null;
  //     }
  //   };
  // }, []);

  useEffect(() => {
    return () => {
      clearControlsTimeout();

      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }

      console.log(
        'PlayerScreen unmounting, saving final playback position for streamId:',
        streamId,
        'currentTime:',
        currentTimeRef.current,
      );
      saveCurrentPlaybackPosition(); //* ****************** */
    };
  }, []);
  // ------------------------------------------------------------
  // Recent tracking
  // ------------------------------------------------------------

  const recentRecorded = useRef(false);

  useEffect(() => {
    if (!profile || !streamId || !type || recentRecorded.current) {
      return;
    }

    const currentID = type === 'serie' ? seriesId : streamId;
    recentRecorded.current = true;

    // this is an API request
    insertDatarecent(currentID, type, profile);

    const add = (arr: string[]) => Array.from(new Set([...arr, currentID]));
    if (type === 'live') {
      changeListLiveRecent(add(listLiveRecent || []));
    } else if (type === 'movie') {
      changeListVodRecent(add(listVodRecent || []));
    } else if (type === 'serie') {
      changeListSerieRecent(add(listSerieRecent || []));
    }
  }, [profile, streamId, type]);

  // ------------------------------------------------------------
  // Play / Pause
  // ------------------------------------------------------------

  const handlePlayPause = () => {
    setPaused(prev => !prev);
    showControlsTemporarily();
  };

  // ------------------------------------------------------------
  // Skip
  // ------------------------------------------------------------

  const handleSkipBackward = () => {
    if (isLive || !videoRef.current) {
      return;
    }

    const newTime = Math.max(0, currentTime - 10);

    videoRef.current.seek(newTime);
    setCurrentTime(newTime);

    showControlsTemporarily();
  };

  const handleSkipForward = () => {
    if (isLive || !videoRef.current || duration <= 0) {
      return;
    }

    const newTime = Math.min(duration, currentTime + 10);

    videoRef.current.seek(newTime);
    setCurrentTime(newTime);

    showControlsTemporarily();
  };

  // ------------------------------------------------------------
  // Toggle controls
  // ------------------------------------------------------------

  const toggleControls = () => {
    if (showControls) {
      setShowControls(false);
      clearControlsTimeout();
    } else {
      showControlsTemporarily();
    }
  };

  // ------------------------------------------------------------
  // Double tap handling
  // ------------------------------------------------------------

  const handleVideoTap = (side: 'left' | 'center' | 'right') => {
    const now = Date.now();

    const DOUBLE_TAP_DELAY = 280;

    const isDoubleTap =
      lastTapSide.current === side &&
      now - lastTapTime.current < DOUBLE_TAP_DELAY;

    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;
    }

    if (isDoubleTap) {
      lastTapSide.current = null;
      lastTapTime.current = 0;

      if (side === 'left') {
        handleSkipBackward();
        return;
      }

      if (side === 'right') {
        handleSkipForward();
        return;
      }

      toggleControls();
      return;
    }

    lastTapSide.current = side;
    lastTapTime.current = now;

    tapTimeout.current = setTimeout(() => {
      lastTapSide.current = null;
      lastTapTime.current = 0;
      tapTimeout.current = null;

      toggleControls();
    }, DOUBLE_TAP_DELAY);
  };

  // ------------------------------------------------------------
  // Speed
  // ------------------------------------------------------------

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    showControlsTemporarily();
  };

  // ------------------------------------------------------------
  // TV controls
  // ------------------------------------------------------------

  useTVEventHandler({
    onPlayPause: () => {
      setPaused(prev => !prev);
      showControlsTemporarily();
    },

    onBack: () => {
      navigation.goBack();
    },
  });

  // ------------------------------------------------------------
  // Series helpers
  // ------------------------------------------------------------

  // const getCurrentEpisode = (): Episode | null => {
  //   if (type !== 'serie' || !serie || !serie.epi) {
  //     return null;
  //   }

  //   return serie.epi;
  // };

  const getNextEpisode = (): Episode | null => {
    if (type !== 'serie' || !serie || !serie.episodes || !serie.epi) {
      return null;
    }

    const currentEpi = serie.epi;

    const currentSeason = String(currentEpi.season || '1');

    const currentEpisodeNum = Number(currentEpi.episode_num || 0);

    const seasonEpisodes = serie.episodes[currentSeason] || [];

    const currentIndex = seasonEpisodes.findIndex(
      (ep: Episode) => Number(ep.episode_num) === currentEpisodeNum,
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
    if (type !== 'serie' || !serie || !serie.episodes || !serie.epi) {
      return null;
    }

    const currentEpi = serie.epi;

    const currentSeason = String(currentEpi.season || '1');

    const currentEpisodeNum = Number(currentEpi.episode_num || 0);

    const seasonEpisodes = serie.episodes[currentSeason] || [];

    const currentIndex = seasonEpisodes.findIndex(
      (ep: Episode) => Number(ep.episode_num) === currentEpisodeNum,
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

  // ------------------------------------------------------------
  // Next episode
  // ------------------------------------------------------------

  const handleNextEpisode = () => {
    if (!profile) {
      return;
    }

    const nextEpi = getNextEpisode();

    if (!nextEpi) {
      return;
    }

    const nextStreamId =
      nextEpi.id || nextEpi.stream_id || nextEpi.movie_data?.stream_id;

    if (!nextStreamId) {
      return;
    }

    const ext = nextEpi.container_extension || 'mp4';

    const nextUrl = generateurlplayer(
      'series',
      String(nextStreamId),
      ext,
      profile,
    );

    const nextTitle =
      nextEpi.title ||
      nextEpi.movie_data?.name ||
      `Episode ${nextEpi.episode_num}`;

    // Update serie context
    if (serie) {
      changeSerie({
        ...serie,
        epi: nextEpi,
      });
    }

    navigation.dispatch(
      StackActions.replace('Player', {
        url: nextUrl,
        title: nextTitle,
        type: 'serie',
        streamId: String(nextStreamId),
      }),
    );
  };

  // ------------------------------------------------------------
  // Previous episode
  // ------------------------------------------------------------

  const handlePreviousEpisode = () => {
    if (!profile) {
      return;
    }

    const prevEpi = getPreviousEpisode();

    if (!prevEpi) {
      return;
    }

    const prevStreamId =
      prevEpi.id || prevEpi.stream_id || prevEpi.movie_data?.stream_id;

    if (!prevStreamId) {
      return;
    }

    const ext = prevEpi.container_extension || 'mp4';

    const prevUrl = generateurlplayer(
      'series',
      String(prevStreamId),
      ext,
      profile,
    );

    const prevTitle =
      prevEpi.title ||
      prevEpi.movie_data?.name ||
      `Episode ${prevEpi.episode_num}`;

    // Update serie context
    if (serie) {
      changeSerie({
        ...serie,
        epi: prevEpi,
      });
    }

    navigation.dispatch(
      StackActions.replace('Player', {
        url: prevUrl,
        title: prevTitle,
        type: 'serie',
        streamId: String(prevStreamId),
      }),
    );
  };

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasNextEpisode = type === 'serie' && getNextEpisode() !== null;

  const hasPreviousEpisode = type === 'serie' && getPreviousEpisode() !== null;

  // ------------------------------------------------------------
  // restore playback position
  // ------------------------------------------------------------

  const restorePlaybackPosition = async () => {
    if (isLive || !streamId || resumeHandledRef.current) {
      return;
    }

    resumeHandledRef.current = true;

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

        // Restore only when the saved episode matches this episode.
        if (
          saved &&
          String(saved.episodeId) === String(streamId) &&
          Number.isFinite(saved.position)
        ) {
          resumePositionRef.current = saved.position;
        }
      }
    } catch (error) {
      console.error('Error restoring playback position:', error);
    }
  };

  // ------------------------------------------------------------
  // Save final playback position on unmount
  // ------------------------------------------------------------

  const saveCurrentPlaybackPosition = async () => {
    if (
      isLive ||
      !streamId ||
      !resumeHandledRef.current ||
      currentTimeRef.current <= 0
    ) {
      return;
    }

    console.log(
      'Saving final playback position for streamId:',
      streamId,
      'currentTime:',
      currentTimeRef.current,
    );
    try {
      const position = currentTimeRef.current;
      const duration = durationRef.current;

      if (type === 'movie') {
        const positions = await getVideoPositions();
        console.log('Saving final playback position for movie:', positions);

        await storeVideoPositions({
          ...positions,
          [String(streamId)]: {
            position,
            duration,
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
            duration,
            title,
          },
        });
      }
    } catch (error) {
      console.error('Error saving final playback position:', error);
    }
  };

  // ------------------------------------------------------------
  // Video source
  // ------------------------------------------------------------

  const videoSource = isLive
    ? {
        uri: url,
        type: 'm3u8' as const,
      }
    : {
        uri: url,
      };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* ======================================================
          VIDEO
      ====================================================== */}

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
        onLoad={async (data: { duration?: number }) => {
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
            setCurrentTime(savedPosition);
            currentTimeRef.current = savedPosition;
          }
        }}
        onLoadStart={() => {
          setLoading(true);
          setBuffering(true);
        }}
        onBuffer={({ isBuffering }: { isBuffering: boolean }) => {
          setBuffering(isBuffering);

          if (!isBuffering) {
            setLoading(false);
          }
        }}
        onError={(err: any) => {
          const e = err?.error;

          const hasCodes =
            e && (typeof e.extra === 'number' || typeof e.what === 'number');

          const code = hasCodes
            ? ` (what: ${e.what ?? '?'}, extra: ${e.extra ?? '?'})`
            : '';

          const msg =
            e?.localizedDescription ||
            e?.code ||
            (code
              ? `Playback error${code}. Try Retry.`
              : 'Failed to load video');

          console.error('Video player error:', err);

          setLoading(false);
          setBuffering(false);
          setError(msg);
        }}
        onProgress={(data: {
          currentTime: number;
          seekableDuration?: number;
        }) => {
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

          // Wait until the saved position has been loaded.
          if (isLive || !resumeHandledRef.current || !streamId) {
            return;
          }

          const now = Date.now();

          // Save at most once every 5 seconds.
          if (now - lastSaveTimeRef.current < 5000) {
            return;
          }

          lastSaveTimeRef.current = now;

          const position = data.currentTime;
          const savedDuration = data.seekableDuration ?? durationRef.current;

          if (position <= 0) {
            return;
          }

          const savePosition = async () => {
            try {
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
            } catch (error) {
              console.error('Error saving playback position:', error);
            }
          };

          void savePosition();
        }}
        onEnd={() => {
          if (!isLive) {
            setPaused(true);
            setShowControls(true);

            if (hasNextEpisode) {
              setTimeout(() => {
                Alert.alert(
                  'DEBUG: handleNextEpisode called from onEnd',
                  `Source: PlayerScreen.tsx → Video onEnd\nCurrent time: ${currentTime}\nHas next episode: ${hasNextEpisode}`,
                );
                handleNextEpisode();
              }, 2000);
            }
          }
        }}
        seek={isLive ? undefined : undefined}
        /*
         * Important:
         * Disable native controls because we use our own
         * compact mobile controls.
         */
        controls={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        pictureInPicture={false}
      />

      {/* ======================================================
          SMALL LOADING INDICATOR
      ====================================================== */}

      {(loading || buffering) && (
        <View pointerEvents="none" style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {error}</Text>

          <TouchableOpacity
            onPress={() => {
              setError(null);
              setLoading(true);
              setBuffering(true);
              setVideoKey(k => k + 1);
            }}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ======================================================
          TAP AREA
      ====================================================== */}

      <View pointerEvents="box-none" style={styles.tapArea}>
        <TouchableOpacity
          style={styles.fullTapArea}
          activeOpacity={1}
          onPress={event => {
            const locationX = event.nativeEvent.locationX;

            if (locationX < width * 0.35) {
              handleVideoTap('left');
            } else if (locationX > width * 0.65) {
              handleVideoTap('right');
            } else {
              handleVideoTap('center');
            }
          }}
        />
      </View>

      {/* ======================================================
          CONTROLS
      ====================================================== */}

      {showControls && (
        <>
          {/* ==================================================
              TOP BAR
          ================================================== */}

          <View pointerEvents="box-none" style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}>
              <Text style={styles.backText}>←</Text>
            </TouchableOpacity>

            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>

            {isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />

                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* ==================================================
              CENTER PLAY BUTTON
          ================================================== */}

          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.centerPlayButton}
            activeOpacity={0.8}>
            <Text style={styles.centerPlayText}>{paused ? '▶' : 'Ⅱ'}</Text>
          </TouchableOpacity>

          {/* ==================================================
              COMPACT BOTTOM CONTROLS
          ================================================== */}

          <View pointerEvents="box-none" style={styles.controlsWrapper}>
            {/* Small progress */}

            {!isLive && (
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          duration > 0
                            ? Math.min(
                                100,
                                Math.max(0, (currentTime / duration) * 100),
                              )
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            )}

            {/* Live indicator */}

            {isLive && (
              <View style={styles.liveProgressContainer}>
                <View style={styles.liveSmallBadge}>
                  <View style={styles.liveDot} />

                  <Text style={styles.liveSmallBadgeText}>LIVE</Text>
                </View>
              </View>
            )}

            {/* ==================================================
                COMPACT BUTTON ROW
            ================================================== */}

            <View style={styles.compactControlsRow}>
              {/* Previous episode */}

              {type === 'serie' && (
                <TouchableOpacity
                  onPress={handlePreviousEpisode}
                  disabled={!hasPreviousEpisode}
                  style={[
                    styles.compactButton,
                    !hasPreviousEpisode && styles.disabledButton,
                  ]}
                  activeOpacity={0.7}>
                  <Text style={styles.compactButtonText}>‹‹</Text>
                </TouchableOpacity>
              )}

              {/* Back 10 */}

              {!isLive && (
                <TouchableOpacity
                  onPress={handleSkipBackward}
                  style={styles.compactButton}
                  activeOpacity={0.7}>
                  <Text style={styles.compactButtonText}>−10</Text>
                </TouchableOpacity>
              )}

              {/* Play / Pause */}

              <TouchableOpacity
                onPress={handlePlayPause}
                style={styles.compactPlayButton}
                activeOpacity={0.8}>
                <Text style={styles.compactPlayText}>{paused ? '▶' : 'Ⅱ'}</Text>
              </TouchableOpacity>

              {/* Forward 10 */}

              {!isLive && (
                <TouchableOpacity
                  onPress={handleSkipForward}
                  style={styles.compactButton}
                  activeOpacity={0.7}>
                  <Text style={styles.compactButtonText}>+10</Text>
                </TouchableOpacity>
              )}

              {/* Next episode */}

              {type === 'serie' && (
                <TouchableOpacity
                  onPress={() => {
                    handleNextEpisode();
                  }}
                  disabled={!hasNextEpisode}
                  style={[
                    styles.compactButton,
                    !hasNextEpisode && styles.disabledButton,
                  ]}
                  activeOpacity={0.7}>
                  <Text style={styles.compactButtonText}>››</Text>
                </TouchableOpacity>
              )}

              {/* Speed */}

              {!isLive && (
                <View style={styles.speedSelector}>
                  {speedOptions.map(speed => (
                    <TouchableOpacity
                      key={speed}
                      onPress={() => handleSpeedChange(speed)}
                      style={[
                        styles.speedButton,
                        playbackRate === speed && styles.speedButtonActive,
                      ]}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.speedButtonText,
                          playbackRate === speed &&
                            styles.speedButtonTextActive,
                        ]}>
                        {speed}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  video: {
    ...StyleSheet.absoluteFillObject,
  },

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  loadingIndicator: {
    position: 'absolute',

    top: '50%',
    left: '50%',

    width: 44,
    height: 44,

    marginLeft: -22,
    marginTop: -22,

    borderRadius: 22,

    backgroundColor: 'rgba(0,0,0,0.65)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  // ----------------------------------------------------------
  // Tap area
  // ----------------------------------------------------------

  tapArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },

  fullTapArea: {
    ...StyleSheet.absoluteFillObject,
  },

  // ----------------------------------------------------------
  // Top bar
  // ----------------------------------------------------------

  topBar: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,

    zIndex: 20,

    flexDirection: 'row',
    alignItems: 'center',

    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,

    backgroundColor: 'rgba(0,0,0,0.50)',
  },

  backButton: {
    width: 36,
    height: 36,

    borderRadius: 18,

    backgroundColor: 'rgba(255,255,255,0.18)',

    justifyContent: 'center',
    alignItems: 'center',

    marginRight: spacing.sm,
  },

  backText: {
    fontSize: 20,
    color: '#fff',
  },

  title: {
    ...typography.body,

    color: '#fff',

    flex: 1,

    fontSize: 14,

    marginRight: spacing.sm,
  },

  // ----------------------------------------------------------
  // Live badge
  // ----------------------------------------------------------

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 10,

    backgroundColor: 'rgba(220,38,38,0.85)',
  },

  liveDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    backgroundColor: '#fff',

    marginRight: 5,
  },

  liveBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // ----------------------------------------------------------
  // Center play
  // ----------------------------------------------------------

  centerPlayButton: {
    position: 'absolute',

    top: '50%',
    left: '50%',

    zIndex: 15,

    width: 54,
    height: 54,

    marginLeft: -27,
    marginTop: -27,

    borderRadius: 27,

    backgroundColor: 'rgba(0,0,0,0.55)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  centerPlayText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  // ----------------------------------------------------------
  // Bottom wrapper
  // ----------------------------------------------------------

  controlsWrapper: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    zIndex: 20,

    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,

    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // ----------------------------------------------------------
  // Progress
  // ----------------------------------------------------------

  progressContainer: {
    height: 22,

    flexDirection: 'row',
    alignItems: 'center',

    marginBottom: 5,
  },

  timeText: {
    color: '#fff',

    fontSize: 10,

    width: 38,

    textAlign: 'center',

    opacity: 0.9,
  },

  progressTrack: {
    flex: 1,

    height: 3,

    marginHorizontal: 5,

    borderRadius: 2,

    backgroundColor: 'rgba(255,255,255,0.28)',

    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',

    backgroundColor: colors.primary,
  },

  // ----------------------------------------------------------
  // Live progress
  // ----------------------------------------------------------

  liveProgressContainer: {
    height: 22,

    justifyContent: 'center',

    marginBottom: 5,
  },

  liveSmallBadge: {
    alignSelf: 'center',

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 8,
    paddingVertical: 3,

    borderRadius: 10,

    backgroundColor: 'rgba(220,38,38,0.75)',
  },

  liveSmallBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },

  // ----------------------------------------------------------
  // Compact controls
  // ----------------------------------------------------------

  compactControlsRow: {
    minHeight: 42,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 6,

    flexWrap: 'wrap',
  },

  compactButton: {
    minWidth: 40,
    height: 34,

    paddingHorizontal: 9,

    borderRadius: 17,

    backgroundColor: 'rgba(0,0,0,0.68)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  compactButtonText: {
    color: '#fff',

    fontSize: 12,

    fontWeight: '600',
  },

  compactPlayButton: {
    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: colors.primary,

    justifyContent: 'center',
    alignItems: 'center',
  },

  compactPlayText: {
    color: '#fff',

    fontSize: 17,

    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.3,
  },

  // ----------------------------------------------------------
  // Speed
  // ----------------------------------------------------------

  speedSelector: {
    flexDirection: 'row',

    alignItems: 'center',

    marginLeft: 3,

    gap: 3,
  },

  speedButton: {
    minWidth: 34,
    height: 30,

    paddingHorizontal: 5,

    borderRadius: 7,

    backgroundColor: 'rgba(255,255,255,0.12)',

    justifyContent: 'center',
    alignItems: 'center',
  },

  speedButtonActive: {
    backgroundColor: colors.primary,
  },

  speedButtonText: {
    color: '#ddd',

    fontSize: 9,

    fontWeight: '500',
  },

  speedButtonTextActive: {
    color: '#fff',

    fontWeight: '700',
  },

  // ----------------------------------------------------------
  // Error
  // ----------------------------------------------------------

  errorContainer: {
    position: 'absolute',

    top: '50%',
    left: spacing.md,
    right: spacing.md,

    zIndex: 50,

    transform: [
      {
        translateY: -50,
      },
    ],

    backgroundColor: 'rgba(0,0,0,0.85)',

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

    color: '#fff',

    fontWeight: '600',
  },
});

export default PlayerScreen;
