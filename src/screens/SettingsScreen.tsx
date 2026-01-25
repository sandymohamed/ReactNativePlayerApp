import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';
import {typography} from '../theme/typography';

const SettingsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.background}>
        <View style={styles.content}>
          <Text style={styles.title}>Settings</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
});

export default SettingsScreen;
