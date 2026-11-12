import AsyncStorage from "@react-native-async-storage/async-storage";
import DeviceInfo from "react-native-device-info";
import type { LoginModel } from "../models/model";

const identityKey = "@iptv/device_identity_v1";
const loginKey = "@velotv/verified_provider_login_v1";
const loginUrl = "https://api.uiplayer.com/api/apps/devices/login";

export interface ProviderIdentity {
  mac: string;
  version: string;
  type: number;
}

interface VerifiedLogin {
  login: LoginModel;
  checkedAt: number;
}

function validMac(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(value) &&
    !["02:00:00:00:00:00", "00:00:00:00:00:00", "ff:ff:ff:ff:ff:ff"].includes(
      value.toLowerCase(),
    )
  );
}

export function providerPassword(mac: string): string {
  return [...mac.replace(/:/g, "")]
    .map((char) => char.charCodeAt(0))
    .join("")
    .slice(0, 6);
}

export async function loadProviderIdentity(): Promise<ProviderIdentity> {
  const raw = await AsyncStorage.getItem(identityKey);
  const saved = raw ? JSON.parse(raw) : null;
  const version = DeviceInfo.getVersion();
  const mac =
    saved?.mac ?? (saved?.identifierType === "mac" ? saved.identifier : null);

  if (validMac(mac)) return { mac, version, type: saved.type ?? 1 };
  if (saved?.identifierType === "uniqueId")
    return { mac: "", version, type: saved.type ?? 1 };

  const candidate = (await DeviceInfo.getMacAddress().catch(() => ""))
    .trim()
    .toLowerCase();
  if (!validMac(candidate)) return { mac: "", version, type: 1 };

  const identity = { mac: candidate, version, type: 1 };
  await AsyncStorage.setItem(
    identityKey,
    JSON.stringify({
      identifier: candidate,
      identifierType: "mac",
      version,
      type: identity.type,
    }),
  );
  return identity;
}

export async function restoreProviderLogin(
  identity: ProviderIdentity,
): Promise<VerifiedLogin | null> {
  try {
    const raw = await AsyncStorage.getItem(loginKey);
    const saved: VerifiedLogin | null = raw ? JSON.parse(raw) : null;
    return identity.mac &&
      saved?.login.mac?.toLowerCase() === identity.mac.toLowerCase()
      ? saved
      : null;
  } catch {
    return null;
  }
}

export async function verifyProviderLogin(
  identity: ProviderIdentity,
): Promise<VerifiedLogin> {
  if (!validMac(identity.mac))
    throw new Error(
      "A usable MAC address is required for provider activation.",
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        mac: identity.mac,
        password: providerPassword(identity.mac),
        version: `'${identity.version}'`,
        type: String(identity.type),
      }),
    });
    if (!response.ok)
      throw new Error(
        `Provider verification failed (HTTP ${response.status}).`,
      );
    const login: LoginModel = await response.json();
    if (![-1, 0, 1].includes(login?.status))
      throw new Error("Invalid provider response.");
    const verified = {
      login: {
        ...login,
        mac: identity.mac,
        playlist: Array.isArray(login.playlist) ? login.playlist : [],
      },
      checkedAt: Date.now(),
    };
    await AsyncStorage.setItem(loginKey, JSON.stringify(verified)).catch(
      () => undefined,
    );
    return verified;
  } finally {
    clearTimeout(timeout);
  }
}
