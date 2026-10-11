import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';

type IconId = 'language' | 'parental' | 'stream' | 'time' | 'list';

const ICONS: Record<IconId, string> = {
  language: '🌐',
  parental: '🔒',
  stream: '📡',
  time: '🕐',
  list: '📋',
};

interface SettingIconProps {
  id: IconId;
  size?: number;
  style?: ViewStyle;
}

const SettingIcon: React.FC<SettingIconProps> = ({id, size = 36, style}) => {
  const emoji = ICONS[id] ?? '⚙️';
  return (
    <View style={[styles.wrap, {width: size, height: size, borderRadius: size / 2}, style]}>
      <Text style={[styles.emoji, {fontSize: size * 0.55}]}>{emoji}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {},
});

export default SettingIcon;
