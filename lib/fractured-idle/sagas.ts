import type { McSymbolName } from "@/components/mc-symbol";
import { skillLevel, type SkillId, type State } from "./data";
import type { EStat } from "./enchant";
import { DIMS, HOES, KINDS, TOOL_BY_ID, allPlots, biggestField, crewTotal, dimSet, gardenOpen, totalHands, upLevel } from "./farm";
import { FEATS as MINE_FEATS, drillHeld, drillMk, enchLevels, hasDrill } from "./mine";
import type { GrantKind } from "./skills";

// Sagas: one story per skill, four chapters each. A chapter is a short list of
// tasks that complete on their own as you play that skill (nothing to track,
// nothing to start). Finishing every task lets you claim the chapter, which pays
// a permanent buff, a grant and Fracture EXP. Claim all four chapters and the
// saga's finale pays a bigger buff and a badge symbol.
//
// This is also the game's tutorial: the first unclaimed chapter of each saga is
// "what to do next" for that skill, in an order that walks a new player through
// every system. The Farming guide that used to live in the Farm tab is chapters of
// the Farmhand Saga now.
//
// Level milestones (LEVEL_PERKS) and saga counts (SAGA_BONUS) add permanent buffs
// on top. Everything is applied through journeyFx(), which enchant.allFx() folds in.

export type SagaId = SkillId;
export type Buff = [EStat, number];
export type Grant = [GrantKind, number];

export interface SagaTask {
    id: string;
    text: string;
    tab: string; // where to go to do it
    prog: (s: State) => [number, number]; // [current, needed]
}

export interface Chapter {
    id: string; // "<saga>:<n>"
    n: number;
    name: string;
    blurb: string;
    tasks: SagaTask[];
    buff: Buff[];
    grant: Grant[];
    xp: number;
}

export interface Saga {
    id: SagaId;
    name: string;
    skill: string; // the skill's display name
    color: string;
    symbol: McSymbolName;
    flavor: string;
    bg: string; // themed background, a CSS background-image
    chapters: Chapter[];
    finale: { name: string; buff: Buff[]; grant: Grant[]; xp: number; badge: string };
}

// ---- Task builders ----

const lvl = (skill: SkillId, n: number, tab: string, label: string): SagaTask => ({
    id: `lv${n}`,
    text: `Reach ${label} level ${n}`,
    tab,
    prog: (s) => [skillLevel(s[skill], skill), n],
});
const cnt = (id: string, text: string, tab: string, get: (s: State) => number, n: number): SagaTask => ({ id, text, tab, prog: (s) => [get(s), n] });
const flag = (id: string, text: string, tab: string, fn: (s: State) => boolean): SagaTask => ({ id, text, tab, prog: (s) => [fn(s) ? 1 : 0, 1] });

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
const epicPlus = (s: State, from: number) => s.enc.byR.slice(from).reduce((a, b) => a + b, 0);
const worn = (s: State) => Object.values(s.enc.eq).filter(Boolean).length;
const codex = (s: State) => Object.values(s.enc.codex).reduce((a, m) => a + [...Array(8).keys()].filter((i) => m & (1 << i)).length, 0);

const ch = (saga: string, n: number, name: string, blurb: string, tasks: SagaTask[], buff: Buff[], grant: Grant[], xp: number): Chapter => ({
    id: `${saga}:${n}`,
    n,
    name,
    blurb,
    tasks,
    buff,
    grant,
    xp,
});

const XP = [40, 70, 110, 160];

