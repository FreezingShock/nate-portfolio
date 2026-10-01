"use client";

import { useSyncExternalStore } from "react";
import { getPrefs, setPrefs, subscribePrefs, type Prefs } from "./engine";

const SERVER: Prefs = { on: true, master: 0.8, ui: 1, game: 1, clickMute: 4 };

/** The live sound preferences (re-renders when they change anywhere on the site). */
export function useSoundPrefs() {
    const p = useSyncExternalStore(subscribePrefs, getPrefs, () => SERVER);
    return [p, setPrefs] as const;
}
