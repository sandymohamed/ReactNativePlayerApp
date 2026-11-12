import RNFS from "react-native-fs";
import type { MainDataCache } from "./storage";

const directory = `${RNFS.DocumentDirectoryPath}/velotv-catalog-v1`;
const pathFor = (key: string) => `${directory}/${encodeURIComponent(key)}.json`;

export async function readPlaylistCache(
  key: string,
  revision: string,
): Promise<MainDataCache | null> {
  try {
    const path = pathFor(key);
    if (!(await RNFS.exists(path))) return null;
    const snapshot = JSON.parse(await RNFS.readFile(path, "utf8"));
    return snapshot.revision === revision ? snapshot.catalog : null;
  } catch {
    return null;
  }
}

export async function writePlaylistCache(
  key: string,
  revision: string,
  catalog: MainDataCache,
): Promise<void> {
  const path = pathFor(key);
  const pending = `${path}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await RNFS.mkdir(directory);
  try {
    await RNFS.writeFile(
      pending,
      JSON.stringify({ revision, catalog }),
      "utf8",
    );
    await RNFS.moveFile(pending, path);
  } finally {
    if (await RNFS.exists(pending)) await RNFS.unlink(pending);
  }
}

export async function deletePlaylistCache(key: string): Promise<void> {
  const path = pathFor(key);
  if (await RNFS.exists(path)) await RNFS.unlink(path);
}