export const SAGAS: Saga[] = [
    {
        id: "mining",
        name: "Spelunking Saga",
        skill: "Mining",
        color: "#e8b04a",
        symbol: "pick",
        flavor: "Every great fortune starts with a swing at a rock. Dig deep, forge better tools and see what sleeps in the core.",
        bg: "radial-gradient(circle at 18% 30%, rgba(255,200,90,.22) 0 2px, transparent 3px), radial-gradient(circle at 70% 70%, rgba(255,200,90,.16) 0 2px, transparent 3px), repeating-linear-gradient(0deg, rgba(0,0,0,.18) 0 22px, transparent 22px 24px), repeating-linear-gradient(90deg, rgba(0,0,0,.14) 0 30px, transparent 30px 32px), linear-gradient(160deg, #2b2218, #15110c)",
        chapters: [
            ch("mining", 1, "First Swings", "Pick up the pickaxe and learn the rock face.", [
                cnt("swing100", "Swing the pickaxe 100 times", "mine", (s) => s.mine.nodes, 100),
                cnt("hand25", "Break 25 ore nodes by hand", "mine", (s) => s.mine.broken, 25),
                lvl("mining", 3, "mine", "Mining"),
                flag("pick1", "Forge a Stone Pickaxe in the Forge", "mine", (s) => s.mine.picks.includes("stone")),
            ], [["click", 0.04]], [["dust", 25]], XP[0]),
            ch("mining", 2, "Down the Shaft", "Go below the surface. Drills and geodes start paying.", [
                lvl("mining", 10, "mine", "Mining"),
                flag("drill1", "Forge a drill: an engine and a head", "mine", hasDrill),
                flag("hold", "Take the drill in your hands", "mine", drillHeld),
                cnt("geode5", "Crack 5 geodes", "mine", (s) => s.mine.cracked, 5),
                cnt("swing1k", "Swing the pickaxe 1,000 times", "mine", (s) => s.mine.nodes, 1000),
            ], [["click", 0.06], ["crit", 0.01]], [["tokens", 1]], XP[1]),
            ch("mining", 3, "The Forge", "Smelt, craft and upgrade. The mine becomes a workshop.", [
                lvl("mining", 20, "mine", "Mining"),
                cnt("craft15", "Collect 15 forge crafts", "mine", (s) => s.mine.crafted, 15),
                cnt("relic1", "Craft a relic", "mine", (s) => s.mine.relics.length, 1),
                cnt("ench20", "Put 20 enchant levels on your tools", "mine", enchLevels, 20),
                cnt("feat5", "Claim 5 mining feats", "mine", (s) => s.mine.claimed.length, 5),
            ], [["click", 0.08], ["comboMax", 0.3]], [["dust", 100]], XP[2]),
            ch("mining", 4, "Core Breaker", "The deepest vein. Only the dedicated reach the core.", [
                lvl("mining", 35, "mine", "Mining"),
                cnt("mk7", "Build a Mk 7 drill", "mine", drillMk, 7),
                cnt("swing25k", "Swing the pickaxe 25,000 times", "mine", (s) => s.mine.nodes, 25000),
                cnt("parts12", "Forge 12 drill parts", "mine", (s) => s.mine.parts.length, 12),
                cnt("feat15", `Claim ${Math.min(15, MINE_FEATS.length)} mining feats`, "mine", (s) => s.mine.claimed.length, Math.min(15, MINE_FEATS.length)),
            ], [["click", 0.12], ["critDmg", 0.2]], [["ap", 1]], XP[3]),
        ],
        finale: { name: "Master Spelunker", buff: [["all", 0.04], ["click", 0.05]], grant: [["eggs", 2]], xp: 250, badge: "saga-mining" },
    },
    {
        id: "farming",
        name: "Farmhand Saga",
        skill: "Farming",
        color: "#8fdc4a",
        symbol: "fortune",
        flavor: "Plant, tend, harvest, repeat. From one lonely plot to a garden in every dimension, all growing at once.",
        bg: "repeating-linear-gradient(90deg, rgba(120,220,70,.16) 0 3px, transparent 3px 18px), repeating-linear-gradient(0deg, rgba(0,0,0,.2) 0 14px, transparent 14px 16px), radial-gradient(circle at 80% 20%, rgba(255,230,120,.22), transparent 38%), linear-gradient(170deg, #1d2d14, #0e1709)",
        chapters: [
            ch("farming", 1, "Seedlings", "Your first crops. Learn to plant, pick and tend.", [
                flag("plant", "Plant your first crop", "farm", (s) => allPlots(s).some((r) => r.pl.c) || s.farm.harvests > 0),
                cnt("pick10", "Pick 10 plots by hand", "farm", (s) => s.farm.picked, 10),
                cnt("tend25", "Tend 25 growing plots", "farm", (s) => s.farm.tends, 25),
                flag("flour", "Mill some flour in the Kitchen", "farm", (s) => (s.farm.goods.flour || 0) > 0 || s.farm.crafted > 0),
                cnt("hoe1", "Make a Stone Hoe", "farm", (s) => s.farm.hoe, 1),
            ], [["minion", 0.04]], [["dust", 30]], XP[0]),
            ch("farming", 2, "Hired Hands", "Let the farm run itself while you do something else.", [
                lvl("farming", 10, "farm", "Farming"),
                cnt("reaper", "Build the Auto-Reaper", "farm", (s) => upLevel(s, "reaper"), 1),
                cnt("hands5", "Hire 5 farmhands", "farm", totalHands, 5),
                cnt("ench1", "Enchant your first crop", "farm", (s) => s.farm.enchanted, 1),
                cnt("sell1", "Sell an Enchanted crop", "farm", (s) => s.farm.soldN, 1),
                cnt("tool1", "Make your first tool", "farm", (s) => s.farm.tools.length, 1),
                cnt("crew1", "Hire your first crew member", "farm", crewTotal, 1),
            ], [["minion", 0.06], ["col", 0.05]], [["tokens", 1]], XP[1]),
            ch("farming", 3, "The Toolshed", "Tools, plots and rhythm. The farm gets serious.", [
                cnt("belt2", "Wear two tools at once", "farm", (s) => s.farm.belt.length, 2),
                cnt("tier3", "Make a tier 3 tool", "farm", (s) => Math.max(0, ...s.farm.tools.map((id) => TOOL_BY_ID[id]?.tier ?? 0)), 3),
                cnt("plots10", "Grow to 10 plots", "farm", (s) => allPlots(s).length, 10),
                cnt("streak25", "Chain a 25 hand-pick streak", "farm", (s) => s.farm.bestStreak, 25),
                cnt("gold1", "Harvest a golden crop", "farm", (s) => s.farm.goldens, 1),
                cnt("field6", "Grow a field of 6 plots of one crop", "farm", (s) => biggestField(s)?.n ?? 0, 6),
            ], [["minion", 0.08], ["offline", 0.02]], [["tokens", 1], ["dust", 60]], XP[2]),
            ch("farming", 4, "Beyond the Overworld", "A garden in every dimension, and the best hoe there is.", [
                lvl("farming", 30, "farm", "Farming"),
                flag("nether", "Open the Nether garden", "farm", (s) => gardenOpen(s, "nether")),
                flag("end", "Open the End garden", "farm", (s) => gardenOpen(s, "end")),
                flag("set1", "Finish a dimension's crop set, tier 1", "farm", (s) => DIMS.some((d) => dimSet(s, d).tier >= 1)),
                flag("kinds", "Own a tool of every kind", "farm", (s) => KINDS.every((k) => s.farm.tools.some((id) => TOOL_BY_ID[id]?.kind === k))),
                cnt("crew20", "Reach 20 crew levels", "farm", crewTotal, 20),
                cnt("cosmic", "Make the Cosmic Hoe", "farm", (s) => s.farm.hoe, HOES.length - 1),
            ], [["minion", 0.12], ["cost", 0.02]], [["ap", 1]], XP[3]),
        ],
        finale: { name: "Master Farmhand", buff: [["all", 0.04], ["minion", 0.06]], grant: [["eggs", 2]], xp: 250, badge: "saga-farming" },
    },
    {
        id: "combat",
        name: "Duelist Saga",
        skill: "Combat",
        color: "#ff6a5f",
        symbol: "critDamage",
        flavor: "Land the crit, keep the combo, never miss the beat. Speed and precision, one blade at a time.",
        bg: "repeating-linear-gradient(115deg, rgba(255,90,80,.18) 0 2px, transparent 2px 26px), repeating-linear-gradient(115deg, rgba(0,0,0,.25) 0 14px, transparent 14px 28px), radial-gradient(circle at 20% 80%, rgba(255,70,60,.25), transparent 45%), linear-gradient(160deg, #2a1213, #12090a)",
        chapters: [
            ch("combat", 1, "First Blood", "A hit that lands harder than it should.", [
                lvl("combat", 3, "skills", "Combat"),
                cnt("crit100", "Land 100 critical hits", "button", (s) => s.crits, 100),
                cnt("combo2", "Reach a combo of x2", "button", (s) => s.bestCombo, 2),
                cnt("qte3", "Try 3 quick time events", "button", (s) => s.evs.qte, 3),
            ], [["critDmg", 0.08]], [["dust", 25]], XP[0]),
            ch("combat", 2, "Sharp Reflexes", "Timing is everything.", [
                lvl("combat", 10, "skills", "Combat"),
                cnt("crit2k", "Land 2,000 critical hits", "button", (s) => s.crits, 2000),
                cnt("combo5", "Reach a combo of x5", "button", (s) => s.bestCombo, 5),
                cnt("perfect10", "Land 10 perfect quick time events", "button", (s) => s.evs.perfect, 10),
            ], [["critDmg", 0.12], ["crit", 0.01]], [["tokens", 1]], XP[1]),
            ch("combat", 3, "Battle Rhythm", "The combo never drops. The crits never stop.", [
                lvl("combat", 20, "skills", "Combat"),
                cnt("crit25k", "Land 25,000 critical hits", "button", (s) => s.crits, 25000),
                cnt("combo10", "Reach a combo of x10", "button", (s) => s.bestCombo, 10),
                cnt("perfect50", "Land 50 perfect quick time events", "button", (s) => s.evs.perfect, 50),
            ], [["comboGain", 0.06], ["critDmg", 0.2]], [["dust", 100]], XP[2]),
            ch("combat", 4, "Blade Master", "A legend of the button. Few get here.", [
                lvl("combat", 35, "skills", "Combat"),
                cnt("crit150k", "Land 150,000 critical hits", "button", (s) => s.crits, 150000),
                cnt("combo20", "Reach a combo of x20", "button", (s) => s.bestCombo, 20),
                cnt("perfect250", "Land 250 perfect quick time events", "button", (s) => s.evs.perfect, 250),
            ], [["critDmg", 0.3], ["crit", 0.02]], [["ap", 1]], XP[3]),
        ],
        finale: { name: "Blade Master", buff: [["all", 0.04], ["critDmg", 0.2]], grant: [["eggs", 2]], xp: 250, badge: "saga-combat" },
    },
    {
        id: "fishing",
        name: "Angler Saga",
        skill: "Fishing",
        color: "#57d8ff",
        symbol: "fishing",
        flavor: "Cast out, wait, and catch the bobber. Treasure, eggs and golden shards wait beneath the waves.",
        bg: "radial-gradient(ellipse at 50% 120%, rgba(90,210,255,.3), transparent 55%), repeating-radial-gradient(circle at 30% 110%, rgba(120,225,255,.14) 0 2px, transparent 2px 22px), repeating-linear-gradient(0deg, rgba(0,60,120,.2) 0 10px, transparent 10px 20px), linear-gradient(180deg, #0d2438, #07131f)",
        chapters: [
            ch("fishing", 1, "Bait and Wait", "A line, a bobber and a lot of patience.", [
                lvl("fishing", 3, "skills", "Fishing"),
                cnt("bob5", "Catch 5 treasure bobbers", "button", (s) => s.bobbers, 5),
                cnt("hatch1", "Hatch an egg", "pets", (s) => s.hatched, 1),
                cnt("visit2", "Visit 2 islands", "islands", (s) => s.visited.length, 2),
            ], [["bobber", 0.08]], [["dust", 25]], XP[0]),
            ch("fishing", 2, "Deeper Waters", "The catch gets bigger the further out you go.", [
                lvl("fishing", 10, "skills", "Fishing"),
                cnt("bob50", "Catch 50 treasure bobbers", "button", (s) => s.bobbers, 50),
                cnt("hatch10", "Hatch 10 eggs", "pets", (s) => s.hatched, 10),
                cnt("gold10", "Catch 10 golden shards", "button", (s) => s.evs.golden, 10),
                cnt("visit5", "Visit 5 islands", "islands", (s) => s.visited.length, 5),
            ], [["bobber", 0.12], ["evBobber", 0.1]], [["tokens", 1]], XP[1]),
            ch("fishing", 3, "Treasure Tides", "Gold in the water. Pets in the nets.", [
                lvl("fishing", 20, "skills", "Fishing"),
                cnt("bob250", "Catch 250 treasure bobbers", "button", (s) => s.bobbers, 250),
                cnt("gold25", "Catch 25 golden shards", "button", (s) => s.evs.golden, 25),
                cnt("pets8", "Own 8 pets", "pets", (s) => Object.keys(s.pets).length, 8),
                cnt("visit10", "Visit 10 islands", "islands", (s) => s.visited.length, 10),
            ], [["bobber", 0.2], ["evGolden", 0.1]], [["dust", 100]], XP[2]),
            ch("fishing", 4, "Leviathan", "The one that did not get away.", [
                lvl("fishing", 35, "skills", "Fishing"),
                cnt("bob1k", "Catch 1,000 treasure bobbers", "button", (s) => s.bobbers, 1000),
                cnt("gold100", "Catch 100 golden shards", "button", (s) => s.evs.golden, 100),
                cnt("pets20", "Own 20 pets", "pets", (s) => Object.keys(s.pets).length, 20),
                cnt("visit15", "Visit 15 islands", "islands", (s) => s.visited.length, 15),
            ], [["bobber", 0.3], ["evBobber", 0.2]], [["ap", 1]], XP[3]),
        ],
        finale: { name: "Master Angler", buff: [["all", 0.04], ["bobber", 0.2]], grant: [["eggs", 2]], xp: 250, badge: "saga-fishing" },
    },
    {
        id: "foraging",
        name: "Wanderer Saga",
        skill: "Foraging",
        color: "#b6f06a",
        symbol: "flower",
        flavor: "Catch what drifts past. Popups, boons, curses and Fracture Fragments reward anyone paying attention.",
        bg: "radial-gradient(circle at 25% 25%, rgba(190,255,110,.2) 0 3px, transparent 4px), radial-gradient(circle at 75% 60%, rgba(190,255,110,.14) 0 3px, transparent 4px), radial-gradient(circle at 50% 90%, rgba(120,200,80,.3), transparent 50%), linear-gradient(165deg, #172812, #0a130a)",
        chapters: [
            ch("foraging", 1, "Trailhead", "Something is floating by. Catch it.", [
                lvl("foraging", 3, "skills", "Foraging"),
                cnt("pop10", "Catch 10 popups", "button", (s) => s.evs.caught, 10),
                cnt("frag1", "Find a Fracture Fragment", "button", (s) => s.frag, 1),
                cnt("curse1", "Survive a curse", "button", (s) => s.evs.curses, 1),
            ], [["evPay", 0.06]], [["dust", 25]], XP[0]),
            ch("foraging", 2, "Deep Woods", "More popups, more boons, more risk.", [
                lvl("foraging", 10, "skills", "Foraging"),
                cnt("pop100", "Catch 100 popups", "button", (s) => s.evs.caught, 100),
                cnt("frag3", "Find 3 Fracture Fragments", "button", (s) => s.frag, 3),
                cnt("curse5", "Survive 5 curses", "button", (s) => s.evs.curses, 5),
            ], [["evPay", 0.1], ["evFreq", 0.08]], [["tokens", 1]], XP[1]),
            ch("foraging", 3, "Old Growth", "You know every trail by sound.", [
                lvl("foraging", 20, "skills", "Foraging"),
                cnt("pop500", "Catch 500 popups", "button", (s) => s.evs.caught, 500),
                cnt("frag10", "Find 10 Fracture Fragments", "button", (s) => s.frag, 10),
                cnt("curse20", "Survive 20 curses", "button", (s) => s.evs.curses, 20),
            ], [["evFreq", 0.12], ["evLife", 0.15]], [["dust", 100]], XP[2]),
            ch("foraging", 4, "Heart of the Forest", "Where the rarest things grow.", [
                lvl("foraging", 35, "skills", "Foraging"),
                cnt("pop2500", "Catch 2,500 popups", "button", (s) => s.evs.caught, 2500),
                cnt("frag30", "Find 30 Fracture Fragments", "button", (s) => s.frag, 30),
                cnt("curse50", "Survive 50 curses", "button", (s) => s.evs.curses, 50),
            ], [["evPay", 0.2], ["curse", 0.08]], [["ap", 1]], XP[3]),
        ],
        finale: { name: "Master Wanderer", buff: [["all", 0.04], ["evPay", 0.15]], grant: [["eggs", 2]], xp: 250, badge: "saga-foraging" },
    },
    {
        id: "enchanting",
        name: "Wizard Saga",
        skill: "Enchanting",
        color: "#c58bff",
        symbol: "intelligence",
        flavor: "Dust, runes and a very lucky roll. Fill the Codex and the table answers back.",
        bg: "radial-gradient(circle at 20% 30%, rgba(230,200,255,.9) 0 1px, transparent 2px), radial-gradient(circle at 65% 20%, rgba(230,200,255,.7) 0 1px, transparent 2px), radial-gradient(circle at 85% 70%, rgba(230,200,255,.8) 0 1px, transparent 2px), radial-gradient(circle at 40% 85%, rgba(230,200,255,.6) 0 1px, transparent 2px), radial-gradient(ellipse at 50% 110%, rgba(170,90,255,.35), transparent 55%), linear-gradient(170deg, #1d1230, #0c0716)",
        chapters: [
            ch("enchanting", 1, "Apprentice", "Your first roll at the Enchanting Table.", [
                lvl("enchanting", 3, "enchant", "Enchanting"),
                cnt("roll10", "Roll 10 enchants", "enchant", (s) => s.enc.rolls, 10),
                flag("wear1", "Wear an enchant on the button", "enchant", (s) => !!s.enc.eq.button),
                cnt("cdx5", "Discover 5 Codex entries", "enchant", codex, 5),
            ], [["luck", 0.04]], [["dust", 40]], XP[0]),
            ch("enchanting", 2, "Adept", "Polish what you have, chase what you do not.", [
                lvl("enchanting", 10, "enchant", "Enchanting"),
                cnt("roll100", "Roll 100 enchants", "enchant", (s) => s.enc.rolls, 100),
                cnt("polish5", "Polish 5 enchants", "enchant", (s) => s.enc.polishes, 5),
                cnt("cdx25", "Discover 25 Codex entries", "enchant", codex, 25),
                cnt("wear2", "Wear 2 enchants at once", "enchant", worn, 2),
            ], [["luck", 0.06], ["dust", 0.1]], [["tokens", 1]], XP[1]),
            ch("enchanting", 3, "Archmage", "Epic pulls are not luck any more.", [
                lvl("enchanting", 20, "enchant", "Enchanting"),
                cnt("roll500", "Roll 500 enchants", "enchant", (s) => s.enc.rolls, 500),
                cnt("cdx70", "Discover 70 Codex entries", "enchant", codex, 70),
                cnt("epic1", "Roll an Epic enchant or better", "enchant", (s) => epicPlus(s, 3), 1),
                cnt("wear3", "Wear 3 enchants at once", "enchant", worn, 3),
            ], [["luck", 0.1], ["xp", 0.08]], [["dust", 200]], XP[2]),
            ch("enchanting", 4, "Wizard Supreme", "Fill the Codex. Roll the impossible.", [
                lvl("enchanting", 35, "enchant", "Enchanting"),
                cnt("roll2500", "Roll 2,500 enchants", "enchant", (s) => s.enc.rolls, 2500),
                cnt("cdx140", "Discover 140 Codex entries", "enchant", codex, 140),
                cnt("leg1", "Roll a Legendary enchant or better", "enchant", (s) => epicPlus(s, 4), 1),
                cnt("myth1", "Roll a Mythic enchant or better", "enchant", (s) => epicPlus(s, 5), 1),
                cnt("wear4", "Wear 4 enchants at once", "enchant", worn, 4),
            ], [["luck", 0.15], ["dust", 0.2]], [["ap", 1]], XP[3]),
        ],
        finale: { name: "Grand Wizard", buff: [["all", 0.04], ["luck", 0.1]], grant: [["eggs", 2]], xp: 250, badge: "saga-enchanting" },
    },
];

