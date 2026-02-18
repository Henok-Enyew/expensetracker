import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as security from "@/lib/security";

interface SecurityContextValue {
  appLockEnabled: boolean;
  locked: boolean;
  setLocked: (v: boolean) => void;
  unlockWithBiometric: () => Promise<boolean>;
  unlockWithPin: (pin: string) => Promise<boolean>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  hasPin: boolean;
  hasBiometric: boolean;
  isLoading: boolean;
  suppressLock: () => void;
  unsuppressLock: () => void;
}

const SecurityContext = createContext<SecurityContextValue | null>(null);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const suppressRef = React.useRef(false);

  const suppressLock = useCallback(() => { suppressRef.current = true; }, []);
  const unsuppressLock = useCallback(() => {
    setTimeout(() => { suppressRef.current = false; }, 2000);
  }, []);

  const loadSecurityState = useCallback(async () => {
    try {
      const [enabled, pinHash] = await Promise.all([
        security.getAppLockEnabled(),
        security.getPinHash(),
      ]);
      setAppLockEnabledState(enabled);
      setHasPin(!!pinHash);
      if (enabled) setLocked(true);
      const biometric = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(biometric && enrolled);
    } catch (e) {
      console.error("Security load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityState();
  }, [loadSecurityState]);

  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!appLockEnabled) return;
    appStateRef.current = AppState.currentState;
    const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if ((nextState === "background" || nextState === "inactive") && !suppressRef.current) {
        setLocked(true);
      }
      if (nextState === "active" && (prev === "background" || prev === "inactive")) {
        if (!suppressRef.current) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [appLockEnabled]);

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Birr Track",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await security.verifyPin(pin);
    if (ok) setLocked(false);
    return ok;
  }, []);

  const setAppLockEnabled = useCallback(async (enabled: boolean) => {
    await security.setAppLockEnabled(enabled);
    setAppLockEnabledState(enabled);
    if (!enabled) {
      setLocked(false);
      await security.clearPinHash();
      setHasPin(false);
    }
  }, []);

  const setPin = useCallback(async (pin: string) => {
    const hash = await security.hashPin(pin);
    await security.setPinHash(hash);
    setHasPin(true);
  }, []);

  const value = useMemo(
    () => ({
      appLockEnabled,
      locked,
      setLocked,
      unlockWithBiometric,
      unlockWithPin,
      setAppLockEnabled,
      setPin,
      hasPin,
      hasBiometric,
      isLoading,
      suppressLock,
      unsuppressLock,
    }),
    [
      appLockEnabled,
      locked,
      unlockWithBiometric,
      unlockWithPin,
      setAppLockEnabled,
      setPin,
      hasPin,
      hasBiometric,
      isLoading,
      suppressLock,
      unsuppressLock,
    ],
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error("useSecurity must be used within SecurityProvider");
  return ctx;
}
