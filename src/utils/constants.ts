import type { Playlist } from '../models/model';

/**
 * Override player API base URL when the login API returns the wrong host.
 * Set to a non‑empty string (e.g. 'https://masterioltd.com') to force this domain;
 * set to '' to use profile.host from the API.
 */
export const PLAYER_HOST_OVERRIDE = 'https://masterioltd.com';

/** Parse query string without URLSearchParams (Hermes doesn't implement .get). */
function parseQueryString(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!query || typeof query !== 'string') return out;
  const pairs = query.split('&');
  for (const p of pairs) {
    const i = p.indexOf('=');
    if (i === -1) continue;
    let k = p.slice(0, i).replace(/\+/g, ' ');
    let v = p.slice(i + 1).replace(/\+/g, ' ');
    try {
      k = decodeURIComponent(k);
      v = decodeURIComponent(v);
    } catch {
      /* leave as-is if malformed */
    }
    if (k) out[k] = v;
  }
  return out;
}

export const tvKey = {
  N1: 49,
  N2: 50,
  N3: 51,
  N4: 52,
  N5: 53,
  N6: 54,
  N7: 55,
  N8: 56,
  N9: 57,
  N0: 48,
  PRECH: 10190,
  VOL_UP: 448,
  VOL_DOWN: 447,
  MUTE: 449,
  CH_UP: 427,
  CH_DOWN: 428,
  TOOLS: 10135,
  ENTER: 13,
  RETURN: 10009,
  INFO: 457,
  EXIT: 10182,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  RED: 403,
  GREEN: 404,
  YELLOW: 405,
  BLUE: 406,
  RW: 412,
  PAUSE: 19,
  FF: 417,
  REC: 416,
  PLAY: 415,
  STOP: 413,
  PLAYPAUSE: 10252,
};

export function generateurl(action: string, playlist: Playlist): string {
  let profile = getetprofile(playlist);
  let url: string;
  if (profile.username) {
    url =
      profile.host +
      '/player_api.php?username=' +
      profile.username +
      '&password=' +
      profile.password;
    if (action !== '') {
      url += '&action=' + action;
    }
  } else {
    url = profile.host;;
  }
  return url;
}

export function generateurlplayer(
  type: string,
  streamid: string,
  ext: string,
  playlist: Playlist,
): string {
  let profile = getetprofile(playlist);

  var url =
    profile.host +
    '/' +
    type +
    '/' +
    profile.username +
    '/' +
    profile.password +
    '/' +
    streamid +
    '.' +
    ext;

  return url;
}

export function getetprofile(profile: Playlist) {
  let prof = {
    host: '',
    username: '',
    password: '',
  };
  if (profile.isXS == 0) {
    const qs = profile?.host?.split('?')[1] ?? '';
    const params = parseQueryString(qs);
    const password = params.password;
    const username = params.username;
    const arr = profile.host.split('/');
    const result = arr[0] + '//' + arr[2];
    if (username) prof.username = username;
    if (password) prof.password = password;
    prof.host = result;
  } else {
    var host = profile.host;
    if (host[host.length - 1] === '/') {
      host = host.slice(0, -1);
    }
    prof.username = profile.username;
    prof.password = profile.password;
    prof.host = host;
  }

  console.log('prof.host', prof.host);
  if (!prof.host) {
    if (PLAYER_HOST_OVERRIDE && PLAYER_HOST_OVERRIDE.trim()) {
      let override = PLAYER_HOST_OVERRIDE.trim();
      if (override.endsWith('/')) override = override.slice(0, -1);
      prof.host = override;
    }
  }
  return prof;
}

export async function deleterow(
  streamid: string,
  type: string,
  profile: Playlist,
): Promise<void> {
  var myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  var raw = JSON.stringify({
    type: type,
    streamid: streamid,
    profileid: profile.id,
  });

  var requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  };

  // 'http://192.168.1.16:5000/api/v2/favorites/createDelete',
  //   requestOptions,
  // )

  fetch(
    'https://api.uiplayer.com/api/v2/favorites/createDelete',
    requestOptions,
  )
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error));
}

export async function insertData(
  streamid: string,
  type: string,
  profile: Playlist,
): Promise<void> {
  var myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  var raw = JSON.stringify({
    type: type,
    streamid: streamid,
    profileid: profile.id,
  });

  var requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  };

  // fetch(
  //   'http://192.168.1.16:5000/api/v2/favorites/createDelete',
  //   requestOptions,
  // )
  fetch(
    'https://api.uiplayer.com/api/v2/favorites/createDelete',
    requestOptions,
  )
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error));
}

export async function insertDatarecent(
  streamid: string,
  type: string,
  profile: Playlist,
): Promise<void> {
  var myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  var raw = JSON.stringify({
    streamid: streamid,
    type: type,
    profileid: profile.id,
  });

  console.log('raw:', raw);

  var requestOptions: RequestInit = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
  };

  fetch(
    'https://api.uiplayer.com/api/v2/recents/insertDatarecent',
    // 'http://192.168.1.16:5000/api/v2/recents/insertDatarecent',
    requestOptions,
  )
    .then(response => response.text())
    .then(result => console.log(result))
    .catch(error => console.log('error', error));
}

export function selectall(type: string, profile: Playlist): Promise<any[]> {
  return new Promise(function (resolve) {
    var myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    var raw = JSON.stringify({
      profileid: profile.id,
      type: type,
    });

    var requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
    };

    fetch(
      'https://api.uiplayer.com/api/v2/favorites/selectall',
      // 'http://192.168.1.16:5000/api/v2/favorites/selectall',
      requestOptions,
    )
      .then(response => response.json())
      .then(result => resolve(result.data))
      .catch(error => resolve([]));
  });
}

export function selectrecentAll(profile: Playlist): Promise<any[]> {
  return new Promise(function (resolve) {
    var myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    var raw = JSON.stringify({
      profileid: profile.id,
    });

    var requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
    };

    fetch(
      'https://api.uiplayer.com/api/v2/recents/selectrecentAll',
      // 'http://192.168.1.16:5000/api/v2/recents/selectrecentAll',
      requestOptions,
    )
      .then(response => response.json())
      .then(result => resolve(result.data))
      .catch(error => resolve([]));
  });
}
