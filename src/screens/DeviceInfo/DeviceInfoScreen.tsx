
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';

import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../navigation/AppNavigator';

import {useGlobalContext} from '../../context/GlobalContext';

import {colors} from '../../theme/colors';
import {spacing, borderRadius} from '../../theme/spacing';
import {typography} from '../../theme/typography';
import {useResponsive} from '../../theme';

import {useAppAlert} from '../../components/AppAlert';

type IdentifierType = 'mac' | 'uniqueId';

type StoredDeviceIdentity = {
  identifier: string;
  identifierType: IdentifierType;
  version: string;
  type: number;
};

const DEVICE_IDENTITY_KEY = '@iptv/device_identity_v1';

const DeviceInfoScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'DeviceInfo'>>();
  const {width, height} = useWindowDimensions();

  const responsive = useResponsive();
  const {showAlert} = useAppAlert();

  const {
    deviceInfo,
    providerLogin,
    refreshProvider,
    access,
  } = useGlobalContext();

  const [storedIdentity, setStoredIdentity] =
    useState<StoredDeviceIdentity | null>(null);

  const [isLoadingIdentity, setIsLoadingIdentity] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --------------------------------------------------
  // LOAD SAVED DEVICE IDENTITY
  // --------------------------------------------------

  const loadDeviceIdentity = useCallback(async () => {
    setIsLoadingIdentity(true);

    try {
      const raw = await AsyncStorage.getItem(DEVICE_IDENTITY_KEY);

      if (!raw) {
        setStoredIdentity(null);
        return;
      }

      const identity = JSON.parse(raw) as StoredDeviceIdentity;

      if (
        !identity.identifier ||
        !identity.version ||
        (identity.identifierType !== 'mac' &&
          identity.identifierType !== 'uniqueId')
      ) {
        setStoredIdentity(null);
        return;
      }

      setStoredIdentity(identity);
    } catch {
      setStoredIdentity(null);
    } finally {
      setIsLoadingIdentity(false);
    }
  }, []);

  useEffect(() => {
    void loadDeviceIdentity();
  }, [loadDeviceIdentity]);

  // --------------------------------------------------
  // DEVICE INFORMATION
  // --------------------------------------------------

  const identifier =
    deviceInfo?.mac || storedIdentity?.identifier || '';

  const identifierType =
    storedIdentity?.identifierType || 'mac';

  const deviceVersion =
    deviceInfo?.version || storedIdentity?.version || '—';

  const deviceType =
    deviceInfo?.type ?? storedIdentity?.type;

  const identifierLabel =
    identifierType === 'uniqueId' ? 'Device ID' : 'MAC Address';

  const getPassword = useCallback((value: string): string => {
    let output = '';

    const cleaned = value.replace(/:/gi, '');

    for (let i = 0; i < cleaned.length; i++) {
      output += cleaned.charCodeAt(i).toString();
    }

    return output.substring(0, 6);
  }, []);

  const devicePassword = useMemo(() => {
    if (!identifier || identifierType !== 'mac') {
      return '';
    }

    return getPassword(identifier);
  }, [identifier, identifierType, getPassword]);

  // --------------------------------------------------
  // PROVIDER INFORMATION
  // --------------------------------------------------

  const providerStatus = providerLogin?.status;
  const hasProviderGrant = access?.grants.some(grant => grant.source === 'provider') ?? false;
  const playGrant = access?.grants.find(grant => grant.source === 'google_play');

  const providerStatusLabel = useMemo(() => {
    if (!providerLogin) {
      return 'Not verified';
    }

    if (providerStatus === -1) {
      return 'Expired';
    }

    if (providerStatus === 0) {
      return 'Trial';
    }

    if (typeof providerStatus === 'number') {
      return providerLogin.is_terial ? 'Trial' : hasProviderGrant ? 'Active' : 'Verification required';
    }

    return 'Unknown';
  }, [hasProviderGrant, providerLogin, providerStatus]);

  const providerStatusColor = useMemo(() => {
    if (!providerLogin) {
      return colors.textTertiary;
    }

    if (providerStatus === -1) {
      return colors.error;
    }

    if (providerStatus === 0 || providerLogin.is_terial) {
      return colors.warning;
    }

    return hasProviderGrant ? colors.success : colors.warning;
  }, [hasProviderGrant, providerLogin, providerStatus]);

  const providerExpiry =
    providerLogin?.ExipiredAt || '—';

  const providerPlaylistCount =
    providerLogin?.playlist?.length || 0;

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);

    try {
      const login = await refreshProvider();
      if (login.playlist.length > 0) {
        navigation.navigate('PlaylistManager');
        return;
      }
      showAlert({
        type: 'warning',
        title: 'No Provider Playlists',
        message: 'The provider returned no playlists for this device.',
      });
    } catch (error) {
      showAlert({
        type: 'warning',
        title: 'Refresh Failed',
        message: error instanceof Error ? error.message : 'Could not verify this device.',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, navigation, refreshProvider, showAlert]);

  // --------------------------------------------------
  // RESPONSIVE LAYOUT
  // --------------------------------------------------

  const isCompact = responsive.isMobile;

  const horizontalPadding = responsive.pagePaddingX;
  const verticalPadding = responsive.pagePaddingY;

  const contentMaxWidth = responsive.isTV
    ? 1050
    : responsive.isTablet
      ? 850
      : 680;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },

        gradient: {
          flex: 1,
        },

        scrollContent: {
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: horizontalPadding,
          paddingVertical: verticalPadding,
        },

        content: {
          width: '100%',
          maxWidth: contentMaxWidth,
          flex: 1,
        },

        header: {
          minHeight: responsive.headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: responsive.sectionGap,
        },

        headerTitle: {
          ...typography.h2,
          fontSize: responsive.font.title,
          color: colors.text,
        },

        headerSubtitle: {
          fontSize: responsive.font.secondary,
          color: colors.textSecondary,
          marginTop: 2,
        },

        backButton: {
          width: responsive.buttonHeight,
          height: responsive.buttonHeight,
          borderRadius: borderRadius.md,
          backgroundColor: colors.backgroundCard,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: responsive.cardGap,
        },

        backButtonText: {
          color: colors.text,
          fontSize: responsive.font.heading,
          fontWeight: '700',
        },

        section: {
          backgroundColor: colors.backgroundCard,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: responsive.cardRadius,
          padding: responsive.cardPadding,
          marginBottom: responsive.cardGap,
        },

        sectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: responsive.cardGap,
        },

        sectionTitle: {
          color: colors.text,
          fontSize: responsive.font.heading,
          fontWeight: '700',
        },

        sectionDescription: {
          color: colors.textTertiary,
          fontSize: responsive.font.secondary,
          marginTop: 3,
        },

        statusBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: borderRadius.round,
          backgroundColor: colors.backgroundSecondary,
        },

        statusDot: {
          width: 7,
          height: 7,
          borderRadius: borderRadius.round,
        },

        statusText: {
          fontSize: responsive.font.secondary,
          fontWeight: '700',
        },

        detailsGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: responsive.cardGap,
        },

        detailItem: {
          flexGrow: 1,
          flexBasis: isCompact ? '45%' : '30%',
          minWidth: isCompact ? 110 : 150,
          backgroundColor: colors.background,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.borderDark,
          padding: responsive.cardPadding,
        },

        detailLabel: {
          color: colors.textTertiary,
          fontSize: responsive.font.caption,
          marginBottom: 6,
        },

        detailValue: {
          color: colors.text,
          fontSize: responsive.font.body,
          fontWeight: '600',
        },

        description: {
          color: colors.textSecondary,
          fontSize: responsive.font.body,
          lineHeight: responsive.font.body * 1.5,
          marginTop: responsive.cardGap,
        },

        refreshButton: {
          minHeight: responsive.buttonHeight,
          backgroundColor: colors.primary,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: responsive.cardPadding,
          marginLeft: responsive.cardGap,
          borderWidth: 2,
          borderColor: 'transparent',
        },

        refreshButtonFocused: {
          borderColor: colors.white,
          backgroundColor: colors.primaryDark,
        },

        refreshButtonDisabled: {
          opacity: 0.65,
        },

        refreshButtonText: {
          color: colors.white,
          fontSize: responsive.font.button,
          fontWeight: '700',
        },

        loadingContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          minHeight: responsive.buttonHeight,
        },

        emptyValue: {
          color: colors.textTertiary,
          fontSize: responsive.font.body,
          fontWeight: '500',
        },

        footer: {
          marginTop: responsive.cardGap,
          alignItems: 'center',
        },

        footerText: {
          color: colors.textTertiary,
          fontSize: responsive.font.caption,
          textAlign: 'center',
        },
      }),
    [
      horizontalPadding,
      verticalPadding,
      contentMaxWidth,
      responsive,
      isCompact,
    ],
  );

  // --------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------

  const renderDetail = (
    label: string,
    value: string | number | undefined,
  ) => (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue} selectable>
        {value !== undefined && value !== '' ? String(value) : '—'}
      </Text>
    </View>
  );

  // --------------------------------------------------
  // SCREEN
  // --------------------------------------------------

  return (
    <View style={[styles.container, {width, height}]}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.gradient}>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          <View style={styles.content}>

            {/* HEADER */}

            <View style={styles.header}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Pressable
                  focusable
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  onPress={() => navigation.goBack()}
                  style={({focused}) => [
                    styles.backButton,
                    focused && {
                      borderColor: colors.focus,
                      backgroundColor: colors.backgroundTertiary,
                    },
                  ]}>
                  <Text style={styles.backButtonText}>‹</Text>
                </Pressable>

                <View>
                  <Text style={styles.headerTitle}>
                    Device Information
                  </Text>

                  <Text style={styles.headerSubtitle}>
                    Device and activation details
                  </Text>
                </View>
              </View>

              <Pressable
                focusable
                accessibilityRole="button"
                disabled={isRefreshing}
                onPress={handleRefresh}
                style={({focused}) => [
                  styles.refreshButton,
                  focused && styles.refreshButtonFocused,
                  isRefreshing && styles.refreshButtonDisabled,
                ]}>

                {isRefreshing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.white} />

                    <Text style={styles.refreshButtonText}>
                      Checking...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.refreshButtonText}>
                    Refresh
                  </Text>
                )}
              </Pressable>
            </View>

            {/* DEVICE IDENTITY */}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Device Identity
                  </Text>

                  <Text style={styles.sectionDescription}>
                    Information about this device
                  </Text>
                </View>
              </View>

              {isLoadingIdentity ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.sectionDescription}>
                    Loading device information...
                  </Text>
                </View>
              ) : (
                <View style={styles.detailsGrid}>
                  {renderDetail(identifierLabel, identifier || 'Unavailable')}

                  {identifierType === 'mac' &&
                    renderDetail('Device Password', devicePassword || '—')}

                  {renderDetail('App Version', deviceVersion)}

                  {renderDetail(
                    'Device Type',
                    deviceType !== undefined ? deviceType : '—',
                  )}
                </View>
              )}
            </View>

            {/* PROVIDER ACTIVATION */}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Provider Activation
                  </Text>

                  <Text style={styles.sectionDescription}>
                    Activation information from your provider
                  </Text>
                </View>

                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      {backgroundColor: providerStatusColor},
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {color: providerStatusColor},
                    ]}>
                    {providerStatusLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                {renderDetail('Activation Status', providerStatusLabel)}

                {renderDetail('Expiration Date', providerExpiry)}

                {renderDetail(
                  'Activation Type',
                  providerLogin
                    ? providerLogin.is_terial
                      ? 'Trial'
                      : 'Provider'
                    : '—',
                )}

                {renderDetail(
                  'Provider Playlists',
                  providerLogin ? providerPlaylistCount : '—',
                )}
              </View>

              {!providerLogin && (
                <Text style={styles.description}>
                  Provider activation information is not available yet.
                  It will appear here after connecting to the provider
                  service.
                </Text>
              )}
            </View>

            {/* GOOGLE PLAY */}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Google Play Subscription
                  </Text>

                  <Text style={styles.sectionDescription}>
                    Application subscription information
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                {renderDetail('Subscription Status', playGrant?.status ?? 'No verified subscription')}

                {renderDetail('Subscription Plan', playGrant?.plan ?? '—')}
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Refresh verifies your device and retrieves playlists from your provider.
              </Text>
            </View>

          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

export default DeviceInfoScreen;
