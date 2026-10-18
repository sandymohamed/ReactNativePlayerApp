import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import { Season, SerieInfo } from '../models/model';

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

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="Home" component={HomeScreen} />
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
