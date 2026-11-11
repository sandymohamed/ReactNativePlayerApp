import React, { useCallback } from 'react';
import { BackHandler, View } from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import MainScreen from '../screens/Main/MainScreen';
import MoviesScreen from '../screens/Movies/MoviesScreen';
import MovieDetailScreen from '../screens/Movies/MovieDetailScreen';
import SeriesScreen from '../screens/Series/SeriesScreen';
import SerieDetailScreen from '../screens/Series/SerieDetailScreen';
import LiveScreen from '../screens/Live/LiveScreen';
import PlayerScreen from '../screens/Player/PlayerScreen';

import SeasonScreen from '../screens/Series/SeasonScreen';
import { SerieInfo, StandalonePlaylist } from '../models/model';
import { useGlobalContext } from '../context/GlobalContext';
import { Text } from 'react-native-svg';
import SearchScreen from '../screens/Search/SearchScreen';
import FavoriteScreen from '../screens/Favorites/FavoriteScreen';
import RecentScreen from '../screens/Recent/RecentScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import PlaylistManagerScreen from '../screens/Playlists/PlaylistManagerScreen';
import AddPlaylistScreen from '../screens/Playlists/AddPlaylistScreen';
import EditPlaylistScreen from '../screens/Playlists/EditPlaylistScreen';
import DeviceInfoScreen from '../screens/DeviceInfo/DeviceInfoScreen';


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
  DeviceInfo: undefined;
  Season: {
    serie: SerieInfo;
    season: { season_number: number; id: string };
    seriesId: string;
  };

  PlaylistManager: undefined;
  AddPlaylist: undefined;
  EditPlaylist: { playlist: StandalonePlaylist };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// const HomeScreenWithBackBlock = () => {
//   useFocusEffect(
//     useCallback(() => {
//       const subscription = BackHandler.addEventListener(
//         'hardwareBackPress',
//         () => true,
//       );

//       console.log( 'hardwareBackPress')
//       return () => subscription.remove();
//     }, []),
//   );

//   return <HomeScreen />;
// };

const HomeScreenWithBackBlock = () => {
  useFocusEffect(
    useCallback(() => {
      console.log('[BACK TEST] Home screen focused');

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          console.log('[BACK TEST] Back event received on Home');
          return true;
        },
      );

      return () => {
        console.log('[BACK TEST] Home screen blurred');
        subscription.remove();
      };
    }, []),
  );

  return <HomeScreen />;
};

const MainScreenWithBackBlock = () => {
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          console.log('Back pressed on Main - blocked');
          return true;
        },
      );

      return () => subscription.remove();
    }, []),
  );

  return <MainScreen />;
};

const AppNavigator = () => {
  const { isAppReady, hasCachedData, profile } = useGlobalContext();

  if (!isAppReady) {
    return (
      <View>
        <Text>SplashScreen</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={profile && hasCachedData ? 'Main' : 'home'}
        initialRouteName={profile && hasCachedData ? 'Main' : 'Home'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Home" component={HomeScreenWithBackBlock} />
        <Stack.Screen name="Main" component={MainScreenWithBackBlock} />
        <Stack.Screen
          name="DeviceInfo"
          component={DeviceInfoScreen}
        />
        <Stack.Screen
          name="PlaylistManager"
          component={PlaylistManagerScreen}
        />
        <Stack.Screen
          name="AddPlaylist"
          component={AddPlaylistScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
  name="EditPlaylist"
  component={EditPlaylistScreen}
  options={{ headerShown: false }}
/>
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
        <Stack.Screen name="Season" component={SeasonScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
