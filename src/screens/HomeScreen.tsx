import React, { useState, useEffect, useCallback, useRef } from 'react';

import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
  Pressable,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';

import { useGlobalContext } from '../context/GlobalContext';
import { LoginModel, Playlist } from '../models/model';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTVEventHandler } from '../hooks/useTVEventHandler';
import { useLandscapeLayout } from '../utils/layout';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

type DeviceInfoShow = '-2' | '-1' | '0' | '1' | 'error';

type IdentifierType = 'mac' | 'uniqueId';

type StoredDeviceIdentity = {
  identifier: string;
  identifierType: IdentifierType;
  version: string;
  type: number;
};

type CachedLogin = {
  data: LoginModel;
  cachedAt: number;
};

const PROFILE_GAP = spacing.lg;

const TEST_MODE = true;

// Keep "mac" unless the distributor confirms uniqueId support.
const DEVICE_IDENTIFIER_MODE: IdentifierType = 'mac';

// const DEF_MAC = '52:53:62:52:36';
const DEF_MAC = 'b8:b4:09:45:24:f6';
const DEF_VERSION = '1.0.2';
const DEF_TYPE = 1;

// const LOGIN_URL = 'https://api.uiplayer.com/api/apps/devices/login';
// const LOGIN_URL = 'http://192.168.1.19:5000/api/apps/devices/login';

