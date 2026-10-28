import React, {
  createContext,
  useContext,
  FC,
  ReactNode,
  useState,
  useEffect,
} from 'react';

import {
  Playlist,
  Stream,
  MovieInfo,
  SerieInfo,
  SeriesWithInfo,
} from '../models/model';

// Change this path to the actual location of your storage file.
import {
  getSelectedProfile,
  getMainData,
  saveSelectedProfile,
  saveMainData,
} from '../utils/storage';

interface GlobalContextProps {
  deviceInfo: any;
  parentalEnable: boolean;
  profile: Playlist | null;
  profileShow: boolean;
  settings: any;

  catLive: any[];
  listLive: Stream[];
  catVod: any[];
  listVod: Stream[];
  catSerie: any[];
  listSerie: SeriesWithInfo[];

  movie: MovieInfo | null;
  serie: SerieInfo | null;

  listVodFav: string[];
  listSerieFav: string[];
  listLiveFav: string[];

  listVodRecent: string[];
  listLiveRecent: string[];
  listSerieRecent: string[];

  // New: tells navigation when storage restoration is finished.
  isAppReady: boolean;

  // New: tells navigation whether a saved catalog exists.
  hasCachedData: boolean;

  changeDeviceInfo: (item: any) => void;
  changeProfile: (item: Playlist | null) => void;
  changeProfileShow: (item: boolean) => void;
  changeSettings: (item: any) => void;

  changeCatLive: (item: any[]) => void;
  changeListLive: (item: Stream[]) => void;

  changeCatVod: (item: any[]) => void;
  changeListVod: (item: Stream[]) => void;

  changeCatSerie: (item: any[]) => void;
  changeListSerie: (item: Stream[]) => void;

  changeSerie: (item: SerieInfo | null) => void;
  changeMovie: (item: MovieInfo | null) => void;

  changeListLiveFav: (item: any[]) => void;
  changeListVodFav: (item: any[]) => void;
  changeListSerieFav: (item: any[]) => void;

  changeListLiveRecent: (item: any[]) => void;
  changeListVodRecent: (item: any[]) => void;
  changeListSerieRecent: (item: any[]) => void;

  changeParental: (item: boolean) => void;
}

