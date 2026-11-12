import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import BackButton from '../../components/BackButton';
import { useGlobalContext } from '../../context/GlobalContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, spacing, borderRadius } from '../../theme';
import MobilePlayerScreen from './MobilePlayerScreen';
import TVPlayerScreen from './TVPlayerScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

export default function PlayerScreen(props: Props) {
  const { access } = useGlobalContext();

  if (access?.hasAccess) {
    return Platform.isTV ? <TVPlayerScreen /> : <MobilePlayerScreen />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <BackButton />
        <Pressable
          focusable
          accessibilityRole="button"
          onPress={() => props.navigation.navigate('DeviceInfo')}
          style={({ focused }) => [
            styles.button,
            focused && styles.buttonFocused,
          ]}>
          <Text style={styles.text}>Device Info</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Playback Access Required</Text>
      <Text style={styles.text}>
        Activate this device with your provider or use an active Google Play
        subscription to watch.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.backgroundCard,
  },
  buttonFocused: { borderColor: colors.focus },
  title: { color: colors.text, fontSize: 24, marginBottom: spacing.sm },
  text: { color: colors.text, fontSize: 16 },
});
