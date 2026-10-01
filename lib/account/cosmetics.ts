import type { McSymbolName } from "@/components/mc-symbol";

// Profile cosmetics that games unlock. Pure data, shared by the server (to check what may be equipped)
// and the browser (to draw them), so it must not import any game code.
//
// Adding one is a single entry: pick a kind, and say which game stat unlocks it. A game reports a small
// "summary" of numbers with each cloud save (see lib/fractured-idle/summary.ts), and `need.stat` names one of
// those numbers. A new game just adds its own entries with its own `game` id and reports its own summary.
//
//   symbol  a glyph shown before your name
//   banner  the profile header background
//   frame   the ring around your avatar
//   accent  the color of your name glow and highlights

export type CosKind = "symbol" | "banner" | "frame" | "accent";
export const COS_KINDS: { id: CosKind; label: string; blurb: string; symbol: McSymbolName }[] = [
    { id: "symbol", label: "Name symbols", blurb: "A glyph shown before your name, everywhere on the site.", symbol: "magicFind" },
    { id: "banner", label: "Banners", blurb: "The backdrop of your profile header.", symbol: "location" },
    { id: "frame", label: "Avatar frames", blurb: "The ring around your avatar.", symbol: "defense" },
    { id: "accent", label: "Accent colors", blurb: "The color of your name glow and profile highlights.", symbol: "speed" },
];

export interface Need {
    game: string;
    /** A key of the game's summary (for Fractured Idle: level, rebirths, asc, visited, pets, mining, ...). */
    stat: string;
    n: number;
    label: string;
}

export interface Cosmetic {
    id: string;
    kind: CosKind;
    name: string;
    /** Which game unlocks it (display only). */
    game: string;
    need?: Need;
    /** symbol: the glyph. */
    symbol?: McSymbolName;
    /** accent: the color. frame/banner also use it as their base tint. */
    color?: string;
    /** banner: a CSS background. */
    bg?: string;
    /** frame: box-shadow ring; `spin` adds an animated conic ring. */
    ring?: string;
    spin?: boolean;
}

const FI = "fractured-idle";
const need = (stat: string, n: number, label: string): Need => ({ game: FI, stat, n, label });

