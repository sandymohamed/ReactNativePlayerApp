import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  useWindowDimensions,
  BackHandler,
  Pressable,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useGlobalContext} from '../context/GlobalContext';
import {colors} from '../theme/colors';
import {spacing, borderRadius} from '../theme/spacing';
import {typography} from '../theme/typography';
import {getSetting, setSetting, SETTINGS_KEYS} from '../utils/storage';
import {useTVEventHandler} from '../hooks/useTVEventHandler';
import SettingIcon from '../components/SettingIcon';

type SettingId = 'language' | 'parental' | 'stream' | 'time' | 'list';

interface SettingItem {
  id: SettingId;
  title: string;
}

const SETTINGS: SettingItem[] = [
  {id: 'language', title: 'Select Language'},
  {id: 'parental', title: 'Parental control'},
  {id: 'stream', title: 'Stream Format'},
  {id: 'time', title: 'Time Format'},
  {id: 'list', title: 'List Type'},
];

const LANGUAGE_OPTIONS = [{id: 'en', title: 'English'}];
const STREAM_OPTIONS = [{id: 'm3u8', title: 'm3u8'}, {id: 'ts', title: 'ts'}];
const TIME_OPTIONS = [{id: '12hours', title: '12 hours'}, {id: '24hours', title: '24 hours'}];
const LIST_OPTIONS = [{id: 'list', title: 'List'}, {id: 'grid', title: 'Grid'}];

