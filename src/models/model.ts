export interface LoginModel {
  id: number;
  mac: string;
  password: string;
  startPackage: string;
  ExipiredAt: string;
  status: number;
  type: number;
  city: City;
  country: string;
  created_at: string;
  updated_at: string;
  version: string;
  is_terial: boolean;
  playlist: Playlist[];
}

export interface City {
  city: string;
  lat: string;
  lng: string;
  iso2: string;
}

export interface Playlist {
  id: number;
  profile_name: string;
  xml_epg: string;
  username: string;
  password: string;
  host: string;
  pin: string;
  isXS: number;
  created_at: string;
  updated_at: string;
  allowed_output_formats: string[];
}

export type Categories = Category[];

export interface Category {
  category_id: string;
  category_name: string;
  parent_id: number;
  category: number;
}

export interface Stream {
  stream_id: string;
  num: number;
  name: string;
  stream_type: string;
  stream_icon: string;
  backdrop_path?: string;
  cover?: string;
  epg_channel_id?: string;
  added?: string;
  category_id?: string;
  custom_sid?: string;
  tv_archive?: number;
  direct_source?: string;
  tv_archive_duration?: number;
}

export interface MovieInfo {
  info?: {
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    duration?: string;
  };
  movie_data?: {
    stream_id?: string;
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    duration?: string;
  };
}

export interface SerieInfo {
  info?: {
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    backdrop_path?: string[];
  };
  /** Season numbers as array (e.g. ["1", "2", "3"]) - extracted from episodes keys */
  sea?: string[];
  /** Episodes grouped by season number: { "1": [Episode, ...], "2": [Episode, ...] } */
  episodes?: {[seasonNumber: string]: Episode[]};
  /** Legacy: seasons array (if API returns it directly) */
  seasons?: Season[];
  /** Current episode being played */
  epi?: Episode;
  series_id?: string;
}

export interface Season {
  air_date: string;
  cover: string;
  episode_count: number;
  id: string;
  name: string;
  overview: string;
  season_number: number;
  episodes: Episode[];
}

export interface Episode {
  id?: string;
  title?: string;
  container_extension?: string;
  season?: number | string;
  episode_num?: number | string;
  stream_id?: string;
  info?: {
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    duration?: string;
  };
  movie_data?: {
    stream_id?: string;
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string;
    duration?: string;
  };
}
