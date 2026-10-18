import AsyncStorage from '@react-native-async-storage/async-storage';

export const SETTINGS_KEYS = {
  LANGUAGE: 'language',
  STREAM_FORMAT: 'streamFormat',
  TIME_FORMAT: 'timeformat',
  LIST_TYPE: 'listType',
  PARENTAL_PASSWORD: 'password',
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
