import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalProvider } from './src/context/GlobalContext';
import AppNavigator from './src/navigation/AppNavigator';
import { AppAlertProvider } from './src/components/AppAlert';

const App: React.FC = () => {
  useEffect(() => {
    StatusBar.setHidden(true, 'none');

    return () => {
      StatusBar.setHidden(false, 'none');
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppAlertProvider>
        <SafeAreaProvider>
          <GlobalProvider>
            <StatusBar hidden={true} />
            <AppNavigator />
          </GlobalProvider>
        </SafeAreaProvider>
      </AppAlertProvider>
    </GestureHandlerRootView>
  );
};

export default App;
