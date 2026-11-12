import { withRequestTimeout } from '../utils/requestTimeout';
// src/services/xtreamService.ts
import type {
  StandalonePlaylist,
  Category,
  Stream,
  MovieInfo,
  SerieInfo,
} from '../models/model';

// ==========================================
// Types
// ==========================================

export interface XtreamUserInfo {
  username?: string;
  password?: string;
  message?: string;
  auth?: number | string;
  status?: string;
  exp_date?: string | null;
  is_trial?: string;
  active_cons?: string;
  created_at?: string;
  max_connections?: string;
  allowed_output_formats?: string[];
}

export interface XtreamServerInfo {
  url?: string;
  port?: string;
  https_port?: string;
  server_protocol?: string;
  rtmp_port?: string;
  timezone?: string;
  timestamp_now?: number;
  time_now?: string;
}

export interface XtreamAccountInfo {
  user_info?: XtreamUserInfo;
  server_info?: XtreamServerInfo;
}

export interface XtreamSeries extends Omit<Stream, 'stream_id'> {
  series_id: string;
}

type XtreamAction =
  | 'get_live_categories'
  | 'get_live_streams'
  | 'get_vod_categories'
  | 'get_vod_streams'
  | 'get_series_categories'
  | 'get_series'
  | 'get_vod_info'
  | 'get_series_info';

// ==========================================
// Helpers
// ==========================================

function getPlaylistCredentials(playlist: StandalonePlaylist) {
  if (playlist.type !== 'xtream') {
    throw new Error('This playlist is not an Xtream playlist.');
  }

  const host = playlist.host?.trim().replace(/\/+$/, '');
  const username = playlist.username?.trim();
  const password = playlist.password?.trim();

  if (!host || !username || !password) {
    throw new Error('Xtream playlist credentials are incomplete.');
  }

  if (!/^https?:\/\//i.test(host)) {
    throw new Error('Invalid Xtream server URL.');
  }

  return {
    host,
    username,
    password,
  };
}

function buildApiUrl(
  playlist: StandalonePlaylist,
  action?: XtreamAction,
  extraParams?: Record<string, string>,
): string {
  const { host, username, password } =
    getPlaylistCredentials(playlist);

  const params: Record<string, string> = {
    username,
    password,
  };

  if (action) {
    params.action = action;
  }

  if (extraParams) {
    Object.assign(params, extraParams);
  }

  const query = Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join('&');

  return `${host}/player_api.php?${query}`;
}

// ==========================================
// API Request
// ==========================================

async function requestXtream<T>(
  playlist: StandalonePlaylist,
  action?: XtreamAction,
  extraParams?: Record<string, string>,
): Promise<T> {
  return withRequestTimeout(async signal => {
    const url = buildApiUrl(playlist, action, extraParams);

    let response: Response;

    try {
      response = await fetch(url, { signal });
    } catch (error) {

      throw new Error(
        'Unable to connect to the IPTV server. Check your internet connection and server URL.',
      );
    }

    if (!response.ok) {
      throw new Error(
        `IPTV server returned HTTP ${response.status}.`,
      );
    }

    const responseText = await response.text();
    const trimmed = responseText.trim();

    if (!trimmed) {
      throw new Error('The IPTV server returned an empty response.');
    }

    let data: any;

    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error(
        'The IPTV server returned an invalid response. Please check your server details.',
      );
    }

    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      data.error
    ) {
      throw new Error('The IPTV server rejected the request.');
    }

    return data as T;
  });
}

// ==========================================
// Response Normalization
// ==========================================

function normalizeCategory(raw: any): Category {
  return {
    ...raw,
    category_id: String(raw.category_id ?? ''),
    category_name: String(raw.category_name ?? ''),
    parent_id: Number(raw.parent_id ?? 0),
    category: Number(raw.category ?? 0),
  };
}

function normalizeStream(raw: any): Stream {
  return {
    ...raw,
    stream_id: String(raw.stream_id ?? ''),
    num: Number(raw.num ?? 0),
    name: String(raw.name ?? ''),
    stream_type: String(raw.stream_type ?? ''),
    stream_icon: String(raw.stream_icon ?? ''),
    category_id:
      raw.category_id != null
        ? String(raw.category_id)
        : undefined,
  };
}

function normalizeSeries(raw: any): XtreamSeries {
  return {
    ...raw,
    series_id: String(raw.series_id ?? ''),
    num: Number(raw.num ?? 0),
    name: String(raw.name ?? ''),
    stream_type: 'series',
    stream_icon: String(raw.cover ?? raw.stream_icon ?? ''),
    category_id:
      raw.category_id != null
        ? String(raw.category_id)
        : undefined,
  };
}

