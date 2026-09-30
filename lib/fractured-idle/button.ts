import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "./data";

// The click button's wardrobe. Every look unlocks from lifetime stats (no
// currency), and whichever shape, skin and effect you have equipped pays its
// small bonus, so choosing a look is also choosing a playstyle.
// To add a look: append a row below (ids are saved, so never rename one), and
// for a new CSS skin / clip shape add the matching rule in button-face.tsx.

export type BtnStat = "clicks" | "crits" | "total" | "rebirths" | "asc" | "bobbers";

export interface BtnBonus {
    click?: number; // +x of click value
    crit?: number; // +x crit chance
    critDmg?: number; // +x crit damage
    hold?: number; // +clicks/s at full heat while holding
}

export interface LookDef {
    id: string;
    name: string;
    desc: string;
    need?: { stat: BtnStat; n: number };
    bonus?: BtnBonus;
}

export const STAT_LABEL: Record<BtnStat, string> = {
    clicks: "clicks",
    crits: "crits",
    total: "lifetime shards",
    rebirths: "rebirths",
    asc: "ascensions",
    bobbers: "bobbers caught",
};

export const SHAPES: LookDef[] = [
    { id: "block", name: "Block", desc: "The classic." },
    { id: "orb", name: "Orb", desc: "Smooth and round.", need: { stat: "clicks", n: 250 }, bonus: { click: 0.03 } },
    { id: "hex", name: "Hexite", desc: "Six honest sides.", need: { stat: "clicks", n: 2000 }, bonus: { crit: 0.01 } },
    { id: "diamond", name: "Shard", desc: "Sharp and hungry.", need: { stat: "crits", n: 100 }, bonus: { critDmg: 0.1 } },
    { id: "octagon", name: "Stopper", desc: "Built to be hammered.", need: { stat: "clicks", n: 15000 }, bonus: { hold: 1 } },
    { id: "bastion", name: "Bastion", desc: "A shield that hits back.", need: { stat: "rebirths", n: 1 }, bonus: { click: 0.05 } },
    { id: "nova", name: "Nova", desc: "A star in your hand.", need: { stat: "crits", n: 2500 }, bonus: { crit: 0.02, critDmg: 0.1 } },
];

export const SKINS: LookDef[] = [
    { id: "island", name: "Island", desc: "Takes the color of your island." },
    { id: "glass", name: "Glass", desc: "Clear and cool.", need: { stat: "clicks", n: 100 }, bonus: { click: 0.02 } },
    { id: "ember", name: "Ember", desc: "Molten and restless.", need: { stat: "clicks", n: 1000 }, bonus: { click: 0.04 } },
    { id: "frost", name: "Frost", desc: "Crisp ice crystal.", need: { stat: "crits", n: 50 }, bonus: { crit: 0.015 } },
    { id: "circuit", name: "Circuit", desc: "Live wires.", need: { stat: "clicks", n: 25000 }, bonus: { hold: 1 } },
    { id: "void", name: "Void", desc: "Stars in the dark.", need: { stat: "total", n: 1e7 }, bonus: { critDmg: 0.15 } },
    { id: "gold", name: "Gold", desc: "Polished and gleaming.", need: { stat: "total", n: 1e10 }, bonus: { click: 0.08 } },
    { id: "prism", name: "Prism", desc: "Every color at once.", need: { stat: "asc", n: 1 }, bonus: { click: 0.05, crit: 0.02 } },
];

