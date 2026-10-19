// import React from 'react';
// import {
//   View,
//   StyleSheet,
//   TouchableOpacity,
//   Image,
//   Text,
//   ViewStyle,
// } from 'react-native';
// import LinearGradient from 'react-native-linear-gradient';
// import { colors } from '../theme/colors';
// import { spacing, borderRadius } from '../theme/spacing';
// import { typography } from '../theme/typography';
// import FastImage from 'react-native-fast-image';

// interface CardProps {
//   title?: string;
//   image?: string;
//   onPress?: () => void;
//   focused?: boolean;
//   style?: ViewStyle;
//   subtitle?: string;
//   badge?: string;
// }

// const Card: React.FC<CardProps> = ({
//   title,
//   image,
//   onPress,
//   focused = false,
//   style,
//   subtitle,
//   badge,
// }) => {
//   return (
//     <TouchableOpacity
//       onPress={onPress}
//       activeOpacity={0.8}
//       style={[styles.container, style, focused && styles.focused]}>
//       <View style={styles.imageContainer}>
//         <LinearGradient
//           colors={[colors.primary, colors.secondary]}
//           start={{ x: 0, y: 0 }}
//           end={{ x: 1, y: 0 }}
//           style={styles.accentBar}
//         />
//         {image ? (
//           <FastImage
//             source={{ uri: image, priority: FastImage.priority.normal }}
//             style={styles.image}
//             // resizeMode={FastImage.resizeMode.cover}
//             resizeMode={FastImage.resizeMode.contain}
//           />
//         ) : (
//           <View style={styles.placeholder}>
//             <Text style={styles.placeholderText}>No Image</Text>
//           </View>
//         )}
//         {badge && (
//           <View style={styles.badge}>
//             <Text style={styles.badgeText}>{badge}</Text>
//           </View>
//         )}
//         {focused && (
//           <LinearGradient
//             colors={['transparent', colors.overlay]}
//             style={styles.overlay}
//           />
//         )}
//       </View>
//       {(title || subtitle) && (
//         <View style={styles.content}>
//           {title && (
//             <Text
//               style={[styles.title, focused && styles.titleFocused]}
//               numberOfLines={2}>
//               {title}
//             </Text>
//           )}
//           {subtitle && (
//             <Text style={styles.subtitle} numberOfLines={1}>
//               {subtitle}
//             </Text>
//           )}
//         </View>
//       )}
//       {focused && <View style={styles.focusRing} />}
//     </TouchableOpacity>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     borderRadius: borderRadius.xl,
//     overflow: 'hidden',
//     backgroundColor: colors.backgroundCard,
//     borderWidth: 1,
//     borderColor: colors.border,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.15,
//     shadowRadius: 8,
//     elevation: 4,
//   },
//   focused: {
//     transform: [{ scale: 1.04 }],
//     borderColor: colors.primary,
//     shadowColor: colors.primary,
//     shadowOpacity: 0.35,
//     shadowRadius: 12,
//     elevation: 8,
//   },
//   // imageContainer: {
//   //   width: '100%',
//   //   aspectRatio: 16 / 9,
//   //   position: 'relative',
//   // },

//   imageContainer: {
//     width: '100%',
//     aspectRatio: 16 / 9,
//     position: 'relative',
//     backgroundColor: '#000',
//   },
//   accentBar: {
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     height: 4,
//     zIndex: 1,
//     borderTopLeftRadius: borderRadius.xl,
//     borderTopRightRadius: borderRadius.xl,
//   },
//   image: {
//     width: '100%',
//     height: '100%',
//   },
//   placeholder: {
//     width: '100%',
//     height: '100%',
//     backgroundColor: colors.backgroundSecondary,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   placeholderText: {
//     color: colors.textTertiary,
//     ...typography.bodySmall,
//   },
//   badge: {
//     position: 'absolute',
//     top: spacing.sm,
//     right: spacing.sm,
//     backgroundColor: colors.primary,
//     paddingHorizontal: spacing.sm,
//     paddingVertical: spacing.xs,
//     borderRadius: borderRadius.sm,
//   },
//   badgeText: {
//     color: colors.text,
//     ...typography.labelSmall,
//     fontWeight: '700',
//   },
//   overlay: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     height: '40%',
//   },
//   content: {
//     padding: spacing.md,
//     height: 92, // Fixed height for the text section
//     justifyContent: 'flex-start',
//   },

//   title: {
//     color: colors.text,
//     ...typography.body,
//     fontSize: 17,
//     fontWeight: '600',
//     marginBottom: spacing.xs,
//     height: 44, // Space for exactly 2 lines
//   },

//   titleFocused: {
//     color: colors.primaryLight,
//   },

//   subtitle: {
//     color: colors.textSecondary,
//     ...typography.bodySmall,
//     height: 18,
//   },
//   // content: {
//   //   padding: spacing.lg,
//   // },
//   // title: {
//   //   color: colors.text,
//   //   ...typography.body,
//   //   fontSize: 17,
//   //   fontWeight: '600',
//   //   marginBottom: spacing.xs,
//   // },
//   // titleFocused: {
//   //   color: colors.primaryLight,
//   // },
//   // subtitle: {
//   //   color: colors.textSecondary,
//   //   ...typography.bodySmall,
//   // },
//   focusRing: {
//     position: 'absolute',
//     top: -3,
//     left: -3,
//     right: -3,
//     bottom: -3,
//     borderRadius: borderRadius.xl + 3,
//     borderWidth: 3,
//     borderColor: colors.primary,
//     shadowColor: colors.primary,
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.5,
//     shadowRadius: 10,
//     elevation: 12,
//   },
// });

// export default Card;




import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { spacing } from '../theme/spacing';
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
  const isLive = badge?.toUpperCase() === 'LIVE';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.container,
        style,
        focused && styles.focused,
      ]}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, badge]
        .filter(Boolean)
        .join(', ')}
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
