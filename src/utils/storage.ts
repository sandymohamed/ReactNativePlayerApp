import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import type { Playlist, Stream } from '../models/model';

const MAIN_CACHE_DIR = `${RNFS.DocumentDirectoryPath}/iptv-cache`;
const PROFILE_KEY = '@iptv/selected_profile_v1';


export const SETTINGS_KEYS = {
  LANGUAGE: 'language',
  STREAM_FORMAT: 'streamFormat',
  TIME_FORMAT: 'timeformat',
  LIST_TYPE: 'listType',
  PARENTAL_PASSWORD: 'password',
} as const;

export interface MainDataCache {
  catLive: any[];
  listLive: Stream[];
  catVod: any[];
  listVod: Stream[];
  catSerie: any[];
  listSerie: Stream[];
  listLiveFav: string[];
  listVodFav: string[];
  listSerieFav: string[];
  listLiveRecent: string[];
  listVodRecent: string[];
  listSerieRecent: string[];
  updatedAt: number;
}

const CACHE_FILES = {
  catLive: 'cat-live.json',
  listLive: 'live.json',
  catVod: 'cat-vod.json',
  listVod: 'vod.json',
  catSerie: 'cat-series.json',
  listSerie: 'series.json',
  listLiveFav: 'live-favorites.json',
  listVodFav: 'vod-favorites.json',
  listSerieFav: 'series-favorites.json',
  listLiveRecent: 'live-recent.json',
  listVodRecent: 'vod-recent.json',
  listSerieRecent: 'series-recent.json',
  updatedAt: 'metadata.json',
} as const;

export async function getSetting(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error('getSetting', key, e);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error('setSetting', key, e);
  }
}

export const storeVideoPositions = async (videoPositions: any) => {
  try {
    const jsonVideoPositions = JSON.stringify(videoPositions);
    await AsyncStorage.setItem('vodPositions', jsonVideoPositions);
    console.log("Video positions stored successfully:", await getVideoPositions());
  } catch (error) {
    console.error('Error storing video positions:', error);
  }
};

export const getVideoPositions = async (): Promise<any> => {
  try {
    const jsonVideoPositions = await AsyncStorage.getItem('vodPositions');
    return jsonVideoPositions ? JSON.parse(jsonVideoPositions) : {};
  } catch (error) {
    console.error('Error getting video positions:', error);
    return {};
  }
};

export const storeSeriePositions = async (videoPositions: any) => {
  try {
    const jsonVideoPositions = JSON.stringify(videoPositions);
    await AsyncStorage.setItem('seriePositions', jsonVideoPositions);
    console.log("Serie positions stored successfully:", await getSeriePositions());
  } catch (error) {
    console.error('Error storing serie positions:', error);
  }
};

export const getSeriePositions = async (): Promise<any> => {
  try {
    const jsonVideoPositions = await AsyncStorage.getItem('seriePositions');
    return jsonVideoPositions ? JSON.parse(jsonVideoPositions) : {};
  } catch (error) {
    console.error('Error getting serie positions:', error);
    return {};
  }
};

async function ensureCacheDirectory(): Promise<void> {
  await RNFS.mkdir(MAIN_CACHE_DIR);
}

async function writeJsonFile(filename: string, value: unknown): Promise<void> {
  const destination = `${MAIN_CACHE_DIR}/${filename}`;
  const temporary = `${destination}.tmp`;

  await RNFS.writeFile(temporary, JSON.stringify(value), 'utf8');

  // Replace the previous file only after writing the new one.
  if (await RNFS.exists(destination)) {
    await RNFS.unlink(destination);
  }

  await RNFS.moveFile(temporary, destination);
}

async function readJsonFile<T>(filename: string, fallback: T): Promise<T> {
  const path = `${MAIN_CACHE_DIR}/${filename}`;

  try {
    if (!(await RNFS.exists(path))) {
      return fallback;
    }

    const contents = await RNFS.readFile(path, 'utf8');
    return JSON.parse(contents) as T;
  } catch (error) {
    console.error(`Failed to read ${filename}:`, error);
    return fallback;
  }
}

export async function saveSelectedProfile(
  profile: Playlist | null,
): Promise<void> {
  try {
    if (profile) {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(PROFILE_KEY);
    }
  } catch (error) {
    console.error('saveSelectedProfile:', error);
  }
}

