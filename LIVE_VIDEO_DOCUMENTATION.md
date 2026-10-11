# Live Video Flow & Error Documentation

## Full Live Video Flow

### 1. User selects a live channel (LiveScreen)

- **File**: `src/screens/LiveScreen.tsx`
- User taps or selects a channel from the filtered list.
- `handleChannelPress(channel)` is called.

### 2. URL generation

```javascript
const u = generateurlplayer('live', channel.stream_id, 'm3u8', profile);
```

- **File**: `src/utils/constants.ts` → `generateurlplayer()`
- **URL format**: `{host}/{type}/{username}/{password}/{streamid}.{ext}`
- **Example**: `https://example.com/live/user123/pass456/419097.m3u8`
- **Parameters**:
  - `type`: `'live'`
  - `streamid`: e.g. `419097`, `642319`
  - `ext`: `'m3u8'` (HLS)
  - `profile`: from GlobalContext (host, username, password)
- Host can be overridden via `PLAYER_HOST_OVERRIDE` in constants.ts.

### 3. Navigation to Player

- **File**: `src/screens/LiveScreen.tsx`
- Navigates to `Player` screen with:
  - `url`: Generated HLS URL
  - `title`: Channel name
  - `type`: `'live'`
  - `streamId`: e.g. `"419097"`

### 4. Player mounts and tracks recent (PlayerScreen)

- **File**: `src/screens/PlayerScreen.tsx`
- On mount, `useEffect` runs with `recentRecorded` ref to avoid duplicate calls.
- Calls `insertDatarecent(streamId, type, profile)`:
  - **API**: `POST https://api.uiplayer.com/api/v2/recents/insertDatarecent`
  - **Body**: `{ streamid, type, profileid }`
- On success, logs: `{"error":false,"message":"Recent added successfully!","data":{...}}`
- Updates `listLiveRecent` in GlobalContext for the Recent category.

### 5. Video playback (react-native-video)

- **File**: `src/screens/PlayerScreen.tsx`
- **Source**: `{ uri: url, type: 'm3u8' }` for live streams.
- **Player**: `react-native-video` (ExoPlayer on Android, AVPlayer on iOS).
- **Live-specific settings**:
  - `live={true}`
  - HLS config: low latency, shorter buffers.
  - Buffer config: `minBufferMs: 1000`, `maxBufferMs: 10000`.
  - `controls={false}` for live.
- **Error handler**: `onError` logs the error and shows a Retry button.

---

## Video Player Error

### Observed error

```text
ERROR  Video player error: {"error": {"extra": -1, "what": 1}}
```

### Where it comes from

- **Platform**: Android (ExoPlayer via react-native-video).
- **Event**: Fired in `onError` when playback fails before or during start.

### Meaning of the codes

| Field   | Value | Meaning |
|---------|-------|---------|
| `what`  | `1`   | ExoPlayer `PlaybackException` / source error (e.g. `SOURCE_CHANGE_FAILED`, format/loading issue). |
| `extra` | `-1`  | Generic / unknown or unspecified error code. |

In ExoPlayer terms, this typically indicates a source/load failure (e.g. format not supported, manifest/segment load failure, or parsing error).

### Common causes for live HLS on Android

1. **Stream format / manifest**
   - Manifest not valid or not reachable.
   - Unexpected playlist structure (e.g. non-standard variants, unsupported codecs).
   - Server returns non-HLS content or redirects incorrectly.

2. **URL / extension detection**
   - URL may not clearly indicate HLS; the app already uses `source={{ uri, type: 'm3u8' }}` to hint format.

3. **Network / server**
   - Auth required (cookies, headers) not supported.
   - CORS or other server restrictions.
   - Stream not available or geo-restricted.

4. **Codec / container**
   - Codecs (e.g. H.264/AAC) or container not supported by the device.
   - Adaptive bitrate variants may use different codecs.

5. **Timing**
   - Live segment not yet available when requested.
   - Manifest or segments expire before playback starts.

### What the app does on error

1. Logs the full error object.
2. Sets an error message for the user.
3. Shows a Retry button.
4. On Retry, remounts the Video component via `videoKey` so the stream is recreated.

### Suggested debugging steps

1. **Test the URL outside the app**
   - Open the same URL in VLC or another HLS player.
   - If it fails there, the issue is with the stream/server, not the app.

2. **Inspect the exact URL**
   - Log or display `url` before passing it to the Video component.

3. **Try alternative format**
   - If the server supports MPEG-TS, try `ext: 'ts'` in `generateurlplayer` and use `type: 'ts'` in the source (if supported).

4. **Try on iOS**
   - If playback works on iOS but not on Android, the problem is likely Android/ExoPlayer specific (format/codec handling).

5. **Server configuration**
   - Confirm:
     - Valid HLS manifest and segments.
     - Correct CORS/auth headers if applicable.
     - Live stream availability and segment freshness.

---

## Terminal output example

```text
LOG  Running "IPTVPlayer" with {"rootTag":11}
LOG  {"error":false,"message":"Recent added successfully!","data":{"streamid":"419097","type":"live","insertDay":"2026-02-01T21:38:31.740Z","profileid":162,"season":null,"episode":null,"currenttime":null,"updated_at":"2026-02-01T21:38:31.740Z"}}
ERROR  Video player error: {"error": {"extra": -1, "what": 1}}
```

- `Recent added successfully!`: `insertDatarecent` succeeded.
- `Video player error`: ExoPlayer failed to play the live HLS stream.
- The error happens after the recent API call, which confirms the sequence: recent tracking works; playback then fails.

---

## Files involved

| File | Role |
|------|------|
| `src/screens/LiveScreen.tsx` | Channel list, URL generation, navigation to Player |
| `src/screens/PlayerScreen.tsx` | Video playback, recent tracking, error handling |
| `src/utils/constants.ts` | `generateurlplayer()`, `insertDatarecent()` |
| `src/context/GlobalContext.tsx` | Profile, recent lists |
