// src/screens/Main/MainScreen.tsx
import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ImageBackground,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';

import { useGlobalContext } from '../../context/GlobalContext';
import { colors } from '../../theme/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Logo from '../../components/Logo';

type MainScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;

type Destination = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  featured?: boolean;
  image?: string;
};

const MainScreen: React.FC = () => {
  const navigation = useNavigation<MainScreenNavigationProp>();
  const { width, height } = useWindowDimensions();

  const {
    profile, listLive, listVod, listSerie, catalogLoading: isLoading,
    catalogError: loadError, refreshCatalog,
  } = useGlobalContext();
  const counts = { live: listLive.length, movies: listVod.length, series: listSerie.length };
  const cardLoading = { live: isLoading, movies: isLoading, series: isLoading };

  const nav = navigation as any;

  const destinations: Destination[] = [
    {
      id: 'live',
      title: 'Live TV',
      subtitle: 'Watch live channels',
      icon: '▶',
      route: 'Live',
      featured: true,
      image: 'https://via.placeholder.com/600x900/252044/FFFFFF?text=LIVE+TV',
    },
    {
      id: 'movies',
      title: 'Movies',
      subtitle: 'Explore movies',
      icon: '🎬',
      route: 'Movies',
      featured: true,
      image: 'https://via.placeholder.com/600x900/402039/FFFFFF?text=MOVIES',
    },
    {
      id: 'series',
      title: 'Series',
      subtitle: 'Your favorite shows',
      icon: '▣',
      route: 'Series',
      featured: true,
      image: 'https://via.placeholder.com/600x900/183A37/FFFFFF?text=SERIES',
    },
    {
      id: 'search',
      title: 'Search',
      subtitle: 'Find something to watch',
      icon: '⌕',
      route: 'Search',
    },
    {
      id: 'favorite',
      title: 'Favorites',
      subtitle: 'Your saved content',
      icon: '♥',
      route: 'Favorite',
    },
    {
      id: 'recent',
      title: 'Recent',
      subtitle: 'Continue watching',
      icon: '◷',
      route: 'Recent',
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Preferences and playback',
      icon: '⚙',
      route: 'Settings',
    },
  ];

  const handleCardPress = useCallback(
    (index: number) => {
      // Keep navigation available while catalog requests are running.
      const destination = destinations[index];

      if (!destination) {
        return;
      }

      if (!profile && destination.route !== 'Settings') {
        navigation.navigate('PlaylistManager');
        return;
      }

      nav.navigate(destination.route);
    },
    [nav, navigation, profile],
  );

  const handleRefresh = () => {
    if (!isLoading) void refreshCatalog();
  };

  const handleManagePlaylists = useCallback(() => {
    navigation.navigate('PlaylistManager');
  }, [navigation]);

  const handleOpenDeviceInfo = useCallback(() => {
    navigation.navigate('DeviceInfo');
  }, [navigation]);

  const profileLabel = (() => {
    const p = profile as any;

    return p?.profile_name ?? p?.name ?? p?.username;
  })();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Logo size={width > 800 ? 100 : 50} />

          <Text style={styles.headerSubtitle}>
            Choose what you want to watch
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.profileContainer}>
            <Pressable
              focusable
              onPress={handleManagePlaylists}
              style={({ focused }) => [
                styles.profileButton,
                focused && styles.focusedButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Manage Playlists">
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profileLabel?.charAt(0).toUpperCase() || '☰'}
                </Text>
              </View>

              <View style={styles.profileTextContainer}>
                <Text style={styles.profileName}>Manage Playlists</Text>
                {profileLabel ? (
                  <Text style={styles.profileHint} numberOfLines={1}>
                    {profileLabel}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </View>

          <Pressable
            focusable
            onPress={handleOpenDeviceInfo}
            style={({ focused }) => [
              styles.deviceInfoButton,
              focused && styles.focusedButton,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Device information">
            <Text style={styles.deviceInfoIcon}>ⓘ</Text>
            <Text style={styles.deviceInfoText}>Device Info</Text>
          </Pressable>

          {profile && (
            <Pressable
              focusable
              disabled={isLoading}
              onPress={handleRefresh}
              style={({ focused }) => [
                styles.refreshButton,
                isLoading && styles.refreshButtonDisabled,
                focused && styles.focusedButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Refresh content">
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.refreshIcon}>↻</Text>
              )}

              <Text style={styles.refreshText}>
                {isLoading ? 'Refreshing' : 'Refresh'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {profile && loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not refresh the catalog. Available cached content is still shown.
          </Text>
        </View>
      )}

      <View style={styles.screenContent}>
        <View
          style={[
            styles.featuredGrid,
            { height: Math.min(height * 0.58, 560) },
          ]}>
          {destinations.slice(0, 3).map((destination, index) => {
            const type =
              index === 0 ? 'live' : index === 1 ? 'movies' : 'series';

            const count =
              type === 'live'
                ? counts.live
                : type === 'movies'
                  ? counts.movies
                  : counts.series;

            const countLabel = !profile
              ? 'Add or select a playlist'
              : cardLoading[type]
                ? 'Loading…'
                : `${count.toLocaleString()} ${
                  type === 'live'
                    ? 'channels'
                    : type === 'movies'
                      ? 'movies'
                      : 'series'
                }`;

            return (
              <View key={destination.id} style={styles.featuredItem}>
                <MainScreenCard
                  title={destination.title}
                  countLabel={countLabel}
                  image={destination.image ?? ''}
                  isCountLoading={cardLoading[type]}
                  onPress={() => handleCardPress(index)}
                />
              </View>
            );
          })}
        </View>

        <View style={styles.quickGrid}>
          {destinations.slice(3).map((destination, offset) => {
            const index = offset + 3;

            return (
              <Pressable
                focusable
                key={destination.id}
                onPress={() => handleCardPress(index)}
                style={({ focused }) => [
                  styles.quickTile,
                  focused && styles.quickTileFocused,
                ]}
                accessibilityRole="button"
                accessibilityLabel={destination.title}>
                <Text style={styles.quickIcon}>{destination.icon}</Text>
                <Text style={styles.quickTitle} numberOfLines={1}>
                  {destination.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    minHeight: 60,
    paddingHorizontal: 24,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    zIndex: 10,
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#B9ADFF',
    fontSize: 12,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileContainer: {
    position: 'relative',
  },
  profileButton: {
    minHeight: 48,
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  focusedButton: {
    borderColor: '#8B7CFF',
    backgroundColor: 'rgba(124,108,246,0.25)',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#7C6CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  profileTextContainer: {
    flexShrink: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  profileHint: {
    color: '#B9ADFF',
    fontSize: 10,
    marginTop: 2,
  },
  deviceInfoButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  deviceInfoIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  deviceInfoText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  refreshButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  refreshButtonDisabled: {
    opacity: 0.65,
  },
  refreshIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  screenContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  featuredGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 14,
  },
  featuredItem: {
    flex: 1,
    minWidth: 0,
  },
  mainCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#191923',
  },
  mainCardFocused: {
    borderColor: '#8B7CFF',
    transform: [{ scale: 1.025 }],
  },
  mainCardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mainCardGradient: {
    minHeight: 120,
    justifyContent: 'flex-end',
    padding: 14,
  },
  mainCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  mainCardCount: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(10,10,18,0.78)',
  },
  mainCardCountText: {
    color: '#E1DCFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  quickTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  quickTileFocused: {
    borderColor: '#8B7CFF',
    backgroundColor: 'rgba(124,108,246,0.22)',
    transform: [{ scale: 1.03 }],
  },
  quickIcon: {
    color: '#B9ADFF',
    fontSize: 20,
    fontWeight: '800',
  },
  quickTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 12,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    backgroundColor: '#29191D',
    zIndex: 40,
  },
  errorText: {
    flex: 1,
    color: '#FCA5A5',
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#7C6CF6',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

type MainScreenCardProps = {
  title: string;
  countLabel: string;
  image: string;
  isCountLoading: boolean;
  onPress: () => void;
};

const MainScreenCard: React.FC<MainScreenCardProps> = ({
  title,
  countLabel,
  image,
  isCountLoading,
  onPress,
}) => (
  <Pressable
    focusable
    style={({ focused }) => [
      styles.mainCard,
      focused && styles.mainCardFocused,
    ]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`${title}, ${countLabel}`}>
    <ImageBackground
      source={{ uri: image }}
      resizeMode="cover"
      style={styles.mainCardImage}
      imageStyle={{ borderRadius: 16 }}>
      <LinearGradient
        colors={['transparent', 'rgba(5,5,12,0.58)', 'rgba(5,5,12,0.97)']}
        locations={[0, 0.48, 1]}
        style={styles.mainCardGradient}>
        <Text style={styles.mainCardTitle} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.mainCardCount}>
          {isCountLoading && <ActivityIndicator size="small" color="#E1DCFF" />}

          <Text style={styles.mainCardCountText} numberOfLines={1}>
            {countLabel}
          </Text>
        </View>
      </LinearGradient>
    </ImageBackground>
  </Pressable>
);

export default MainScreen;