export const SAGA_BY_ID = Object.fromEntries(SAGAS.map((x) => [x.id, x])) as Record<SagaId, Saga>;
export const CHAPTERS: Chapter[] = SAGAS.flatMap((x) => x.chapters);
export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<string, Chapter>;
export const finaleId = (id: SagaId) => `${id}:fin`;

// ---- Progress ----

export const taskDone = (s: State, t: SagaTask) => {
    const [a, n] = t.prog(s);
    return a >= n;
};
export const chapterClaimed = (s: State, c: Chapter) => s.chap.includes(c.id);
export const chapterDone = (s: State, c: Chapter) => c.tasks.every((t) => taskDone(s, t));
export const chapterReady = (s: State, c: Chapter) => !chapterClaimed(s, c) && chapterDone(s, c);
export const chapterFrac = (s: State, c: Chapter) => c.tasks.reduce((a, t) => a + Math.min(1, t.prog(s)[0] / t.prog(s)[1]), 0) / c.tasks.length;
export const tasksDone = (s: State, c: Chapter) => c.tasks.filter((t) => taskDone(s, t)).length;

export const sagaClaimed = (s: State, x: Saga) => x.chapters.filter((c) => chapterClaimed(s, c)).length;
export const sagaComplete = (s: State, x: Saga) => sagaClaimed(s, x) === x.chapters.length;
export const finaleClaimed = (s: State, x: Saga) => s.chap.includes(finaleId(x.id));
export const finaleReady = (s: State, x: Saga) => sagaComplete(s, x) && !finaleClaimed(s, x);
/** The first chapter you have not claimed yet: what to work on next in this saga. */
export const currentChapter = (s: State, x: Saga) => x.chapters.find((c) => !chapterClaimed(s, c)) ?? null;
/** Sagas whose finale has been claimed. */
export const sagasDone = (s: State) => SAGAS.filter((x) => finaleClaimed(s, x)).length;