export const BURSTS: LookDef[] = [
    { id: "ripple", name: "Ripple", desc: "Rings on water." },
    { id: "sparks", name: "Sparks", desc: "Quick little flecks.", need: { stat: "clicks", n: 150 }, bonus: { click: 0.02 } },
    { id: "bubbles", name: "Bubbles", desc: "Drifting upward.", need: { stat: "bobbers", n: 3 }, bonus: { crit: 0.01 } },
    { id: "stars", name: "Stars", desc: "Tumbling sparkles.", need: { stat: "clicks", n: 3000 }, bonus: { critDmg: 0.08 } },
    { id: "embers", name: "Embers", desc: "Rising heat.", need: { stat: "clicks", n: 12000 }, bonus: { click: 0.04 } },
    { id: "confetti", name: "Confetti", desc: "Every click a party.", need: { stat: "crits", n: 500 }, bonus: { crit: 0.015, hold: 1 } },
    { id: "shock", name: "Shockwave", desc: "Thunder on every hit.", need: { stat: "rebirths", n: 5 }, bonus: { click: 0.05, critDmg: 0.1 } },
];

export const GLYPHS: { id: string; name: string; symbol: McSymbolName }[] = [
    { id: "speed", name: "Spark", symbol: "speed" },
    { id: "strength", name: "Fist", symbol: "strength" },
    { id: "fortune", name: "Clover", symbol: "fortune" },
    { id: "heat", name: "Steam", symbol: "heat" },
    { id: "regen", name: "Heart", symbol: "regen" },
    { id: "comet", name: "Comet", symbol: "comet" },
    { id: "pristine", name: "Gem", symbol: "pristine" },
    { id: "portal", name: "Portal", symbol: "portal" },
];

export interface BtnPrefs {
    shape: string;
    skin: string;
    burst: string;
    glyph: string;
    hold: boolean; // hold to auto-click
}

export const DEFAULT_BTN: BtnPrefs = { shape: "block", skin: "island", burst: "ripple", glyph: "speed", hold: true };

export const isUnlocked = (s: State, l: LookDef) => !l.need || (s[l.need.stat] as number) >= l.need.n;

const find = (list: LookDef[], id: string) => list.find((l) => l.id === id) ?? list[0];

/** Coerce saved prefs to ids that exist and are unlocked. */
export function cleanBtn(raw: unknown, s: State): BtnPrefs {
    const r = (raw && typeof raw === "object" ? raw : {}) as Partial<BtnPrefs>;
    const pick = (list: LookDef[], id: unknown) => {
        const l = list.find((x) => x.id === id);
        return l && isUnlocked(s, l) ? l.id : list[0].id;
    };
    return {
        shape: pick(SHAPES, r.shape),
        skin: pick(SKINS, r.skin),
        burst: pick(BURSTS, r.burst),
        glyph: GLYPHS.some((g) => g.id === r.glyph) ? (r.glyph as string) : DEFAULT_BTN.glyph,
        hold: r.hold !== false,
    };
}

/** Summed bonus of the equipped shape + skin + effect. */
export function btnBonus(s: State): Required<BtnBonus> {
    const out = { click: 0, crit: 0, critDmg: 0, hold: 0 };
    const b = s.btn;
    for (const l of [find(SHAPES, b.shape), find(SKINS, b.skin), find(BURSTS, b.burst)]) {
        if (!isUnlocked(s, l) || !l.bonus) continue;
        out.click += l.bonus.click ?? 0;
        out.crit += l.bonus.crit ?? 0;
        out.critDmg += l.bonus.critDmg ?? 0;
        out.hold += l.bonus.hold ?? 0;
    }
    return out;
}

// ---- Holding ----
// Holding the button (or Space) clicks automatically. The rate starts at
// HOLD_BASE and heats up to HOLD_MAX over HEAT_SECONDS of unbroken holding.

export const HOLD_BASE = 3;
export const HOLD_MAX = 7;
export const HEAT_SECONDS = 2.2;

export const holdMax = (s: State) => HOLD_MAX + btnBonus(s).hold;

export function bonusText(b: BtnBonus): string {
    const p: string[] = [];
    if (b.click) p.push(`+${Math.round(b.click * 100)}% click`);
    if (b.crit) p.push(`+${+(b.crit * 100).toFixed(1)}% crit chance`);
    if (b.critDmg) p.push(`+${Math.round(b.critDmg * 100)}% crit damage`);
    if (b.hold) p.push(`+${b.hold} hold click/s`);
    return p.join(", ");
}
