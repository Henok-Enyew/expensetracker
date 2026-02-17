import { Platform } from "react-native";

export interface SmsMessage {
  id: string;
  address: string;
  body: string;
  date: number;
  read: boolean;
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
  if (Platform.OS !== "android") {
    return [];
  }
  try {
    const { requireNativeModule } = require("expo-modules-core");
    const SmsInbox = requireNativeModule("SmsInbox");
    return await SmsInbox.readInbox(maxCount, sinceDate ?? 0);
  } catch (e) {
    console.warn("[SmsInbox] Native module not available:", e);
    return [];
  }
}
