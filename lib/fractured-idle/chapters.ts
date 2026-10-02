import type { State } from "./data";
import { CHAPTER_REWARDS, type ChapterReward } from "./chapter-fx";
import { FXP_CATS, FXP_PER_LEVEL, type FxpCat } from "./fxp";
import { fxpSteps, type Step } from "./fxp-steps";

// Fractured Level chapters. Chapter 1 is levels 0 to 40, chapter 2 is 40 to 80, and so on up to 400. A chapter's tasks
// are not new challenges: they are the very things that pay Fracture EXP (the sources in fxp.ts, split into steps by
// fxp-steps.ts), handed out in order of difficulty, so doing a chapter's tasks is exactly what takes you through its
// 40 levels. Whatever is left after level 400 lives in the last chapter, the Endgame.
//
// Tasks that pay XP always pay it, even from a chapter you have not opened yet; the chapters only decide what the Level
// page shows you first and when a chapter's reward can be claimed. Claim them in order: each opens the next.

export const CHAPTER_LEVELS = 40;
export const CHAPTER_XP = CHAPTER_LEVELS * FXP_PER_LEVEL;
export const CHAPTER_COUNT = 10; // claimable chapters; the Endgame is number 11
export const ENDGAME = CHAPTER_COUNT + 1;

const NAMES = [
    ["First Fracture", "Learn the ropes: hire minions, find your first pets and start every skill."],
    ["Finding Your Feet", "Build an engine. Upgrades, your first rebirths and the early islands."],
    ["The Wider World", "Travel, mine and farm. Every system opens up."],
    ["Beyond the Hub", "The Nether and deeper islands, rarer pets and sharper trophies."],
    ["The Collector", "Fill the collections: ores, crops, looks and the codex."],
    ["Mastery", "Island mastery, big skill levels and long ladders start paying."],
    ["Echoes of Power", "Ascension upgrades and the strongest pets come into reach."],
    ["Legend in the Making", "Trophies, feats and relics that take real commitment."],
    ["Edge of the Void", "The last hard climbs before the cap."],
    ["Mythic Core", "Everything it takes to reach level 400."],
    ["Endgame", "Everything left over. Every level past 400 comes from here, and there is plenty."],
];

export interface ChapterInfo {
    n: number; // 1 to 11
    name: string;
    blurb: string;
    from: number; // first level
    to: number; // level you reach by finishing it (Infinity for the Endgame)
    color: string;
    reward: ChapterReward | null;
}

const COLORS = ["#7dffb8", "#6fe3ff", "#9be04a", "#ffd23a", "#ffaa00", "#ff8fc7", "#c58bff", "#ff6b6b", "#57d8ff", "#ffffff", "#ff55ff"];
export const CHAPTER_INFO: ChapterInfo[] = NAMES.map(([name, blurb], i) => ({
    n: i + 1,
    name,
    blurb,
    from: i * CHAPTER_LEVELS,
    to: i < CHAPTER_COUNT ? (i + 1) * CHAPTER_LEVELS : Infinity,
    color: COLORS[i],
    reward: CHAPTER_REWARDS[i] ?? null,
}));

// ---- The plan ----

/** One line on a chapter's checklist: a source with the steps of it that fall in this chapter. */
export interface Row {
    id: string; // chapter + source
    src: string;
    cat: FxpCat;
    name: string;
    steps: Step[];
    xp: number;
    tab: string;
}

export interface Plan {
    n: number;
    rows: Row[];
    xp: number;
    steps: number;
}

let plan: Plan[] | null = null;

/** Every chapter's rows. Steps go in order of difficulty, 4,000 XP to a chapter; the Endgame takes the rest. */
export function chapterPlan(): Plan[] {
    if (plan) return plan;
    const lists: Step[][] = Array.from({ length: ENDGAME }, () => []);
    let acc = 0;
    for (const st of fxpSteps()) {
        lists[Math.min(ENDGAME - 1, Math.floor((acc + st.xp / 2) / CHAPTER_XP))].push(st);
        acc += st.xp;
    }
    plan = lists.map((list, i) => {
        const bySrc = new Map<string, Row>();
        for (const st of list) {
            let r = bySrc.get(st.src);
            if (!r) {
                r = { id: `${i + 1}:${st.src}`, src: st.src, cat: st.cat, name: st.name, steps: [], xp: 0, tab: st.tab };
                bySrc.set(st.src, r);
            }
            r.steps.push(st);
            r.xp += st.xp;
        }
        return { n: i + 1, rows: [...bySrc.values()], xp: list.reduce((a, st) => a + st.xp, 0), steps: list.length };
    });
    return plan;
}

// ---- Progress ----

