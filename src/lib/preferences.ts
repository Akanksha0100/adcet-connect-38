/**
 * Persistent admin/user preferences (toggles only, no PII).
 * Stored in localStorage; dark mode is reflected on <html>.
 */
import { useEffect, useState } from "react";

export type PreferenceKey =
  | "emailNotifications"
  | "pushNotifications"
  | "darkMode"
  | "weeklyDigest";

export type Preferences = Record<PreferenceKey, boolean>;

const STORAGE_KEY = "adcet:prefs:v1";
const EVENT = "adcet:prefs";

export const DEFAULT_PREFS: Preferences = {
  emailNotifications: true,
  pushNotifications: true,
  darkMode: false,
  weeklyDigest: true,
};

export const readPrefs = (): Preferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const writePrefs = (prefs: Preferences) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  applyDarkMode(prefs.darkMode);
  window.dispatchEvent(new CustomEvent(EVENT));
};

export const applyDarkMode = (enabled: boolean) => {
  const root = document.documentElement;
  if (enabled) root.classList.add("dark");
  else root.classList.remove("dark");
};

/** Call once on app boot to sync the `<html class="dark">` flag. */
export const initPreferences = () => {
  applyDarkMode(readPrefs().darkMode);
};

export const requestPushPermission = async (): Promise<boolean> => {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
};

export const usePreferences = (): [Preferences, (key: PreferenceKey, value: boolean) => void] => {
  const [prefs, setPrefs] = useState<Preferences>(readPrefs);
  useEffect(() => {
    const refresh = () => setPrefs(readPrefs());
    window.addEventListener("storage", refresh);
    window.addEventListener(EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(EVENT, refresh);
    };
  }, []);
  const update = (key: PreferenceKey, value: boolean) => {
    const next = { ...readPrefs(), [key]: value };
    writePrefs(next);
    setPrefs(next);
  };
  return [prefs, update];
};