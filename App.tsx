import React, { useEffect } from 'react';
import { StatusBar, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalProvider } from './src/context/GlobalContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';

const App: React.FC = () => {
  useEffect(() => {
    StatusBar.setHidden(true, 'none');

    return () => {
      StatusBar.setHidden(false, 'none');
    };
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GlobalProvider>
          {/* <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
            translucent={Platform.OS === 'android'}
          /> */}
          <StatusBar  hidden={true} />

          <AppNavigator />
        </GlobalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