export const readyChapters = (s: State) => CHAPTERS.filter((c) => chapterReady(s, c));
/** Everything waiting for a click on the Level page: chapters to claim and finales. */
export const journeyReady = (s: State) => readyChapters(s).length + SAGAS.filter((x) => finaleReady(s, x)).length;

/** Chapters claimed out of all chapters, finales included. */
export const journeyDone = (s: State) => s.chap.filter((id) => id in CHAPTER_BY_ID || id.endsWith(":fin")).length;
export const JOURNEY_TOTAL = CHAPTERS.length + SAGAS.length;

// ---- Claiming ----

export function grantTo(s: State, [kind, n]: Grant) {
    if (kind === "dust") {
        s.enc.dust += n;
        s.enc.earned += n;
    } else if (kind === "tokens") s.tokens += n;
    else if (kind === "eggs") s.freeEggs += n;
    else if (kind === "ap") s.ap += n;
    else s.frag += n;
}

export function claimChapter(s: State, id: string): Chapter | null {
    const c = CHAPTER_BY_ID[id];
    if (!c || !chapterReady(s, c)) return null;
    s.chap.push(c.id);
    for (const g of c.grant) grantTo(s, g);
    return c;
}
export function claimFinale(s: State, id: SagaId): Saga | null {
    const x = SAGA_BY_ID[id];
    if (!x || !finaleReady(s, x)) return null;
    s.chap.push(finaleId(id));
    for (const g of x.finale.grant) grantTo(s, g);
    return x;
}
/** Claim every ready chapter and finale. Returns what was claimed, in order. */
export function claimAllJourney(s: State): { chapters: Chapter[]; sagas: Saga[] } {
    const out = { chapters: [] as Chapter[], sagas: [] as Saga[] };
    for (const x of SAGAS) {
        for (const c of x.chapters) {
            const got = claimChapter(s, c.id);
            if (got) out.chapters.push(got);
        }
        const f = claimFinale(s, x.id);
        if (f) out.sagas.push(f);
    }
    return out;
}