export const COSMETICS: Cosmetic[] = [
    // ---- name symbols ----
    { id: "sym-none", kind: "symbol", name: "None", game: "site" },
    { id: "sym-spark", kind: "symbol", name: "Spark", game: FI, symbol: "speed", need: need("level", 5, "Fractured Level 5") },
    { id: "sym-forge", kind: "symbol", name: "Forge", game: FI, symbol: "forge", need: need("rebirths", 1, "Rebirth once") },
    { id: "sym-wisdom", kind: "symbol", name: "Wisdom", game: FI, symbol: "wisdom", need: need("level", 20, "Fractured Level 20") },
    { id: "sym-clover", kind: "symbol", name: "Clover", game: FI, symbol: "fortune", need: need("pets", 6, "Own 6 pets") },
    { id: "sym-portal", kind: "symbol", name: "Portal", game: FI, symbol: "portal", need: need("visited", 10, "Visit 10 islands") },
    { id: "sym-comet", kind: "symbol", name: "Comet", game: FI, symbol: "comet", need: need("asc", 1, "Ascend once") },
    { id: "sym-skull", kind: "symbol", name: "Skull", game: FI, symbol: "critDamage", need: need("level", 60, "Fractured Level 60") },
    { id: "sym-star", kind: "symbol", name: "Star", game: FI, symbol: "magicFind", need: need("level", 100, "Fractured Level 100") },
    { id: "sym-crown", kind: "symbol", name: "Crown", game: FI, symbol: "crown", need: need("asc", 3, "Ascend 3 times") },

    // ---- banners ----
    { id: "ban-dusk", kind: "banner", name: "Dusk", game: "site", color: "#a855f7", bg: "radial-gradient(120% 140% at 0% 0%, #3b1d6e 0%, transparent 60%), radial-gradient(100% 120% at 100% 100%, #1b3a6e 0%, transparent 60%), #0b0820" },
    { id: "ban-meadow", kind: "banner", name: "Meadow", game: FI, color: "#55ff55", bg: "radial-gradient(110% 130% at 10% 100%, #1f6b2a 0%, transparent 60%), radial-gradient(90% 110% at 95% 0%, #3d6b1f 0%, transparent 60%), #08150b", need: need("farming", 10, "Farming level 10") },
    { id: "ban-deep", kind: "banner", name: "Deep Mine", game: FI, color: "#ffaa00", bg: "radial-gradient(110% 130% at 90% 100%, #6b4a10 0%, transparent 60%), radial-gradient(90% 120% at 0% 0%, #2a2a38 0%, transparent 60%), #0c0b10", need: need("mining", 10, "Mining level 10") },
    { id: "ban-tide", kind: "banner", name: "Tide", game: FI, color: "#55ffff", bg: "radial-gradient(120% 140% at 100% 0%, #0f5a73 0%, transparent 60%), radial-gradient(90% 110% at 0% 100%, #123a6b 0%, transparent 60%), #06121c", need: need("fishing", 10, "Fishing level 10") },
    { id: "ban-ember", kind: "banner", name: "Ember", game: FI, color: "#ff7a33", bg: "radial-gradient(120% 140% at 0% 100%, #7a2a0c 0%, transparent 60%), radial-gradient(90% 110% at 100% 0%, #6b1010 0%, transparent 60%), #140806", need: need("rebirths", 1, "Rebirth once") },
    { id: "ban-nebula", kind: "banner", name: "Nebula", game: FI, color: "#ff55ff", bg: "radial-gradient(100% 120% at 20% 20%, #6b1f7a 0%, transparent 60%), radial-gradient(100% 120% at 85% 85%, #1f2f7a 0%, transparent 60%), #0d0614", need: need("asc", 1, "Ascend once") },
    { id: "ban-aurora", kind: "banner", name: "Aurora", game: FI, color: "#7dffb8", bg: "linear-gradient(115deg, #0b2a2a 0%, #1b6b55 28%, #3a2a7a 62%, #0b1030 100%)", need: need("asc", 3, "Ascend 3 times") },
    { id: "ban-fracture", kind: "banner", name: "Fracture", game: FI, color: "#ffd23a", bg: "conic-gradient(from 210deg at 50% 120%, #ff55ff, #55ffff, #ffd23a, #ff55ff), #07050f", need: need("level", 150, "Fractured Level 150") },

    // ---- avatar frames ----
    { id: "frm-plain", kind: "frame", name: "Plain", game: "site", color: "#ffffff", ring: "0 0 0 2px rgba(255,255,255,.25)" },
    { id: "frm-iron", kind: "frame", name: "Iron", game: FI, color: "#cfd6df", ring: "0 0 0 3px #cfd6df, 0 0 14px -2px #cfd6df88", need: need("level", 10, "Fractured Level 10") },
    { id: "frm-emerald", kind: "frame", name: "Emerald", game: FI, color: "#55ff55", ring: "0 0 0 3px #55ff55, 0 0 16px 0 #55ff5588", need: need("visited", 8, "Visit 8 islands") },
    { id: "frm-gold", kind: "frame", name: "Gold", game: FI, color: "#ffaa00", ring: "0 0 0 3px #ffaa00, 0 0 18px 0 #ffaa0099", need: need("rebirths", 3, "Rebirth 3 times") },
    { id: "frm-diamond", kind: "frame", name: "Diamond", game: FI, color: "#55ffff", ring: "0 0 0 3px #55ffff, 0 0 22px 1px #55ffffaa", need: need("asc", 1, "Ascend once") },
    { id: "frm-ender", kind: "frame", name: "Ender", game: FI, color: "#c084fc", ring: "0 0 0 3px #a855f7, 0 0 24px 2px #a855f7aa", need: need("level", 100, "Fractured Level 100") },
    { id: "frm-fractured", kind: "frame", name: "Fractured", game: FI, color: "#ffd23a", spin: true, need: need("asc", 5, "Ascend 5 times") },

    // ---- accent colors ----
    { id: "acc-aqua", kind: "accent", name: "Aqua", game: "site", color: "#55ffff" },
    { id: "acc-green", kind: "accent", name: "Green", game: FI, color: "#55ff55", need: need("level", 10, "Fractured Level 10") },
    { id: "acc-gold", kind: "accent", name: "Gold", game: FI, color: "#ffaa00", need: need("mining", 20, "Mining level 20") },
    { id: "acc-pink", kind: "accent", name: "Pink", game: FI, color: "#ff55ff", need: need("pets", 4, "Own 4 pets") },
    { id: "acc-red", kind: "accent", name: "Red", game: FI, color: "#ff5555", need: need("combat", 20, "Combat level 20") },
    { id: "acc-violet", kind: "accent", name: "Violet", game: FI, color: "#c084fc", need: need("asc", 1, "Ascend once") },
    { id: "acc-white", kind: "accent", name: "Radiant", game: FI, color: "#ffffff", need: need("level", 200, "Fractured Level 200") },
];

export const DEFAULTS: Record<CosKind, string> = { symbol: "sym-none", banner: "ban-dusk", frame: "frm-plain", accent: "acc-aqua" };

export const cosmeticById = (id: string) => COSMETICS.find((c) => c.id === id);
export const ofKind = (k: CosKind) => COSMETICS.filter((c) => c.kind === k);

/** What a profile has equipped: kind -> cosmetic id. Missing or unknown entries fall back to the defaults. */
export type Equipped = Partial<Record<CosKind, string>>;
/** Per-game summary numbers (and a few ids), as reported with each cloud save. */
export type GameSummary = Record<string, number | string>;
export type GameSummaries = Record<string, GameSummary>;

export function equippedOf(e: Equipped | null | undefined): Record<CosKind, Cosmetic> {
    const out = {} as Record<CosKind, Cosmetic>;
    for (const k of Object.keys(DEFAULTS) as CosKind[]) {
        const c = e?.[k] ? cosmeticById(e[k]!) : undefined;
        out[k] = c && c.kind === k ? c : cosmeticById(DEFAULTS[k])!;
    }
    return out;
}

/** The player's current value for a cosmetic's requirement. */
export const progressFor = (c: Cosmetic, games: GameSummaries): number => {
    if (!c.need) return Infinity;
    const v = games[c.need.game]?.[c.need.stat];
    return typeof v === "number" ? v : 0;
};
export const isUnlocked = (c: Cosmetic, games: GameSummaries) => !c.need || progressFor(c, games) >= c.need.n;
