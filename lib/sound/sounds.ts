import { gate, note, pick, tone, whoosh, type Bus } from "./engine";

// The sound catalogue. Every entry is a tier (see engine.ts), a bus (site interface vs game), a minimum gap between
// plays, and a small recipe made from the engine's soft voices. Notes are scale degrees of one pentatonic scale
// (0 = C4, 5 = C5), so everything agrees with everything else.

type Def = { tier: number; bus: Bus; gap: number; play: (a: any) => void };

const seq = (bus: Bus, degs: number[], step: number, o: { dur: number; gain: number; harm?: number; type?: OscillatorType; cutoff?: number; at?: number }) =>
    degs.forEach((d, i) => tone(bus, { f: note(d), at: (o.at ?? 0) + i * step, dur: o.dur, gain: o.gain, harm: o.harm, type: o.type, cutoff: o.cutoff ?? 3200, attack: 0.012 }));

const DEFS = {
    // ---- tier 0: ambient
    hover: { tier: 0, bus: "ui", gap: 70, play: () => tone("ui", { f: note(9), dur: 0.05, gain: 0.025, cutoff: 1800, attack: 0.01 }) },

    tip: { tier: 0, bus: "ui", gap: 90, play: () => tone("ui", { f: note(8 + pick("tip", 2)), dur: 0.07, gain: 0.03, glide: 0.96, cutoff: 1800, attack: 0.012 }) },

    // ---- tier 1: interface
    tap: {
        tier: 1,
        bus: "ui",
        gap: 35,
        play: () => tone("ui", { f: note(4 + pick("tap", 3)), dur: 0.12, gain: 0.12, harm: 0.22, glide: 0.94, attack: 0.012, cutoff: 2600 }),
    },
    tab: {
        tier: 1,
        bus: "ui",
        gap: 50,
        play: () => {
            tone("ui", { f: note(3), dur: 0.14, gain: 0.11, glide: 0.88, attack: 0.012, cutoff: 2200 });
            whoosh("ui", { from: 500, to: 1500, dur: 0.12, gain: 0.018 });
        },
    },
    on: { tier: 1, bus: "ui", gap: 60, play: () => seq("ui", [4, 6], 0.065, { dur: 0.16, gain: 0.11, harm: 0.2 }) },
    off: { tier: 1, bus: "ui", gap: 60, play: () => seq("ui", [6, 3], 0.065, { dur: 0.16, gain: 0.09, harm: 0.1, cutoff: 2200 }) },
    open: {
        tier: 1,
        bus: "ui",
        gap: 90,
        play: () => {
            whoosh("ui", { from: 350, to: 1800, dur: 0.2, gain: 0.05 });
            tone("ui", { f: note(5), at: 0.05, dur: 0.12, gain: 0.07, attack: 0.02, cutoff: 2400 });
        },
    },
    close: {
        tier: 1,
        bus: "ui",
        gap: 90,
        play: () => {
            whoosh("ui", { from: 1600, to: 330, dur: 0.18, gain: 0.04 });
            tone("ui", { f: note(3), dur: 0.1, gain: 0.06, attack: 0.02, cutoff: 2000 });
        },
    },
    nav: { tier: 1, bus: "ui", gap: 300, play: () => seq("ui", [5, 7], 0.09, { dur: 0.22, gain: 0.08, harm: 0.25, cutoff: 2800 }) },
    deny: { tier: 1, bus: "ui", gap: 120, play: () => tone("ui", { f: note(-3), dur: 0.14, gain: 0.1, glide: 0.8, attack: 0.012, cutoff: 1500 }) },

    // the big button: a soft low bloop that climbs with the combo, and a small sparkle on a crit
    click: {
        tier: 1,
        bus: "game",
        gap: 42,
        play: (a: { mult?: number; crit?: boolean } | undefined) => {
            const m = Math.max(1, a?.mult ?? 1);
            const deg = Math.max(0, Math.min(9, Math.round(Math.log2(m) * 2.2))) + pick("click", 2) - 1;
            tone("game", { f: note(deg - 1), dur: 0.1, gain: 0.13, glide: 0.8, attack: 0.005, cutoff: 2000, harm: 0.18 });
            tone("game", { f: note(deg - 6), dur: 0.09, gain: 0.09, attack: 0.004, cutoff: 800 });
            if (a?.crit) seq("game", [deg + 4, deg + 7], 0.05, { dur: 0.2, gain: 0.08, harm: 0.35, at: 0.02 });
        },
    },

    // ---- tier 2: transactions
    buy: { tier: 2, bus: "game", gap: 40, play: () => seq("game", [4, 7], 0.06, { dur: 0.24, gain: 0.14, harm: 0.28 }) },
    bulk: { tier: 2, bus: "game", gap: 60, play: () => seq("game", [3, 5, 7, 9], 0.05, { dur: 0.26, gain: 0.13, harm: 0.28 }) },
    equip: { tier: 2, bus: "game", gap: 60, play: () => seq("game", [2, 6], 0.075, { dur: 0.26, gain: 0.13, harm: 0.2, type: "triangle" }) },
    collect: { tier: 2, bus: "game", gap: 60, play: () => seq("game", [7, 11], 0.07, { dur: 0.3, gain: 0.13, harm: 0.4 }) },
    popup: { tier: 1, bus: "game", gap: 400, play: () => tone("game", { f: note(9), dur: 0.4, gain: 0.08, harm: 0.4, attack: 0.02, cutoff: 3000 }) },

    // ---- tier 3: rewards
    level: { tier: 3, bus: "game", gap: 300, play: () => seq("game", [4, 6, 8, 10], 0.09, { dur: 0.4, gain: 0.14, harm: 0.25, type: "triangle" }) },
    trophy: { tier: 3, bus: "game", gap: 300, play: () => seq("game", [5, 7, 9], 0.1, { dur: 0.45, gain: 0.14, harm: 0.3 }) },
    tier: { tier: 3, bus: "game", gap: 300, play: () => seq("game", [6, 8], 0.08, { dur: 0.35, gain: 0.12, harm: 0.3 }) },
    rebirth: {
        tier: 3,
        bus: "game",
        gap: 800,
        play: () => {
            whoosh("game", { from: 260, to: 2400, dur: 0.6, gain: 0.07 });
            seq("game", [2, 4, 6, 8, 10], 0.08, { dur: 0.5, gain: 0.12, harm: 0.3, type: "triangle", at: 0.1 });
            seq("game", [5, 7, 9], 0, { dur: 1.1, gain: 0.1, harm: 0.2, at: 0.55 });
        },
    },

    // ---- tier 4: hero
    ascend: {
        tier: 4,
        bus: "game",
        gap: 1200,
        play: () => {
            whoosh("game", { from: 200, to: 3200, dur: 1.0, gain: 0.09 });
            tone("game", { f: note(-8), dur: 1.8, gain: 0.14, attack: 0.3, cutoff: 500 });
            seq("game", [0, 2, 4, 6, 8, 10, 12], 0.09, { dur: 0.6, gain: 0.11, harm: 0.35, type: "triangle", at: 0.15 });
            seq("game", [7, 9, 11, 14], 0, { dur: 1.7, gain: 0.09, harm: 0.25, at: 0.85 });
        },
    },

    // egg and enchant reveals, scaled by rarity index 0..7
    charge: {
        tier: 2,
        bus: "game",
        gap: 80,
        play: (a: { r: number; ms: number }) => {
            const d = Math.max(0.3, a.ms / 1000);
            whoosh("game", { from: 220, to: 700 + a.r * 260, dur: d, gain: 0.035 + a.r * 0.008, q: 1.4 });
            if (a.r >= 3) tone("game", { f: note(-8 + a.r), dur: d, gain: 0.05, attack: d * 0.8, cutoff: 600 });
        },
    },
    reveal: {
        tier: 3,
        bus: "game",
        gap: 80,
        play: (a: { r: number }) => {
            const r = Math.max(0, Math.min(7, a.r));
            const n = Math.min(5, 2 + Math.floor(r / 1.5));
            const degs = Array.from({ length: n }, (_, i) => [4, 6, 7, 9, 11][i] + (r >= 5 ? 0 : 0));
            seq("game", degs, 0.055, { dur: 0.45 + r * 0.1, gain: 0.11 + r * 0.008, harm: 0.25 + r * 0.03, type: r >= 4 ? "triangle" : "sine" });
            if (r >= 4) whoosh("game", { from: 500, to: 3500, dur: 0.5, gain: 0.04 + (r - 4) * 0.012 });
            if (r >= 5) seq("game", [12, 14, 16], 0.07, { dur: 0.7, gain: 0.07, harm: 0.5, at: 0.25 });
            if (r >= 6) tone("game", { f: note(-6), dur: 1.3, gain: 0.13, attack: 0.04, cutoff: 600 });
            if (r >= 7) seq("game", [9, 11, 14, 16], 0, { dur: 1.6, gain: 0.07, harm: 0.3, at: 0.4 });
        },
    },
} satisfies Record<string, Def>;

export type SfxName = keyof typeof DEFS;

/** Play a named sound if sound is on, unlocked, and the rate limit allows it. Safe on the server (does nothing). */
export function sfx(name: SfxName, arg?: unknown) {
    const d: Def = DEFS[name];
    if (!gate(name, d.tier, d.gap)) return;
    d.play(arg);
}
