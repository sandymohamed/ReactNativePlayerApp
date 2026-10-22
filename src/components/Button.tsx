
import React, {useState} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  onFocus?: () => void;
  onBlur?: () => void;
  focusable?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
  onFocus,
  onBlur,
  focusable = true,
}) => {
  const [focused, setFocused] = useState(false);

  const isDisabled = disabled || loading;

  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
  };

  const isPrimary = variant === 'primary';

  const indicatorColor =
    variant === 'outline' ? colors.primary : colors.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={isDisabled}
      // focusable={focusable && !isDisabled}
      activeOpacity={isPrimary ? 0.8 : 0.7}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : variantStyles[variant],
        sizeStyles[size],
        disabled && styles.disabled,
        style,
        focused && styles.focused,
      ]}>
      {isPrimary && (
        <LinearGradient
          colors={colors.gradients.primary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          pointerEvents="none"
          style={styles.gradientBackground}
        />
      )}

      {loading ? (
        <ActivityIndicator color={indicatorColor} />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary ? styles.primaryText : variantTextStyles[variant],
            sizeTextStyles[size],
            textStyle,
          ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.md,
  },
  focused: {
    borderWidth: 3,
    borderColor: colors.text,
    elevation: 8,
    transform: [{scale: 1.04}],
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
    zIndex: 1,
  },
  primaryText: {
    ...typography.button,
    color: colors.text,
    fontWeight: '700',
  },
});

const sizeStyles = StyleSheet.create({
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 56,
  },
});

const variantStyles = StyleSheet.create({
  secondary: {
    backgroundColor: colors.backgroundSecondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

const variantTextStyles = StyleSheet.create({
  secondary: {
    color: colors.text,
  },
  outline: {
    color: colors.primary,
  },
  ghost: {
    color: colors.text,
  },
});

const sizeTextStyles = StyleSheet.create({
  small: {
    ...typography.buttonSmall,
  },
  medium: {
    ...typography.button,
  },
  large: {
    ...typography.button,
    fontSize: 18,
  },
});

export default Button;
