import { LEVEL_BONUS, UPGRADES, type State } from "@/lib/fractured-idle/data";
import { COMBO_BASE_MAX } from "@/lib/fractured-idle/combo";
import { btnBonus } from "@/lib/fractured-idle/button";
import { allFx } from "@/lib/fractured-idle/enchant";
import { buffFx } from "@/lib/fractured-idle/events";
import { collectionEffects, petBonus, trophyBonus, type Derived } from "@/lib/fractured-idle/engine";
import { activeIsland, islandFx, visitBonus } from "@/lib/fractured-idle/island-logic";

// "Where does this stat come from?" For the Stats tab tooltips. Each builder
// mirrors the matching line in derive() (engine.ts) and lists every source that
// is actually contributing right now, biggest first. They only run while a
// tooltip is open, and share one lazily built bundle of bonuses per render.

export interface Src {
    label: string;
    value: string;
    color: string;
    w: number; // sort weight
}

const G = "var(--mc-green)";
const A = "var(--mc-aqua)";
const R = "var(--mc-red)";
const Y = "var(--mc-yellow)";
const GRAY = "#9a94b0";

export type SourceFn = () => Src[];

export function makeSources(s: State, d: Derived, F: (n: number) => string) {
    let cache: ReturnType<typeof build> | null = null;
    const b = () => (cache ??= build(s));

    const fm = (v: number) => (v >= 1000 ? F(v) : v.toFixed(v < 10 ? 2 : 1));
    const mul = (label: string, v: number): Src | null => (Math.abs(v - 1) < 1e-6 ? null : { label, value: `×${fm(v)}`, color: v > 1 ? G : R, w: Math.abs(Math.log(Math.max(1e-9, v))) });
    const pct = (v: number) => `${+(v * 100).toFixed(Math.abs(v) < 0.1 ? 2 : 1)}%`;
    const add = (label: string, v: number): Src | null => (Math.abs(v) < 1e-9 ? null : { label, value: `${v > 0 ? "+" : "-"}${pct(Math.abs(v))}`, color: v > 0 ? A : R, w: Math.abs(v) });
    const flat = (label: string, v: number, unit = ""): Src | null => (Math.abs(v) < 1e-9 ? null : { label, value: `+${+v.toFixed(2)}${unit}`, color: A, w: Math.abs(v) });
    const base = (label: string, text: string): Src => ({ label, value: text, color: GRAY, w: Infinity });
    const list = (xs: (Src | null)[]): Src[] => (xs.filter(Boolean) as Src[]).sort((x, y) => y.w - x.w);

    const upP = (kind: string) => UPGRADES.reduce((a, u) => (u.kind === kind ? a * Math.pow(u.value, s.ups[u.id] || 0) : a), 1);
    const upS = (kind: string) => UPGRADES.reduce((a, u) => (u.kind === kind ? a + u.value * (s.ups[u.id] || 0) : a), 0);
    const r = (id: string) => s.rups[id] || 0;
    const a = (id: string) => s.aups[id] || 0;

    const map: Record<string, SourceFn> = {
        click: () => {
            const { ce, pb, tb, bb, bf, isl, X } = b();
            return [
                ...list([
                    mul("Click upgrades", upP("click")),
                    mul("Trophies", 1 + tb.click),
                    mul("Collections", 1 + ce.click),
                    mul("Pets", 1 + pb.click),
                    mul("Button looks", 1 + bb.click),
                    mul("Rebirth: Might", 1 + 0.05 * r("might")),
                    mul("Popup boons", bf.click),
                    mul("Island perks", isl.click),
                    mul("Island button affinity", isl.affinity),
                    mul("Enchants & Mine perks", 1 + X.click),
                    mul(`Mining Lv ${d.mining}`, 1 + 0.03 * d.mining * isl.eff.mining),
                    mul("Everything multiplier", d.all),
                ]),
                ...list([flat("Pocket Minion (shards/sec per click)", d.cps * d.synergy)]),
            ];
        },
        critChance: () => {
            const { ce, pb, tb, bb, bf, isl, X } = b();
            return [
                base("Base", "5%"),
                ...list([
                    add("Upgrades", upS("critChance")),
                    add("Trophies", tb.critChance),
                    add("Collections", ce.crit),
                    add("Pets", pb.critChance),
                    add("Button looks", bb.crit),
                    add("Popup boons", bf.crit),
                    add("Island perks", isl.crit),
                    add("Rebirth: Lucky", 0.01 * r("luck")),
                    add("Enchants & Mine perks", X.crit),
                ]),
                ...(d.critChance >= 0.75 ? [{ label: "Capped", value: "75%", color: Y, w: -1 }] : []),
            ];
        },
        critDmg: () => {
            const { ce, pb, tb, bb, bf, isl, X } = b();
            return [
                base("Base", "+50%"),
                ...list([
                    add("Upgrades", upS("critDmg")),
                    add("Trophies", tb.critDmg),
                    add("Collections", ce.critDmg),
                    add("Pets", pb.critDmg),
                    add("Button looks", bb.critDmg),
                    add("Popup boons", bf.critDmg),
                    add("Island perks", isl.critDmg),
                    add("Enchants & Mine perks", X.critDmg),
                    add(`Combat Lv ${d.combat}`, 0.02 * d.combat * isl.eff.combat),
                ]),
            ];
        },
        auto: () => list([flat("Upgrades", upS("auto"), "/s"), flat("Enchants & Mine perks", b().X.auto, "/s")]),
        minion: () => {
            const { pb, tb, bf, isl, X } = b();
            return [
                ...list([
                    mul("Minion upgrades", upP("minion")),
                    mul("Trophies", 1 + tb.minion),
                    mul("Pets", 1 + pb.minion),
                    mul("Rebirth: Engine", 1 + 0.05 * r("engine")),
                    mul("Ascension: Union", 1 + 0.25 * a("union")),
                    mul("Popup boons", bf.minion),
                    mul("Island perks", isl.minionAll),
                    mul("Enchants & Mine perks", 1 + X.minion),
                    mul(`Farming Lv ${d.farming}`, 1 + 0.03 * d.farming * isl.eff.farming),
                    mul("Everything multiplier", d.all),
                ]),
                { label: "Plus each minion's own upgrades, milestones and collections", value: "", color: GRAY, w: -1 },
            ];
        },
        all: () => {
            const { ce, pb, bf, isl, X } = b();
            return list([
                mul("Rebirths", d.rMult),
                mul("Islands (tier)", d.islandMult),
                mul("Trophies", d.achMult),
                mul("Talismans & Golden Touch", d.allUp),
                mul("Popup boons & Fragments", bf.all),
                mul("Collections & pet species", 1 + ce.all + pb.all),
                mul(`Fishing Lv ${d.fishing}`, 1 + 0.01 * d.fishing * isl.eff.fishing),
                mul("Ascensions", d.ascMult),
                mul("Island perks", isl.all),
                mul("Islands visited", 1 + visitBonus(s)),
                mul(`Fractured Level ${s.lvl}`, 1 + LEVEL_BONUS * s.lvl),
                mul("Enchants & Mine perks", 1 + X.all),
            ]);
        },
        luck: () => list([mul("Enchants & Codex", 1 + b().X.luck), mul(`Enchanting Lv ${d.enchanting}`, 1 + 0.02 * d.enchanting), mul("Popup boons", b().bf.luck)]),
        dust: () => list([mul("Enchants & Mine perks", 1 + b().X.dust), mul(`Enchanting Lv ${d.enchanting}`, 1 + 0.03 * d.enchanting), mul("Popup boons", b().bf.dust)]),
        xp: () => {
            const { pb, tb, bb, X } = b();
            return [base("Base", "x1"), ...list([add("Trophies", tb.skillXp), add("Pets", pb.skillXp), add("Button looks", bb.xp), add("Enchants & Mine perks", X.xp)])];
        },
        popups: () => {
            const { bf, isl, X } = b();
            return list([
                mul("Upgrades & Rebirth: Omen", 1 + upS("evRate") + 0.1 * r("omen")),
                mul("Popup boons", bf.freq),
                mul("Island perks", isl.ev.freq),
                mul("Enchants & Mine perks", 1 + X.evFreq),
                mul(`Foraging Lv ${d.foraging}`, 1 + 0.005 * d.foraging),
                mul(`Fishing Lv ${d.fishing}`, 1 / Math.max(0.4, 1 - 0.01 * d.fishing)),
            ]);
        },
        offline: () => {
            const { ce, pb, tb, isl, X } = b();
            return [base("Base", "50%"), ...list([add("Rebirth: Offline", 0.1 * r("off")), add("Trophies", tb.offline), add("Collections", ce.offline), add("Pets", pb.offline), add("Island perks", isl.offline), add("Enchants & Mine perks", X.offline)]), { label: "Capped", value: "100%", color: GRAY, w: -1 }];
        },
        combo: () => {
            const { bb, isl, X } = b();
            return [
                base("Base", `x${COMBO_BASE_MAX}`),
                ...list([
                    flat("Upgrades", upS("comboMax")),
                    flat("Rebirth: Momentum", 0.5 * r("mom")),
                    flat("Ascension: Overdrive", a("over")),
                    flat(`Combat Lv ${d.combat}`, 0.02 * d.combat),
                    flat("Button looks", bb.combo),
                    flat("Island perks", isl.comboMax),
                    flat("Enchants & Mine perks", X.comboMax),
                ]),
            ];
        },
    };
    return map;
}

function build(s: State) {
    return {
        ce: collectionEffects(s),
        pb: petBonus(s),
        tb: trophyBonus(s),
        bb: btnBonus(s),
        bf: buffFx(s),
        isl: islandFx(s, activeIsland(s)),
        X: allFx(s),
    };
}
