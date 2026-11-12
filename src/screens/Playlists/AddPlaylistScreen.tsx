// src/screens/Playlists/AddPlaylistScreen.tsx
import React, { useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';

import { useGlobalContext } from '../../context/GlobalContext';
import { asPlaylist } from '../../services/playlistCatalog';
import { addStandalonePlaylist } from '../../utils/standaloneStorage';

import type {
  StandalonePlaylist,
  StandalonePlaylistType,
} from '../../models/model';
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
  danger: '#F87171',
};

const isTV = Platform.isTV;

export default function AddPlaylistScreen() {
  const navigation = useNavigation<any>();
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

  const { selectPlaylist } = useGlobalContext();

  const [playlistType, setPlaylistType] =
    useState<StandalonePlaylistType>('xtream');

  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const normalizeHost = (value: string) => {
    return value.trim().replace(/\/+$/, '');
  };

  const isValidUrl = (value: string) => {
    return /^https?:\/\/.+/i.test(value.trim());
  };

  const handleTestConnection = async () => {
    if (loading || testingConnection) return;

    Keyboard.dismiss();

    try {
      setTestingConnection(true);

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
            message:
              'Please enter a valid URL starting with http:// or https://',
          });
          return;
        }

        const testPlaylist: StandalonePlaylist = {
          id: 'connection-test',
          name: name.trim() || 'Connection Test',
          type: 'm3u',
          m3uUrl: cleanM3uUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isActive: false,
        };

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

        return;
      }

      // ==========================================
      // Test Xtream
      // ==========================================

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

      const testPlaylist: StandalonePlaylist = {
        id: 'connection-test',
        name: name.trim() || 'Connection Test',
        type: 'xtream',
        host: cleanHost,
        username: cleanUsername,
        password: cleanPassword,
        createdAt: now,
        updatedAt: now,
        isActive: false,
      };

      const result = await testXtreamConnection(testPlaylist);

      const userInfo = result?.user_info ?? {};

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
      console.error('[AddPlaylist] Connection test failed:', error);

      showAlert({
        type: 'error',
        title: 'Connection Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Could not connect to the IPTV server. Please check your playlist details.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (loading || testingConnection) return;
    Keyboard.dismiss();

    const cleanName = name.trim();

    if (!cleanName) {
      showAlert({
        type: 'warning',
        title: 'Missing name',
        message: 'Please enter a playlist name.',
      });
      return;
    }

    const cleanHost = normalizeHost(host);
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();
    const cleanM3uUrl = m3uUrl.trim();
    const url = playlistType === 'xtream' ? cleanHost : cleanM3uUrl;

    if (!isValidUrl(url) || (playlistType === 'xtream' && (!cleanUsername || !cleanPassword))) {
      showAlert({
        type: 'warning',
        title: 'Check Your Playlist Details',
        message: playlistType === 'xtream'
          ? 'Enter a valid HTTP or HTTPS server URL, username and password.'
          : 'Enter a valid HTTP or HTTPS M3U URL.',
      });
      return;
    }

    const input = playlistType === 'xtream'
      ? { name: cleanName, type: playlistType, host: cleanHost, username: cleanUsername, password: cleanPassword, isActive: false }
      : { name: cleanName, type: playlistType, m3uUrl: cleanM3uUrl, isActive: false };

    try {
      setLoading(true);
      const now = Date.now();
      const draft = { ...input, id: 'test', createdAt: now, updatedAt: now };
      await (draft.type === 'm3u' ? testM3uConnection(draft) : testXtreamConnection(draft));
      const saved = await addStandalonePlaylist(input);
      if (!saved) throw new Error('Could not save the playlist.');

      try {
        await selectPlaylist(asPlaylist(saved));
      } catch {
        showAlert({
          type: 'warning',
          title: 'Playlist Saved',
          message: 'Open Manage Playlists to select this playlist.',
          buttons: [{ text: 'OK', style: 'primary', onPress: () => navigation.goBack() }],
        });
        return;
      }

      showAlert({
        type: 'success',
        title: 'Playlist Added',
        message: 'This playlist is now selected.',
        buttons: [{ text: 'OK', style: 'primary', onPress: () => navigation.popToTop() }],
      });
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Could Not Save Playlist',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.title}>Add Playlist</Text>
            <Text style={styles.subtitle}>Connect your IPTV playlist</Text>
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

        {/* Basic Information */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Playlist Information</Text>

          {renderInput('Playlist Name', name, setName, 'My IPTV Playlist', {
            autoCapitalize: 'sentences',
          })}

          {playlistType === 'xtream' ? (
            <>
              <View style={styles.divider} />

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
              <View style={styles.divider} />

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

        {/* Save */}
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
            <Text style={styles.saveButtonText}>Add Playlist</Text>
          )}
        </Pressable>

        <Text style={styles.footerText}>
          Your playlist credentials are saved locally on this device.
        </Text>
      </ScrollView>
    </View>
  );
}

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
});
