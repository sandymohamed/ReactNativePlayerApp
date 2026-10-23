import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { spacing } from '../theme/spacing';
import FastImage from 'react-native-fast-image';

interface CardProps {
  title?: string;
  image?: string;
  onPress?: () => void;
  focused?: boolean;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  badge?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  image,
  onPress,
  focused = false,
  style,
  subtitle,
  badge,
}) => {
  const isLive = badge?.toUpperCase() === 'LIVE';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.container, style, focused && styles.focused]}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join(', ')}
      accessibilityState={{ selected: focused }}>
      <View style={styles.posterWrapper}>
        {image ? (
          <FastImage
            source={{
              uri: image,
              priority: FastImage.priority.normal,
            }}
            style={styles.poster}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderLetter}>
              {title?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
        )}

        <LinearGradient
          colors={[
            'transparent',
            'rgba(10, 10, 15, 0.25)',
            'rgba(10, 10, 15, 0.95)',
          ]}
          locations={[0, 0.45, 1]}
          style={styles.posterGradient}
          pointerEvents="none"
        />

        {badge ? (
          <View
            style={[
              styles.badge,
              isLive ? styles.liveBadge : styles.defaultBadge,
            ]}>
            {isLive && <View style={styles.liveDot} />}
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        {/* <View
          style={[
            styles.playButton,
            focused && styles.playButtonFocused,
          ]}
          pointerEvents="none">
          <Text style={styles.playIcon}>▶</Text>
        </View> */}

        {(title || subtitle) && (
          <View style={styles.posterInfo} pointerEvents="none">
            {title ? (
              <Text style={styles.posterTitle} numberOfLines={2}>
                {title}
              </Text>
            ) : null}

            {subtitle ? (
              <Text style={styles.posterSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#191923',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.md,
  },

  focused: {
    transform: [{ scale: 1.04 }],
    borderColor: '#7C6CF6',
    shadowColor: '#7C6CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  posterWrapper: {
    width: '100%',
    aspectRatio: 0.68,
    overflow: 'hidden',
    backgroundColor: '#191923',
  },

  poster: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#201C38',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderLetter: {
    color: '#A99CFF',
    fontSize: 44,
    fontWeight: '800',
  },

  posterGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    gap: 5,
  },

  liveBadge: {
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
  },

  defaultBadge: {
    backgroundColor: 'rgba(124, 108, 246, 0.95)',
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },

  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  playButton: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(124,108,246,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  playButtonFocused: {
    backgroundColor: 'rgba(124,108,246,1)',
    transform: [{ scale: 1.08 }],
  },

  playIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 3,
  },

  posterInfo: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 12,
  },

  posterTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },

  posterSubtitle: {
    color: '#C1C0D0',
    fontSize: 10,
    marginTop: 5,
  },
});

export default Card;