// ---- Level milestone perks ----

export interface LevelPerk {
    at: number;
    name: string;
    buff: Buff[];
}
export const LEVEL_PERKS: LevelPerk[] = [
    { at: 5, name: "Fresh Start", buff: [["click", 0.02]] },
    { at: 10, name: "Steady Hands", buff: [["minion", 0.03]] },
    { at: 15, name: "Quick Study", buff: [["xp", 0.05]] },
    { at: 20, name: "Lucky Streak", buff: [["luck", 0.03]] },
    { at: 25, name: "Sharp Eyes", buff: [["crit", 0.01]] },
    { at: 30, name: "Heavy Hitter", buff: [["critDmg", 0.1]] },
    { at: 40, name: "Fortune's Favor", buff: [["evPay", 0.05]] },
    { at: 50, name: "Halfway Hero", buff: [["all", 0.02]] },
    { at: 60, name: "Momentum", buff: [["comboMax", 0.3]] },
    { at: 75, name: "Hive Mind", buff: [["minion", 0.05]] },
    { at: 100, name: "Centurion", buff: [["all", 0.03], ["click", 0.04]] },
    { at: 125, name: "Powerhouse", buff: [["click", 0.08]] },
    { at: 150, name: "Beastmaster", buff: [["petXp", 0.15]] },
    { at: 175, name: "Arcane Insight", buff: [["dust", 0.1]] },
    { at: 200, name: "Legend's Might", buff: [["all", 0.04], ["minion", 0.05]] },
    { at: 250, name: "Swarm Lord", buff: [["minion", 0.1]] },
    { at: 300, name: "Fractured Mind", buff: [["all", 0.05]] },
    { at: 350, name: "Deathblow", buff: [["critDmg", 0.3]] },
    { at: 400, name: "Mythic Core", buff: [["all", 0.08]] },
];
export const perkAt = (level: number) => LEVEL_PERKS.find((p) => p.at === level);

