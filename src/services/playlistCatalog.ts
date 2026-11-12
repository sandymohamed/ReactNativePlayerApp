import type { Playlist, StandalonePlaylist, Stream } from "../models/model";
import { fetchJson, normalizeCategories, normalizeStreams } from "../utils/api";
import { generateurl, selectall, selectrecentAll } from "../utils/constants";
import type { MainDataCache } from "../utils/storage";
import { getStandaloneActivity } from "../utils/standaloneActivityStorage";
import { loadM3uPlaylist } from "./m3uService";
import * as xtream from "./xtreamService";

export function playlistKey(profile: Playlist): string {
  return profile.standalone
    ? `standalone:${profile.standalone.id}`
    : `provider:${profile.id}`;
}

export function asPlaylist(standalone: StandalonePlaylist): Playlist {
  return {
    id: 0,
    profile_name: standalone.name,
    xml_epg: "",
    username: standalone.username ?? "",
    password: standalone.password ?? "",
    host: standalone.host ?? "",
    pin: "",
    isXS: 1,
    created_at: new Date(standalone.createdAt).toISOString(),
    updated_at: String(standalone.updatedAt),
    allowed_output_formats: ["m3u8"],
    standalone,
  };
}

export function emptyCatalog(): MainDataCache {
  return {
    catLive: [],
    listLive: [],
    catVod: [],
    listVod: [],
    catSerie: [],
    listSerie: [],
    listLiveFav: [],
    listVodFav: [],
    listSerieFav: [],
    listLiveRecent: [],
    listVodRecent: [],
    listSerieRecent: [],
    updatedAt: 0,
  };
}

const categories = (items: unknown[]) => [
  { category_id: "0", category_name: "all", parent_id: 0 },
  { category_id: "-1", category_name: "favorite", parent_id: 0 },
  { category_id: "-2", category_name: "recent", parent_id: 0 },
  ...items,
];

export async function loadCatalog(profile: Playlist): Promise<MainDataCache> {
  const source = profile.standalone;
  const api = (action: string) => fetchJson(generateurl(action, profile));
  const providerList = async (
    action: string,
    kind: "categories" | "streams",
  ) => {
    const data = await api(action);
    if (
      !Array.isArray(data) &&
      !Array.isArray((data as Record<string, unknown> | null)?.[kind])
    ) {
      throw new Error("The provider returned an invalid catalog response.");
    }
    return data;
  };
  const m3u = source?.type === "m3u" ? await loadM3uPlaylist(source) : null;
  const data = m3u
    ? [
        m3u.liveCategories,
        m3u.liveStreams,
        m3u.movieCategories,
        m3u.movies,
        m3u.seriesCategories,
        m3u.series,
      ]
    : source
      ? await Promise.all([
          xtream.getLiveCategories(source),
          xtream.getLiveStreams(source),
          xtream.getMovieCategories(source),
          xtream.getMovies(source),
          xtream.getSeriesCategories(source),
          xtream.getSeries(source),
        ])
      : await Promise.all([
          providerList("get_live_categories", "categories"),
          providerList("get_live_streams", "streams"),
          providerList("get_vod_categories", "categories"),
          providerList("get_vod_streams", "streams"),
          providerList("get_series_categories", "categories"),
          providerList("get_series", "streams"),
        ]);

  const streams = (items: unknown, series = false) =>
    (normalizeStreams(items) as Array<Stream & { series_id?: string }>).map(
      (item) => {
        const id = String(
          (series ? item.series_id : item.stream_id) ??
            item.stream_id ??
            item.num ??
            "",
        );
        return { ...item, stream_id: id, ...(series ? { series_id: id } : {}) };
      },
    );

  return {
    ...emptyCatalog(),
    catLive: categories(normalizeCategories(data[0])),
    listLive: streams(data[1]),
    catVod: categories(normalizeCategories(data[2])),
    listVod: streams(data[3]),
    catSerie: categories(normalizeCategories(data[4])),
    listSerie: streams(data[5], true),
    updatedAt: Date.now(),
  };
}

export async function loadActivity(profile: Playlist) {
  if (profile.standalone) {
    const { favorites, recents } = await getStandaloneActivity(
      profile.standalone.id,
    );
    return {
      listLiveFav: favorites.live,
      listVodFav: favorites.movie,
      listSerieFav: favorites.series,
      listLiveRecent: recents.live,
      listVodRecent: recents.movie,
      listSerieRecent: recents.series,
    };
  }

  const [live, movies, series, recent] = await Promise.all([
    selectall("live", profile),
    selectall("movie", profile),
    selectall("serie", profile),
    selectrecentAll(profile),
  ]);
  const ids = (items: unknown) =>
    Array.isArray(items)
      ? items.map((item) => String(item?.streamid ?? item))
      : [];
  return {
    listLiveFav: ids(live),
    listVodFav: ids(movies),
    listSerieFav: ids(series),
    listLiveRecent: ids(recent?.live),
    listVodRecent: ids(recent?.movie),
    listSerieRecent: ids(recent?.serie),
  };
}
