// PlayerScreen.tsx
import React from 'react';
import { Platform } from 'react-native';

import MobilePlayerScreen from './MobilePlayerScreen';
import TVPlayerScreen from './TVPlayerScreen';

export default function PlayerScreen(props: any) {
  const isTV = Platform.isTV;

  console.log('PlayerScreen: isTV =', isTV);
  return isTV
    ? <TVPlayerScreen {...props} />
    : <MobilePlayerScreen {...props} />;
}