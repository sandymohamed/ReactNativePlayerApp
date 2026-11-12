import { StandalonePlaylist } from '../models/model';
import { clearStandalonePositions } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearStandalonePlaylistActivity,
} from './standaloneActivityStorage';
// ==========================================
// Standalone Playlist Storage
// ==========================================

const STANDALONE_PLAYLISTS_KEY = '@velotv/standalone_playlists_v1';
const STANDALONE_ACTIVE_PLAYLIST_KEY = '@velotv/standalone_active_playlist_v1';

/**
 * Get all standalone playlists
 */
export const getStandalonePlaylists = async (): Promise<
  StandalonePlaylist[]
> => {
  try {
    const stored = await AsyncStorage.getItem(STANDALONE_PLAYLISTS_KEY);

    if (!stored) {
      return [];
    }

    const playlists = JSON.parse(stored);

    return Array.isArray(playlists) ? playlists : [];
  } catch (error) {
    console.error('[Standalone Storage] Failed to get playlists:', error);

    return [];
  }
};

/**
 * Save all standalone playlists
 */
export const saveStandalonePlaylists = async (
  playlists: StandalonePlaylist[],
): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(
      STANDALONE_PLAYLISTS_KEY,
      JSON.stringify(playlists),
    );

    return true;
  } catch (error) {
    console.error('[Standalone Storage] Failed to save playlists:', error);

    return false;
  }
};

/**
 * Add a new standalone playlist
 */
export const addStandalonePlaylist = async (
  playlist: Omit<StandalonePlaylist, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<StandalonePlaylist | null> => {
  try {
    const playlists = await getStandalonePlaylists();
    const now = Date.now();

    const newPlaylist: StandalonePlaylist = {
      ...playlist,
      id: `playlist_${now}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    const updatedPlaylists = [...playlists, newPlaylist];

    const saved = await saveStandalonePlaylists(updatedPlaylists);

    if (!saved) {
      return null;
    }

    return newPlaylist;
  } catch (error) {
    console.error('[Standalone Storage] Failed to add playlist:', error);

    return null;
  }
};

/**
 * Update an existing standalone playlist
 */
export const updateStandalonePlaylist = async (
  id: string,
  updates: Partial<Omit<StandalonePlaylist, 'id' | 'createdAt'>>,
): Promise<boolean> => {
  try {
    const playlists = await getStandalonePlaylists();

    const index = playlists.findIndex(item => item.id === id);

    if (index === -1) {
      return false;
    }

    playlists[index] = {
      ...playlists[index],
      ...updates,
      id,
      createdAt: playlists[index].createdAt,
      updatedAt: Date.now(),
    };

    return await saveStandalonePlaylists(playlists);
  } catch (error) {
    console.error('[Standalone Storage] Failed to update playlist:', error);

    return false;
  }
};

export const deleteStandalonePlaylist = async (
  id: string,
): Promise<boolean> => {
  try {
    const playlists = await getStandalonePlaylists();

    const updatedPlaylists = playlists.filter(
      item => item.id !== id,
    );

    if (updatedPlaylists.length === playlists.length) {
      return false;
    }

    const saved = await saveStandalonePlaylists(updatedPlaylists);

    if (!saved) {
      return false;
    }

    const activeId = await getActiveStandalonePlaylistId();

    if (activeId === id) {
      if (updatedPlaylists.length > 0) {
        await setActiveStandalonePlaylist(updatedPlaylists[0].id);
      } else {
        await clearActiveStandalonePlaylist();
      }
    }

    // Remove local Favorites and Recent for the deleted playlist.
    await clearStandalonePlaylistActivity(id);
    await clearStandalonePositions(id).catch(() => undefined);

    return true;
  } catch (error) {
    console.error(
      '[Standalone Storage] Failed to delete playlist:',
      error,
    );

    return false;
  }
};

/**
 * Set active standalone playlist
 */
export const setActiveStandalonePlaylist = async (
  id: string,
): Promise<boolean> => {
  try {
    const playlists = await getStandalonePlaylists();

    const exists = playlists.some(item => item.id === id);

    if (!exists) {
      return false;
    }

    const updatedPlaylists = playlists.map(item => ({
      ...item,
      isActive: item.id === id,
    }));

    const saved = await saveStandalonePlaylists(updatedPlaylists);

    if (!saved) {
      return false;
    }

    await AsyncStorage.setItem(STANDALONE_ACTIVE_PLAYLIST_KEY, id);

    return true;
  } catch (error) {
    console.error('[Standalone Storage] Failed to set active playlist:', error);

    return false;
  }
};

/**
 * Get active standalone playlist ID
 */
export const getActiveStandalonePlaylistId = async (): Promise<
  string | null
> => {
  try {
    return await AsyncStorage.getItem(STANDALONE_ACTIVE_PLAYLIST_KEY);
  } catch (error) {
    console.error(
      '[Standalone Storage] Failed to get active playlist ID:',
      error,
    );

    return null;
  }
};

/**
 * Get active standalone playlist
 */
export const getActiveStandalonePlaylist =
  async (): Promise<StandalonePlaylist | null> => {
    try {
      const playlists = await getStandalonePlaylists();
      const activeId = await getActiveStandalonePlaylistId();

      if (!activeId) {
        return null;
      }

      return playlists.find(item => item.id === activeId) ?? null;
    } catch (error) {
      console.error(
        '[Standalone Storage] Failed to get active playlist:',
        error,
      );

      return null;
    }
  };

/**
 * Clear active standalone playlist
 */
export const clearActiveStandalonePlaylist = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(STANDALONE_ACTIVE_PLAYLIST_KEY);

    return true;
  } catch (error) {
    console.error(
      '[Standalone Storage] Failed to clear active playlist:',
      error,
    );

    return false;
  }
};
