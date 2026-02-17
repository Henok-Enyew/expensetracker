import { Platform } from "react-native";

export interface SmsMessage {
  id: string;
  address: string;
  body: string;
  date: number;
  read: boolean;
}

export interface IncomingSms {
  address: string;
  body: string;
  date: number;
}

let nativeModule: any = null;
let eventEmitter: any = null;

function getNativeModule() {
  if (nativeModule) return nativeModule;
  if (Platform.OS !== "android") return null;
  try {
    const { requireNativeModule } = require("expo-modules-core");
    nativeModule = requireNativeModule("SmsInbox");
    return nativeModule;
  } catch (e) {
    console.warn("[SmsInbox] Native module not available:", e);
    return null;
  }
}

function getEventEmitter() {
  if (eventEmitter) return eventEmitter;
  if (Platform.OS !== "android") return null;
  try {
    const { EventEmitter, requireNativeModule } = require("expo-modules-core");
    const mod = requireNativeModule("SmsInbox");
    eventEmitter = new EventEmitter(mod);
    return eventEmitter;
  } catch (e) {
    console.warn("[SmsInbox] EventEmitter not available:", e);
    return null;
  }
}

/**
 * Read SMS messages from the device inbox (Android only).
 * Returns messages sorted by date descending (newest first).
 *
 * @param maxCount  Maximum number of messages to return (default 1000)
 * @param sinceDate Unix timestamp in ms — only return messages after this date (0 = no filter)
 */
export async function readSmsInbox(
  maxCount: number = 1000,
  sinceDate?: number,
): Promise<SmsMessage[]> {
  const mod = getNativeModule();
  if (!mod) return [];
  try {
    return await mod.readInbox(maxCount, sinceDate ?? 0);
  } catch (e) {
    console.warn("[SmsInbox] readInbox failed:", e);
    return [];
  }
}

/**
 * Start listening for incoming SMS messages (Android only).
 * Returns true if listener was started successfully.
 */
export async function startSmsListening(): Promise<boolean> {
  const mod = getNativeModule();
  if (!mod) return false;
  try {
    return await mod.startListening();
  } catch (e) {
    console.warn("[SmsInbox] startListening failed:", e);
    return false;
  }
}

/**
 * Stop listening for incoming SMS messages.
 */
export async function stopSmsListening(): Promise<boolean> {
  const mod = getNativeModule();
  if (!mod) return false;
  try {
    return await mod.stopListening();
  } catch (e) {
    console.warn("[SmsInbox] stopListening failed:", e);
    return false;
  }
}

/**
 * Subscribe to incoming SMS events.
 * Returns an unsubscribe function.
 */
export function addSmsReceivedListener(
  callback: (sms: IncomingSms) => void,
): { remove: () => void } {
  const emitter = getEventEmitter();
  if (!emitter) {
    return { remove: () => {} };
  }
  const subscription = emitter.addListener("onSmsReceived", callback);
  return subscription;
}