/** Extra permanent buffs for owning several finished sagas. */
export const SAGA_BONUS: { n: number; name: string; buff: Buff[] }[] = [
    { n: 2, name: "Storyteller", buff: [["all", 0.02]] },
    { n: 4, name: "Chronicler", buff: [["all", 0.04]] },
    { n: 6, name: "Living Legend", buff: [["all", 0.08], ["xp", 0.1]] },
];

// ---- The buffs themselves ----

type Fx = Partial<Record<EStat, number>>;
const addTo = (out: Fx, buff: Buff[]) => {
    for (const [k, v] of buff) out[k] = (out[k] ?? 0) + v;
};

/** Permanent buffs from claimed chapters and finales. */
export function sagaFx(s: State): Fx {
    const out: Fx = {};
    for (const x of SAGAS) {
        for (const c of x.chapters) if (chapterClaimed(s, c)) addTo(out, c.buff);
        if (finaleClaimed(s, x)) addTo(out, x.finale.buff);
    }
    const n = sagasDone(s);
    for (const b of SAGA_BONUS) if (n >= b.n) addTo(out, b.buff);
    return out;
}
/** Permanent buffs from Fractured Level milestones. */
export function levelFx(s: State): Fx {
    const out: Fx = {};
    for (const p of LEVEL_PERKS) if (s.lvl >= p.at) addTo(out, p.buff);
    return out;
}
/** Everything the Level page gives you; allFx folds this in. */
export function journeyFx(s: State): Fx {
    const out = sagaFx(s);
    addTo(out, Object.entries(levelFx(s)) as Buff[]);
    return out;
}
