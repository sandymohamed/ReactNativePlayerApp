import React, { memo, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ViewStyle,
  StyleProp,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import { SvgUri } from 'react-native-svg';
import { spacing } from '../theme/spacing';
import { colors } from '../theme';

interface CardProps {
  title?: string;
  image?: string;
  onPress?: () => void;
  onFocus?: () => void;
  focused?: boolean;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  badge?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  image,
  onPress,
  onFocus,
  focused = false,
  style: cardStyle,
  subtitle,
  badge,
}) => {
  const [nativeFocused, setNativeFocused] = useState(false);

  const isFocused = focused || nativeFocused;
  const isLive = badge?.toUpperCase() === 'LIVE';

  const handleFocus = useCallback(() => {
    setNativeFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setNativeFocused(false);
  }, []);

  return (
    <Pressable
      focusable
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPress={onPress}
      style={({ focused }) => ({
        borderRadius: 15,
        overflow: 'hidden',
        backgroundColor: colors.backgroundCard,
        marginBottom: spacing.md,
        transform: focused ? [{ scale: 1.04 }] : [{ scale: 1.0 }],
        borderColor: focused ? colors.focus : 'rgba(255,255,255,0.08)',
        borderWidth: focused ? 2 : 1,
        ...StyleSheet.flatten(cardStyle),
      })}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, badge].filter(Boolean).join(', ')}
      accessibilityState={{ selected: isFocused }}>
      <View style={styles.posterWrapper}>
        {image ? (
          image.toLowerCase().split('?')[0].endsWith('.svg') ? (
            <SvgUri uri={image} width="100%" height="100%" />
          ) : (
            <FastImage
              source={{
                uri: image,
                priority: FastImage.priority.normal,
              }}
              style={styles.poster}
              resizeMode={FastImage.resizeMode.cover}
            />
          )
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
            ]}
            pointerEvents="none">
            {isLive && <View style={styles.liveDot} />}
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

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
    </Pressable>
  );
};

const styles = StyleSheet.create({
  posterWrapper: {
    width: '100%',
    aspectRatio: 0.68,
    overflow: 'hidden',
    backgroundColor: '#191923',
  },

  poster: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 15,
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

export default memo(Card);
