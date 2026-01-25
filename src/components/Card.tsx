import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import FastImage from 'react-native-fast-image';

interface CardProps {
  title?: string;
  image?: string;
  onPress?: () => void;
  focused?: boolean;
  style?: ViewStyle;
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
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, style, focused && styles.focused]}>
      <View style={styles.imageContainer}>
        {image ? (
          <FastImage
            source={{uri: image, priority: FastImage.priority.normal}}
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {focused && (
          <LinearGradient
            colors={['transparent', colors.overlay]}
            style={styles.overlay}
          />
        )}
      </View>
      {(title || subtitle) && (
        <View style={styles.content}>
          {title && (
            <Text
              style={[styles.title, focused && styles.titleFocused]}
              numberOfLines={2}>
              {title}
            </Text>
          )}
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
      {focused && (
        <View style={styles.focusRing} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.backgroundCard,
  },
  focused: {
    transform: [{scale: 1.05}],
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textTertiary,
    ...typography.bodySmall,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    color: colors.text,
    ...typography.labelSmall,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  content: {
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  titleFocused: {
    color: colors.primaryLight,
  },
  subtitle: {
    color: colors.textSecondary,
    ...typography.bodySmall,
  },
  focusRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: borderRadius.lg + 2,
    borderWidth: 2,
    borderColor: colors.focus,
    shadowColor: colors.focus,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default Card;
