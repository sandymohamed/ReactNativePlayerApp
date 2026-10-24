import React, { useCallback } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import MainScreen from '../screens/MainScreen';
import MoviesScreen from '../screens/MoviesScreen';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import SeriesScreen from '../screens/SeriesScreen';
import SerieDetailScreen from '../screens/SerieDetailScreen';
import LiveScreen from '../screens/LiveScreen';
import PlayerScreen from '../screens/PlayerScreen';
import SearchScreen from '../screens/SearchScreen';
import FavoriteScreen from '../screens/FavoriteScreen';
import RecentScreen from '../screens/RecentScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CategoryScreen from '../screens/CategoryScreen';
import SeasonScreen from '../screens/SeasonScreen';
import { SerieInfo } from '../models/model';
import { useGlobalContext } from '../context/GlobalContext';

export type RootStackParamList = {
  Home: undefined;
  Main: undefined;
  Movies: { categoryId?: string };
  MovieDetail: { movie: any };
  Series: { categoryId?: string };
  SerieDetail: { serie: any };
  Live: { categoryId?: string; channelIndex?: number };
  Player: {
    url: string;
    title: string;
    type: 'live' | 'movie' | 'serie';
    streamId?: string;
    seriesId?: string;
  };
  Search: undefined;
  Favorite: undefined;
  Recent: undefined;
  Settings: undefined;
  Category: { type: 'live' | 'movie' | 'serie'; categoryId: string };
  Season: {
    serie: SerieInfo;
    season: { season_number: number; id: string };
    seriesId: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const HomeScreenWithBackBlock = () => {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => true,
      );

      return () => subscription.remove();
    }, []),
  );

  return <HomeScreen />;
};

const AppNavigator = () => {
  const { isAppReady, hasCachedData, profile } = useGlobalContext();

  // if (!isAppReady) {
  //   return (
  //     <View>
  //       {' '}
  //       <Text>SplashScreen</Text>
  //     </View>
  //   );
  // }

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={profile && hasCachedData ? 'main' : 'home'}
        initialRouteName={profile && hasCachedData ? 'Main' : 'Home'}
        // initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Home" component={HomeScreenWithBackBlock} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="Movies" component={MoviesScreen} />
        <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
        <Stack.Screen name="Series" component={SeriesScreen} />
        <Stack.Screen name="SerieDetail" component={SerieDetailScreen} />
        <Stack.Screen name="Live" component={LiveScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Favorite" component={FavoriteScreen} />
        <Stack.Screen name="Recent" component={RecentScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Season" component={SeasonScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
