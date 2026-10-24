import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import type { Playlist, Stream } from '../models/model';

const MAIN_CACHE_DIR = `${RNFS.DocumentDirectoryPath}/iptv-cache`;
const PROFILE_KEY = '@iptv/selected_profile_v1';

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
