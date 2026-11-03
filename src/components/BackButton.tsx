import { Pressable, StyleSheet, Text } from 'react-native';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';

interface BackButtonProps {
  onPress?: () => void;
}

const BackButton = ({ onPress }: BackButtonProps) => {
  const navigation = useNavigation();

  return (
    <Pressable
      focusable={true}
      onPress={onPress ?? (() => navigation.goBack())}
      style={({ focused }) => ({
        borderWidth: focused ? 2 : 0,
        borderColor: colors.focusRing,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundCard,
      })}
    >
      <Text style={styles.backArrow}>←</Text>
      <Text style={styles.backLabel}>Back</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backArrow: {
    fontSize: 20,
    color: colors.text,
    marginRight: spacing.xs,
  },
  backLabel: {
    ...typography.button,
    color: colors.text,
  },
});

export default BackButton;
