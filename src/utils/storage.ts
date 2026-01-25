import AsyncStorage from '@react-native-async-storage/async-storage';

export const storeVideoPositions = async (videoPositions: any) => {
  try {
    const jsonVideoPositions = JSON.stringify(videoPositions);
    await AsyncStorage.setItem('vodPositions', jsonVideoPositions);
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
