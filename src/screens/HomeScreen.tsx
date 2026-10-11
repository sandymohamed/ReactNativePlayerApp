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

type DeviceInfoShow = '-2' | '-1' | '0' | '1';

const PROFILE_SIZE = 120;
const PROFILE_GAP = spacing.lg;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { width } = useWindowDimensions();
  const { deviceInfo, changeDeviceInfo, changeProfile } = useGlobalContext();

  const [deviceInfoShow, setDeviceInfoShow] = useState<DeviceInfoShow>('-2');
  const [deviceInfoShowForce, setDeviceInfoShowForce] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [expiredAt, setExpiredAt] = useState('');
  const [profileList, setProfileList] = useState<Playlist[]>([]);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const profileListRef = useRef<FlatList>(null);

  const wide = width >= 800;

  const getPassword = useCallback((chaine: string): string => {
    let out = '';
    const cleaned = chaine.replace(/:/gi, '');
    for (let i = 0; i < cleaned.length; i++) {
      out += cleaned.charCodeAt(i).toString();
    }
    return out.substring(0, 6);
  }, []);

  const callService = useCallback(
    async (macAddress: string, version: string, type: number) => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(
          'https://api.uiplayer.com/api/apps/devices/login',
          // 'http://192.168.1.16:5000/api/apps/devices/login',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mac: macAddress,
              password: getPassword(macAddress),
              type: String(type),
              version,
            }),
          },
        );
        const data: LoginModel = await res.json();
        console.log('callService response data:', data, 'for MAC:', macAddress);
        if (data.status === -1) {
          setDeviceInfoShow('-1');
          setIsTrial(!!data.is_terial);
          setExpiredAt('');
          setProfileList([]);
          return;
        }
        if (data.status === 0) {
          setDeviceInfoShow('0');
          setIsTrial(!!data.is_terial);
          const future = data.ExipiredAt
            ? new Date(data.ExipiredAt).getTime()
            : 0;
          const now = Date.now();
          const days = future
            ? Math.floor((future - now) / (1000 * 60 * 60 * 24))
            : 0;
          setExpiredAt(days > 0 ? `Expired in ${days} days` : '');
          setProfileList([]);
          return;
        }

        setDeviceInfoShow('1');
        setIsTrial(!!data.is_terial);
        const future = data.ExipiredAt
          ? new Date(data.ExipiredAt).getTime()
          : 0;
        const now = Date.now();
        const days = future
          ? Math.floor((future - now) / (1000 * 60 * 60 * 24))
          : 0;
        setExpiredAt(days > 0 ? `Expired in ${days} days` : '');

        if (data.playlist && data.playlist.length > 0) {
          setProfileList(data.playlist);
          setSelectedProfileIndex(0);
          setDeviceInfoShowForce(false);
        } else {
          setProfileList([]);
          setDeviceInfoShowForce(true);
        }
      } catch (err: any) {
        console.error(
          'Error in callService:',
          err,
          'for MAC:',
          macAddress,
          'version:',
          version,
          'type:',
          type,
          'url:',
          // 'http://192.168.1.16:5000/api/apps/devices/login',
          'https://api.uiplayer.com/api/apps/devices/login',
        );
        setError(err?.message || 'Failed to connect');
        setDeviceInfoShow('1');
        setProfileList([]);
      } finally {
        setLoading(false);
      }
    },
    [getPassword],
  );

  const initializeDevice = useCallback(() => {
    const defaultMac = 'b8:b4:09:45:24:f6';
    const defaultVersion = '1.0.2';
    const defaultType = 3;
    changeDeviceInfo({
      mac: defaultMac,
      version: defaultVersion,
      type: defaultType,
    });
    callService(defaultMac, defaultVersion, defaultType);
  }, [changeDeviceInfo, callService]);

  useEffect(() => {
    initializeDevice();
  }, []);

  const handleRefresh = useCallback(() => {
    setProfileList([]);
    setDeviceInfoShowForce(false);
    setError('');
    const info = deviceInfo?.mac
      ? deviceInfo
      : { mac: 'b8:b4:09:45:24:f6', version: '1.0.2', type: 3 };
    callService(info.mac, info.version || '1.0.2', info.type ?? 3);
  }, [deviceInfo, callService]);

  const handleDeviceInfoToggle = useCallback(() => {
    setDeviceInfoShowForce(v => !v);
  }, []);

  const handleProfileSelect = useCallback(
    (profile: Playlist) => {
      console.warn('Selected profile:', profile);
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
        return;
      }
    },
    onSelect: () => {
      if (showProfilePicker && profileList[selectedProfileIndex]) {
        handleProfileSelect(profileList[selectedProfileIndex]);
      }
    },
    onLeft: () => {
      if (showProfilePicker) setSelectedProfileIndex(i => Math.max(0, i - 1));
    },
    onRight: () => {
      if (showProfilePicker)
        setSelectedProfileIndex(i => Math.min(profileList.length - 1, i + 1));
    },
  });

  useEffect(() => {
    if (
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
    return (
      <TouchableOpacity
        onPress={() => {
          setSelectedProfileIndex(index);
          handleProfileSelect(item);
        }}
        activeOpacity={0.9}
        style={[styles.profileItem, focused && styles.profileItemFocused]}>
        {focused ? (
          <>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileRing}>
              <View style={styles.profileCircleInner}>
                <Logo size={40} />
              </View>
            </LinearGradient>
            <Text style={styles.selectedProfileName}>{item.profile_name}</Text>
          </>
        ) : (
          <>
            <View style={styles.profileCircle}>
              <Logo size={44} />
            </View>
            <Text style={styles.selectedProfileName}>
              {item.profile_name}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
              <View style={styles.profileSection}>
                <Text style={styles.whoConnected}>Who Connected</Text>
                <FlatList
                  ref={profileListRef}
                  data={profileList}
                  horizontal
                  renderItem={renderProfileItem}
                  keyExtractor={item => String(item.id)}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.profileList}
                  getItemLayout={(_, i) => ({
                    length: PROFILE_SIZE + PROFILE_GAP,
                    offset: (PROFILE_SIZE + PROFILE_GAP) * i,
                    index: i,
                  })}
                  onScrollToIndexFailed={({ index }) => {
                    setTimeout(() => {
                      profileListRef.current?.scrollToOffset({
                        offset: Math.max(
                          0,
                          index * (PROFILE_SIZE + PROFILE_GAP),
                        ),
                        animated: true,
                      });
                    }, 100);
                  }}
                />
                {profileList.length > 0 &&
                  profileList[selectedProfileIndex] && (
                    <Text style={styles.selectedProfileName}>
                      {profileList[selectedProfileIndex].profile_name}
                    </Text>
                  )}
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
                        Your TV MAC is expired{'\n'}Use the following TV MAC
                        address and password to upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text>
                      </Text>
                    )}
                    {deviceInfoShow === '-1' && isTrial && (
                      <Text style={styles.deviceMessage}>
                        Limited Time Trial Has Expired{'\n'}Use the following TV
                        MAC address and password to upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text>
                      </Text>
                    )}
                    {deviceInfoShow === '0' && (
                      <Text style={styles.deviceMessage}>
                        Trial 7 days{'\n'}
                        {expiredAt ? (
                          <Text style={styles.expiredAt}>{expiredAt}</Text>
                        ) : null}
                        {expiredAt ? '\n' : ''}Use the following TV MAC address
                        and password to upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text>
                      </Text>
                    )}
                    {deviceInfoShow === '1' && profileList.length > 0 && (
                      <Text style={styles.deviceMessage}>
                        Your TV MAC is activated{'\n'}
                        {expiredAt ? (
                          <Text style={styles.expiredAt}>{expiredAt}</Text>
                        ) : null}
                        {expiredAt ? '\n' : ''}Use the following TV MAC address
                        and password to upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text>
                      </Text>
                    )}
                    {deviceInfoShow === '1' && profileList.length === 0 && (
                      <Text style={styles.deviceMessage}>
                        Your TV MAC is activated{'\n'}
                        {expiredAt ? (
                          <Text style={styles.expiredAt}>{expiredAt}</Text>
                        ) : null}
                        {expiredAt ? '\n' : ''}There is no playlist uploaded for
                        your TV.{'\n\n'}Use the following TV MAC address and
                        password to upload your playlist at{' '}
                        <Text style={styles.link}>uiplayer.com</Text>
                      </Text>
                    )}
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.macRow}>
                    <View style={styles.macItem}>
                      <Text style={styles.macLabel}>MAC Address</Text>
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

            {showDeviceInfoCard && (
              <View style={styles.moreInfo}>
                <Text style={styles.moreInfoLabel}>More Info At </Text>
                <Text style={styles.moreInfoLink}>uiplayer.com</Text>
              </View>
            )}

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
  scrollContentWide: { paddingVertical: spacing.xxl },
  center: { width: '100%', maxWidth: 600, alignItems: 'center' },
  centerWide: { maxWidth: 720 },
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
    marginBottom: spacing.xl,
  },
  whoConnected: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  profileList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  profileItem: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
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
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCircle: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  profileCircleInner: {
    width: PROFILE_SIZE - 8,
    height: PROFILE_SIZE - 8,
    borderRadius: (PROFILE_SIZE - 8) / 2,
    backgroundColor: colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedProfileName: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
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
  badgeWrapper: { position: 'absolute', top: -spacing.lg, right: -spacing.lg },
  badge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  badgeActive: { backgroundColor: colors.success },
  badgeInactive: { backgroundColor: colors.error },
  badgeText: {
    ...typography.button,
    color: colors.text,
  },
  deviceMessageBlock: { marginBottom: spacing.lg },
  deviceMessage: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  expiredAt: { color: colors.textTertiary, fontWeight: '600' },
  link: { color: colors.info, fontWeight: '700' },
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
  macItem: { alignItems: 'center' },
  macLabel: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  macValue: { ...typography.h4, color: colors.text },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionsWide: { flexDirection: 'row' },
  actionBtn: { minWidth: 140 },
  moreInfo: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  moreInfoLabel: { ...typography.body, color: colors.textTertiary },
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