const DEVICE_IDENTITY_KEY = '@iptv/device_identity_v1';
const LOGIN_CACHE_PREFIX = '@iptv/device_login_v1:';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { width, height } = useWindowDimensions();
  const layout = useLandscapeLayout();

  const PROFILE_SIZE = layout.isTV ? height / 2 - 100 : height / 2 - 50;

  const { deviceInfo, changeDeviceInfo, changeProfile } = useGlobalContext();

  const [deviceInfoShow, setDeviceInfoShow] = useState<DeviceInfoShow>('-2');

  const [deviceInfoShowForce, setDeviceInfoShowForce] = useState(false);

  const [isTrial, setIsTrial] = useState(false);
  const [expiredAt, setExpiredAt] = useState('');
  const [profileList, setProfileList] = useState<Playlist[]>([]);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState<
    number | null
  >(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const profileListRef = useRef<FlatList>(null);

  const wide = width >= 800;

  const identifierLabel: string =
    // @ts-expect-error
    DEVICE_IDENTIFIER_MODE === 'uniqueId' && !TEST_MODE
      ? 'Device ID'
      : 'MAC Address';

  const getPassword = useCallback((value: string): string => {
    let output = '';
    const cleaned = value.replace(/:/gi, '');

    for (let i = 0; i < cleaned.length; i++) {
      output += cleaned.charCodeAt(i).toString();
    }

    return output.substring(0, 6);
  }, []);

  const parseExpiry = useCallback((value?: string | null): number => {
    if (!value) {
      return 0;
    }

    // Supports timestamps such as "2050-09-13 03:09:00".
    // No timezone is added because the API's timezone contract
    // has not been established.
    const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;

    const timestamp = new Date(normalized).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
  }, []);

  const getLoginCacheKey = useCallback(
    (identifierType: IdentifierType, identifier: string) =>
      `${LOGIN_CACHE_PREFIX}${identifierType}:${identifier}`,
    [],
  );

  const getDeviceCredentials =
    useCallback(async (): Promise<StoredDeviceIdentity> => {
      if (TEST_MODE) {
        return {
          identifier: DEF_MAC,
          identifierType: 'mac',
          version: DEF_VERSION,
          type: DEF_TYPE,
        };
      }

      const storedRaw = await AsyncStorage.getItem(DEVICE_IDENTITY_KEY);

      if (storedRaw) {
        const stored = JSON.parse(storedRaw) as StoredDeviceIdentity;

        if (
          !stored.identifier ||
          !stored.version ||
          (stored.identifierType !== 'mac' &&
            stored.identifierType !== 'uniqueId')
        ) {
          throw new Error(
            'Saved device identity is invalid. Please contact support.',
          );
        }

        // Do not silently change the device identity mode.
        if (stored.identifierType !== DEVICE_IDENTIFIER_MODE) {
          throw new Error(
            'The configured device identifier differs from the saved identifier. Device identity was not changed.',
          );
        }

        return stored;
      }

      let identifier: string;

      if (DEVICE_IDENTIFIER_MODE === 'mac') {
        identifier = await DeviceInfo.getMacAddress();

        const normalizedMac = identifier.trim().toLowerCase();

        if (
          !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(normalizedMac) ||
          normalizedMac === '02:00:00:00:00:00' ||
          normalizedMac === '00:00:00:00:00:00' ||
          normalizedMac === 'ff:ff:ff:ff:ff:ff'
        ) {
          throw new Error(
            'Android did not provide a usable MAC address. Login was not sent to avoid registering the wrong device.',
          );
        }

        identifier = normalizedMac;
      } else {
        identifier = (await DeviceInfo.getUniqueId()).trim();

        if (!identifier) {
          throw new Error('Android did not provide a usable device ID.');
        }
      }

      const identity: StoredDeviceIdentity = {
        identifier,
        identifierType: DEVICE_IDENTIFIER_MODE,
        version: `'${DeviceInfo.getVersion()}'`,
        type: DEF_TYPE,
      };

      // Save once; never silently replace a previously saved identity.
      await AsyncStorage.setItem(DEVICE_IDENTITY_KEY, JSON.stringify(identity));
      return identity;
    }, []);

  const applyLoginData = useCallback(
    (data: LoginModel) => {
      console.log('from applyLoginData', data);
      setError('');
      setIsTrial(!!data.is_terial);

      const expiryTimestamp = parseExpiry(data.ExipiredAt);
      const daysRemaining = expiryTimestamp
        ? Math.floor((expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      setExpiredAt(daysRemaining > 0 ? `Expired in ${daysRemaining} days` : '');

      if (data.status === -1) {
        console.log('from applyLoginData data.status === -1', data.status);
        setDeviceInfoShow('-1');
        setProfileList([]);
        setDeviceInfoShowForce(false);
        return;
      }

      if (data.status === 0) {
        console.log('from applyLoginData data.status === 0');
        setDeviceInfoShow('0');
        setProfileList([]);
        setDeviceInfoShowForce(false);
        return;
      }

      setDeviceInfoShow('1');

      if (data.playlist && data.playlist.length > 0) {
        console.log(
          'from applyLoginData data.playlist && data.playlist.length > 0',
        );

        setProfileList(data.playlist);
        // TODO: Change me to real playlist
        // setProfileList();
        setDeviceInfoShowForce(false);
      } else {
        console.log(
          'from applyLoginData NOT data.playlist && data.playlist.length > 0',
        );
        setProfileList([]);
        setDeviceInfoShowForce(true);
      }
    },
    [parseExpiry],
  );

  const readValidLoginCache = useCallback(
    async (
      identifierType: IdentifierType,
      identifier: string,
    ): Promise<LoginModel | null> => {
      console.log('readValidLoginCache');
      const cacheKey = getLoginCacheKey(identifierType, identifier);

      try {
        const raw = await AsyncStorage.getItem(cacheKey);

        if (!raw) {
          console.log('readValidLoginCache NOT raw:');
          return null;
        }

        const cached = JSON.parse(raw) as CachedLogin;
        const data = cached?.data;

        if (!data || typeof data.status !== 'number') {
          await AsyncStorage.removeItem(cacheKey);
          return null;
        }

        const expiryTimestamp = parseExpiry(data.ExipiredAt);

        // Expired, malformed, or non-expiring login responses
        // must not be used to bypass a fresh login.
        if (
          data.status === -1 ||
          !expiryTimestamp ||
          expiryTimestamp <= Date.now()
        ) {
          await AsyncStorage.removeItem(cacheKey);
          return null;
        }

        return data;
      } catch (cacheError) {
        console.warn('Could not read login cache:', cacheError);
        return null;
      }
    },
    [getLoginCacheKey, parseExpiry],
  );

  const saveLoginCache = useCallback(
    async (
      identifierType: IdentifierType,
      identifier: string,
      data: LoginModel,
    ) => {
      console.log(' saveLoginCache:', data);
      const expiryTimestamp = parseExpiry(data.ExipiredAt);

      // Never cache an expired response or a response without
      // a valid future expiry.
      if (
        data.status === -1 ||
        !expiryTimestamp ||
        expiryTimestamp <= Date.now()
      ) {
        console.log(' data.status === -1', expiryTimestamp);
        return;
      }

      const cacheKey = getLoginCacheKey(identifierType, identifier);

      const cache: CachedLogin = {
        data,
        cachedAt: Date.now(),
      };
      console.log('cacheKey', cacheKey);

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cache));
    },
    [getLoginCacheKey, parseExpiry],
  );

  const callService = useCallback(
    async (
      identifier: string,
      version: string,
      type: number,
      identifierType: IdentifierType,
      forceRefresh = false,
    ) => {
      console.log('from callService');
      setError('');

      if (!forceRefresh) {
        console.log('!forceRefresh');
        const cachedData = await readValidLoginCache(
          identifierType,
          identifier,
        );

        if (cachedData) {
          console.log('cachedData', cachedData);
          applyLoginData(cachedData);
          return;
        }
      }

      setLoading(true);
      setDeviceInfoShow('-2');

      try {
        // const response = await fetch(LOGIN_URL, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     mac: identifier,
        //     password: getPassword(identifier),
        //     type: String(type),
        //     version,
        //   }),
        // });

        // console.log('ressss', response);
        // if (!response.ok) {
        //   throw new Error(`Login request failed with HTTP ${response.status}.`);
        // }

        // const data: LoginModel = await response.json();
        // console.log('data:', data);
        // if (typeof data.status !== 'number') {
        //   throw new Error('The login API returned an unexpected response.');
        // }

        // data.playlist?.map(i => (i.allowed_output_formats = ['m3u']));
        // console.log(
        //   'Login response received for device identifier type:',
        //   identifierType,
        //   data,
        // );

        // if (data.status === -1) {
        //   const cacheKey = getLoginCacheKey(identifierType, identifier);

        //   await AsyncStorage.removeItem(cacheKey);
        //   applyLoginData(data);
        //   return;
        // }

        const data: LoginModel = {
          id: 1,
          mac: 'b8:b4:09:45:24:f6',
          password: '',
          startPackage: '',
          ExipiredAt: '25-05-2030',
          status: 1,
          type: 3,
          city: {
            city: '',
            lat: '',
            lng: '',
            iso2: '',
          },
          country: '',
          created_at: '',
          updated_at: '',
          version: '1.0.2',
          is_terial: false,
          playlist: [
            {
              id: 1,
              profile_name: 'demo',
              xml_epg: '',
              username: 'demo',
              password: 'demo',
              host: 'https://spannable.com/mock/xtream',
              pin: '',
              isXS: 1,
              created_at: '',
              updated_at: '',
              allowed_output_formats: ['m3u'],
            },
            {
              id: 2,
              profile_name: 'demo2',
              xml_epg: '',
              username: 'demo',
              password: 'demo',
              host: 'https://spannable.com/mock/xtream',
              pin: '',
              isXS: 1,
              created_at: '',
              updated_at: '',
              allowed_output_formats: ['m3u'],
            },
          ],
        };

        setLoading(false);
        setDeviceInfoShow('1');
        setDeviceInfoShowForce(false);

        await saveLoginCache(identifierType, identifier, data);

        applyLoginData(data);
      } catch (err: unknown) {
        console.error('Error in callService:', err);

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to connect to the login service.',
        );

        setDeviceInfoShow('error');
        setProfileList([]);
      } finally {
        setLoading(false);
      }
    },
    [
      applyLoginData,
      getLoginCacheKey,
      getPassword,
      readValidLoginCache,
      saveLoginCache,
    ],
  );

  const initializeDevice = useCallback(async () => {
    try {
      console.log('from initializeDevice');
      setLoading(true);
      setError('');
      setDeviceInfoShow('-2');

      const identity = await getDeviceCredentials();

      console.log('identity:', identity);
      changeDeviceInfo({
        mac: identity.identifier,
        version: identity.version,
        type: identity.type,
      });

      await callService(
        identity.identifier,
        identity.version,
        identity.type,
        identity.identifierType,
      );
    } catch (err: unknown) {
      console.error('initializeDevice failed:', err);

      setError(
        err instanceof Error ? err.message : 'Unable to identify this device.',
      );

      setDeviceInfoShow('error');
      setProfileList([]);
    } finally {
      setLoading(false);
    }
  }, [callService, changeDeviceInfo, getDeviceCredentials]);

  useEffect(() => {
    console.log('will initialize');
    void initializeDevice();
  }, []);

  const handleRefresh = useCallback(async () => {
    setProfileList([]);
    setDeviceInfoShowForce(false);
    setError('');
    setDeviceInfoShow('-2');

    try {
      const identity = await getDeviceCredentials();

      changeDeviceInfo({
        mac: identity.identifier,
        version: identity.version,
        type: identity.type,
      });

      // Force a fresh request; do not use the login-response cache.
      await callService(
        identity.identifier,
        identity.version,
        identity.type,
        identity.identifierType,
        true,
      );
    } catch (err: unknown) {
      console.error('Refresh failed:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to refresh device information.',
      );

      setDeviceInfoShow('error');
    }
  }, [callService, changeDeviceInfo, getDeviceCredentials]);

  const handleDeviceInfoToggle = useCallback(() => {
    setDeviceInfoShowForce(value => !value);
  }, []);

  const handleProfileChange = useCallback(
    (profile: Playlist) => {
      changeProfile(profile);
      navigation.replace('Main');
    },
    [navigation],
  );

  const showDeviceInfoCard =
    deviceInfoShow === '-1' ||
    deviceInfoShow === '0' ||
    (deviceInfoShow === '1' && deviceInfoShowForce);

  const showProfilePicker =
    deviceInfoShow === '1' && !deviceInfoShowForce && profileList.length > 0;

  useTVEventHandler({
    onBack: () => {
      if (showDeviceInfoCard && deviceInfoShowForce && profileList.length > 0) {
        setDeviceInfoShowForce(false);
      }

      return;
    },
  });

  useEffect(() => {
    if (
      selectedProfileIndex !== null &&
      showProfilePicker &&
      profileList.length > 0 &&
      selectedProfileIndex >= 0
    ) {
      profileListRef.current?.scrollToIndex({
        index: selectedProfileIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [selectedProfileIndex, showProfilePicker, profileList.length]);

  const renderProfileItem = ({
    item,
    index,
  }: {
    item: Playlist;
    index: number;
  }) => {
    const logoSize = layout.isTV ? PROFILE_SIZE - 80 : PROFILE_SIZE - 40;

    const profileNameStyle =
      PROFILE_SIZE > 120
        ? { ...typography.h1, marginTop: spacing.lg }
        : { ...typography.bodyLarge, marginTop: spacing.sm };

    return (
      <Pressable
        focusable
        hasTVPreferredFocus={index === 0}
        onPress={() => handleProfileChange(item)}
        style={({ focused }) => ({
          ...styles.profileItem,
          width: PROFILE_SIZE,
          height: PROFILE_SIZE,

          padding: focused ? 4 : 0,
          borderWidth: focused ? 4 : 0,
          borderColor: focused ? colors.focus : 'transparent',
          borderRadius: PROFILE_SIZE / 2,
          backgroundColor: focused ? colors.backgroundCard : 'transparent',
        })}>
        <View
          style={[
            styles.profileCircle,
            {
              width: PROFILE_SIZE - 15,
              height: PROFILE_SIZE - 15,
              borderRadius: PROFILE_SIZE / 2,
            },
          ]}>
          <Logo size={logoSize} />
        </View>

        <Text style={[styles.selectedProfileName, profileNameStyle]}>
          {item.profile_name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <LinearGradient colors={colors.gradients.dark} style={styles.gradient}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            wide && styles.scrollContentWide,
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.center, wide && styles.centerWide]}>
            {/* Loading */}
            {deviceInfoShow === '-2' && (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Connecting...</Text>
              </View>
            )}

            {/* Profile Selection */}
            {showProfilePicker && (
              <View
                style={[
                  styles.profileSection,
                  {
                    width,
                    height: height / 1.8,
                  },
                ]}>
                <View style={styles.sectionHeading}>
                  {/* <Text style={styles.sectionEyebrow}>YOUR PROFILES</Text> */}
                  <Text style={styles.whoConnected}>Who's Watching?</Text>
                  <Text style={styles.sectionSubtitle}>
                    Select a profile to continue
                  </Text>
                </View>

                <FlatList
                  ref={profileListRef}
                  data={profileList}
                  extraData={selectedProfileIndex}
                  horizontal
                  renderItem={renderProfileItem}
                  keyExtractor={item => String(item.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.profileList}
                  getItemLayout={(_, index) => ({
                    length: PROFILE_SIZE + PROFILE_GAP,
                    offset: (PROFILE_SIZE + PROFILE_GAP) * index,
                    index,
                  })}
                  onScrollToIndexFailed={({ index }) => {
                    profileListRef.current?.scrollToOffset({
                      offset: Math.max(0, index * (PROFILE_SIZE + PROFILE_GAP)),
                      animated: true,
                    });
                  }}
                />
              </View>
            )}

            {/* Device Dashboard */}
            {showDeviceInfoCard && (
              <View style={styles.deviceInfoSection}>
                <View style={styles.deviceCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleGroup}>
                      <Text style={styles.cardEyebrow}>DEVICE OVERVIEW</Text>
                      <Text style={styles.cardTitle}>Device Information</Text>
                    </View>

                    <View
                      style={[
                        styles.statusChip,
                        deviceInfoShow === '1'
                          ? styles.statusChipActive
                          : deviceInfoShow === '0'
                            ? styles.statusChipTrial
                            : styles.statusChipInactive,
                      ]}>
                      <View
                        style={[
                          styles.statusDot,
                          deviceInfoShow === '1'
                            ? styles.statusDotActive
                            : deviceInfoShow === '0'
                              ? styles.statusDotTrial
                              : styles.statusDotInactive,
                        ]}
                      />

                      <Text style={styles.statusText}>
                        {deviceInfoShow === '1' && 'Active'}
                        {deviceInfoShow === '-1' && 'Expired'}
                        {deviceInfoShow === '0' && 'Trial'}
                      </Text>
                    </View>
                  </View>

                  {/* Status Information */}
                  <View style={styles.statusContent}>
                    {deviceInfoShow === '-1' && !isTrial && (
                      <Text style={styles.deviceMessage}>
                        Your TV subscription is expired.
                        {'\n'}
                      </Text>
                    )}

                    {deviceInfoShow === '-1' && isTrial && (
                      <Text style={styles.deviceMessage}>
                        Limited Time Trial Has Expired
                        {'\n'}
                      </Text>
                    )}

                    {deviceInfoShow === '0' && (
                      <Text style={styles.deviceMessage}>
                        Trial 7 days
                        {'\n'}
                        {expiredAt ? (
                          <Text style={styles.expiredAt}>{expiredAt}</Text>
                        ) : null}
                        {expiredAt ? '\n' : ''}
                      </Text>
                    )}

                    {deviceInfoShow === '1' && profileList.length > 0 && (
                      <Text style={styles.deviceMessage}>
                        Your device is activated
                        {'\n'}
                        {expiredAt ? (
                          <Text style={styles.expiredAt}>{expiredAt}</Text>
                        ) : null}
                        {expiredAt ? '\n' : ''}
                      </Text>
                    )}

                    {deviceInfoShow === '1' && profileList.length === 0 && (
                      <Text style={styles.deviceMessage}>
                        Your device is activated
                        {'\n'}
                        {expiredAt ? (
                          <Text style={styles.expiredAt}>{expiredAt}</Text>
                        ) : null}
                        {expiredAt ? '\n' : ''}
                        There is no playlist uploaded for your device.
                        {'\n\n'}
                      </Text>
                    )}
                  </View>

                  {/* Device Credentials */}
                  <View style={styles.credentialsSection}>
                    <Text style={styles.credentialsHeading}>
                      DEVICE CREDENTIALS
                    </Text>

                    <View style={styles.credentialsRow}>
                      <View style={styles.credentialBox}>
                        <Text style={styles.macLabel}>{identifierLabel}</Text>
                        <Text style={styles.macValue} selectable>
                          {deviceInfo?.mac || '—'}
                        </Text>
                      </View>

                      <View style={styles.credentialBox}>
                        <Text style={styles.macLabel}>Password</Text>
                        <Text style={styles.macValue} selectable>
                          {deviceInfo?.mac ? getPassword(deviceInfo.mac) : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={[styles.actions, wide && styles.actionsWide]}>
              <Button
                title="Refresh"
                onPress={handleRefresh}
                loading={loading}
                style={styles.actionBtn}
              />

              {showProfilePicker && (
                <Button
                  title="Device Info"
                  onPress={handleDeviceInfoToggle}
                  style={styles.actionBtn}
                />
              )}
            </View>

            {/* Error */}
            {error ? (
              <View style={styles.errorBlock}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080B14',
  },

  gradient: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  scrollContentWide: {
    paddingVertical: 45,
  },

  center: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },

  centerWide: {
    maxWidth: 760,
  },

  // Loading

  loadingBlock: {
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    ...typography.body,
    color: '#9CA3B5',
    marginTop: 16,
  },

  // Profile Section

  profileSection: {
    alignItems: 'center',
    marginBottom: 28,
    justifyContent: 'center',
  },

  sectionHeading: {
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: '#8586A5',
    marginBottom: 10,
  },

  whoConnected: {
    ...typography.h1,
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  sectionSubtitle: {
    fontSize: 13,
    color: '#9299AB',
    marginTop: 7,
  },

  profileList: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  profileItem: {
    marginTop: 0,
    marginRight: PROFILE_GAP,
  },

  profileCircle: {
    backgroundColor: '#171C2B',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#30374A',
    borderRadius: 24,
  },

  selectedProfileName: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },

  // Device Section

  deviceInfoSection: {
    width: '100%',
    marginBottom: 28,
    alignItems: 'center',
  },

  deviceCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#121827',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#293349',
    overflow: 'hidden',
  },

  // Header

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 12,
  },

  cardTitleGroup: {
    flex: 1,
  },

  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: '#818CA5',
    marginBottom: 7,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },

  // Status Chip

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    gap: 7,
  },

  statusChipActive: {
    backgroundColor: 'rgba(52,211,153,0.10)',
    borderColor: 'rgba(52,211,153,0.25)',
  },

  statusChipTrial: {
    backgroundColor: 'rgba(251,191,36,0.10)',
    borderColor: 'rgba(251,191,36,0.25)',
  },

  statusChipInactive: {
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderColor: 'rgba(248,113,113,0.25)',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusDotActive: {
    backgroundColor: '#34D399',
  },

  statusDotTrial: {
    backgroundColor: '#FBBF24',
  },

  statusDotInactive: {
    backgroundColor: '#F87171',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Status Message

  statusContent: {
    backgroundColor: '#1A2233',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 17,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#7775F5',
  },

  deviceMessage: {
    ...typography.body,
    color: '#E2E7F0',
    textAlign: 'left',
    lineHeight: 25,
  },

  expiredAt: {
    color: '#A5B4FC',
    fontWeight: '700',
  },

  link: {
    color: '#A5B4FC',
    fontWeight: '700',
  },

  // Credentials

  credentialsSection: {
    width: '100%',
  },

  credentialsHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#818CA5',
    marginBottom: 13,
  },

  credentialsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  credentialBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#0C1220',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#293349',
  },

  macLabel: {
    ...typography.bodySmall,
    color: '#8994AA',
    marginBottom: 10,
  },

  macValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Actions

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
  },

  actionsWide: {
    flexDirection: 'row',
  },

  actionBtn: {
    minWidth: 150,
  },

  // Error

  errorBlock: {
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.25)',
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
    alignSelf: 'stretch',
  },

  errorText: {
    ...typography.bodySmall,
    color: '#FCA5A5',
    textAlign: 'center',
  },
});

export default HomeScreen;
