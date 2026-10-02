import { ASC_UPS, REBIRTH_UPS, UPGRADES, type State } from "./data";
import type { EStat } from "./enchant";

// What the "new systems" upgrades add: shard upgrades of kind "fx", and the token and gem upgrades that carry an `fx`.
// Each one adds `value * level` to one stat. The Mine and Farm read their own stats straight from here (upStat);
// everything else reaches the game through allFx in enchant.ts.

const SHARD = UPGRADES.filter((u) => u.kind === "fx" && u.stat);
const TOKEN = REBIRTH_UPS.filter((u) => u.fx);
const GEM = ASC_UPS.filter((u) => u.fx);

/** The total bonus to one stat from every shard, token and gem upgrade. */
export function upStat(s: State, stat: EStat): number {
    let v = 0;
    for (const u of SHARD) if (u.stat === stat) v += u.value * (s.ups[u.id] || 0);
    for (const u of TOKEN) if (u.fx![0] === stat) v += u.fx![1] * (s.rups[u.id] || 0);
    for (const u of GEM) if (u.fx![0] === stat) v += u.fx![1] * (s.aups[u.id] || 0);
    return v;
}

/** Every stat these upgrades touch, summed. */
export function upFx(s: State): Partial<Record<EStat, number>> {
    const out: Partial<Record<EStat, number>> = {};
    for (const u of SHARD) {
        const l = s.ups[u.id] || 0;
        if (l) out[u.stat!] = (out[u.stat!] ?? 0) + u.value * l;
    }
    for (const u of TOKEN) {
        const l = s.rups[u.id] || 0;
        if (l) out[u.fx![0]] = (out[u.fx![0]] ?? 0) + u.fx![1] * l;
    }
    for (const u of GEM) {
        const l = s.aups[u.id] || 0;
        if (l) out[u.fx![0]] = (out[u.fx![0]] ?? 0) + u.fx![1] * l;
    }
    return out;
}

export const FX_WORD: Partial<Record<EStat, string>> = {
    xp: "skill XP",
    petXp: "pet XP",
    dust: "arcane dust",
    luck: "enchant luck",
    offline: "offline",
    tokens: "tokens",
    ore: "ore",
    drill: "drill speed",
    forge: "forge speed",
    crop: "crops",
    grow: "growth",
    goldCrop: "golden crops",
    sale: "sale price",
    cook: "cooking speed",
};

const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, "");
/** "+12% skill XP" for a total of `v` (a fraction) on a stat. */
export const fxText = (stat: EStat, v: number) => (v > 0 ? `+${trim(v * 100)}% ${FX_WORD[stat] ?? stat}` : `no ${FX_WORD[stat] ?? stat} bonus`);
