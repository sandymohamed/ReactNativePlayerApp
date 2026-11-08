import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalProvider } from './src/context/GlobalContext';
import AppNavigator from './src/navigation/AppNavigator';

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
          <StatusBar hidden={true} />
          <AppNavigator />
        </GlobalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