function normalizeArray<T>(
  data: unknown,
  normalizer: (item: any) => T,
): T[] {
  if (!Array.isArray(data)) {
    throw new Error('The IPTV server returned an invalid list.');
  }

  return data
    .filter(item => item && typeof item === 'object')
    .map(normalizer);
}

export async function testXtreamConnection(
  playlist: StandalonePlaylist,
): Promise<XtreamAccountInfo> {
  const data = await requestXtream<XtreamAccountInfo>(playlist);

  if (!data || typeof data !== 'object' || !data.user_info) {
    throw new Error(
      'Invalid server response. The server did not return account information.',
    );
  }

  const userInfo = data.user_info;

  // Check authentication only when the server provides it.
  if (
    userInfo.auth !== undefined &&
    userInfo.auth !== null &&
    (userInfo.auth === 0 || userInfo.auth === '0')
  ) {
    throw new Error(
      userInfo.message || 'Invalid username or password.',
    );
  }

  // Check account status when available.
  if (typeof userInfo.status === 'string') {
    const status = userInfo.status.trim().toLowerCase();

    const inactiveStatuses = [
      'disabled',
      'inactive',
      'expired',
      'banned',
      'blocked',
    ];

    if (inactiveStatuses.includes(status)) {
      throw new Error(`This IPTV account is ${status}.`);
    }
  }

  return data;
}

// ==========================================
// 2. Live TV
// ==========================================

export async function getLiveCategories(
  playlist: StandalonePlaylist,
): Promise<Category[]> {
  const data = await requestXtream<any[]>(
    playlist,
    'get_live_categories',
  );

  return normalizeArray(data, normalizeCategory);
}

export async function getLiveStreams(
  playlist: StandalonePlaylist,
  categoryId?: string,
): Promise<Stream[]> {
  const data = await requestXtream<any[]>(
    playlist,
    'get_live_streams',
  );

  const streams = normalizeArray(data, normalizeStream);

  if (!categoryId) {
    return streams;
  }

  return streams.filter(
    stream => stream.category_id === String(categoryId),
  );
}

// ==========================================
// 3. Movies
// ==========================================

export async function getMovieCategories(
  playlist: StandalonePlaylist,
): Promise<Category[]> {
  const data = await requestXtream<any[]>(
    playlist,
    'get_vod_categories',
  );

  return normalizeArray(data, normalizeCategory);
}

export async function getMovies(
  playlist: StandalonePlaylist,
  categoryId?: string,
): Promise<Stream[]> {
  const data = await requestXtream<any[]>(
    playlist,
    'get_vod_streams',
  );

  const movies = normalizeArray(data, normalizeStream);

  if (!categoryId) {
    return movies;
  }

  return movies.filter(
    movie => movie.category_id === String(categoryId),
  );
}

export async function getMovieInfo(
  playlist: StandalonePlaylist,
  movieId: string | number,
): Promise<MovieInfo> {
  return requestXtream<MovieInfo>(
    playlist,
    'get_vod_info',
    {
      vod_id: String(movieId),
    },
  );
}

// ==========================================
// 4. Series
// ==========================================

export async function getSeriesCategories(
  playlist: StandalonePlaylist,
): Promise<Category[]> {
  const data = await requestXtream<any[]>(
    playlist,
    'get_series_categories',
  );

  return normalizeArray(data, normalizeCategory);
}

export async function getSeries(
  playlist: StandalonePlaylist,
  categoryId?: string,
): Promise<XtreamSeries[]> {
  const data = await requestXtream<any[]>(
    playlist,
    'get_series',
  );

  const series = normalizeArray(data, normalizeSeries);

  if (!categoryId) {
    return series;
  }

  return series.filter(
    item => item.category_id === String(categoryId),
  );
}

export async function getSeriesInfo(
  playlist: StandalonePlaylist,
  seriesId: string | number,
): Promise<SerieInfo> {
  return requestXtream<SerieInfo>(
    playlist,
    'get_series_info',
    {
      series_id: String(seriesId),
    },
  );
}

// ==========================================
// 5. Playback URLs
// ==========================================

export type XtreamStreamType =
  | 'live'
  | 'movie'
  | 'series';

export function buildXtreamPlaybackUrl(
  playlist: StandalonePlaylist,
  type: XtreamStreamType,
  streamId: string | number,
  extension?: string,
): string {
  const { host, username, password } =
    getPlaylistCredentials(playlist);

  const defaultExtensions: Record<XtreamStreamType, string> = {
    live: 'ts',
    movie: 'mp4',
    series: 'mkv',
  };

  const ext = (
    extension || defaultExtensions[type]
  ).replace(/^\./, '');

  const safeUsername = encodeURIComponent(username);
  const safePassword = encodeURIComponent(password);
  const safeStreamId = encodeURIComponent(String(streamId));

  return (
    `${host}/${type}/` +
    `${safeUsername}/${safePassword}/` +
    `${safeStreamId}.${ext}`
  );
}
