import React, { useState, useEffect, useCallback, useRef } from 'react';

import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  FlatList,
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

// const DEF_MAC = 'b8:b4:09:45:24:f6';
// const DEF_MAC = '52:53:62:52:36';
const DEF_MAC = 'b8:b4:09:45:24:f6';
const DEF_VERSION = "'1.0.2'";
const DEF_TYPE = 3;

const LOGIN_URL = 'https://api.uiplayer.com/api/apps/devices/login';

const DEVICE_IDENTITY_KEY = '@iptv/device_identity_v1';
const LOGIN_CACHE_PREFIX = '@iptv/device_login_v1:';

const HomeScreen: React.FC = () => {
  console.log('HomeScreen');
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { width, height } = useWindowDimensions();

  const PROFILE_SIZE = height / 2 - 100;

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
      console.log('from applyLoginData');
      setError('');
      setIsTrial(!!data.is_terial);

      const expiryTimestamp = parseExpiry(data.ExipiredAt);
      const daysRemaining = expiryTimestamp
        ? Math.floor((expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      setExpiredAt(daysRemaining > 0 ? `Expired in ${daysRemaining} days` : '');

      if (data.status === -1) {
        console.log('from applyLoginData data.status === -1');
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

        // setProfileList(data.playlist);
        // TODO: Change me to real playlist
        setProfileList([
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
        ]);
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
        console.log('readValidLoginCache raw:', raw);

        if (!raw) {
          console.log('readValidLoginCache NOT raw:');
          return null;
        }

        const cached = JSON.parse(raw) as CachedLogin;
        const data = cached?.data;

        console.log('readValidLoginCache cached:', cached, 'data:', data);
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
      const expiryTimestamp = parseExpiry(data.ExipiredAt);

      // Never cache an expired response or a response without
      // a valid future expiry.
      if (
        data.status === -1 ||
        !expiryTimestamp ||
        expiryTimestamp <= Date.now()
      ) {
        return;
      }

      const cacheKey = getLoginCacheKey(identifierType, identifier);

      const cache: CachedLogin = {
        data,
        cachedAt: Date.now(),
      };

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
        const response = await fetch(LOGIN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // The current API expects `mac`.
            // uniqueId mode is usable only if the backend/distributor
            // explicitly supports that identifier in this field.
            mac: identifier,
            password: getPassword(identifier),
            type: String(type),
            version,
          }),
        });

        console.log('ressss', response);
        if (!response.ok) {
          throw new Error(`Login request failed with HTTP ${response.status}.`);
        }

        const data: LoginModel = await response.json();
        console.log('data:', data);
        if (typeof data.status !== 'number') {
          throw new Error('The login API returned an unexpected response.');
        }

        console.log(
          'Login response received for device identifier type:',
          identifierType,
        );

        if (data.status === -1) {
          const cacheKey = getLoginCacheKey(identifierType, identifier);

          await AsyncStorage.removeItem(cacheKey);
          applyLoginData(data);
          return;
        }

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
    console.log('from HOmeScreen');
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

  const handleProfileSelect = useCallback(
    (profile: Playlist) => {
      console.log('handleProfileSelect:', profile);
      changeProfile(profile);
      navigation.replace('Main');
    },
    [changeProfile, navigation],
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
    const focused = showProfilePicker && selectedProfileIndex === index;

    const logoSize =
      PROFILE_SIZE > 120 ? PROFILE_SIZE - 100 : PROFILE_SIZE - 40;

    const profileNameStyle =
      PROFILE_SIZE > 120
        ? { ...typography.h1, marginTop: spacing.lg }
        : { ...typography.bodyLarge, marginTop: spacing.sm };

    return (
      <TouchableOpacity
        hasTVPreferredFocus={index === 0}
        onFocus={() => setSelectedProfileIndex(index)}
        onBlur={() => {
          setSelectedProfileIndex(current =>
            current === index ? null : current,
          );
        }}
        onPress={() => handleProfileSelect(item)}
        activeOpacity={0.9}
        style={[
          styles.profileItem,
          {
            width: PROFILE_SIZE,
            height: PROFILE_SIZE,
          },
          focused && styles.profileItemFocused,
        ]}>
        {focused ? (
          <>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.profileRing,
                {
                  width: PROFILE_SIZE,
                  height: PROFILE_SIZE,
                  borderRadius: PROFILE_SIZE / 2,
                },
              ]}>
              <View
                style={[
                  styles.profileCircleInner,
                  {
                    width: PROFILE_SIZE - 8,
                    height: PROFILE_SIZE - 8,
                    borderRadius: (PROFILE_SIZE - 8) / 2,
                  },
                ]}>
                <Logo size={logoSize} />
              </View>
            </LinearGradient>

            <Text style={[styles.selectedProfileName, profileNameStyle]}>
              {item.profile_name}
            </Text>
          </>
        ) : (
          <>
            <View
              style={[
                styles.profileCircle,
                {
                  width: PROFILE_SIZE,
                  height: PROFILE_SIZE,
                  borderRadius: PROFILE_SIZE / 2,
                },
              ]}>
              <Logo size={logoSize} />
            </View>

            <Text style={[styles.selectedProfileName, profileNameStyle]}>
              {item.profile_name}
            </Text>
          </>
        )}
      </TouchableOpacity>
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
            {deviceInfoShow === '-2' && (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Connecting...</Text>
              </View>
            )}

            {showProfilePicker && (
              <View
                style={[
                  styles.profileSection,
                  {
                    width,
                    height: height / 1.8,
                  },
                ]}>
                <Text style={styles.whoConnected}>Who Connected</Text>

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

            {showDeviceInfoCard && (
              <View style={styles.deviceInfoSection}>
                <View
                  style={[
                    styles.deviceCard,
                    deviceInfoShow === '1'
                      ? styles.deviceCardActive
                      : styles.deviceCardInactive,
                  ]}>
                  <View style={styles.badgeWrapper}>
                    <View
                      style={[
                        styles.badge,
                        deviceInfoShow === '1'
                          ? styles.badgeActive
                          : styles.badgeInactive,
                      ]}>
                      <Text style={styles.badgeText}>
                        {deviceInfoShow === '1' && 'Active'}
                        {deviceInfoShow === '-1' && 'Expired'}
                        {deviceInfoShow === '0' && 'Trial'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.deviceMessageBlock}>
                    {deviceInfoShow === '-1' && !isTrial && (
                      <Text style={styles.deviceMessage}>
                        Your TV subscription is expired.
                        {'\n'}
                        {/* Use the following device identifier and password to
                        upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com </Text> */}
                      </Text>
                    )}

                    {deviceInfoShow === '-1' && isTrial && (
                      <Text style={styles.deviceMessage}>
                        Limited Time Trial Has Expired
                        {'\n'}
                        {/* Use the following device identifier and password to
                        upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text> */}
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
                        {/* Use the following device identifier and password to
                        upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text> */}
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
                        {/* Use the following device identifier and password to
                        upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text> */}
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
                        {/* Use the following device identifier and password to
                        upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text> */}
                      </Text>
                    )}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.macRow}>
                    <View style={styles.macItem}>
                      <Text style={styles.macLabel}>{identifierLabel}</Text>
                      <Text style={styles.macValue}>
                        {deviceInfo?.mac || '—'}
                      </Text>
                    </View>

                    <View style={styles.macItem}>
                      <Text style={styles.macLabel}>Password</Text>
                      <Text style={styles.macValue}>
                        {deviceInfo?.mac ? getPassword(deviceInfo.mac) : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.actions, wide && styles.actionsWide]}>
              <Button
                title="Refresh"
                onPress={handleRefresh}
                loading={loading}
                variant="outline"
                style={styles.actionBtn}
              />

              {showProfilePicker && (
                <Button
                  title="Device Info"
                  onPress={handleDeviceInfoToggle}
                  variant="outline"
                  style={styles.actionBtn}
                />
              )}
            </View>
{/* 
            {showDeviceInfoCard && (
              <View style={styles.moreInfo}>
                <Text style={styles.moreInfoLabel}>More Info At</Text>
                <Text style={styles.moreInfoLink}>uiplayer.com</Text>
              </View>
            )} */}

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
  container: { flex: 1 },
  gradient: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  scrollContentWide: {
    paddingVertical: spacing.xxl,
  },

  center: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },

  centerWide: {
    maxWidth: 720,
  },

  loadingBlock: {
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },

  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  whoConnected: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  profileList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },

  profileItem: {
    marginTop: PROFILE_GAP,
    marginRight: PROFILE_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileItemFocused: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },

  profileRing: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCircle: {
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },

  profileCircleInner: {
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedProfileName: {
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
  },

  deviceInfoSection: {
    width: '100%',
    marginBottom: spacing.xl,
    alignItems: 'center',
  },

  deviceCard: {
    width: '100%',
    maxWidth: 520,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  deviceCardActive: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.success,
  },

  deviceCardInactive: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.error,
  },

  badgeWrapper: {
    position: 'absolute',
    top: -spacing.lg,
    right: -spacing.lg,
  },

  badge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },

  badgeActive: {
    backgroundColor: colors.success,
  },

  badgeInactive: {
    backgroundColor: colors.error,
  },

  badgeText: {
    ...typography.button,
    color: colors.text,
  },

  deviceMessageBlock: {
    marginBottom: spacing.lg,
  },

  deviceMessage: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },

  expiredAt: {
    color: colors.textTertiary,
    fontWeight: '600',
  },

  link: {
    color: colors.info,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: '100%',
    marginBottom: spacing.lg,
  },

  macRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xl,
  },

  macItem: {
    alignItems: 'center',
  },

  macLabel: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },

  macValue: {
    ...typography.h4,
    color: colors.text,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },

  actionsWide: {
    flexDirection: 'row',
  },

  actionBtn: {
    minWidth: 140,
  },

  moreInfo: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    alignItems: 'center',
  },

  moreInfoLabel: {
    ...typography.body,
    color: colors.textTertiary,
  },

  moreInfoLink: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },

  errorBlock: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },

  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
});

export default HomeScreen;