export async function getSelectedProfile(): Promise<Playlist | null> {
  try {
    const value = await AsyncStorage.getItem(PROFILE_KEY);
    return value ? (JSON.parse(value) as Playlist) : null;
  } catch (error) {
    console.error('getSelectedProfile:', error);
    return null;
  }
}

export async function saveMainData(data: MainDataCache): Promise<void> {
  await ensureCacheDirectory();

  const keys = Object.keys(CACHE_FILES).filter(
    key => key !== 'updatedAt',
  ) as Array<Exclude<keyof typeof CACHE_FILES, 'updatedAt'>>;

  for (const key of keys) {
    await writeJsonFile(CACHE_FILES[key], data[key]);
  }

  await writeJsonFile(CACHE_FILES.updatedAt, {
    updatedAt: data.updatedAt,
  });
}

export async function getMainData(): Promise<MainDataCache | null> {
  try {
    await ensureCacheDirectory();

    const [
      catLive,
      listLive,
      catVod,
      listVod,
      catSerie,
      listSerie,
      listLiveFav,
      listVodFav,
      listSerieFav,
      listLiveRecent,
      listVodRecent,
      listSerieRecent,
      metadata,
    ] = await Promise.all([
      readJsonFile<any[]>(CACHE_FILES.catLive, []),
      readJsonFile<Stream[]>(CACHE_FILES.listLive, []),
      readJsonFile<any[]>(CACHE_FILES.catVod, []),
      readJsonFile<Stream[]>(CACHE_FILES.listVod, []),
      readJsonFile<any[]>(CACHE_FILES.catSerie, []),
      readJsonFile<Stream[]>(CACHE_FILES.listSerie, []),
      readJsonFile<string[]>(CACHE_FILES.listLiveFav, []),
      readJsonFile<string[]>(CACHE_FILES.listVodFav, []),
      readJsonFile<string[]>(CACHE_FILES.listSerieFav, []),
      readJsonFile<string[]>(CACHE_FILES.listLiveRecent, []),
      readJsonFile<string[]>(CACHE_FILES.listVodRecent, []),
      readJsonFile<string[]>(CACHE_FILES.listSerieRecent, []),
      readJsonFile<{ updatedAt: number } | null>(CACHE_FILES.updatedAt, null),
    ]);

    // The metadata file is written last, marking a completed save.
    if (!metadata || typeof metadata.updatedAt !== 'number') {
      return null;
    }

    return {
      catLive,
      listLive,
      catVod,
      listVod,
      catSerie,
      listSerie,
      listLiveFav,
      listVodFav,
      listSerieFav,
      listLiveRecent,
      listVodRecent,
      listSerieRecent,
      updatedAt: metadata.updatedAt,
    };
  } catch (error) {
    console.error('getMainData:', error);
    return null;
  }
}

export async function clearMainData(): Promise<void> {
  try {
    if (await RNFS.exists(MAIN_CACHE_DIR)) {
      await RNFS.unlink(MAIN_CACHE_DIR);
    }
  } catch (error) {
    console.error('clearMainData:', error);
  }
}





const DEVICE_IDENTITY_KEY = '@iptv/device_identity_v1';

export type DeviceIdentity = {
  mac: string;
  version: string;
  type: number;
};

export async function getDeviceIdentity(): Promise<DeviceIdentity | null> {
  try {
    const value = await AsyncStorage.getItem(DEVICE_IDENTITY_KEY);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as DeviceIdentity;
  } catch (error) {
    console.error('Failed to read device identity:', error);
    return null;
  }
}

export async function saveDeviceIdentityOnce(
  identity: DeviceIdentity,
): Promise<DeviceIdentity> {
  const existing = await getDeviceIdentity();

  if (existing) {
    return existing;
  }

  const mac = identity.mac.trim().toLowerCase();

  if (
    !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(mac) ||
    mac === '02:00:00:00:00:00' ||
    mac === '00:00:00:00:00:00' ||
    mac === 'ff:ff:ff:ff:ff:ff'
  ) {
    throw new Error(
      'The device MAC address is unavailable or invalid.',
    );
  }

  const savedIdentity: DeviceIdentity = {
    ...identity,
    mac,
  };

  await AsyncStorage.setItem(
    DEVICE_IDENTITY_KEY,
    JSON.stringify(savedIdentity),
  );

  return savedIdentity;
}