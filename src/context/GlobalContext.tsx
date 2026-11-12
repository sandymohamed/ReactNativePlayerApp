
import React, {
  createContext,
  useContext,
  FC,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import {
  LoginModel,
  Playlist,
  Stream,
  MovieInfo,
  SerieInfo,
  SeriesWithInfo,
} from '../models/model';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type { AccessSnapshot } from '../models/access';
import { getMainData, getSelectedProfile, MainDataCache } from '../utils/storage';
import { getActiveStandalonePlaylist, getStandalonePlaylists } from '../utils/standaloneStorage';
import { asPlaylist, emptyCatalog, loadActivity, loadCatalog, playlistKey } from '../services/playlistCatalog';
import { readPlaylistCache, writePlaylistCache } from '../utils/playlistCache';
import { loadProviderIdentity, restoreProviderLogin, verifyProviderLogin } from '../services/providerLogin';
import { evaluateAccess } from '../services/access/appAccess';

const sessionKey = '@velotv/active_playlist_v1';
const legacyCatalogKey = '@uiplayer_main_data_profile_key';

interface GlobalContextProps {
  deviceInfo: any;
  providerLogin: LoginModel | null;

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

  isAppReady: boolean;
  hasCachedData: boolean;
  catalogLoading: boolean;
  catalogError: boolean;
  access: AccessSnapshot | null;
  refreshProvider: () => Promise<LoginModel>;
  refreshCatalog: () => Promise<void>;
  selectPlaylist: (item: Playlist | null) => Promise<void>;

  changeDeviceInfo: (item: any) => void;
  changeProviderLogin: (item: LoginModel | null) => void;

  changeProfile: (item: Playlist | null) => void;
  changeProfileShow: (item: boolean) => void;
  changeSettings: (item: any) => void;

  changeCatLive: (item: any[]) => void;
  changeListLive: (item: Stream[]) => void;

  changeCatVod: (item: any[]) => void;
  changeListVod: (item: Stream[]) => void;

  changeCatSerie: (item: any[]) => void;
  changeListSerie: (item: SeriesWithInfo[]) => void;

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

const GlobalContext = createContext<GlobalContextProps | undefined>(
  undefined,
);

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);

  if (!context) {
    throw new Error(
      'useGlobalContext must be used within a GlobalProvider',
    );
  }

  return context;
};

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: FC<GlobalProviderProps> = ({
  children,
}) => {
  // Device identity
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  // Provider login response - separate from device identity
  const [providerLogin, setProviderLogin] =
    useState<LoginModel | null>(null);

  const [parentalEnable, setParentalEnable] =
    useState<boolean>(false);

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

  const [isAppReady, setIsAppReady] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [access, setAccess] = useState<AccessSnapshot | null>(null);
  const activeProfile = useRef<Playlist | null>(null);
  const activeKey = useRef('');
  const catalogSnapshot = useRef<MainDataCache | null>(null);
  const loadSequence = useRef(0);
  const lastVerification = useRef(0);
  const refreshInFlight = useRef<Promise<LoginModel> | null>(null);
  const selectionInFlight = useRef<Promise<void>>(Promise.resolve());
  const cacheWrite = useRef<Promise<void>>(Promise.resolve());

  const applyCatalog = useCallback((data: MainDataCache) => {
    catalogSnapshot.current = data.updatedAt ? data : null;
    setcatLive(data.catLive);
    setlistLive(data.listLive);
    setcatVod(data.catVod);
    setlistVod(data.listVod);
    setcatSerie(data.catSerie);
    setlistSerie(data.listSerie as SeriesWithInfo[]);
    setlistLiveFav(data.listLiveFav);
    setlistVodFav(data.listVodFav);
    setlistSerieFav(data.listSerieFav);
    setlistLiveRecent(data.listLiveRecent);
    setlistVodRecent(data.listVodRecent);
    setlistSerieRecent(data.listSerieRecent);
    setHasCachedData(data.updatedAt > 0);
  }, []);

  const loadPlaylist = useCallback(async (item: Playlist, restore: boolean) => {
    const sequence = ++loadSequence.current;
    const key = playlistKey(item);
    const revision = item.updated_at || '';
    const current = () => sequence === loadSequence.current;
    setCatalogLoading(true);
    setCatalogError(false);
    let cached = restore ? null : catalogSnapshot.current;
    try {
      if (restore) {
        cached = await readPlaylistCache(key, revision);
        if (!cached && !item.standalone && await AsyncStorage.getItem(legacyCatalogKey) === String(item.id)) {
          cached = await getMainData();
        }
        if (cached && current()) {
          const activity = item.standalone ? await loadActivity(item) : null;
          if (current()) applyCatalog({ ...cached, ...activity });
        }
      }
      if (!current()) return;
      const catalog = await loadCatalog(item);
      const activity = await loadActivity(item).catch(() => null);
      if (!current()) return;
      const data = {
        ...catalog,
        ...(activity ?? (cached && {
          listLiveFav: cached.listLiveFav, listVodFav: cached.listVodFav, listSerieFav: cached.listSerieFav,
          listLiveRecent: cached.listLiveRecent, listVodRecent: cached.listVodRecent,
          listSerieRecent: cached.listSerieRecent,
        })),
      };
      applyCatalog(data);
      cacheWrite.current = cacheWrite.current.then(() => current()
        ? writePlaylistCache(key, revision, item.standalone ? catalog : data)
        : undefined).catch(() => undefined);
    } catch {
      if (current()) setCatalogError(true);
    } finally {
      if (current()) setCatalogLoading(false);
    }
  }, [applyCatalog]);

  const selectPlaylist = useCallback((item: Playlist | null) => {
    const work = selectionInFlight.current.then(async () => {
      const key = item ? playlistKey(item) : '';
      await AsyncStorage.setItem(sessionKey, key);
      activeKey.current = key;
      ++loadSequence.current;
      activeProfile.current = item;
      applyCatalog(emptyCatalog());
      setMovie(null);
      setSerie(null);
      setCatalogError(false);
      setCatalogLoading(false);
      setProfile(item);
    });
    selectionInFlight.current = work.catch(() => undefined);
    return work;
  }, [applyCatalog]);

  const refreshCatalog = useCallback(async () => {
    if (activeProfile.current) await loadPlaylist(activeProfile.current, false);
  }, [loadPlaylist]);

  const refreshProvider = useCallback(() => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const work = (async () => {
      const identity = await loadProviderIdentity();
      setDeviceInfo(identity);
      const result = await verifyProviderLogin(identity);
      const updatedAccess = await evaluateAccess(result.login, result.checkedAt);
      lastVerification.current = result.checkedAt;
      setProviderLogin(result.login);
      setAccess(updatedAccess);
      if (activeKey.current.startsWith('provider:')) {
        const updated = result.login.playlist.find(item => playlistKey(item) === activeKey.current);
        const current = activeProfile.current;
        if (updated && JSON.stringify(updated) !== JSON.stringify(current)) {
          const key = activeKey.current;
          const previousSelection = selectionInFlight.current;
          void previousSelection.then(() => {
            if (activeKey.current === key) return selectPlaylist(updated);
          }).catch(() => undefined);
        } else if (!updated && result.login.status === 1 && current) {
          // Keep the selected ID for restoration if the provider adds it again.
          ++loadSequence.current;
          activeProfile.current = null;
          applyCatalog(emptyCatalog());
          setProfile(null);
        }
      }
      return result.login;
    })();
    refreshInFlight.current = work;
    const clear = () => { refreshInFlight.current = null; };
    void work.then(clear, clear);
    return work;
  }, [applyCatalog, selectPlaylist]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const [key, legacyProfile, legacyStandalone, identity] = await Promise.all([
          AsyncStorage.getItem(sessionKey),
          getSelectedProfile(),
          getActiveStandalonePlaylist(),
          loadProviderIdentity().catch(() => null),
        ]);
        const verified = identity ? await restoreProviderLogin(identity) : null;
        const list = await getStandalonePlaylists();
        if (cancelled) return;
        const provider = verified?.login ?? null;
        if (identity) setDeviceInfo(identity);
        setProviderLogin(provider);
        lastVerification.current = verified?.checkedAt ?? 0;
        const initialAccess = await evaluateAccess(provider, lastVerification.current);
        if (cancelled) return;
        setAccess(initialAccess);
        let item: Playlist | null = null;
        if (key?.startsWith('standalone:')) {
          const standalone = list.find(candidate => `standalone:${candidate.id}` === key);
          if (standalone) item = asPlaylist(standalone);
        } else if (key?.startsWith('provider:')) {
          item = provider?.playlist.find(candidate => playlistKey(candidate) === key) ??
            (legacyProfile && playlistKey(legacyProfile) === key ? legacyProfile : null);
        } else if (key === null) {
          item = legacyProfile ?? (legacyStandalone ? asPlaylist(legacyStandalone) : null);
          if (item) await AsyncStorage.setItem(sessionKey, playlistKey(item));
        }
        if (cancelled) return;
        activeKey.current = key ?? (item ? playlistKey(item) : '');
        activeProfile.current = item;
        setProfile(item);
        setIsAppReady(true);
        if (identity?.mac) void refreshProvider().catch(() => undefined);
      } finally {
        if (!cancelled) setIsAppReady(true);
      }
    };
    void restore().catch(() => {
      if (!cancelled) setAccess({ hasAccess: false, grants: [], checkedAt: Date.now() });
    });
    return () => {
      cancelled = true;
      ++loadSequence.current;
    };
  }, [refreshProvider]);

  useEffect(() => {
    if (!isAppReady || !profile) {
      ++loadSequence.current;
      setCatalogLoading(false);
      return;
    }
    void loadPlaylist(profile, true);
    return () => { ++loadSequence.current; };
  }, [isAppReady, profile, loadPlaylist]);

  useEffect(() => {
    if (!isAppReady) return;
    const update = () => {
      const checkedAt = lastVerification.current;
      void evaluateAccess(providerLogin, checkedAt).then(snapshot => {
        if (checkedAt === lastVerification.current) setAccess(snapshot);
      });
      if (Date.now() - lastVerification.current >= 5 * 60 * 1000 && deviceInfo.mac) {
        void refreshProvider().catch(() => undefined);
      }
    };
    const interval = setInterval(update, 60 * 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [deviceInfo.mac, isAppReady, providerLogin, refreshProvider]);

  // --------------------------------------------------
  // DEVICE IDENTITY
  // --------------------------------------------------

  const changeDeviceInfo = (item: any) => {
    setDeviceInfo(item);
  };

  // --------------------------------------------------
  // PROVIDER LOGIN RESPONSE
  // --------------------------------------------------

  const changeProviderLogin = (item: LoginModel | null) => {
    setProviderLogin(item);
  };

  // --------------------------------------------------
  // EXISTING CONTEXT FUNCTIONS
  // --------------------------------------------------

  const changeParental = (item: boolean) => {
    setParentalEnable(item);
  };

  const changeProfile = (item: Playlist | null) => {
    void selectPlaylist(item).catch(() => undefined);
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

  const changeListSerie = (item: SeriesWithInfo[]) => {
    setlistSerie(item);
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

  // --------------------------------------------------
  // CONTEXT PROVIDER
  // --------------------------------------------------

  return (
    <GlobalContext.Provider
      value={{
        deviceInfo,
        providerLogin,

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
        catalogLoading,
        catalogError,
        access,
        refreshProvider,
        refreshCatalog,
        selectPlaylist,

        changeDeviceInfo,
        changeProviderLogin,

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
