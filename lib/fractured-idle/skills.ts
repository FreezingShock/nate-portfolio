import type { EStat } from "./enchant";
import { SKILLS, skillLevel, type SkillId, type State } from "./data";

// Skill milestones: on top of each skill's per-level perk, every skill pays a
// reward at fixed levels. A reward is a permanent stat (applied by level, in
// derive via enchant.allFx), a one-time grant (dust, tokens, eggs, ascension
// points, fragments; paid once and remembered in state.skm) or an unlock note
// for something that opens by level elsewhere (enchant slots and cosmetics).

export type GrantKind = "dust" | "tokens" | "eggs" | "ap" | "frag";
export interface MReward {
    stat?: [EStat, number];
    grant?: [GrantKind, number];
    unlock?: string;
}
export interface Milestone {
    at: number;
    name: string;
    rewards: MReward[];
}

const S = (k: EStat, v: number): MReward => ({ stat: [k, v] });
const G = (k: GrantKind, n: number): MReward => ({ grant: [k, n] });
const U = (text: string): MReward => ({ unlock: text });
const M = (at: number, name: string, ...rewards: MReward[]): Milestone => ({ at, name, rewards });

export const MILESTONES_BY_SKILL: Record<SkillId, Milestone[]> = {
    mining: [
        M(5, "Prospector", S("click", 0.04)),
        M(10, "Rock Steady", S("crit", 0.01), G("dust", 15)),
        M(15, "Vein Finder", S("click", 0.06)),
        M(20, "Heavy Swing", S("comboMax", 0.3), G("tokens", 1)),
        M(25, "Deep Driller", S("click", 0.08)),
        M(30, "Pay Dirt", S("crit", 0.02), G("dust", 60)),
        M(35, "Shatterer", S("click", 0.1)),
        M(40, "Core Breaker", S("comboMax", 0.5), G("eggs", 1)),
        M(45, "Motherlode", S("click", 0.12)),
        M(50, "Earthshaker", S("critDmg", 0.25), G("tokens", 2)),
        M(55, "Bedrock", S("click", 0.15)),
        M(60, "Master Miner", S("all", 0.08), G("ap", 1)),
    ],
    farming: [
        M(5, "Seedling", S("minion", 0.04)),
        M(10, "Green Hands", S("col", 0.05), G("dust", 15)),
        M(15, "Fertile Soil", S("minion", 0.06)),
        M(20, "Barn Raising", S("offline", 0.02), G("tokens", 1)),
        M(25, "Harvest Moon", S("minion", 0.08)),
        M(30, "Silo", S("col", 0.08), G("dust", 60)),
        M(35, "Bumper Crop", S("minion", 0.1)),
        M(40, "Golden Wheat", S("offline", 0.03), G("eggs", 1)),
        M(45, "Orchard", S("minion", 0.12)),
        M(50, "Fair Trade", S("cost", 0.03), G("tokens", 2)),
        M(55, "Grand Harvest", S("minion", 0.15)),
        M(60, "Master Farmer", S("all", 0.08), G("ap", 1)),
    ],
    combat: [
        M(5, "Scrapper", S("critDmg", 0.08)),
        M(10, "Sharp Eye", S("crit", 0.01), G("dust", 15)),
        M(15, "Finisher", S("critDmg", 0.12)),
        M(20, "Battle Rhythm", S("comboGain", 0.05), G("tokens", 1)),
        M(25, "Duelist", S("critDmg", 0.16)),
        M(30, "Deadeye", S("crit", 0.02), G("dust", 60)),
        M(35, "Warlord", S("comboMax", 0.4)),
        M(40, "Executioner", S("critDmg", 0.2), G("eggs", 1)),
        M(45, "Bloodlust", S("comboGain", 0.08)),
        M(50, "Legend", S("crit", 0.03), G("tokens", 2)),
        M(55, "Annihilator", S("critDmg", 0.25)),
        M(60, "Master Slayer", S("all", 0.08), G("ap", 1)),
    ],
    fishing: [
        M(5, "Bait Shop", S("bobber", 0.08)),
        M(10, "Steady Line", S("evBobber", 0.1), G("dust", 15)),
        M(15, "Deep Cast", S("bobber", 0.12)),
        M(20, "Lucky Lure", S("luck", 0.03), G("tokens", 1)),
        M(25, "Tidecaller", S("bobber", 0.16)),
        M(30, "Siren Song", S("evFreq", 0.05), G("dust", 60)),
        M(35, "Kraken Hunter", S("bobber", 0.2)),
        M(40, "Sunken Chest", S("evGolden", 0.1), G("eggs", 1)),
        M(45, "Abyss Diver", S("evPay", 0.08)),
        M(50, "Leviathan", S("bobber", 0.35), G("tokens", 2)),
        M(55, "Storm Angler", S("evFreq", 0.08)),
        M(60, "Master Angler", S("all", 0.08), G("ap", 1)),
    ],
    foraging: [
        M(5, "Trailhead", S("evLife", 0.05)),
        M(10, "Keen Nose", S("evFreq", 0.04), G("dust", 15)),
        M(15, "Forager's Bounty", S("evPay", 0.08)),
        M(20, "Patient Step", S("qteTime", 0.4), G("tokens", 1)),
        M(25, "Canopy", S("evPower", 0.06)),
        M(30, "Gold Dust", S("evGolden", 0.1), G("dust", 60)),
        M(35, "Old Growth", S("evLife", 0.08)),
        M(40, "Thornward", S("curse", 0.08), G("eggs", 1)),
        M(45, "Heartwood", S("evPower", 0.1)),
        M(50, "Dustwalker", S("evDust", 0.8), G("tokens", 2)),
        M(55, "Wild Hunt", S("evFreq", 0.08)),
        M(60, "Master Forager", S("all", 0.08), G("ap", 1)),
    ],
    enchanting: [
        M(3, "Polish", U("Polish: re-roll an enchant's quality")),
        M(5, "Apprentice", S("luck", 0.03), G("dust", 20), U("Minion Core slot")),
        M(8, "Reforge", U("Reforge: re-roll an enchant's affixes")),
        M(10, "Adept", S("dust", 0.05), U("Event Lens slot and the Orbit glint")),
        M(15, "Attuned", S("luck", 0.05), U("Attunement: focus the enchant you chase")),
        M(18, "Conjurer", G("dust", 120), U("Auto-roll")),
        M(20, "Scholar", S("dust", 0.08), U("Fractured Tome slot")),
        M(25, "Luminary", S("luck", 0.08), U("Rainbow glint color")),
        M(30, "Archmage", S("dust", 0.12), G("tokens", 2), U("Prism glint")),
        M(35, "Runesmith", S("luck", 0.1), U("Void table")),
        M(40, "Enchanter", S("dust", 0.16), G("eggs", 1), U("Void Crown glint")),
        M(45, "Sage", S("luck", 0.14)),
        M(50, "Grand Magus", S("dust", 0.22), G("tokens", 3), U("Prismatic table")),
        M(55, "Cosmic Weaver", S("luck", 0.2)),
        M(60, "Master Enchanter", S("all", 0.08), S("luck", 0.1), G("ap", 1)),
    ],
};

