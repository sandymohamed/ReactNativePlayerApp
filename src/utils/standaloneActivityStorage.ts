
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ContentType = 'live' | 'movie' | 'series';

export interface StandaloneActivity {
  favorites: Record<ContentType, string[]>;
  recents: Record<ContentType, string[]>;
}

const STORAGE_PREFIX = '@velotv/standalone_activity_v1:';
const DEFAULT_RECENT_LIMIT = 50;

const getStorageKey = (playlistId: string): string =>
  `${STORAGE_PREFIX}${playlistId}`;

const createEmptyActivity = (): StandaloneActivity => ({
  favorites: {
    live: [],
    movie: [],
    series: [],
  },
  recents: {
    live: [],
    movie: [],
    series: [],
  },
});

const normalizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      item =>
        typeof item === 'string' ||
        typeof item === 'number',
    )
    .map(String);
};

const normalizeActivity = (data: any): StandaloneActivity => {
  const empty = createEmptyActivity();

  return {
    favorites: {
      live: normalizeIds(data?.favorites?.live),
      movie: normalizeIds(data?.favorites?.movie),
      series: normalizeIds(data?.favorites?.series),
    },
    recents: {
      live: normalizeIds(data?.recents?.live),
      movie: normalizeIds(data?.recents?.movie),
      series: normalizeIds(data?.recents?.series),
    },
  };
};

/**
 * Get all local activity for a specific playlist.
 */
export const getStandaloneActivity = async (
  playlistId: string,
): Promise<StandaloneActivity> => {
  try {
    const stored = await AsyncStorage.getItem(
      getStorageKey(playlistId),
    );

    if (!stored) {
      return createEmptyActivity();
    }

    return normalizeActivity(JSON.parse(stored));
  } catch (error) {
    console.error('[Standalone Activity] Read error:', error);
    return createEmptyActivity();
  }
};

/**
 * Save all activity for a specific playlist.
 */
export const saveStandaloneActivity = async (
  playlistId: string,
  activity: StandaloneActivity,
): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(
      getStorageKey(playlistId),
      JSON.stringify(normalizeActivity(activity)),
    );

    return true;
  } catch (error) {
    console.error('[Standalone Activity] Save error:', error);
    return false;
  }
};

/**
 * Check whether an item is a favorite.
 */
export const isStandaloneFavorite = async (
  playlistId: string,
  type: ContentType,
  streamId: string | number,
): Promise<boolean> => {
  const activity = await getStandaloneActivity(playlistId);

  return activity.favorites[type].includes(String(streamId));
};

/**
 * Add or remove an item from favorites.
 * Returns the new favorite state, or null if saving failed.
 */
export const toggleStandaloneFavorite = async (
  playlistId: string,
  type: ContentType,
  streamId: string | number,
): Promise<boolean | null> => {
  try {
    const activity = await getStandaloneActivity(playlistId);
    const id = String(streamId);

    const exists = activity.favorites[type].includes(id);

    activity.favorites[type] = exists
      ? activity.favorites[type].filter(item => item !== id)
      : [...activity.favorites[type], id];

    const saved = await saveStandaloneActivity(
      playlistId,
      activity,
    );

    return saved ? !exists : null;
  } catch (error) {
    console.error('[Standalone Activity] Toggle favorite error:', error);
    return null;
  }
};

/**
 * Add an item to recent history.
 * The latest item is always placed first.
 */
export const addStandaloneRecent = async (
  playlistId: string,
  type: ContentType,
  streamId: string | number,
  limit: number = DEFAULT_RECENT_LIMIT,
): Promise<boolean> => {
  try {
    const activity = await getStandaloneActivity(playlistId);
    const id = String(streamId);

    const safeLimit = Math.max(1, limit);

    activity.recents[type] = [
      id,
      ...activity.recents[type].filter(item => item !== id),
    ].slice(0, safeLimit);

    return await saveStandaloneActivity(
      playlistId,
      activity,
    );
  } catch (error) {
    console.error('[Standalone Activity] Add recent error:', error);
    return false;
  }
};

/**
 * Remove an item from favorites.
 */
export const removeStandaloneFavorite = async (
  playlistId: string,
  type: ContentType,
  streamId: string | number,
): Promise<boolean> => {
  try {
    const activity = await getStandaloneActivity(playlistId);
    const id = String(streamId);

    activity.favorites[type] =
      activity.favorites[type].filter(item => item !== id);

    return await saveStandaloneActivity(
      playlistId,
      activity,
    );
  } catch (error) {
    console.error('[Standalone Activity] Remove favorite error:', error);
    return false;
  }
};

/**
 * Remove an item from recent history.
 */
export const removeStandaloneRecent = async (
  playlistId: string,
  type: ContentType,
  streamId: string | number,
): Promise<boolean> => {
  try {
    const activity = await getStandaloneActivity(playlistId);
    const id = String(streamId);

    activity.recents[type] =
      activity.recents[type].filter(item => item !== id);

    return await saveStandaloneActivity(
      playlistId,
      activity,
    );
  } catch (error) {
    console.error('[Standalone Activity] Remove recent error:', error);
    return false;
  }
};

/**
 * Clear all activity belonging to a playlist.
 */
export const clearStandalonePlaylistActivity = async (
  playlistId: string,
): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(getStorageKey(playlistId));
    return true;
  } catch (error) {
    console.error('[Standalone Activity] Clear error:', error);
    return false;
  }
};
