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
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
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
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentBar}
        />
        {image ? (
          <FastImage
            source={{ uri: image, priority: FastImage.priority.normal }}
            style={styles.image}
            // resizeMode={FastImage.resizeMode.cover}
            resizeMode={FastImage.resizeMode.contain}
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
      {focused && <View style={styles.focusRing} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.backgroundCard,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  focused: {
    transform: [{ scale: 1.04 }],
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  // imageContainer: {
  //   width: '100%',
  //   aspectRatio: 16 / 9,
  //   position: 'relative',
  // },

  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 1,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
    height: 92, // Fixed height for the text section
    justifyContent: 'flex-start',
  },

  title: {
    color: colors.text,
    ...typography.body,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.xs,
    height: 44, // Space for exactly 2 lines
  },

  titleFocused: {
    color: colors.primaryLight,
  },

  subtitle: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    height: 18,
  },
  // content: {
  //   padding: spacing.lg,
  // },
  // title: {
  //   color: colors.text,
  //   ...typography.body,
  //   fontSize: 17,
  //   fontWeight: '600',
  //   marginBottom: spacing.xs,
  // },
  // titleFocused: {
  //   color: colors.primaryLight,
  // },
  // subtitle: {
  //   color: colors.textSecondary,
  //   ...typography.bodySmall,
  // },
  focusRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: borderRadius.xl + 3,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
});

export default Card;
