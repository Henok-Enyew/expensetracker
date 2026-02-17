import React from "react";
import { useSmsListener } from "@/hooks/useSmsListener";

/**
 * Invisible component that starts the global SMS listener.
 * Must be mounted inside AppProvider.
 */
export function SmsListenerProvider({ children }: { children: React.ReactNode }) {
  useSmsListener();
  return <>{children}</>;
}
