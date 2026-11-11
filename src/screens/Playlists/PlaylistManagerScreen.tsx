
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import type { StandalonePlaylist } from '../../models/model';

import {
  getStandalonePlaylists,
  getActiveStandalonePlaylistId,
  setActiveStandalonePlaylist,
  deleteStandalonePlaylist,
} from '../../utils/standaloneStorage';

import Logo from '../../components/Logo';
import { useAppAlert } from '../../components/AppAlert';

import { colors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

const PlaylistManagerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { showAlert } = useAppAlert();

  // Device layout
  const isTV = Platform.isTV;
  const isTablet = !isTV && width >= 768;
  const isMobile = !isTV && !isTablet;

  const [playlists, setPlaylists] = useState<StandalonePlaylist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(
    null,
  );

  const isBusy = loadingPlaylistId !== null;

  const layout = {
    headerMinHeight: isTV ? 82 : isTablet ? 72 : 60,
    headerPaddingHorizontal: isTV ? 36 : isTablet ? 28 : 16,
    headerPaddingVertical: isTV ? 12 : 8,
    logoSize: isTV ? 66 : isTablet ? 54 : 42,
    titleSize: isTV ? 25 : isTablet ? 22 : 18,
    subtitleSize: isTV ? 14 : 12,
    contentPaddingHorizontal: isTV ? 40 : isTablet ? 28 : 16,
    contentPaddingTop: isTV ? 24 : isTablet ? 18 : 12,
    cardPadding: isTV ? 20 : isTablet ? 17 : 13,
    cardGap: isTV ? 18 : 14,
    emptyPaddingVertical: isTV ? 28 : isTablet ? 22 : 12,
    emptyIconSize: isTV ? 72 : isTablet ? 64 : 48,
    emptyTitleSize: isTV ? 26 : isTablet ? 23 : 19,
    descriptionSize: isTV ? 14 : 12,
    instructionPadding: isTV ? 20 : isTablet ? 17 : 13,
  };

  // ==========================================
  // Load Playlists
  // ==========================================

  const loadPlaylists = useCallback(async () => {
    try {
      setIsLoading(true);

      const [savedPlaylists, activeId] = await Promise.all([
        getStandalonePlaylists(),
        getActiveStandalonePlaylistId(),
      ]);

      setPlaylists(savedPlaylists);
      setActivePlaylistId(activeId);
    } catch (error) {
      console.error('[PlaylistManager] Failed to load playlists:', error);

      showAlert({
        type: 'error',
        title: 'Something Went Wrong',
        message: 'Could not load your playlists. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      void loadPlaylists();
    }, [loadPlaylists]),
  );

  // ==========================================
  // Add Playlist
  // ==========================================

  const handleAddPlaylist = useCallback(() => {
    if (isBusy) {
      return;
    }

    navigation.navigate('AddPlaylist');
  }, [navigation, isBusy]);

  // ==========================================
  // Edit Playlist
  // ==========================================

  const handleEditPlaylist = useCallback(
    (playlist: StandalonePlaylist) => {
      if (isBusy) {
        return;
      }

      navigation.navigate('EditPlaylist', { playlist });
    },
    [navigation, isBusy],
  );

  // ==========================================
  // Select Active Playlist
  // ==========================================

  const handleSelectPlaylist = useCallback(
    async (playlist: StandalonePlaylist) => {
      if (playlist.id === activePlaylistId || isBusy) {
        return;
      }

      try {
        setLoadingPlaylistId(playlist.id);

        const success = await setActiveStandalonePlaylist(playlist.id);

        if (!success) {
          showAlert({
            type: 'error',
            title: 'Something Went Wrong',
            message: 'Could not activate this playlist. Please try again.',
          });

          return;
        }

        setActivePlaylistId(playlist.id);

        setPlaylists(previous =>
          previous.map(item => ({
            ...item,
            isActive: item.id === playlist.id,
          })),
        );
      } catch (error) {
        console.error('[PlaylistManager] Failed to activate playlist:', error);

        showAlert({
          type: 'error',
          title: 'Something Went Wrong',
          message: 'Something went wrong while selecting this playlist.',
        });
      } finally {
        setLoadingPlaylistId(null);
      }
    },
    [activePlaylistId, isBusy, showAlert],
  );

  // ==========================================
  // Delete Playlist
  // ==========================================

  const handleDeletePlaylist = useCallback(
    (playlist: StandalonePlaylist) => {
      if (isBusy) {
        return;
      }

      showAlert({
        type: 'warning',
        title: 'Delete Playlist',
        message: `Are you sure you want to delete "${playlist.name}"?`,
        dismissible: false,
        buttons: [
          {
            text: 'Cancel',
            style: 'secondary',
          },
          {
            text: 'Delete',
            style: 'danger',
            onPress: async () => {
              try {
                setLoadingPlaylistId(playlist.id);

                const success = await deleteStandalonePlaylist(playlist.id);

                if (!success) {
                  showAlert({
                    type: 'error',
                    title: 'Delete Failed',
                    message:
                      'Could not delete this playlist. Please try again.',
                  });

                  return;
                }

                await loadPlaylists();

                showAlert({
                  type: 'success',
                  title: 'Playlist Deleted',
                  message: `"${playlist.name}" has been deleted successfully.`,
                });
              } catch (error) {
                console.error(
                  '[PlaylistManager] Failed to delete playlist:',
                  error,
                );

                showAlert({
                  type: 'error',
                  title: 'Something Went Wrong',
                  message:
                    'An unexpected error occurred while deleting this playlist.',
                });
              } finally {
                setLoadingPlaylistId(null);
              }
            },
          },
        ],
      });
    },
    [isBusy, loadPlaylists, showAlert],
  );

  // ==========================================
  // Render Playlist Card
  // ==========================================

  const renderPlaylist = useCallback(
    ({ item }: { item: StandalonePlaylist; index: number }) => {
      // The stored active ID is the single source of truth.
      const isActive = activePlaylistId === item.id;
      const isItemLoading = loadingPlaylistId === item.id;

      return (
        <View
          style={[
            styles.playlistCard,
            {
              padding: layout.cardPadding,
            },
            isActive && styles.activePlaylistCard,
          ]}>
          <View style={styles.cardHeader}>
            <View style={styles.playlistIdentity}>
              <View
                style={[
                  styles.playlistIcon,
                  isActive && styles.activePlaylistIcon,
                ]}>
                <Text style={styles.playlistIconText}>
                  {item.type === 'xtream' ? 'XT' : 'M3U'}
                </Text>
              </View>

              <View style={styles.playlistInfo}>
                <Text
                  style={[
                    styles.playlistName,
                    isTV && styles.playlistNameTV,
                  ]}
                  numberOfLines={1}>
                  {item.name}
                </Text>

                <Text style={styles.playlistType}>
                  {item.type === 'xtream' ? 'Xtream Codes' : 'M3U Playlist'}
                </Text>
              </View>
            </View>

            {isActive && (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.playlistDetails}>
            {item.type === 'xtream' ? (
              <>
                <Text style={styles.detailLabel}>SERVER</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.host || 'Not available'}
                </Text>

                <Text style={styles.detailLabel}>USERNAME</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {item.username || 'Not available'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.detailLabel}>M3U URL</Text>
                <Text style={styles.detailValue} numberOfLines={2}>
                  {item.m3uUrl || 'Not available'}
                </Text>
              </>
            )}
          </View>

          <View style={styles.cardActions}>
            <Pressable
              focusable
              disabled={isBusy || isActive}
              onPress={() => handleSelectPlaylist(item)}
              style={({ focused }) => [
                styles.actionButton,
                styles.selectButton,
                isActive && styles.selectedButton,
                focused && styles.buttonFocused,
                (isBusy || isActive) && styles.buttonDisabled,
              ]}>
              {isItemLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.actionButtonText}>
                  {isActive ? 'Selected' : 'Select'}
                </Text>
              )}
            </Pressable>

            <Pressable
              focusable
              disabled={isBusy}
              onPress={() => handleEditPlaylist(item)}
              style={({ focused }) => [
                styles.actionButton,
                styles.editButton,
                focused && styles.buttonFocused,
                isBusy && styles.buttonDisabled,
              ]}>
              <Text style={styles.actionButtonText}>Edit</Text>
            </Pressable>

            <Pressable
              focusable
              disabled={isBusy}
              onPress={() => handleDeletePlaylist(item)}
              style={({ focused }) => [
                styles.actionButton,
                styles.deleteButton,
                focused && styles.deleteButtonFocused,
                isBusy && styles.buttonDisabled,
              ]}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [
      activePlaylistId,
      loadingPlaylistId,
      isBusy,
      isTV,
      layout.cardPadding,
      handleSelectPlaylist,
      handleEditPlaylist,
      handleDeletePlaylist,
    ],
  );

  // ==========================================
  // Empty State
  // ==========================================

  const renderEmptyState = () => (
    <ScrollView
      style={styles.emptyScroll}
      contentContainerStyle={[
        styles.emptyScrollContent,
        {
          paddingHorizontal: layout.contentPaddingHorizontal,
          paddingVertical: layout.emptyPaddingVertical,
        },
      ]}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.emptyContainer,
          isTV && styles.emptyContainerTV,
        ]}>
        <View
          style={[
            styles.emptyIconContainer,
            {
              width: layout.emptyIconSize,
              height: layout.emptyIconSize,
              borderRadius: isMobile ? 16 : 22,
            },
          ]}>
          <Text
            style={[
              styles.emptyIcon,
              { fontSize: layout.emptyIconSize * 0.5 },
            ]}>
            ▤
          </Text>
        </View>

        <Text
          style={[
            styles.emptyTitle,
            { fontSize: layout.emptyTitleSize },
          ]}>
          No Playlists Yet
        </Text>

        <Text
          style={[
            styles.emptySubtitle,
            { fontSize: isTV ? 16 : 13 },
          ]}>
          Let's get you started!
        </Text>

        <Text
          style={[
            styles.emptyDescription,
            {
              fontSize: layout.descriptionSize,
              lineHeight: layout.descriptionSize * 1.6,
              marginBottom: isMobile ? spacing.md : spacing.lg,
            },
          ]}>
          You haven't added any playlists yet. Add a playlist to start watching
          your favorite Live TV channels, Movies, and Series.
        </Text>

        <View
          style={[
            styles.instructionsContainer,
            {
              padding: layout.instructionPadding,
              marginBottom: spacing.md,
            },
          ]}>
          <Text
            style={[
              styles.instructionsTitle,
              { fontSize: isTV ? 17 : 14 },
            ]}>
            How can you add a playlist?
          </Text>

          {/* Provider */}
          <View style={styles.instructionItem}>
            <View style={styles.instructionIconContainer}>
              <Text style={styles.instructionIcon}>TV</Text>
            </View>

            <View style={styles.instructionTextContainer}>
              <Text style={styles.instructionItemTitle}>
                Provider Playlist
              </Text>

              <Text style={styles.instructionItemDescription}>
                If you have a subscription or activation from an IPTV provider,
                your provider can supply the playlist details needed to access
                its channels and content.
              </Text>
            </View>
          </View>

          <View style={styles.instructionDivider} />

          {/* Xtream */}
          <View style={styles.instructionItem}>
            <View style={styles.instructionIconContainer}>
              <Text style={styles.instructionIcon}>XT</Text>
            </View>

            <View style={styles.instructionTextContainer}>
              <Text style={styles.instructionItemTitle}>Xtream Codes</Text>

              <Text style={styles.instructionItemDescription}>
                Choose this option if your IPTV provider gave you a Server URL,
                Username, and Password. Enter these details to connect your
                playlist.
              </Text>
            </View>
          </View>

          <View style={styles.instructionDivider} />

          {/* M3U */}
          <View style={styles.instructionItem}>
            <View style={styles.instructionIconContainer}>
              <Text style={styles.instructionIcon}>M3U</Text>
            </View>

            <View style={styles.instructionTextContainer}>
              <Text style={styles.instructionItemTitle}>M3U Playlist</Text>

              <Text style={styles.instructionItemDescription}>
                Choose this option if you have an M3U playlist link. Paste the
                URL provided by your IPTV service to connect it.
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.emptyFooter}>
          You can add, edit, or switch between your playlists anytime.
        </Text>
      </View>
    </ScrollView>
  );

  // ==========================================
  // Main Render
  // ==========================================

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            minHeight: layout.headerMinHeight,
            paddingHorizontal: layout.headerPaddingHorizontal,
            paddingVertical: layout.headerPaddingVertical,
          },
        ]}>
        <View style={styles.headerLeft}>
          <Logo size={layout.logoSize} />

          <View style={styles.headerTextContainer}>
            <Text
              style={[
                styles.headerTitle,
                { fontSize: layout.titleSize },
              ]}>
              My Playlists
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                { fontSize: layout.subtitleSize },
              ]}>
              Manage your IPTV playlists
            </Text>
          </View>
        </View>

        {/* Keep the primary action visible at the top, including empty state. */}
        {!isLoading && (
          <Pressable
            focusable
            hasTVPreferredFocus={isTV && playlists.length === 0}
            disabled={isBusy}
            onPress={handleAddPlaylist}
            style={({ focused }) => [
              styles.addButton,
              isTV && styles.addButtonTV,
              isMobile && styles.addButtonMobile,
              focused && styles.buttonFocused,
              isBusy && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Add playlist">
            <Text style={styles.addButtonIcon}>＋</Text>
            <Text style={styles.addButtonText}>Add Playlist</Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading playlists...</Text>
        </View>
      ) : playlists.length === 0 ? (
        renderEmptyState()
      ) : (
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: layout.contentPaddingHorizontal,
              paddingTop: layout.contentPaddingTop,
            },
          ]}>
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { fontSize: isTV ? 20 : isTablet ? 18 : 16 },
              ]}>
              Your Playlists
            </Text>

            <Text style={styles.playlistCount}>
              {playlists.length}{' '}
              {playlists.length === 1 ? 'Playlist' : 'Playlists'}
            </Text>
          </View>

          <FlatList
            key={isTV || isTablet ? 'large-grid' : 'mobile-list'}
            data={playlists}
            keyExtractor={item => item.id}
            renderItem={renderPlaylist}
            numColumns={isTV || isTablet ? 2 : 1}
            contentContainerStyle={[
              styles.listContent,
              { gap: layout.cardGap },
            ]}
            columnWrapperStyle={
              isTV || isTablet
                ? [styles.columnWrapper, { gap: layout.cardGap }]
                : undefined
            }
            showsVerticalScrollIndicator={false}
            extraData={{ activePlaylistId, loadingPlaylistId }}
          />
        </View>
      )}
    </View>
  );
};

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.textTertiary,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  addButton: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  addButtonTV: {
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  addButtonMobile: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  addButtonIcon: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  addButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  // Content
  content: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  playlistCount: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  columnWrapper: {
    alignItems: 'stretch',
  },

  // Playlist Card
  playlistCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.textTertiary,
    backgroundColor: colors.backgroundCard,
  },
  activePlaylistCard: {
    borderColor: colors.success,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  playlistIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  playlistIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(99,102,241,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePlaylistIcon: {
    backgroundColor: 'rgba(16,185,129,0.13)',
  },
  playlistIconText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  playlistInfo: {
    flex: 1,
    minWidth: 0,
  },
  playlistName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  playlistNameTV: {
    fontSize: 17,
  },
  playlistType: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: 4,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  activeBadgeText: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '900',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textTertiary,
    marginVertical: spacing.sm,
  },
  playlistDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailLabel: {
    color: colors.textTertiary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: spacing.xs,
  },
  detailValue: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  selectButton: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: 'rgba(99,102,241,0.35)',
  },
  selectedButton: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: colors.textTertiary,
  },
  deleteButton: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.25)',
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 11,
    fontWeight: '800',
  },
  buttonFocused: {
    borderWidth: 2,
    borderColor: colors.focus,
    backgroundColor: 'rgba(99,102,241,0.28)',
    transform: [{ scale: 1.035 }],
  },
  deleteButtonFocused: {
    borderWidth: 2,
    borderColor: colors.error,
    backgroundColor: 'rgba(239,68,68,0.18)',
    transform: [{ scale: 1.035 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Loading
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textTertiary,
    fontSize: 13,
  },

  // Empty State
  emptyScroll: {
    flex: 1,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    alignItems: 'center',
  },
  emptyContainerTV: {
    maxWidth: 900,
  },
  emptyIconContainer: {
    backgroundColor: 'rgba(99,102,241,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyIcon: {
    color: colors.textSecondary,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyDescription: {
    maxWidth: 520,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // Empty State Instructions
  instructionsContainer: {
    width: '100%',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.textTertiary,
    backgroundColor: colors.backgroundCard,
  },
  instructionsTitle: {
    color: colors.text,
    fontWeight: '900',
    marginBottom: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  instructionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionIcon: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  instructionTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  instructionItemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  instructionItemDescription: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  instructionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.textTertiary,
    marginVertical: spacing.md,
  },
  emptyFooter: {
    color: colors.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
});

export default PlaylistManagerScreen;
