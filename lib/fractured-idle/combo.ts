// Combo: the longer you hold the button (or Space), the higher your combo
// multiplier climbs, exponentially (it doubles every COMBO_T seconds at base
// build speed) until it reaches your max. The multiplier applies to click
// value, speeds up held clicks, gives minions a small active boost and makes
// treasure bobbers show up sooner. Letting go drains it after a short grace.
//
// Max multiplier and build speed come from many places (see derive() in
// engine.ts): Training upgrades, rebirth and ascension upgrades, Combat and
// Mining levels, and the button looks you equip. Surges are a rare proc while
// holding that make the combo build SURGE_GAIN times faster for a few seconds.

export const COMBO_BASE_MAX = 2; // max multiplier before any bonuses
export const COMBO_T = 5; // seconds to double at build speed 1
export const COMBO_GRACE = 0.35; // seconds after letting go before the combo starts draining
export const COMBO_CPS_SHARE = 0.12; // share of (mult - 1) that minions also get while you hold
export const COMBO_BOBBER_SHARE = 0.4; // share of (mult - 1) that speeds up bobber spawns
export const SURGE_LEN = 6;
export const SURGE_GAIN = 2.5;
export const SURGE_BASE_CHANCE = 0.012; // per second of holding, once the combo is warm

export interface ComboTier {
    at: number; // multiplier where the tier starts
    name: string;
    color: string;
}

export const COMBO_TIERS: ComboTier[] = [
    { at: 1, name: "Warming up", color: "var(--mc-aqua)" },
    { at: 1.5, name: "Warm", color: "var(--mc-green)" },
    { at: 2.5, name: "Hot", color: "var(--mc-yellow)" },
    { at: 4, name: "Blazing", color: "var(--mc-gold)" },
    { at: 7, name: "Inferno", color: "var(--mc-red)" },
    { at: 12, name: "Overdrive", color: "var(--mc-light-purple)" },
    { at: 25, name: "Hyper", color: "var(--mc-blue)" },
    { at: 50, name: "Godspeed", color: "#ffffff" },
];

/** Multipliers that announce themselves with a pop. */
export const COMBO_MILESTONES = [1.5, 2, 3, 4, 5, 7, 10, 15, 20, 30, 50, 75, 100];

export interface ComboCfg {
    max: number; // max multiplier
    gain: number; // build speed (1 = base)
    surge: number; // surge chance per second of holding
    cap: number; // held clicks per second ceiling
}

export interface ComboState {
    t: number; // effective seconds built up
    mult: number;
    grace: number;
    surge: number; // seconds of surge left
    tier: number;
    mile: number; // index of the next milestone to cross
    atMax: boolean;
}

export type ComboEvent =
    | { type: "milestone"; value: number }
    | { type: "tier"; tier: number }
    | { type: "surge" }
    | { type: "max" };

export const newCombo = (): ComboState => ({ t: 0, mult: 1, grace: 0, surge: 0, tier: 0, mile: 0, atMax: false });

export const tierOf = (mult: number) => {
    let i = 0;
    while (i + 1 < COMBO_TIERS.length && mult >= COMBO_TIERS[i + 1].at) i++;
    return i;
};

/** Bar fill 0..1. The bar is log-scaled, because the multiplier grows exponentially with time. */
export const comboFill = (mult: number, max: number) => (max <= 1 ? 0 : Math.max(0, Math.min(1, Math.log(mult) / Math.log(max))));

/** Held clicks per second at this multiplier (linear in the multiplier, up to the cap). */
export const holdRate = (mult: number, base: number, cap: number) => Math.min(cap, base * mult);

/** Advance the combo by dt seconds. Returns what happened, for the UI to celebrate. */
export function stepCombo(c: ComboState, cfg: ComboCfg, holding: boolean, dt: number, rand: () => number = Math.random): ComboEvent[] {
    const events: ComboEvent[] = [];
    const T = COMBO_T / cfg.gain;
    const tMax = T * Math.log2(Math.max(1.0001, cfg.max));
    if (holding) {
        c.grace = COMBO_GRACE;
        c.t = Math.min(tMax, c.t + dt * (c.surge > 0 ? SURGE_GAIN : 1));
        if (c.surge > 0) c.surge = Math.max(0, c.surge - dt);
        else if (c.mult > 1.3 && rand() < cfg.surge * dt) {
            c.surge = SURGE_LEN;
            events.push({ type: "surge" });
        }
    } else {
        c.surge = Math.max(0, c.surge - dt);
        if (c.grace > 0) c.grace -= dt;
        else c.t = Math.max(0, c.t - dt * (tMax / 2.5 + 0.6)); // drains in about 2.5s from full
    }
    c.t = Math.min(c.t, tMax);
    c.mult = Math.min(cfg.max, Math.pow(2, c.t / T));

    // Milestones: announce each one once per climb.
    while (c.mile < COMBO_MILESTONES.length && c.mult >= COMBO_MILESTONES[c.mile]) {
        events.push({ type: "milestone", value: COMBO_MILESTONES[c.mile] });
        c.mile++;
    }
    while (c.mile > 0 && c.mult < COMBO_MILESTONES[c.mile - 1]) c.mile--;

    const tier = tierOf(c.mult);
    if (tier > c.tier) events.push({ type: "tier", tier });
    c.tier = tier;

    const atMax = c.mult >= cfg.max - 1e-6 && cfg.max > 1.01;
    if (atMax && !c.atMax) events.push({ type: "max" });
    c.atMax = atMax;
    return events;
}
