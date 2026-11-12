import React, { useEffect, useMemo, useState, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import Video from 'react-native-video';

import { Stream, Playlist } from '../models/model';
import { generateurlplayer, insertDatarecent } from '../utils/constants';

import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

import { useGlobalContext } from '../context/GlobalContext';
import { useTVEventHandler } from '../hooks/useTVEventHandler';

interface Props {
  channel: Stream | null;
  profile: Playlist;
  isFullscreen?: boolean;
  onFullscreenChange?: (value: boolean) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const LiveEmbeddedPlayer: React.FC<Props> = ({
  channel,
  profile,
  isFullscreen = false,
  onFullscreenChange,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const { access, listLiveRecent, changeListLiveRecent } = useGlobalContext();
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(false);
  const [focusedControl, setFocusedControl] = useState<string | null>(null);

  const videoUrl = useMemo(() => {
    if (!access?.hasAccess || !channel || !profile) {
      return null;
    }

    return generateurlplayer('live', channel.stream_id, 'm3u8', profile);
  }, [access?.hasAccess, channel, profile]);

  useEffect(() => {
    setPaused(false);
    setLoading(!!videoUrl);
    setBuffering(false);
    setError(false);
  }, [videoUrl]);

  const exitFullscreen = useCallback(() => {
    if (isFullscreen) {
      onFullscreenChange?.(false);
    }
  }, [isFullscreen, onFullscreenChange]);

  useTVEventHandler({
    onSelect: exitFullscreen,
    onPlayPause: exitFullscreen,
    onUp: exitFullscreen,
    onDown: exitFullscreen,
    onLeft: exitFullscreen,
    onRight: exitFullscreen,
    onBack: exitFullscreen,
    onMenu: exitFullscreen,
  });

  const retry = useCallback(() => {
    setError(false);
    setLoading(true);
    setPaused(false);
  }, []);

  const togglePlayback = useCallback(() => {
    setPaused(value => !value);
  }, []);

  const toggleFullscreen = useCallback(() => {
    onFullscreenChange?.(!isFullscreen);
  }, [isFullscreen, onFullscreenChange]);

  const renderControl = (
    id: string,
    label: string,
    onPress: () => void,
    active = false,
  ) => (
    <Pressable
      key={id}
      focusable
      // onFocus={() => setFocusedControl(id)}
      // onBlur={() => setFocusedControl(null)}
      onPress={onPress}
      style={[
        styles.controlButton,
        active && styles.favoriteActive,
        focusedControl === id && styles.controlButtonFocused,
      ]}>
      <Text
        style={[
          styles.controlText,
          active && styles.favoriteText,
          focusedControl === id && styles.controlTextFocused,
        ]}>
        {label}
      </Text>
    </Pressable>
  );

  if (!channel || !videoUrl) {
    return (
      <View style={styles.emptyPlayer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>▶</Text>
        </View>

        <Text style={styles.emptyTitle}>Live Preview</Text>

        <Text style={styles.emptyDescription}>
          {channel ? 'Playback access is required.' : 'Select a channel to start watching'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, isFullscreen && styles.containerFullscreen]}>
      <View style={styles.videoContainer}>
        <Video
          key={String(channel.stream_id)}
          source={{
            uri: videoUrl,
            ...(/\.m3u8(?:[?#]|$)/i.test(videoUrl) ? { type: 'm3u8' } : {}),
          }}
          style={styles.video}
          resizeMode="contain"
          paused={paused}
          playInBackground={false}
          playWhenInactive={false}
          onLoad={() => {
            if (profile.standalone) {
              const id = String(channel.stream_id);
              void insertDatarecent(id, 'live', profile);
              changeListLiveRecent([id, ...listLiveRecent.filter(item => item !== id)].slice(0, 50));
            }
            setLoading(false);
            setBuffering(false);
            setError(false);
          }}
          onBuffer={({ isBuffering }: { isBuffering: boolean }) => {
            setBuffering(isBuffering);
          }}
          onError={() => {

            setLoading(false);
            setBuffering(false);
            setError(true);
          }}
        />

        {(loading || buffering) && !error && (
          <View style={styles.videoOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />

            <Text style={styles.overlayText}>
              {buffering ? 'Buffering...' : 'Connecting...'}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.videoOverlay}>
            <Text style={styles.errorText}>Unable to play this channel</Text>

            {renderControl('retry-overlay', 'Retry', retry)}
          </View>
        )}
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.channelInfo}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>

          <Text style={styles.channelName} numberOfLines={1}>
            {channel.name}
          </Text>
        </View>

        <View style={styles.controls}>
          {renderControl('play', paused ? '▶ Play' : 'Ⅱ Pause', togglePlayback)}

          {renderControl('retry', '↻ Retry', retry)}

          {renderControl(
            'favorite',
            isFavorite ? '❤' : '🤍',
            onToggleFavorite || (() => {}),
            isFavorite,
          )}

          {renderControl(
            'fullscreen',
            isFullscreen ? '⛶ Exit' : '⛶ Fullscreen',
            toggleFullscreen,
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  containerFullscreen: {
    borderRadius: 0,
    borderWidth: 0,
  },
  videoContainer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overlayText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  bottomBar: {
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  channelInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    ...typography.labelSmall,
    color: '#EF4444',
    fontWeight: '700',
  },
  channelName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  controlButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundCard,
  },
  controlButtonFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundTertiary,
  },
  controlText: {
    ...typography.labelSmall,
    color: colors.text,
    fontWeight: '600',
  },
  controlTextFocused: {
    color: colors.primaryLight,
  },
  favoriteActive: {
    borderColor: '#EF4444',
  },
  favoriteText: {
    color: '#EF4444',
    fontSize: 18,
  },
  emptyPlayer: {
    flex: 1,
    minHeight: 170,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyIconText: {
    color: colors.primary,
    fontSize: 20,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  emptyDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default LiveEmbeddedPlayer;
