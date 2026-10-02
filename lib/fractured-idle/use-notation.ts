"use client";

import { useSyncExternalStore } from "react";
import { getNotation, subscribeNotation } from "./format";

/** Re-render the calling component whenever the number style (suffix or scientific) is switched. */
export const useNotation = () => useSyncExternalStore(subscribeNotation, getNotation, () => false);
