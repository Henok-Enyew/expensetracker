import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const KEYS = {
  APP_LOCK_ENABLED: "birr_app_lock_enabled",
  PIN_HASH: "birr_pin_hash",
};

export async function getAppLockEnabled(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(KEYS.APP_LOCK_ENABLED);
  return v === "true";
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.APP_LOCK_ENABLED, enabled ? "true" : "false");
}

export async function getPinHash(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.PIN_HASH);
}

export async function setPinHash(hash: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.PIN_HASH, hash);
}

export async function clearPinHash(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.PIN_HASH);
}

export async function hashPin(pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return digest;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await getPinHash();
  if (!stored) return false;
  const hash = await hashPin(pin);
  return hash === stored;
}
