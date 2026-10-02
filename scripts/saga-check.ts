// Sanity run for the Level page engine: sagas, chapters, claiming, buffs, level perks, XP sources and old saves.
import { newState, parseSave, serialize, derive } from "../lib/fractured-idle/engine";
import { allFx } from "../lib/fractured-idle/enchant";
import { fxpSources, updateFxp, rewardFor, BADGE_SYMBOLS, symbolOpen, PREFIXES, prefixOpen, prefixStat } from "../lib/fractured-idle/fxp";
import * as SG from "../lib/fractured-idle/sagas";

let fails = 0;
const ok = (c: boolean, m: string) => {
    if (!c) {
        fails++;
        console.log("FAIL", m);
    } else console.log("ok  ", m);
};

const s = newState();
ok(s.chap.length === 0, "new state has no claimed chapters");
ok(SG.SAGAS.length === 6 && SG.CHAPTERS.length === 24, "6 sagas x 4 chapters");
const ids = SG.CHAPTERS.flatMap((c) => c.tasks.map((t) => `${c.id}/${t.id}`));
ok(new Set(ids).size === ids.length, "task ids are unique");
ok(SG.CHAPTERS.every((c) => c.tasks.length >= 3 && c.buff.length > 0), "every chapter has tasks and a buff");
for (const c of SG.CHAPTERS) for (const t of c.tasks) { const [a, n] = t.prog(s); if (!(n > 0 && Number.isFinite(a))) ok(false, `task ${c.id}/${t.id} progress is sane`); }
ok(SG.readyChapters(s).length === 0, "nothing ready on a fresh save");

// Do the first Spelunking chapter by editing state.
const x = SG.SAGA_BY_ID.mining;
ok(SG.currentChapter(s, x)?.n === 1, "current chapter starts at 1");
ok(SG.claimChapter(s, "mining:1") === null, "cannot claim before the tasks are done");
s.mine.nodes = 200; s.mine.broken = 30; s.mining = 1e5; s.mine.picks.push("stone");
ok(SG.chapterReady(s, x.chapters[0]), "chapter 1 completes from state");
const dust0 = s.enc.dust;
const d0 = derive(s);
const click0 = d0.clickUp;
ok(!!SG.claimChapter(s, "mining:1"), "claim chapter 1");
ok(SG.claimChapter(s, "mining:1") === null, "cannot claim twice");
ok(s.enc.dust === dust0 + 25, "chapter grant paid");
ok(derive(s).clickUp > click0, "chapter buff raises click power");
ok(allFx(s).click >= 0.04, "allFx includes the saga buff");
ok(SG.currentChapter(s, x)?.n === 2, "current chapter moves on");

// Finale requires all four.
ok(!SG.finaleReady(s, x), "finale not ready early");
for (const c of x.chapters.slice(1)) s.chap.push(c.id);
ok(SG.finaleReady(s, x), "finale ready after four chapters");
const sym = BADGE_SYMBOLS.find((b) => b.id === "saga-mining")!;
s.lvl = 5;
ok(!symbolOpen(s, sym), "saga symbol locked before finale");
ok(!!SG.claimFinale(s, "mining"), "claim finale");
ok(symbolOpen(s, sym), "saga symbol unlocks with finale");
ok(prefixStat(s, "saga_mining") === 1 && SG.sagasDone(s) === 1, "saga prefix stat counts");
ok(prefixOpen(s, PREFIXES.find((p) => p.id === "spelunker")!), "Spelunker prefix unlocks");

// Level perks.
const lf0 = SG.levelFx(newState());
s.lvl = 100;
const lf = SG.levelFx(s);
ok(Object.keys(lf0).length === 0 && (lf.all ?? 0) > 0, "level perks apply by level");
ok(rewardFor(100).unlocks.some((u) => u.endsWith("perk")), "level 100 reward mentions its perk");

// XP: chapters pay once, sources have unique ids.
const src = fxpSources(s);
ok(new Set(src.map((q) => q.id)).size === src.length, "xp source ids are unique");
ok(src.filter((q) => q.cat === "sagas").every((q) => q.max > 0), "saga sources are bounded");
const before = Object.values(s.fxp).reduce((a, b) => a + b, 0);
updateFxp(s, true);
const after = Object.values(s.fxp).reduce((a, b) => a + b, 0);
ok(after > before && s.fxp["fin:mining"] === 250, "claimed chapters and finale pay Fracture EXP");
ok(!src.some((q) => q.cat === "skills" && /^(mine|farm):/.test(q.id)), "mining and farming sources have their own groups");

// Claim all.
const t = newState();
const got = SG.claimAllJourney(t);
ok(got.chapters.length === 0, "claimAll on a fresh save claims nothing");

// Saves.
const back = parseSave(serialize(s));
ok(!!back && back.chap.length === s.chap.length, "claimed chapters survive a save");
const old = JSON.parse(serialize(s));
delete old.chap;
const mig = parseSave(JSON.stringify(old));
ok(!!mig && Array.isArray(mig.chap) && mig.chap.length === 0, "old saves without chap load");
old.chap = ["mining:1", "mining:1", 5, "x"];
const dd = parseSave(JSON.stringify(old));
ok(!!dd && dd.chap.length === 2, "bad chap entries are cleaned");

console.log(fails ? `${fails} FAILED` : "all good");
process.exit(fails ? 1 : 0);
