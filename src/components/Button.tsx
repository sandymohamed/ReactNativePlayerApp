import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
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
  style?: ViewStyle;
  textStyle?: TextStyle;
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
}) => {
  const getButtonContent = () => {
    if (variant === 'primary') {
      return (
        <LinearGradient
          colors={colors.gradients.primary}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[
            styles.gradient,
            sizeStyles[size],
            disabled && styles.disabled,
            style,
          ]}>
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.primaryText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      );
    }

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={[
          styles.button,
          variantStyles[variant],
          sizeStyles[size],
          disabled && styles.disabled,
          style,
        ]}>
        {loading ? (
          <ActivityIndicator
            color={variant === 'outline' ? colors.primary : colors.text}
          />
        ) : (
          <Text
            style={[
              styles.text,
              variantTextStyles[variant],
              sizeTextStyles[size],
              textStyle,
            ]}>
            {title}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}>
        {getButtonContent()}
      </TouchableOpacity>
    );
  }

  return getButtonContent();
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.button,
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

export default Button;