export const GRANT_LABEL: Record<GrantKind, string> = {
    dust: "Arcane Dust",
    tokens: "rebirth tokens",
    eggs: "free eggs",
    ap: "gem",
    frag: "Fracture Fragment",
};

/** Every milestone stat the skills have earned so far, by current level. */
export function skillPerks(s: State): Partial<Record<EStat, number>> {
    const out: Partial<Record<EStat, number>> = {};
    for (const k of SKILLS) {
        const lvl = skillLevel(s[k.id], k.id);
        for (const m of MILESTONES_BY_SKILL[k.id]) {
            if (m.at > lvl) break;
            for (const r of m.rewards) if (r.stat) out[r.stat[0]] = (out[r.stat[0]] ?? 0) + r.stat[1];
        }
    }
    return out;
}

export interface MilestoneEvent {
    skill: SkillId;
    milestone: Milestone;
}

/** Pay every milestone reached but not yet paid. Returns what was paid (for the notification). */
export function claimMilestones(s: State): MilestoneEvent[] {
    const out: MilestoneEvent[] = [];
    for (const k of SKILLS) {
        const lvl = skillLevel(s[k.id], k.id);
        const done = s.skm[k.id] || 0;
        for (const m of MILESTONES_BY_SKILL[k.id]) {
            if (m.at <= done || m.at > lvl) continue;
            for (const r of m.rewards) {
                if (!r.grant) continue;
                const [g, n] = r.grant;
                if (g === "dust") {
                    s.enc.dust += n;
                    s.enc.earned += n;
                } else if (g === "tokens") s.tokens += n;
                else if (g === "eggs") s.freeEggs += n;
                else if (g === "ap") s.ap += n;
                else s.frag += n;
            }
            out.push({ skill: k.id, milestone: m });
        }
        if (lvl > done) s.skm[k.id] = lvl;
    }
    return out;
}

/** Text for one reward (stat text needs the enchant formatter, so the caller passes it in). */
export function rewardLine(r: MReward, fmtStat: (k: EStat, v: number) => string): string {
    if (r.stat) return fmtStat(r.stat[0], r.stat[1]);
    if (r.grant) return `+${r.grant[1]} ${GRANT_LABEL[r.grant[0]]}${r.grant[1] > 1 && r.grant[0] === "ap" ? "s" : ""}`;
    return r.unlock ?? "";
}

export const nextMilestone = (id: SkillId, level: number): Milestone | undefined => MILESTONES_BY_SKILL[id].find((m) => m.at > level);