/** A step is done once its source has paid this much, or what it asks for is true right now. */
/** s.fxp keeps each source rounded down, so a step's running total is compared rounded down too. */
export const stepDone = (s: State, st: Step) => (s.fxp[st.src] || 0) >= Math.floor(st.cum + 1e-9) || st.val(s) >= st.need;
export const rowDone = (s: State, r: Row) => r.steps.every((st) => stepDone(s, st));
/** The step to do next on a row (the first one not done), or the last when it is finished. */
export const rowNext = (s: State, r: Row) => r.steps.find((st) => !stepDone(s, st)) ?? r.steps[r.steps.length - 1];
/** How far along the row's next step is, 0 to 1. */
export const rowFrac = (s: State, r: Row) => {
    if (rowDone(s, r)) return 1;
    const st = rowNext(s, r);
    return Math.max(0, Math.min(1, st.val(s) / Math.max(1e-9, st.need)));
};
export const rowXpDone = (s: State, r: Row) => r.steps.reduce((a, st) => a + (stepDone(s, st) ? st.xp : 0), 0);

export interface Progress {
    rows: number;
    rowsDone: number;
    steps: number;
    stepsDone: number;
    xp: number;
    xpDone: number;
}
const memo = new WeakMap<State, { at: number; p: Progress[] }>();
/** Per-chapter totals. Cheap enough to call every render, but still cached for a quarter of a second. */
export function progress(s: State): Progress[] {
    const now = Date.now();
    const m = memo.get(s);
    if (m && now - m.at < 250) return m.p;
    const p = chapterPlan().map((c) => {
        let stepsDone = 0;
        let xpDone = 0;
        let rowsDone = 0;
        for (const r of c.rows) {
            let all = true;
            for (const st of r.steps) {
                if (stepDone(s, st)) {
                    stepsDone++;
                    xpDone += st.xp;
                } else all = false;
            }
            if (all) rowsDone++;
        }
        return { rows: c.rows.length, rowsDone, steps: c.steps, stepsDone, xp: c.xp, xpDone };
    });
    memo.set(s, { at: now, p });
    return p;
}

export const chapterClaimed = (s: State, n: number) => n <= s.lch;
/** Chapter 1 is always open; each later chapter opens when the one before is claimed. */
export const chapterOpen = (s: State, n: number) => n <= s.lch + 1;
/** Exact (not cached): claiming must never act on a stale count. */
export const chapterComplete = (s: State, n: number) => {
    const c = chapterPlan()[n - 1];
    return !!c && c.rows.every((r) => rowDone(s, r));
};
/** True when this is the chapter to claim: open, finished and not yet claimed. Never the Endgame. */
export const chapterReady = (s: State, n: number) => n <= CHAPTER_COUNT && n === s.lch + 1 && chapterComplete(s, n);
/** The chapter you are working on: the first one not claimed. */
export const currentChapter = (s: State) => Math.min(ENDGAME, s.lch + 1);

export function claimChapter(s: State, n: number): ChapterInfo | null {
    if (!chapterReady(s, n)) return null;
    const r = CHAPTER_REWARDS[n - 1];
    s.tokens += r.tokens;
    s.freeEggs += r.eggs;
    s.ap += r.ap;
    s.enc.dust += r.dust;
    s.enc.earned += r.dust;
    s.lch = n;
    return CHAPTER_INFO[n - 1];
}

export interface Pick {
    row: Row;
    step: Step;
    chapter: number;
    frac: number;
}

/**
 * What to do next: the not-done rows of the chapter you are on, the ones closest to finishing first. If a chapter is
 * finished but not claimed, that comes back as an empty list (the caller shows the claim instead).
 */
export function nextPicks(s: State, limit = 3): Pick[] {
    const n = currentChapter(s);
    const c = chapterPlan()[n - 1];
    const out: Pick[] = [];
    for (const row of c.rows) {
        if (rowDone(s, row)) continue;
        const step = rowNext(s, row);
        out.push({ row, step, chapter: n, frac: rowFrac(s, row) });
    }
    out.sort((a, b) => b.frac - a.frac || a.step.key - b.step.key);
    return out.slice(0, limit);
}

/** The categories that make up most of a chapter, for its one-line summary. */
export function focusOf(n: number, top = 3): { cat: FxpCat; name: string; xp: number }[] {
    const by = new Map<FxpCat, number>();
    for (const r of chapterPlan()[n - 1].rows) by.set(r.cat, (by.get(r.cat) ?? 0) + r.xp);
    return [...by.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([cat, xp]) => ({ cat, xp, name: FXP_CATS.find((c) => c.id === cat)?.name ?? cat }));
}
