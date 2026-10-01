import type { GameSummary } from "@/lib/account/cosmetics";
import type { State } from "./data";
import { prefixStat, type PrefixStat } from "./fxp";

// The small set of numbers Fractured Idle reports with every cloud save. Profile cosmetics unlock from these,
// and the top-right menu and profile read them without opening the whole save. Keep the keys stable: renaming
// one would re-lock everything that depends on it.
export const SUMMARY_STATS: PrefixStat[] = ["level", "mining", "farming", "combat", "fishing", "rebirths", "asc", "pets", "visited", "islands", "total", "bestCombo", "frag", "perfect"];

export function fiSummary(s: State): GameSummary {
    const out: GameSummary = {};
    for (const k of SUMMARY_STATS) out[k] = prefixStat(s, k);
    out.clicks = s.clicks;
    out.playTime = Math.floor(s.playTime);
    out.bsym = s.bsym;
    out.pfx = s.pfx;
    return out;
}
