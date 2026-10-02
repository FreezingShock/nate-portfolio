import { COL_AT as ORE_COL_AT, FEATS, MINE_UPS, ORES, RELICS, bestTier, enchLevels } from "./mine";
import { COL_AT as CROP_COL_AT, CROPS, FARM_UPS, FEATS as FARM_FEATS, RELICS as CROW_RELICS, TOOLS as FARM_TOOLS, crewTotal } from "./farm";
import { CATS, isUnlocked as lookUnlocked } from "./button";
import { ASC_UPS, MILESTONES, MINIONS, PETS, PET_MAX, REBIRTH_UPS, SKILLS, TROPHIES, UPGRADES, petLevel, skillLevel, type State } from "./data";
import { CODEX_TOTAL, ENCHANTS, codexCount } from "./enchant";
import { colTiers } from "./engine";
import { masteryLevel, islandOpen } from "./island-logic";
import { ISLANDS, MASTERY_AT, isSpecial } from "./islands";
import { chapterClaimed, finaleClaimed, CHAPTERS, SAGAS, SAGA_BY_ID, type SagaId } from "./sagas";
import { fmt, fmtInt } from "./format";
import {
    COMBO,
    CODEX_XP,
    COL_XP,
    CURSES,
    EGGS as EGG_LADDER,
    GOLDEN,
    HOURS,
    MILESTONE_XP,
    PERFECT,
    POP_CAUGHT,
    RARITY_XP,
    ROLLS,
    decadePay,
    skillLevelXp,
    trophyTierXp,
    type FxpCat,
} from "./fxp";

// The Fracture EXP sources (fxp.ts) broken into single, ordered steps: "Own 25 Cobblestone Minions: +4 FXP".
// Chapters (chapters.ts) hand these out in order of difficulty, so the total of every step is exactly what the
// sources pay. A step's xp numbers mirror fxpSources(); scripts/check-fxp-steps.ts proves they still add up.

export interface Step {
    id: string; // "<source id>#<index>"
    src: string; // the source it belongs to (the key into s.fxp)
    cat: FxpCat;
    name: string; // the source's name
    text: string; // what to do
    tab: string; // where to go to do it ("" = just play)
    xp: number;
    cum: number; // xp of this source up to and including this step: done once the source has paid this much
    key: number; // difficulty, 0..1: lower comes in earlier chapters
    need: number;
    val: (s: State) => number;
}

interface Item {
    xp: number;
    need: number;
    text: string;
}

const steps: Step[] = [];
const paid = new Map<string, number>(); // xp handed out so far per source (a source can be added in two parts)
const made = new Map<string, number>();
const sum = (a: Item[]) => a.reduce((t, i) => t + i.xp, 0);

/** Adds one source's items. The key climbs from k0 to k1 with the share of the source's xp already passed. */
function line(src: string, cat: FxpCat, name: string, tab: string, k0: number, k1: number, val: (s: State) => number, items: Item[]) {
    const total = sum(items);
    let part = 0;
    items.forEach((it) => {
        if (it.xp <= 0) return;
        const f = total ? (part + it.xp / 2) / total : 0;
        part += it.xp;
        const cum = (paid.get(src) ?? 0) + it.xp;
        paid.set(src, cum);
        const k = made.get(src) ?? 0;
        made.set(src, k + 1);
        steps.push({ id: `${src}#${k}`, src, cat, name, text: it.text, tab, xp: it.xp, cum, key: k0 + (k1 - k0) * f, need: it.need, val });
    });
}

/** A ladder of [threshold, xp] rungs. */
const rungs = (l: [number, number][], text: (n: number) => string): Item[] => l.map(([n, xp]) => ({ xp, need: n, text: text(n) }));

/** Splits a linear total (xp per unit, up to `count` units) into at most `n` steps. */
function chunk(count: number, perUnit: number, n: number, text: (need: number) => string): Item[] {
    const out: Item[] = [];
    let prev = 0;
    for (let j = 1; j <= n; j++) {
        const need = Math.round((count * j) / n);
        if (need <= prev) continue;
        out.push({ xp: (need - prev) * perUnit, need, text: text(need) });
        prev = need;
    }
    return out;
}

/** Merges neighbours that ask for the same thing (an upgrade with a single level pays all three marks at once). */
const merged = (items: Item[]): Item[] => {
    const out: Item[] = [];
    for (const it of items) {
        const last = out[out.length - 1];
        if (last && last.need === it.need) last.xp += it.xp;
        else out.push({ ...it });
    }
    return out;
};

