// src/screens/Playlists/EditPlaylistScreen.tsx

import React, { useState, useCallback, useEffect } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';

import type {
  StandalonePlaylist,
  StandalonePlaylistType,
} from '../../models/model';

import { useGlobalContext } from '../../context/GlobalContext';
import { asPlaylist } from '../../services/playlistCatalog';
import { getStandalonePlaylists, updateStandalonePlaylist } from '../../utils/standaloneStorage';

import { useAppAlert } from '../../components/AppAlert';
import { testXtreamConnection } from '../../services/xtreamService';
import { testM3uConnection } from '../../services/m3uService';

const COLORS = {
  background: '#0A0A0F',
  card: '#15151F',
  input: '#1D1D29',
  primary: '#7C6CF6',
  focus: '#8B7CFF',
  secondary: '#B9ADFF',
  text: '#FFFFFF',
  muted: '#9292A5',
  border: '#292938',
  success: '#5EEAD4',
};

const isTV = Platform.isTV;

export default function EditPlaylistScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { showAlert } = useAppAlert();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [returnFocusTo, setReturnFocusTo] = useState<string | null>(null);

  useEffect(() => {
    if (!isTV || editingField === null) return;

    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      setReturnFocusTo(editingField);
      setEditingField(current => current === editingField ? null : current);
    });
    return () => subscription.remove();
  }, [editingField]);

  const { profile, selectPlaylist } = useGlobalContext();

  const playlist = route.params?.playlist as StandalonePlaylist | undefined;

  const [playlistType, setPlaylistType] = useState<StandalonePlaylistType>(
    playlist?.type || 'xtream',
  );
  const [testingConnection, setTestingConnection] = useState(false);

  const [name, setName] = useState(playlist?.name || '');

  const [host, setHost] = useState(playlist?.host || '');
  const [username, setUsername] = useState(playlist?.username || '');
  const [password, setPassword] = useState(playlist?.password || '');

  const [m3uUrl, setM3uUrl] = useState(playlist?.m3uUrl || '');

  const [loading, setLoading] = useState(false);

  // ==========================================
  // Helpers
  // ==========================================

  const normalizeHost = (value: string) => {
    return value.trim().replace(/\/+$/, '');
  };

  const isValidUrl = (value: string) => {
    return /^https?:\/\/.+/i.test(value.trim());
  };

  const handleTestConnection = async () => {
    if (loading || testingConnection) return;

    Keyboard.dismiss();

    // ==========================================
    // Test M3U
    // ==========================================

    if (playlistType === 'm3u') {
      const cleanM3uUrl = m3uUrl.trim();

      if (!cleanM3uUrl) {
        showAlert({
          type: 'warning',
          title: 'Missing M3U URL',
          message: 'Please enter your M3U playlist URL.',
        });
        return;
      }

      if (!isValidUrl(cleanM3uUrl)) {
        showAlert({
          type: 'warning',
          title: 'Invalid M3U URL',
          message: 'Please enter a valid URL starting with http:// or https://',
        });
        return;
      }

      const now = Date.now();

      const testPlaylist: StandalonePlaylist = {
        id: playlist?.id || 'connection-test',
        name: name.trim() || 'Connection Test',
        type: 'm3u',
        m3uUrl: cleanM3uUrl,
        createdAt: playlist?.createdAt || now,
        updatedAt: now,
        isActive: playlist?.isActive || false,
      };

      try {
        setTestingConnection(true);

        const totalStreams = await testM3uConnection(testPlaylist);

        showAlert({
          type: 'success',
          title: 'Playlist Valid',
          message:
            `Your M3U playlist was downloaded successfully.\n\n` +
            `Total Streams: ${totalStreams}`,
          buttons: [
            {
              text: 'OK',
              style: 'primary',
            },
          ],
        });
      } catch (error) {
        console.error('[EditPlaylist] M3U test failed:', error);

        showAlert({
          type: 'error',
          title: 'Connection Failed',
          message:
            error instanceof Error
              ? error.message
              : 'Could not download or read the M3U playlist.',
        });
      } finally {
        setTestingConnection(false);
      }

      return;
    }

    // ==========================================
    // Existing Xtream Test
    // ==========================================

    if (playlistType !== 'xtream') return;

    Keyboard.dismiss();

    const cleanHost = normalizeHost(host);
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanHost || !cleanUsername || !cleanPassword) {
      showAlert({
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter the server URL, username and password.',
      });
      return;
    }

    if (!isValidUrl(cleanHost)) {
      showAlert({
        type: 'warning',
        title: 'Invalid Server URL',
        message: 'Please enter a valid URL starting with http:// or https://',
      });
      return;
    }

    const now = Date.now();

    if (!playlist) {
      showAlert({
        type: 'error',
        title: 'Playlist Not Found',
        message: 'The playlist information is unavailable.',
      });
      return;
    }
    try {
      setTestingConnection(true);

      const testPlaylist: StandalonePlaylist = {
        id: playlist.id,
        name: name.trim() || playlist.name,
        type: 'xtream',
        host: cleanHost,
        username: cleanUsername,
        password: cleanPassword,
        createdAt: playlist.createdAt,
        updatedAt: now,
        isActive: playlist.isActive,
      };

      const result = await testXtreamConnection(testPlaylist);

      const userInfo = (result as any)?.user_info ?? {};

      const formatExpiry = (value: unknown) => {
        if (value === undefined || value === null || value === '') {
          return 'Unknown';
        }

        const timestamp = Number(value);

        if (Number.isFinite(timestamp)) {
          if (timestamp === 0) return 'Unlimited';

          const date = new Date(timestamp * 1000);

          if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString();
          }
        }

        return String(value);
      };

      const status = userInfo.status || 'Active';
      const expiry = formatExpiry(userInfo.exp_date);
      const maxConnections = userInfo.max_connections ?? 'Unknown';
      const activeConnections = userInfo.active_cons ?? 'Unknown';

      showAlert({
        type: 'success',
        title: 'Connection Successful',
        message:
          `Your Xtream server is reachable and the account was accepted.\n\n` +
          `Status: ${status}\n` +
          `Expires: ${expiry}\n` +
          `Max Connections: ${maxConnections}\n` +
          `Active Connections: ${activeConnections}`,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
          },
        ],
      });
    } catch (error) {
      console.error('[EditPlaylist] Connection test failed:', error);

      showAlert({
        type: 'error',
        title: 'Connection Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not connect to the IPTV server. Please check your credentials and server URL.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // ==========================================
  // Save Changes
  // ==========================================

  const handleSave = useCallback(async () => {
    if (loading || testingConnection) return;

    if (!playlist) {
      showAlert({
        type: 'error',
        title: 'Playlist Not Found',
        message: 'The playlist you are trying to edit could not be found.',
      });
      return;
    }

    Keyboard.dismiss();

    const cleanName = name.trim();

    if (!cleanName) {
      showAlert({
        type: 'warning',
        title: 'Missing Name',
        message: 'Please enter a playlist name.',
      });
      return;
    }

    let updates: Partial<Omit<StandalonePlaylist, 'id' | 'createdAt'>>;

    if (playlistType === 'xtream') {
      const cleanHost = normalizeHost(host);
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      if (!cleanHost || !cleanUsername || !cleanPassword) {
        showAlert({
          type: 'warning',
          title: 'Missing Information',
          message: 'Please enter the server URL, username and password.',
        });
        return;
      }

      if (!isValidUrl(cleanHost)) {
        showAlert({
          type: 'warning',
          title: 'Invalid Server URL',
          message: 'Please enter a valid URL starting with http:// or https://',
        });
        return;
      }

      updates = {
        name: cleanName,
        type: 'xtream',
        host: cleanHost,
        username: cleanUsername,
        password: cleanPassword,

        // Clear old M3U data when changing playlist type.
        m3uUrl: undefined,
      };
    } else {
      const cleanM3uUrl = m3uUrl.trim();

      if (!cleanM3uUrl) {
        showAlert({
          type: 'warning',
          title: 'Missing M3U URL',
          message: 'Please enter your M3U playlist URL.',
        });
        return;
      }

      if (!isValidUrl(cleanM3uUrl)) {
        showAlert({
          type: 'warning',
          title: 'Invalid M3U URL',
          message: 'Please enter a valid URL starting with http:// or https://',
        });
        return;
      }

      updates = {
        name: cleanName,
        type: 'm3u',
        m3uUrl: cleanM3uUrl,

        // Clear old Xtream credentials when changing playlist type.
        host: undefined,
        username: undefined,
        password: undefined,
      };
    }

    try {
      setLoading(true);

      const draft = { ...playlist, ...updates };
      await (draft.type === 'm3u' ? testM3uConnection(draft) : testXtreamConnection(draft));
      const success = await updateStandalonePlaylist(playlist.id, updates);

      if (!success) {
        showAlert({
          type: 'error',
          title: 'Update Failed',
          message: 'Could not update this playlist. Please try again.',
        });
        return;
      }

      if (profile?.standalone?.id === playlist.id) {
        const updated = (await getStandalonePlaylists()).find(item => item.id === playlist.id);
        if (updated) await selectPlaylist(asPlaylist(updated));
      }

      showAlert({
        type: 'success',
        title: 'Changes Saved',
        message: `"${cleanName}" has been updated successfully.`,
        buttons: [
          {
            text: 'OK',
            style: 'primary',
            onPress: () => navigation.goBack(),
          },
        ],
      });
    } catch (error) {
      console.error('[EditPlaylist] Failed to update playlist:', error);

      showAlert({
        type: 'error',
        title: 'Something Went Wrong',
        message: error instanceof Error ? error.message : 'Could not update the playlist.',
      });
    } finally {
      setLoading(false);
    }
  }, [
    profile,
    selectPlaylist,
    loading,
    playlist,
    name,
    playlistType,
    host,
    username,
    password,
    m3uUrl,
    showAlert,
    navigation,
  ]);

  // ==========================================
  // Playlist Type Selector
  // ==========================================

  const renderTypeButton = (
    type: StandalonePlaylistType,
    title: string,
    description: string,
  ) => {
    const selected = playlistType === type;

    return (
      <Pressable
        onPress={() => setPlaylistType(type)}
        style={({ focused }) => [
          styles.typeButton,
          selected && styles.typeButtonSelected,
          focused && styles.focused,
        ]}>
        <View style={styles.typeHeader}>
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected && <View style={styles.radioInner} />}
          </View>

          <Text style={styles.typeTitle}>{title}</Text>
        </View>

        <Text style={styles.typeDescription}>{description}</Text>
      </Pressable>
    );
  };

  // ==========================================
  // Input Component
  // ==========================================

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    options?: {
      secureTextEntry?: boolean;
      keyboardType?: 'default' | 'url';
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
      autoCorrect?: boolean;
    },
  ) => {
    const isEditing = isTV && editingField === label;
    const input = !isTV || isEditing ? (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        secureTextEntry={options?.secureTextEntry}
        keyboardType={options?.keyboardType || 'default'}
        autoCapitalize={options?.autoCapitalize || 'none'}
        autoCorrect={options?.autoCorrect ?? false}
        selectionColor={COLORS.primary}
        autoFocus={isEditing}
        returnKeyType={isTV ? 'done' : undefined}
        onSubmitEditing={isEditing ? () => {
          setReturnFocusTo(label);
          setEditingField(null);
          Keyboard.dismiss();
        } : undefined}
        onBlur={isEditing ? () => {
          setEditingField(current => current === label ? null : current);
        } : undefined}
        style={isTV ? styles.tvInput : styles.input}
      />
    ) : null;

    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>

        {isTV ? (
          <Pressable
            focusable={!isEditing}
            accessible={!isEditing}
            hasTVPreferredFocus={!isEditing && returnFocusTo === label}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint="Press OK to edit"
            onFocus={() => setReturnFocusTo(null)}
            onPress={isEditing ? undefined : () => setEditingField(label)}
            style={({ focused }) => [
              styles.input,
              styles.tvInputFrame,
              (focused || isEditing) && styles.tvInputFocused,
            ]}>
            {input ?? (
              <Text
                numberOfLines={1}
                style={[styles.tvInputValue, !value && styles.tvInputPlaceholder]}>
                {value && options?.secureTextEntry ? '•'.repeat(value.length) : value || placeholder}
              </Text>
            )}
          </Pressable>
        ) : input}
      </View>
    );
  };

  // ==========================================
  // Invalid Playlist
  // ==========================================

  if (!playlist) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Playlist Not Found</Text>

        <Text style={styles.errorMessage}>
          The playlist information is unavailable.
        </Text>

        <Pressable
          onPress={() => navigation.goBack()}
          hasTVPreferredFocus={isTV}
          style={({ focused }) => [
            styles.saveButton,
            focused && styles.focused,
          ]}>
          <Text style={styles.saveButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  // ==========================================
  // Render
  // ==========================================

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hasTVPreferredFocus={isTV}
            style={({ focused }) => [
              styles.backButton,
              focused && styles.focused,
            ]}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Edit Playlist</Text>

            <Text style={styles.subtitle}>
              Update your playlist information
            </Text>
          </View>
        </View>

        {/* Playlist Type */}
        <Text style={styles.sectionTitle}>Playlist Type</Text>

        <View style={styles.typeContainer}>
          {renderTypeButton(
            'xtream',
            'Xtream Codes',
            'Server URL, username and password',
          )}

          {renderTypeButton(
            'm3u',
            'M3U URL',
            'Connect using an M3U playlist link',
          )}
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Playlist Information</Text>

          {renderInput('Playlist Name', name, setName, 'My IPTV Playlist', {
            autoCapitalize: 'sentences',
          })}

          <View style={styles.divider} />

          {playlistType === 'xtream' ? (
            <>
              <Text style={styles.sectionTitle}>Xtream Credentials</Text>

              {renderInput(
                'Server URL',
                host,
                setHost,
                'http://example.com:8080',
                {
                  keyboardType: 'url',
                },
              )}

              {renderInput('Username', username, setUsername, 'Enter username')}

              {renderInput(
                'Password',
                password,
                setPassword,
                'Enter password',
                {
                  secureTextEntry: true,
                },
              )}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>M3U Information</Text>

              {renderInput(
                'M3U Playlist URL',
                m3uUrl,
                setM3uUrl,
                'https://example.com/playlist.m3u',
                {
                  keyboardType: 'url',
                },
              )}
            </>
          )}
        </View>

        <Pressable
          onPress={handleTestConnection}
          disabled={loading || testingConnection}
          style={({ focused }) => [
            styles.testButton,
            focused && styles.focused,
            (loading || testingConnection) && styles.saveButtonDisabled,
          ]}>
          {testingConnection ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator color={COLORS.success} />
              <Text style={styles.testButtonText}>Testing Connection...</Text>
            </View>
          ) : (
            <Text style={styles.testButtonText}>Test Connection</Text>
          )}
        </Pressable>

        {/* Save Button */}
        <Pressable
          onPress={handleSave}
          disabled={loading || testingConnection}
          style={({ focused }) => [
            styles.saveButton,
            focused && styles.focused,
            loading && styles.saveButtonDisabled,
          ]}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </Pressable>

        <Text style={styles.footerText}>
          Your playlist information is stored locally on this device.
        </Text>
      </ScrollView>
    </View>
  );
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    paddingBottom: 48,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  backText: {
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 38,
  },

  headerTextContainer: {
    flex: 1,
  },

  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },

  typeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },

  typeButton: {
    flex: 1,
    minHeight: 100,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    justifyContent: 'center',
  },

  typeButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#1D1A32',
  },

  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  radioSelected: {
    borderColor: COLORS.primary,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  typeTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },

  typeDescription: {
    color: COLORS.muted,
    fontSize: 13,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    marginBottom: 24,
  },

  field: {
    marginBottom: 20,
  },

  label: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 9,
  },

  input: {
    height: 52,
    backgroundColor: COLORS.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    paddingHorizontal: 15,
    fontSize: 15,
  },

  tvInputFrame: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },

  tvInputFocused: {
    borderColor: COLORS.focus,
    borderWidth: 2,
  },

  tvInput: {
    height: '100%',
    paddingHorizontal: 14,
    paddingVertical: 0,
    color: COLORS.text,
    fontSize: 15,
  },

  tvInputValue: {
    paddingHorizontal: 14,
    color: COLORS.text,
    fontSize: 15,
  },

  tvInputPlaceholder: {
    color: COLORS.muted,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 22,
  },
  testButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  testButtonText: {
    color: COLORS.success,
    fontSize: 16,
    fontWeight: '700',
  },

  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  focused: {
    borderColor: COLORS.focus,
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },

  footerText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },

  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  errorTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },

  errorMessage: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
  },
});
