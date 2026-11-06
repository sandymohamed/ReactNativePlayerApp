import React, { useEffect } from 'react';
import { StatusBar, Platform, BackHandler, useTVEventHandler, DeviceEventEmitter, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalProvider } from './src/context/GlobalContext';
import AppNavigator from './src/navigation/AppNavigator';

// TODO: clean this code
const App: React.FC = () => {
  useEffect(() => {
    StatusBar.setHidden(true, 'none');

    return () => {
      StatusBar.setHidden(false, 'none');
    };
  }, []);

// useEffect(() => {
//   console.log('[EVENT TEST] App mounted');

//   // 1. Android hardware Back
//   const backSubscription = BackHandler.addEventListener(
//     'hardwareBackPress',
//     () => {
//       console.log('[EVENT TEST] hardwareBackPress received');
//       return true;
//     },
//   );

//   // 2. App state changes
//   const appStateSubscription = AppState.addEventListener(
//     'change',
//     state => {
//       console.log('[EVENT TEST] AppState:', state);
//     },
//   );

//   // 3. Keyboard events (if supported by the TV fork)
//   const keyDownSubscription = DeviceEventEmitter.addListener(
//     'onKeyDown',
//     event => {
//       console.log('[EVENT TEST] onKeyDown:', event);
//     },
//   );

//   return () => {
//     backSubscription.remove();
//     appStateSubscription.remove();
//     keyDownSubscription.remove();
//   };
// }, []);



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GlobalProvider>
          {/* <StatusBar
            barStyle="light-content"
            backgroundColor={colors.background}
            translucent={Platform.OS === 'android'}
          /> */}
          <StatusBar hidden={true} />

          <AppNavigator />
        </GlobalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