let built = false;
export function fxpSteps(): Step[] {
    if (built) return steps;
    built = true;

    // ---- Trophies ----
    TROPHIES.forEach((t, i) => {
        const jit = (i % 7) * 0.004;
        line(`tro:${t.id}`, "trophies", `Trophy: ${t.name}`, "trophies", 0.02 + jit, 0.9 + jit, t.metric, t.tiers.map((tr, k) => ({ xp: trophyTierXp(k), need: tr.at, text: `${t.name}: reach ${fmt(tr.at)} ${t.unit}` })));
    });

    // ---- Skills: five levels at a time ----
    SKILLS.forEach((k, i) => {
        const items: Item[] = [];
        for (let a = 1; a <= 60; a += 5) {
            let xp = 0;
            for (let l = a; l < a + 5; l++) xp += skillLevelXp(l);
            items.push({ xp, need: a + 4, text: `${k.name} to level ${a + 4}` });
        }
        line(`skill:${k.id}`, "skills", `${k.name} levels`, "skills", 0.01 + i * 0.003, 0.95, (s) => skillLevel(s[k.id], k.id), items);
    });

    // ---- Islands ----
    const mainIslands = ISLANDS.filter((i) => !isSpecial(i));
    const specials = ISLANDS.filter((i) => isSpecial(i));
    ISLANDS.forEach((i, n) => {
        const key = isSpecial(i) ? 0.3 + specials.indexOf(i) * 0.06 : 0.02 + (0.8 * Math.max(0, mainIslands.indexOf(i))) / Math.max(1, mainIslands.length - 1);
        const pay = isSpecial(i) ? 350 : Math.round(25 * Math.pow(1.4, n));
        line(`isl:${i.id}`, "islands", `Island: ${i.name}`, "islands", key, key, (s) => (islandOpen(s, i) ? 1 : 0), [{ xp: pay, need: 1, text: `Reach ${i.name}` }]);
        line(`mast:${i.id}`, "islands", `${i.name} mastery`, "islands", key + 0.06, key + 0.26, (s) => masteryLevel(s.isec[i.id] || 0), [
            { xp: 125, need: 5, text: `${i.name} mastery level 5` },
            { xp: 125, need: MASTERY_AT.length, text: `Master ${i.name} (level ${MASTERY_AT.length})` },
        ]);
        if (i.id !== "hub") line(`visit:${i.id}`, "islands", `Visited ${i.name}`, "islands", key, key, (s) => (s.visited.includes(i.id) ? 1 : 0), [{ xp: 12, need: 1, text: `Visit ${i.name}` }]);
    });

    // ---- Button looks: four unlocks at a time ----
    CATS.forEach((c, ci) => {
        const need = c.list.filter((l) => l.need);
        const items: Item[] = [];
        let xp = 0;
        need.forEach((l, k) => {
            xp += l.need!.stat === "asc" ? 50 : 5;
            if ((k + 1) % 4 === 0 || k === need.length - 1) {
                items.push({ xp, need: k + 1, text: `Unlock ${k + 1} ${c.label} looks` });
                xp = 0;
            }
        });
        line(`looks:${c.id}`, "looks", `${c.label} looks`, "button", 0.03 + ci * 0.015, 0.85, (s) => need.filter((l) => lookUnlocked(s, l)).length, items);
    });

    // ---- Pets: discover, then three level marks ----
    const RANK = ["common", "uncommon", "rare", "epic", "legendary", "mythic", "divine"];
    PETS.forEach((p, i) => {
        const base = RARITY_XP[p.rarity] ?? 20;
        const r = Math.max(0, RANK.indexOf(p.rarity)) / 6;
        const k0 = 0.04 + 0.6 * r + (i % 5) * 0.004;
        const mk = (n: number, mult: number, text: string, kk: number): [Item, number] => [{ xp: base * mult, need: n, text }, kk];
        const marks: [Item, number][] = [mk(1, 1, `Hatch ${p.name}`, 0), mk(25, 1, `${p.name} to level 25`, 0.1), mk(60, 3, `${p.name} to level 60`, 0.25), mk(PET_MAX, 8, `${p.name} to level ${PET_MAX}`, 0.4)];
        let cum = 0;
        marks.forEach(([it, off], k) => {
            cum += it.xp;
            steps.push({ id: `pet:${p.id}#${k}`, src: `pet:${p.id}`, cat: "pets", name: `Pet: ${p.name}`, text: it.text, tab: k === 0 ? "inventory" : "pets", xp: it.xp, cum, key: Math.min(0.99, k0 + off), need: it.need, val: k === 0 ? (s) => (s.pets[p.id] ? 1 : 0) : (s) => (s.pets[p.id] ? petLevel(p, s.pets[p.id].xp) : 0) });
        });
    });

    // ---- Minions: collection tiers, then count milestones ----
    MINIONS.forEach((m, i) => {
        const k0 = 0.03 + (0.5 * i) / MINIONS.length;
        const cols = COL_XP.map((xp, t): Item => ({ xp, need: t + 1, text: `${m.name}: collection tier ${t + 1}` }));
        const ms = MILESTONE_XP.map((xp, j): Item => ({ xp, need: MILESTONES[j], text: `Own ${fmtInt(MILESTONES[j])} ${m.name}s` }));
        const total = sum(cols) + sum(ms);
        let cum = 0;
        [...cols, ...ms].forEach((it, k) => {
            const isCol = k < cols.length;
            const f = (cum + it.xp / 2) / total;
            cum += it.xp;
            steps.push({ id: `min:${m.id}#${k}`, src: `min:${m.id}`, cat: "minions", name: m.name, text: it.text, tab: "minions", xp: it.xp, cum, key: k0 + 0.3 * f, need: it.need, val: isCol ? (s) => colTiers(s)[i] : (s) => s.minions[i] });
        });
    });

    // ---- Upgrades ----
    UPGRADES.forEach((u, i) => {
        const k0 = 0.02 + (0.4 * i) / UPGRADES.length;
        line(`up:${u.id}`, "upgrades", `Upgrade: ${u.name}`, "upgrades", k0, k0 + 0.25, (s) => s.ups[u.id] || 0, merged([
            { xp: 2, need: 1, text: `Buy ${u.name}` },
            { xp: 5, need: Math.ceil(u.max / 2), text: `${u.name} to level ${Math.ceil(u.max / 2)}` },
            { xp: 11, need: u.max, text: `Max out ${u.name}` },
        ]));
    });
    const tiered = (max: number, per: number, text: (n: number) => string): Item[] => {
        const out: Item[] = [];
        let prev = 0;
        for (let j = 1; j <= 4; j++) {
            const need = Math.ceil((max * j) / 4);
            if (need <= prev) continue;
            out.push({ xp: (need - prev) * per, need, text: text(need) });
            prev = need;
        }
        return out;
    };
    REBIRTH_UPS.forEach((u, i) => {
        const k0 = 0.08 + (0.5 * i) / REBIRTH_UPS.length;
        line(`rup:${u.id}`, "upgrades", `Token upgrade: ${u.name}`, "rebirth", k0, k0 + 0.3, (s) => s.rups[u.id] || 0, tiered(u.max, 9, (n) => `${u.name} to level ${n}`));
    });
    ASC_UPS.forEach((u, i) => {
        const k0 = 0.3 + (0.5 * i) / ASC_UPS.length;
        line(`aup:${u.id}`, "upgrades", `Ascension upgrade: ${u.name}`, "ascension", k0, k0 + 0.3, (s) => s.aups[u.id] || 0, tiered(u.max, 18, (n) => `${u.name} to level ${n}`));
    });

    // ---- Popups, Fragments and combo (all on the main screen) ----
    line("ev:caught", "events", "Popups caught", "", 0.02, 0.8, (s) => s.evs.caught, rungs(POP_CAUGHT, (n) => `Catch ${fmtInt(n)} popup${n === 1 ? "" : "s"}`));
    line("ev:golden", "events", "Golden shards", "", 0.03, 0.8, (s) => s.evs.golden, rungs(GOLDEN, (n) => `Catch ${fmtInt(n)} golden shard${n === 1 ? "" : "s"}`));
    line("ev:perfect", "events", "Perfect quick time events", "", 0.04, 0.85, (s) => s.evs.perfect, rungs(PERFECT, (n) => `Land ${fmtInt(n)} perfect quick time event${n === 1 ? "" : "s"}`));
    line("ev:curses", "events", "Curses survived", "", 0.1, 0.7, (s) => s.evs.curses, rungs(CURSES, (n) => `Survive ${fmtInt(n)} curse${n === 1 ? "" : "s"}`));
    line("ev:frag", "events", "Fracture Fragments", "", 0.05, 0.85, (s) => Math.min(100, s.frag), chunk(100, 6, 5, (n) => `Hold ${n} Fracture Fragments`));
    line("ev:combo", "events", "Best combo", "", 0.02, 0.85, (s) => s.bestCombo, rungs(COMBO, (n) => `Reach a x${n} combo`));

    // ---- Enchanting ----
    const codexMax = ENCHANTS.length * CODEX_XP.reduce((a, b) => a + b, 0);
    line("ench:codex", "enchant", `Enchant codex (${CODEX_TOTAL} entries)`, "enchant", 0.05, 0.8, codexCount, chunk(CODEX_TOTAL, codexMax / CODEX_TOTAL, 12, (n) => `Discover ${n} codex entries`));
    line("ench:rolls", "enchant", "Enchant rolls", "enchant", 0.04, 0.8, (s) => s.enc.rolls, rungs(ROLLS, (n) => `Roll ${fmtInt(n)} enchant${n === 1 ? "" : "s"}`));

    // ---- Mining ----
    const MN_NODES: [number, number][] = [[100, 8], [1000, 15], [5000, 30], [25000, 60], [100000, 120]];
    const FM_HARV: [number, number][] = [[50, 8], [500, 15], [5000, 30], [25000, 60], [100000, 120]];
    const FOUR: [number, number][] = [[1, 10], [10, 20], [40, 40], [150, 80]];
    const THREE: [number, number][] = [[1, 10], [10, 20], [50, 40], [200, 80]];
    line("mine:nodes", "mining", "Pickaxe swings", "mine", 0.03, 0.8, (s) => s.mine.nodes, rungs(MN_NODES, (n) => `Swing the pickaxe ${fmtInt(n)} times`));
    line("mine:pick", "mining", "Best tool tier", "mine", 0.04, 0.8, (s) => bestTier(s), chunk(9, 10, 9, (n) => `Own a tier ${n + 1} tool`));
    const mineUpMax = 300 + MINE_UPS.reduce((a, u) => a + u.max, 0);
    line("mine:ups", "mining", "Enchant levels and forge upgrades", "mine", 0.04, 0.9, (s) => Math.min(300, enchLevels(s)) + Object.values(s.mine.ups).reduce((a, b) => a + b, 0), chunk(mineUpMax, 1, 8, (n) => `Reach ${fmtInt(n)} mine upgrade levels`));
    line("mine:feats", "mining", "Mining feats", "mine", 0.05, 0.85, (s) => s.mine.claimed.length, chunk(FEATS.length, 6, 5, (n) => `Claim ${n} mining milestones`));
    line("mine:forge", "mining", "Forge crafts and relics", "mine", 0.05, 0.85, (s) => s.mine.crafted, rungs(FOUR, (n) => `Forge ${fmtInt(n)} item${n === 1 ? "" : "s"}`));
    line("mine:forge", "mining", "Forge crafts and relics", "mine", 0.3, 0.9, (s) => s.mine.relics.length, chunk(RELICS.length, 20, 4, (n) => `Forge ${n} mining relics`));
    line("mine:drills", "mining", "Drill parts forged", "mine", 0.1, 0.8, (s) => s.mine.parts.length, rungs([[1, 10], [3, 20], [8, 40], [16, 80]], (n) => `Forge ${n} drill part${n === 1 ? "" : "s"}`));
    line("mine:geodes", "mining", "Geodes cracked", "mine", 0.06, 0.8, (s) => s.mine.cracked, rungs(THREE, (n) => `Crack ${fmtInt(n)} geode${n === 1 ? "" : "s"}`));
    line("mine:col", "mining", "Ore collection tiers", "mine", 0.04, 0.9, (s) => Object.values(s.mine.mined).reduce((a, m) => a + ORE_COL_AT.filter((n) => m >= n).length, 0), chunk(ORES.length * ORE_COL_AT.length, 5, 10, (n) => `Reach ${n} ore collection tiers`));

    // ---- Farming ----
    line("farm:harvest", "farming", "Harvests", "farm", 0.03, 0.8, (s) => s.farm.harvests, rungs(FM_HARV, (n) => `Harvest ${fmtInt(n)} crops`));
    line("farm:hoe", "farming", "Hoe tiers", "farm", 0.04, 0.8, (s) => s.farm.hoe, chunk(9, 12, 9, (n) => `Own a tier ${n} hoe`));
    line("farm:ups", "farming", "Farm upgrade levels", "farm", 0.04, 0.9, (s) => Object.values(s.farm.ups).reduce((a, b) => a + b, 0), chunk(FARM_UPS.reduce((a, u) => a + u.max, 0), 1, 6, (n) => `Reach ${n} farm upgrade levels`));
    line("farm:hands", "farming", "Farmhands hired", "farm", 0.05, 0.8, (s) => Object.values(s.farm.hands).reduce((a, b) => a + b, 0), rungs([[1, 10], [10, 20], [50, 40], [200, 80]], (n) => `Hire ${fmtInt(n)} farmhand${n === 1 ? "" : "s"}`));
    line("farm:pods", "farming", "Seed pods opened", "farm", 0.06, 0.8, (s) => s.farm.opened, rungs(THREE, (n) => `Open ${fmtInt(n)} seed pod${n === 1 ? "" : "s"}`));
    line("farm:col", "farming", "Crop collection tiers", "farm", 0.04, 0.9, (s) => Object.values(s.farm.grown).reduce((a, m) => a + CROP_COL_AT.filter((n) => m >= n).length, 0), chunk(CROPS.length * CROP_COL_AT.length, 5, 10, (n) => `Reach ${n} crop collection tiers`));
    line("farm:feats", "farming", "Farming feats", "farm", 0.05, 0.85, (s) => s.farm.claimed.length, chunk(FARM_FEATS.length, 6, 5, (n) => `Claim ${n} farming milestones`));
    line("farm:tools", "farming", "Farm tools made", "farm", 0.06, 0.85, (s) => s.farm.tools.length, chunk(FARM_TOOLS.length, 12, 5, (n) => `Make ${n} farm tools`));
    line("farm:crew", "farming", "Crew levels", "farm", 0.06, 0.8, crewTotal, rungs([[5, 10], [20, 20], [60, 40], [150, 80]], (n) => `Reach ${n} crew levels`));
    line("farm:ench", "farming", "Enchanted crops made", "farm", 0.07, 0.8, (s) => s.farm.enchanted, rungs([[1, 10], [25, 20], [250, 40], [2000, 80]], (n) => `Make ${fmtInt(n)} Enchanted crop${n === 1 ? "" : "s"}`));
    line("farm:kitchen", "farming", "Kitchen crafts and scarecrows", "farm", 0.06, 0.85, (s) => s.farm.crafted, rungs(FOUR, (n) => `Cook or craft ${fmtInt(n)} thing${n === 1 ? "" : "s"}`));
    line("farm:kitchen", "farming", "Kitchen crafts and scarecrows", "farm", 0.3, 0.9, (s) => s.farm.relics.length, chunk(CROW_RELICS.length, 20, 4, (n) => `Craft ${n} scarecrow relics`));

    // ---- Sagas ----
    CHAPTERS.forEach((c) => {
        const x = SAGA_BY_ID[c.id.split(":")[0] as SagaId];
        const j = SAGAS.indexOf(x);
        const key = 0.01 + (c.n - 1) * 0.11 + j * 0.004;
        line(`chap:${c.id}`, "sagas", `${x.name}, chapter ${c.n}`, "level", key, key, (s) => (chapterClaimed(s, c) ? 1 : 0), [{ xp: c.xp, need: 1, text: `Claim ${x.name}, chapter ${c.n}: ${c.name}` }]);
    });
    SAGAS.forEach((x, j) => line(`fin:${x.id}`, "sagas", `${x.name} finale`, "level", 0.46 + j * 0.01, 0.46 + j * 0.01, (s) => (finaleClaimed(s, x) ? 1 : 0), [{ xp: x.finale.xp, need: 1, text: `Claim the ${x.name} finale: ${x.finale.name}` }]));

    // ---- Progress that is not tied to one system ----
    const rb = (s: State) => Math.max(s.rebirths, s.btn.rb);
    const RB = [1, 3, 5, 10, 15, 25, 40, 60, 90, 120, 150];
    line("rebirths", "progress", "Rebirths", "rebirth", 0.05, 0.85, rb, RB.map((n, k): Item => ({ xp: (n - (RB[k - 1] ?? 0)) * 5, need: n, text: `Rebirth ${n} time${n === 1 ? "" : "s"}` })));
    const decades: Item[] = [];
    for (let d = 1; decadePay(10 ** (d + 2)) > 0 && d <= 43; d++) decades.push({ xp: decadePay(10 ** (d + 2)) - decadePay(10 ** (d + 1)), need: 10 ** (d + 2), text: `Earn ${fmt(10 ** (d + 2))} shards in total` });
    line("wealth", "progress", "Lifetime shards", "", 0.02, 0.9, (s) => s.total, decades);
    line("hours", "progress", "Time played", "", 0.02, 0.75, (s) => s.playTime / 3600, rungs(HOURS, (n) => `Play for ${fmtInt(n)} hour${n === 1 ? "" : "s"}`));
    line("eggs", "progress", "Eggs hatched", "inventory", 0.04, 0.75, (s) => s.hatched, rungs(EGG_LADDER, (n) => `Hatch ${fmtInt(n)} egg${n === 1 ? "" : "s"}`));

    steps.sort((a, b) => a.key - b.key || (a.id < b.id ? -1 : 1));
    return steps;
}