const MIN_MODAL_HEIGHT = 420;
const MODAL_MAX_HEIGHT_PCT = 0.75;
const MODAL_PADDING_V = 80;

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {width, height} = useWindowDimensions();
  const {changeParental} = useGlobalContext();

  const modalHeight = Math.min(
    Math.max(MIN_MODAL_HEIGHT, height * MODAL_MAX_HEIGHT_PCT),
    height - MODAL_PADDING_V,
  );

  const [openModal, setOpenModal] = useState<SettingId | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [language, setLanguage] = useState('English');
  const [streamFormat, setStreamFormat] = useState('m3u8');
  const [timeFormat, setTimeFormat] = useState('24 hours');
  const [listType, setListType] = useState('List');
  const [parentalStatus, setParentalStatus] = useState('off');

  const wide = width >= 800;
  const numCols = wide ? 3 : 2;
  const cardWidth = wide
    ? (width - spacing.xl * 2 - spacing.md * (numCols - 1)) / numCols
    : (width - spacing.xl * 2 - spacing.md) / 2;

  const loadSettings = useCallback(async () => {
    const [lang, stream, time, list, pwd] = await Promise.all([
      getSetting(SETTINGS_KEYS.LANGUAGE),
      getSetting(SETTINGS_KEYS.STREAM_FORMAT),
      getSetting(SETTINGS_KEYS.TIME_FORMAT),
      getSetting(SETTINGS_KEYS.LIST_TYPE),
      getSetting(SETTINGS_KEYS.PARENTAL_PASSWORD),
    ]);
    setLanguage(lang === 'en' || !lang ? 'English' : lang);
    setStreamFormat(stream || 'm3u8');
    setTimeFormat(!time || time === '24hours' ? '24 hours' : '12 hours');
    setListType(list === 'grid' ? 'Grid' : 'List');
    setParentalStatus(pwd ? 'On' : 'off');
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openModal) {
        setOpenModal(null);
        return true;
      }
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation, openModal]);

  useTVEventHandler({
    onBack: () => {
      if (openModal) {
        setOpenModal(null);
        return;
      }
      navigation.goBack();
    },
    onSelect: () => {
      if (!openModal && SETTINGS[focusedIndex]) {
        setOpenModal(SETTINGS[focusedIndex].id);
      }
    },
    onUp: () => {
      if (openModal) return;
      setFocusedIndex(i => Math.max(0, i - numCols));
    },
    onDown: () => {
      if (openModal) return;
      setFocusedIndex(i => Math.min(SETTINGS.length - 1, i + numCols));
    },
    onLeft: () => {
      if (openModal) return;
      setFocusedIndex(i => Math.max(0, i - 1));
    },
    onRight: () => {
      if (openModal) return;
      setFocusedIndex(i => Math.min(SETTINGS.length - 1, i + 1));
    },
  });

  const getSubtitle = (id: SettingId) => {
    switch (id) {
      case 'language': return language;
      case 'parental': return parentalStatus;
      case 'stream': return streamFormat;
      case 'time': return timeFormat;
      case 'list': return listType;
      default: return '';
    }
  };

  const handleCloseModal = useCallback(() => {
    setOpenModal(null);
    loadSettings();
  }, [loadSettings]);

  const handleLanguage = async (id: string) => {
    await setSetting(SETTINGS_KEYS.LANGUAGE, id);
    handleCloseModal();
  };

  const handleStream = async (id: string) => {
    await setSetting(SETTINGS_KEYS.STREAM_FORMAT, id);
    handleCloseModal();
  };

  const handleTime = async (id: string) => {
    await setSetting(SETTINGS_KEYS.TIME_FORMAT, id);
    handleCloseModal();
  };

  const handleList = async (id: string) => {
    await setSetting(SETTINGS_KEYS.LIST_TYPE, id);
    handleCloseModal();
  };

  const handleParental = async (value: 'on' | 'off') => {
    if (value === 'off') {
      await setSetting(SETTINGS_KEYS.PARENTAL_PASSWORD, '');
      changeParental(false);
      setParentalStatus('off');
    } else {
      await setSetting(SETTINGS_KEYS.PARENTAL_PASSWORD, '1');
      changeParental(true);
      setParentalStatus('On');
    }
    handleCloseModal();
  };

  const renderOptionButton = (
    title: string,
    onPress: () => void,
    key?: string,
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.optionRow}>
      <Text style={styles.optionText}>{title}</Text>
      <Text style={styles.optionChevron}>›</Text>
    </TouchableOpacity>
  );

  const renderOptionsModal = () => {
    if (!openModal) return null;

    const titre =
      openModal === 'language' ? 'Select your language' :
      openModal === 'parental' ? 'Parental control' :
      openModal === 'stream' ? 'Select your stream type' :
      openModal === 'time' ? 'Select Time Format' :
      'Select List Type';

    if (openModal === 'parental') {
      return (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
            <View style={[styles.modalBox, {minHeight: modalHeight, maxHeight: modalHeight}]}>
              <Text style={styles.modalTitle}>{titre}</Text>
              <View style={styles.modalOptions}>
                {renderOptionButton('On', () => handleParental('on'))}
                {renderOptionButton('Off', () => handleParental('off'))}
              </View>
              <TouchableOpacity
                onPress={handleCloseModal}
                activeOpacity={0.8}
                style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      );
    }

    let options: {id: string; title: string}[] = [];
    let onSelect: (id: string) => void = () => {};

    if (openModal === 'language') {
      options = LANGUAGE_OPTIONS;
      onSelect = handleLanguage;
    } else if (openModal === 'stream') {
      options = STREAM_OPTIONS;
      onSelect = handleStream;
    } else if (openModal === 'time') {
      options = TIME_OPTIONS;
      onSelect = handleTime;
    } else if (openModal === 'list') {
      options = LIST_OPTIONS;
      onSelect = handleList;
    }

    return (
      <Modal visible animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseModal} />
          <View style={[styles.modalBox, {minHeight: modalHeight, maxHeight: modalHeight}]}>
            <Text style={styles.modalTitle}>{titre}</Text>
            <ScrollView
              style={styles.modalOptionsScroll}
              contentContainerStyle={styles.modalOptionsContent}
              showsVerticalScrollIndicator={true}>
              {options.map(opt =>
                renderOptionButton(opt.title, () => onSelect(opt.id), opt.id),
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={handleCloseModal}
              activeOpacity={0.8}
              style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={colors.gradients.dark} style={styles.background}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
            <Text style={styles.backLabel}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Setting</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.grid, {width: '100%', maxWidth: wide ? 900 : width - spacing.xl * 2}]}>
            {SETTINGS.map((item, index) => {
              const focused = !openModal && focusedIndex === index;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, {width: cardWidth}, focused && styles.cardFocused]}
                  onPress={() => {
                    setFocusedIndex(index);
                    setOpenModal(item.id);
                  }}
                  activeOpacity={0.85}>
                  <View style={[styles.cardTopBar, focused && styles.cardTopBarFocused]} />
                  <View style={styles.cardInner}>
                    <SettingIcon id={item.id} size={40} />
                    <Text style={[styles.cardTitle, focused && styles.cardTitleFocused]}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{getSubtitle(item.id)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
      {renderOptionsModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundCard,
  },
  backArrow: {
    fontSize: 20,
    color: colors.text,
    marginRight: spacing.xs,
  },
  backLabel: {
    ...typography.button,
    color: colors.text,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    minHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundTertiary,
  },
  cardTopBar: {
    height: 4,
    width: '33%',
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  cardTopBarFocused: {
    backgroundColor: colors.secondary,
  },
  cardTitleFocused: {
    color: colors.primaryLight,
  },
  cardInner: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
  },
  cardSubtitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'column',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  modalOptions: {
    marginBottom: spacing.sm,
  },
  modalOptionsScroll: {
    flex: 1,
    minHeight: 140,
  },
  modalOptionsContent: {
    paddingBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  optionChevron: {
    fontSize: 22,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalCloseBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  modalCloseBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
});

export default SettingsScreen;
