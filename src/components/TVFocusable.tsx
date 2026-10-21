import React, { useState } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Text
} from 'react-native';

type TVFocusableProps = TouchableOpacityProps & {
  focusedStyle?: StyleProp<ViewStyle>;
};

export default function TVFocusable({
  style,
  focusedStyle,
  onFocus,
  onBlur,
  ...props
}: TVFocusableProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TouchableOpacity
      {...props}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      style={[
        styles.base,
        style,
        isFocused && styles.focused,
        isFocused && focusedStyle,
      ]}
    />
        
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: '#f61722',
    transform: [{ scale: 1.03 }],
    zIndex: 10,
    elevation: 8,
  },
});