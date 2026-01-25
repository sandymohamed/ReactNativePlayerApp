import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {useGlobalContext} from '../context/GlobalContext';
import {LoginModel, Playlist} from '../models/model';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import Logo from '../components/Logo';
import Button from '../components/Button';
import {RootStackParamList} from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {changeDeviceInfo, changeProfile} = useGlobalContext();
  const [mac, setMac] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileList, setProfileList] = useState<Playlist[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<number>(0);

  useEffect(() => {
    initializeDevice();
  }, []);

  /**
   * Device info logic aligned with web (Home.tsx):
   * - Tizen (Samsung TV): Tizen.info.mac, type 3
   * - WebOS (LG TV): WebOs.info.mac, type 5
   * - Fallback (browser / React Native): "b8:b4:09:45:24:f6", "1.0.2", type 3
   * React Native has no Tizen/WebOS, so we use the same fallback as web.
   */
  const initializeDevice = async () => {
    try {
      const defaultMac = 'b8:b4:09:45:24:f6';
      const defaultVersion = '1.0.2';
      const defaultType = 3;

      changeDeviceInfo({
        mac: defaultMac,
        version: defaultVersion,
        type: defaultType,
      });

      setMac(defaultMac);
      callService(defaultMac, defaultVersion, defaultType);
    } catch (error) {
      console.error('Error initializing device:', error);
    }
  };

  /** Same as web (Home.tsx): derive password from MAC. */
  const getPassword = (chaine: string): string => {
    let chaineEncode = '';
    const cleaned = chaine.replace(/:/gi, '');
    for (let i = 0; i < cleaned.length; i++) {
      chaineEncode += cleaned.charCodeAt(i).toString();
    }
    return chaineEncode.substring(0, 6);
  };

  /** POST to devices/login, same as web (Home.tsx). */
  const callService = async (
    macAddress: string,
    version: string,
    type: number,
  ) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        'https://api.uiplayer.com/api/apps/devices/login',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            mac: macAddress,
            password: getPassword(macAddress),
            type: String(type),
            version,
          }),
        },
      );

      const data: LoginModel = await response.json();

      if (data.status === -1) {
        setError('Subscription expired');
        return;
      }
      if (data.status === 0) {
        setError('Trial or limited access');
        return;
      }

      if (data && data.playlist && data.playlist.length > 0) {
        setProfileList(data.playlist);
        if (data.playlist.length === 1) {
          handleProfileSelect(data.playlist[0]);
        }
      } else {
        setError('No profiles found for this device');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!mac) {
      setError('MAC address is required');
      return;
    }
    callService(mac, '1.0.0', 5);
  };

  const handleProfileSelect = (profile: Playlist) => {
    changeProfile(profile);
    navigation.replace('Main');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient
        colors={colors.gradients.dark}
        style={styles.gradient}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Logo size={100} />
            <Text style={styles.title}>IPTV Player</Text>
            <Text style={styles.subtitle}>Modern Streaming Experience</Text>
          </View>

          <View style={styles.formContainer}>
            {profileList.length === 0 ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>MAC Address</Text>
                  <TextInput
                    style={styles.input}
                    value={mac}
                    onChangeText={setMac}
                    placeholder="Enter MAC address"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Button
                  title={loading ? 'Connecting...' : 'Connect'}
                  onPress={handleLogin}
                  loading={loading}
                  style={styles.button}
                />
              </>
            ) : (
              <View style={styles.profileContainer}>
                <Text style={styles.profileTitle}>Select Profile</Text>
                {profileList.map((profile, index) => (
                  <Button
                    key={profile.id}
                    title={profile.profile_name}
                    onPress={() => handleProfileSelect(profile)}
                    variant={selectedProfile === index ? 'primary' : 'outline'}
                    style={styles.profileButton}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.md,
  },
  profileContainer: {
    width: '100%',
  },
  profileTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  profileButton: {
    marginBottom: spacing.md,
  },
});

export default HomeScreen;
