import React, {
  createContext,
  useContext,
  FC,
  ReactNode,
  useState,
} from 'react';
import { Playlist, Stream, MovieInfo, SerieInfo } from '../models/model';

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
  listSerie: Stream[];
  movie: MovieInfo | null;
  serie: SerieInfo | null;

  listVodFav: any[];
  listSerieFav: any[];
  listLiveFav: any[];

  listVodRecent: any[];
  listLiveRecent: any[];
  listSerieRecent: any[];

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
  const [settings, setSettings] = useState<any>({ position: 0 });
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

  const [movie, setMovie] = useState<MovieInfo | null>(null);
  const [serie, setSerie] = useState<SerieInfo | null>(null);

  const changeMovie = (item: MovieInfo | null) => {
    setMovie(item);
  };

  const changeSerie = (item: SerieInfo | null) => {
    setSerie(item);
  };

  const [catLive, setcatLive] = useState<any[]>([]);
  const [listLive, setlistLive] = useState<Stream[]>([]);

  const changeCatLive = (item: any[]) => {
    setcatLive([...item]);
  };

  const changeListLive = (item: Stream[]) => {
    setlistLive(item);
  };

  const [catVod, setcatVod] = useState<any[]>([]);
  const [listVod, setlistVod] = useState<Stream[]>([]);

  const changeCatVod = (item: any[]) => {
    setcatVod(item);
  };

  const changeListVod = (item: Stream[]) => {
    setlistVod(item);
  };

  const [catSerie, setcatSerie] = useState<any[]>([]);
  const [listSerie, setlistSerie] = useState<Stream[]>([]);

  const changeCatSerie = (item: any[]) => {
    setcatSerie(item);
  };

  const changeListSerie = (item: Stream[]) => {
    setlistSerie(item);
  };

  const [listSerieFav, setlistSerieFav] = useState<any[]>([]);
  const [listVodFav, setlistVodFav] = useState<any[]>([]);
  const [listLiveFav, setlistLiveFav] = useState<any[]>([]);
  const changeListSerieFav = (item: any[]) => {
    setlistSerieFav(item);
  };
  const changeListVodFav = (item: any[]) => {
    setlistVodFav(item);
  };
  const changeListLiveFav = (item: any[]) => {
    setlistLiveFav(item);
  };

  const [listSerieRecent, setlistSerieRecent] = useState<any[]>([]);
  const [listVodRecent, setlistVodRecent] = useState<any[]>([]);
  const [listLiveRecent, setlistLiveRecent] = useState<any[]>([]);
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
        profile,
        profileShow,
        catLive,
        settings,
        listLive,
        catVod,
        listVod,
        catSerie,
        listSerie,
        movie,
        serie,
        listLiveFav,
        listLiveRecent,
        listSerieRecent,
        listSerieFav,
        listVodFav,
        listVodRecent,
        changeDeviceInfo,
        changeProfile,
        changeProfileShow,
        changeSettings,
        changeCatLive,
        changeListLive,
        changeCatSerie,
        changeListVod,
        changeCatVod,
        changeListSerie,
        changeMovie,
        changeSerie,
        changeListLiveFav,
        changeListLiveRecent,
        changeListSerieFav,
        changeListSerieRecent,
        changeListVodFav,
        changeListVodRecent,
        parentalEnable,
        changeParental,
      }}>
      {children}
    </GlobalContext.Provider>
  );
};
