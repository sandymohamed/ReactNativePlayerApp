/**
 * IPTV Player - React Native App
 * Modern IPTV player for TV and mobile devices
 */

import React from 'react';
import {StatusBar, Platform} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GlobalProvider} from './src/context/GlobalContext';
import AppNavigator from './src/navigation/AppNavigator';
import {colors} from './src/theme/colors';

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <GlobalProvider>
          <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
            translucent={Platform.OS === 'android'}
          />
          <AppNavigator />
        </GlobalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
