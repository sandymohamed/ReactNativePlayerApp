import { withRequestTimeout } from '../utils/requestTimeout';

import type {
  StandalonePlaylist,
  Category,
  Stream,
} from '../models/model';

// ==========================================
// Types
// ==========================================

export type M3uContentType = 'live' | 'movie' | 'series';

export interface M3uPlaylistData {
  liveCategories: Category[];
  liveStreams: Stream[];

  movieCategories: Category[];
  movies: Stream[];

  seriesCategories: Category[];
  series: Stream[];

  totalStreams: number;
}

interface M3uEntry {
  name: string;
  url: string;
  logo: string;
  groupTitle: string;
  tvgId: string;
  tvgName: string;
}

// ==========================================
// Helpers
// ==========================================

const cleanValue = (value: string): string =>
  value.replace(/&amp;/gi, '&').trim();

function getAttribute(
  line: string,
  attribute: string,
): string {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const regex = new RegExp(
    `${escaped}="([^"]*)"`,
    'i',
  );

  return cleanValue(line.match(regex)?.[1] ?? '');
}

function getEntryName(line: string): string {
  const commaIndex = line.indexOf(',');

  if (commaIndex === -1) {
    return '';
  }

  return cleanValue(line.slice(commaIndex + 1));
}

function classifyContent(groupTitle: string): M3uContentType {
  const value = groupTitle.trim().toLowerCase();

  const seriesKeywords = [
    'series',
    'serie',
    'tv shows',
    'shows',
    'مسلسلات',
    'مسلسل',
  ];

  const movieKeywords = [
    'movie',
    'movies',
    'vod',
    'film',
    'films',
    'cinema',
    'أفلام',
    'افلام',
    'فيلم',
  ];

  if (
    seriesKeywords.some(keyword => value.includes(keyword))
  ) {
    return 'series';
  }

  if (
    movieKeywords.some(keyword => value.includes(keyword))
  ) {
    return 'movie';
  }

  return 'live';
}

function createCategoryId(
  type: M3uContentType,
  groupTitle: string,
): string {
  return `m3u:${type}:${groupTitle.trim().toLowerCase()}`;
}

// ==========================================
// M3U Parser
// ==========================================

export function parseM3uContent(
  content: string,
): M3uPlaylistData {
  if (!content || typeof content !== 'string') {
    throw new Error('The M3U playlist is empty.');
  }

  const normalizedContent = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const lines = normalizedContent
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const entries: M3uEntry[] = [];

  let pendingEntry: Omit<M3uEntry, 'url'> | null = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      const tvgName = getAttribute(line, 'tvg-name');

      const name =
        tvgName ||
        getEntryName(line) ||
        'Unknown Channel';

      pendingEntry = {
        name,
        logo: getAttribute(line, 'tvg-logo'),
        groupTitle:
          getAttribute(line, 'group-title') || 'Uncategorized',
        tvgId: getAttribute(line, 'tvg-id'),
        tvgName,
      };

      continue;
    }

    // Ignore comments and additional M3U directives.
    if (line.startsWith('#')) {
      continue;
    }

    if (!pendingEntry) {
      continue;
    }

    if (!/^https?:\/\//i.test(line)) {
      pendingEntry = null;
      continue;
    }

    entries.push({
      ...pendingEntry,
      url: line,
    });

    pendingEntry = null;
  }

  if (entries.length === 0) {
    throw new Error(
      'No playable streams were found in this M3U playlist.',
    );
  }

  return buildPlaylistData(entries);
}

// ==========================================
// Build Stream[] and Categories
// ==========================================

function buildPlaylistData(
  entries: M3uEntry[],
): M3uPlaylistData {
  const result: M3uPlaylistData = {
    liveCategories: [],
    liveStreams: [],

    movieCategories: [],
    movies: [],

    seriesCategories: [],
    series: [],

    totalStreams: 0,
  };

  const categoryMaps: Record<
    M3uContentType,
    Map<string, Category>
  > = {
    live: new Map(),
    movie: new Map(),
    series: new Map(),
  };

  const counters: Record<M3uContentType, number> = {
    live: 0,
    movie: 0,
    series: 0,
  };

  const uniqueEntries = new Set<string>();
  entries.forEach(entry => {
    const type = classifyContent(entry.groupTitle);

    const entryKey = `${type}:${entry.url}`;
    if (uniqueEntries.has(entryKey)) return;
    uniqueEntries.add(entryKey);

    const categoryId = createCategoryId(
      type,
      entry.groupTitle,
    );

    const categoryMap = categoryMaps[type];

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        category_id: categoryId,
        category_name: entry.groupTitle,
        parent_id: 0,
        category: 0,
      });
    }

    counters[type] += 1;

    const stream: Stream = {
      stream_id: entry.url,
      num: counters[type],
      name: entry.name,
      stream_type: type,
      stream_icon: entry.logo,
      category_id: categoryId,
      direct_source: entry.url,
    };

    switch (type) {
      case 'live':
        result.liveStreams.push(stream);
        break;

      case 'movie':
        result.movies.push(stream);
        break;

      case 'series':
        result.series.push(stream);
        break;
    }
  });

  result.liveCategories = Array.from(
    categoryMaps.live.values(),
  );

  result.movieCategories = Array.from(
    categoryMaps.movie.values(),
  );

  result.seriesCategories = Array.from(
    categoryMaps.series.values(),
  );

  result.totalStreams = uniqueEntries.size;
  return result;
}

// ==========================================
// Load M3U Playlist
// ==========================================

export async function loadM3uPlaylist(
  playlist: StandalonePlaylist,
): Promise<M3uPlaylistData> {
  return withRequestTimeout(async signal => {
    if (playlist.type !== 'm3u') {
      throw new Error('This playlist is not an M3U playlist.');
    }

    const url = playlist.m3uUrl?.trim();

    if (!url) {
      throw new Error('M3U playlist URL is missing.');
    }

    if (!/^https?:\/\//i.test(url)) {
      throw new Error('Invalid M3U playlist URL.');
    }

    let response: Response;

    try {
      response = await fetch(url, { signal });
    } catch (error) {

      throw new Error(
        'Unable to download the M3U playlist. Check your internet connection and playlist URL.',
      );
    }

    if (!response.ok) {
      throw new Error(
        `M3U server returned HTTP ${response.status}.`,
      );
    }

    let content: string;

    try {
      content = await response.text();
    } catch (error) {

      throw new Error(
        'Unable to read the M3U playlist response.',
      );
    }

    return parseM3uContent(content);
  });
}

// ==========================================
// Test M3U Connection
// ==========================================

export async function testM3uConnection(
  playlist: StandalonePlaylist,
): Promise<number> {
  const data = await loadM3uPlaylist(playlist);

  return data.totalStreams;
}