const GlobalContext = createContext<GlobalContextProps | undefined>(undefined);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);

  if (!context) {
    throw new Error('useGlobalContext must be used within a GlobalProvider');
  }

  return context;
};

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: FC<GlobalProviderProps> = ({ children }) => {
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [parentalEnable, setParentalEnable] = useState<boolean>(false);

  const [profile, setProfile] = useState<Playlist | null>(null);
  const [profileShow, setProfileShow] = useState<boolean>(false);
  const [settings, setSettings] = useState<any>({
    position: 0,
  });

  const [movie, setMovie] = useState<MovieInfo | null>(null);
  const [serie, setSerie] = useState<SerieInfo | null>(null);

  const [catLive, setcatLive] = useState<any[]>([]);
  const [listLive, setlistLive] = useState<Stream[]>([]);

  const [catVod, setcatVod] = useState<any[]>([]);
  const [listVod, setlistVod] = useState<Stream[]>([]);

  const [catSerie, setcatSerie] = useState<any[]>([]);
  const [listSerie, setlistSerie] = useState<SeriesWithInfo[]>([]);

  const [listSerieFav, setlistSerieFav] = useState<any[]>([]);
  const [listVodFav, setlistVodFav] = useState<any[]>([]);
  const [listLiveFav, setlistLiveFav] = useState<any[]>([]);

  const [listSerieRecent, setlistSerieRecent] = useState<any[]>([]);
  const [listVodRecent, setlistVodRecent] = useState<any[]>([]);
  const [listLiveRecent, setlistLiveRecent] = useState<any[]>([]);

  // New states
  const [isAppReady, setIsAppReady] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);

  // Prevent persistence until the initial restoration is complete.
  const [isRestored, setIsRestored] = useState(false);

  // --------------------------------------------------
  // RESTORE SAVED PROFILE AND CATALOG AT APP START
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const restoreApp = async () => {
      try {
        const [savedProfile, cachedData] = await Promise.all([
          getSelectedProfile(),
          getMainData(),
        ]);

        if (cancelled) return;

        if (savedProfile) {
          setProfile(savedProfile);
        }

        if (cachedData) {
          setcatLive(cachedData.catLive);
          setlistLive(cachedData.listLive);

          setcatVod(cachedData.catVod);
          setlistVod(cachedData.listVod);

          setcatSerie(cachedData.catSerie);
          setlistSerie(cachedData.listSerie as SeriesWithInfo[]);

          setlistLiveFav(cachedData.listLiveFav ?? []);
          setlistVodFav(cachedData.listVodFav ?? []);
          setlistSerieFav(cachedData.listSerieFav ?? []);

          setlistLiveRecent(cachedData.listLiveRecent ?? []);
          setlistVodRecent(cachedData.listVodRecent ?? []);
          setlistSerieRecent(cachedData.listSerieRecent ?? []);

          setHasCachedData(true);
        }
      } catch (error) {
        console.error('Error restoring saved app data:', error);
      } finally {
        if (!cancelled) {
          setIsRestored(true);
          setIsAppReady(true);
        }
      }
    };

    restoreApp();

    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------------------------
  // SAVE SELECTED PROFILE
  // --------------------------------------------------

  useEffect(() => {
    if (!isRestored) return;
    saveSelectedProfile(profile);
  }, [isRestored, profile]);

  // --------------------------------------------------
  // SAVE CATALOG, FAVORITES AND RECENT HISTORY
  // --------------------------------------------------

  useEffect(() => {
    if (!isRestored) return;

    const saveData = async () => {
      const data = {
        catLive,
        listLive,
        catVod,
        listVod,
        catSerie,
        listSerie,

        listLiveFav: listLiveFav.map(String),
        listVodFav: listVodFav.map(String),
        listSerieFav: listSerieFav.map(String),

        listLiveRecent: listLiveRecent.map(String),
        listVodRecent: listVodRecent.map(String),
        listSerieRecent: listSerieRecent.map(String),

        updatedAt: Date.now(),
      };

      await saveMainData(data);

      const hasCatalog =
        data.catLive.length > 0 ||
        data.listLive.length > 0 ||
        data.catVod.length > 0 ||
        data.listVod.length > 0 ||
        data.catSerie.length > 0 ||
        data.listSerie.length > 0;

      if (hasCatalog) {
        setHasCachedData(true);
      }
    };

    saveData();
  }, [
    isRestored,
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
  ]);

  // --------------------------------------------------
  // EXISTING CONTEXT FUNCTIONS
  // --------------------------------------------------

  const changeParental = (item: boolean) => {
    setParentalEnable(item);
  };

  const changeDeviceInfo = (item: any) => {
    setDeviceInfo(item);
  };

  const changeProfile = (item: Playlist | null) => {
    setProfile(item);
  };

  const changeProfileShow = (item: boolean) => {
    setProfileShow(item);
  };

  const changeSettings = (item: any) => {
    setSettings(item);
  };

  const changeMovie = (item: MovieInfo | null) => {
    setMovie(item);
  };

  const changeSerie = (item: SerieInfo | null) => {
    setSerie(item);
  };

  const changeCatLive = (item: any[]) => {
    setcatLive([...item]);
  };

  const changeListLive = (item: Stream[]) => {
    setlistLive(item);
  };

  const changeCatVod = (item: any[]) => {
    setcatVod(item);
  };

  const changeListVod = (item: Stream[]) => {
    setlistVod(item);
  };

  const changeCatSerie = (item: any[]) => {
    setcatSerie(item);
  };

  const changeListSerie = (item: Stream[]) => {
    setlistSerie(item as SeriesWithInfo[]);
  };

  const changeListSerieFav = (item: any[]) => {
    setlistSerieFav(item);
  };

  const changeListVodFav = (item: any[]) => {
    setlistVodFav(item);
  };

  const changeListLiveFav = (item: any[]) => {
    setlistLiveFav(item);
  };

  const changeListSerieRecent = (item: any[]) => {
    setlistSerieRecent(item);
  };

  const changeListVodRecent = (item: any[]) => {
    setlistVodRecent(item);
  };

  const changeListLiveRecent = (item: any[]) => {
    setlistLiveRecent(item);
  };

  return (
    <GlobalContext.Provider
      value={{
        deviceInfo,
        parentalEnable,
        profile,
        profileShow,
        settings,

        catLive,
        listLive,
        catVod,
        listVod,
        catSerie,
        listSerie,

        movie,
        serie,

        listLiveFav,
        listVodFav,
        listSerieFav,

        listLiveRecent,
        listVodRecent,
        listSerieRecent,

        isAppReady,
        hasCachedData,

        changeDeviceInfo,
        changeProfile,
        changeProfileShow,
        changeSettings,

        changeCatLive,
        changeListLive,
        changeCatVod,
        changeListVod,
        changeCatSerie,
        changeListSerie,

        changeMovie,
        changeSerie,

        changeListLiveFav,
        changeListVodFav,
        changeListSerieFav,

        changeListLiveRecent,
        changeListVodRecent,
        changeListSerieRecent,

        changeParental,
      }}>
      {children}
    </GlobalContext.Provider>
  );
};
