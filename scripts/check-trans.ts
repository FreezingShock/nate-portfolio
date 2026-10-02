// Run: npx tsx scripts/check-trans.ts
// Exercises Transcendence, vows, Essence upgrades, milestones and the save round-trip. Exits 1 on any failure.
import "../lib/fractured-idle/enchant";
import { MINIONS } from "../lib/fractured-idle/data";
import { advance, ascPlan, ascend, ascMult, buyUpgrade, derive, newState, parseSave, rbCost, rebirth, rebirthCap, rebirthPlan, serialize, tokenMult, transcend } from "../lib/fractured-idle/engine";
import { advise, logReset, newRunLog, sample, runSecs } from "../lib/fractured-idle/runs";
import { ESS_UPS, buyEssence, essFor, hasVow, prestigeBonus, toggleVow, transMult, transPlan, VOWS } from "../lib/fractured-idle/trans";

let bad = 0;
const ok = (c: unknown, msg: string) => {
    if (!c) {
        bad++;
        console.log("FAIL:", msg);
    }
};
const close = (a: number, b: number, msg: string) => ok(Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b)), `${msg} (got ${a}, want ${b})`);

// ---- A late-game state: ascension 10, gem upgrades, auto-buyers, pets ----
const mk = () => {
    const s = newState();
    s.asc = 10;
    s.ascEver = 10;
    s.rebirths = 14;
    s.pbest.rb = 14;
    s.ap = 33;
    s.aups = { cosmic: 5, autoMin: 2, autoUp: 1, autoTok: 1, autoRb: 1, perch2: 1 };
    s.auto.min = true;
    s.auto.rb = true;
    s.rups = { might: 8, stack: 4, keep: 2 };
    s.minions[0] = 100;
    s.minions[3] = 40;
    s.pets = { silverfish: { xp: 5, n: 2 } };
    s.shards = 1e12;
    s.total = 1e15;
    s.playTime = 100000; // a long run, so the Transcendence time gate is open
    return s;
};

// ---- Transcendence ----
{
    const s = mk();
    ok(transPlan(s).can, "ascension 10 can transcend");
    ok(transPlan(s).gain === essFor(s, 10) && transPlan(s).gain === 4, `ascension 10 pays 4 Essence (got ${transPlan(s).gain})`);
    const before = ascMult(s);
    ok(transcend(s), "transcend works");
    ok(s.trans === 1, "trans count");
    ok(s.ess === 4 && s.essTotal === 4, "essence paid");
    ok(s.asc === 0, "ascension count reset");
    ok(s.ascEver === 10, "lifetime ascensions kept");
    ok(s.ap === 0, "unspent gems erased");
    ok(s.aups.cosmic === 5 && s.aups.autoMin === 2 && s.aups.perch2 === 1, "gem upgrades kept");
    ok(s.auto.min && s.auto.rb, "auto-buyer switches kept");
    ok(s.pets.silverfish?.n === 2, "pets kept");
    ok(s.shards === 0, "shards reset");
    ok(s.minions[0] === 10 && s.minions[3] === 4, `Afterglow (ascension 2 perk) keeps 10% of minions through the reset (got ${s.minions[0]}, ${s.minions[3]})`);
    ok(s.tokens === 0, "tokens reset");
    ok(Object.keys(s.ups).length === 0, "shard upgrades reset");
    close(transMult(s), 2 * (1 + 0.03 * 4), "transcendent multiplier");
    ok(ascMult(s) < before, "ascension multiplier restarts (it comes back as you re-ascend)");
    ok(!transcend(s), "cannot transcend again straight away");
    ok(transPlan(s).req === 12, "next transcendence needs two more ascensions");
}

// ---- The Transcendence time gate ----
{
    const s = mk();
    s.playTime = 3600 * 7; // seven hours in, the first run needs eight
    ok(!transPlan(s).can && transPlan(s).ascOk && Math.abs(transPlan(s).timeLeft - 3600) < 1, "ascension 10 is not enough before the time gate opens");
    ok(!transcend(s), "cannot transcend before the gate opens");
    s.playTime = 3600 * 8 + 1;
    ok(transPlan(s).can && transcend(s), "the gate opens after eight hours");
    s.asc = 12;
    s.playTime += 3600 * 8;
    ok(!transPlan(s).can, "the second run needs longer than eight hours (it grows)");
    s.playTime += 3600 * 2;
    ok(transPlan(s).can, "...and opens a little later");
}

// ---- Essence upgrades ----
{
    const s = mk();
    s.ess = 500;
    ok(!buyEssence(s, "deepstack"), "Deep Stack is locked behind Lean Climb");
    for (let i = 0; i < 2; i++) ok(buyEssence(s, "lean"), "buy Lean Climb");
    ok(buyEssence(s, "deepstack"), "Deep Stack opens at Lean Climb 2");
    ok(rebirthCap(s) === 1 + 4 + 2 + 1 + 1, `stack cap: base, Stack 4, Deep Stack +2, rebirth-10 and ascension-3 perks (got ${rebirthCap(s)})`);
    close(rbCost(s, 0), 1e5 * 4 ** 10 * 0.92 ** 2, "Lean Climb lowers rebirth cost");
    for (let i = 0; i < 3; i++) buyEssence(s, "afterimage");
    s.asc = 10;
    s.vowNext = [];
    transcend(s);
    ok(s.asc === 3, `Afterimage starts at ascension 3 (got ${s.asc})`);
    ok(ESS_UPS.every((u) => u.max >= 1 && u.cost > 0), "essence upgrade data is sane");
}

// ---- Vows ----
{
    const s = mk();
    ok(toggleVow(s, "poverty"), "choose a vow");
    ok(!toggleVow(s, "lone"), "only one vow slot by default");
    ok(toggleVow(s, "poverty"), "drop a vow again");
    toggleVow(s, "poverty");
    s.asc = 12;
    ok(transPlan(s).gain === essFor(s, 12), "plan uses the live vows (none yet this run)");
    transcend(s);
    ok(hasVow(s, "poverty"), "vow becomes active on the next run");
    s.shards = 1e30;
    ok(!buyUpgrade(s, "auto"), "Vow of Poverty blocks shard upgrades");
}
{
    const s = mk();
    s.vow = ["lone"];
    const cpsVow = (() => {
        s.minions[0] = 50;
        return derive(s).cps;
    })();
    s.vow = [];
    ok(derive(s).cps > cpsVow * 2, "Vow of the Lone Hand cuts minion output");
}
{
    const s = mk();
    s.vow = ["scarcity"];
    const a = tokenMult(s);
    s.vow = [];
    close(a, tokenMult(s) * 0.6, "Vow of Scarcity cuts tokens by 40%");
    s.rebirths = 25;
    const gemsNone = ascPlan(s).ap;
    s.vow = ["scarcity"];
    ok(ascPlan(s).ap < gemsNone, "Vow of Scarcity cuts gems");
}
{
    const s = mk();
    s.vow = ["haste"];
    const withHaste = ascPlan(s).req;
    s.vow = [];
    ok(withHaste === ascPlan(s).req + 3, "Vow of Haste is exactly +3");
}
{
    const s = mk();
    s.vow = ["silence"];
    s.auto.min = true;
    s.minions = MINIONS.map(() => 0);
    s.shards = 1e9;
    const d = derive(s);
    // advance would buy minions through the auto-buyer; with Silence nothing is bought
    // (engine.advance is exercised by fi-sim; here we just check the flag).
    ok(hasVow(s, "silence") && d.cps >= 0, "Vow of Silence is active");
    const total = VOWS.reduce((a, v) => a * (1 + v.bonus), 1);
    ok(total > 1, "vows pay Essence");
}

// ---- Auto-buyers through the game tick ----
{
    const run = (vow: string[]) => {
        const s = newState();
        s.aups = { autoMin: 3 };
        s.auto.min = true;
        s.vow = vow;
        s.shards = 1e6;
        for (let i = 0; i < 40; i++) advance(s, derive(s), 1);
        return s.minions.reduce((a, b) => a + b, 0);
    };
    ok(run([]) > 0, "the Minion Foreman buys minions on the tick");
    ok(run(["silence"]) === 0, "Vow of Silence stops every auto-buyer");
}
{
    const s = newState();
    s.aups = { cosmic: 0 };
    s.eups = { gemSteward: 1, autoAsc: 1 };
    s.auto.gem = true;
    s.auto.asc = true;
    s.auto.ascN = 12;
    s.ap = 50;
    for (let i = 0; i < 60; i++) advance(s, derive(s), 1);
    ok(Object.keys(s.aups).some((k) => (s.aups[k] || 0) > 0 && k !== "cosmic") || s.aups.cosmic > 0, "Gem Steward spends gems automatically");
    const a = newState();
    a.eups = { autoAsc: 1 };
    a.auto.asc = true;
    a.auto.ascN = 12;
    a.rebirths = 11;
    for (let i = 0; i < 5; i++) advance(a, derive(a), 1);
    ok(a.asc === 0, "Auto-Ascend waits for the rebirth count you set");
    a.rebirths = 12;
    for (let i = 0; i < 5; i++) advance(a, derive(a), 1);
    ok(a.asc === 1 && a.ap > 0, `Auto-Ascend ascends at the set count (asc ${a.asc}, gems ${a.ap})`);
}

// ---- Milestones ----
{
    const s = newState();
    ok(prestigeBonus(s).keep === 0, "no milestone perks on a fresh save");
    s.pbest.rb = 3;
    close(prestigeBonus(s).keep, 0.05, "rebirth 3 keeps 5% of minions");
    s.pbest.rb = 25;
    close(prestigeBonus(s).keep, 0.1, "rebirth 25 keeps 10% of minions");
    s.pbest.rb = 10;
    ok(prestigeBonus(s).cap === 1, "rebirth 10 adds 1 stack");
    s.ascEver = 3;
    ok(prestigeBonus(s).cap === 2 && prestigeBonus(s).ascKeep === 0.1, "ascension 2 and 3 perks");
    // a real rebirth keeps minions and records the best
    const r = newState();
    r.pbest.rb = 3;
    r.minions[0] = 200;
    r.shards = 1e9;
    r.rebirths = 0;
    ok(rebirthPlan(r).count >= 1, "rebirth is available");
    rebirth(r);
    ok(r.minions[0] === 10, `rebirth keeps 5% of 200 minions (got ${r.minions[0]})`);
    ok(r.pbest.rb >= 1, "best rebirth recorded");
}

// ---- Ascension keeps ascEver and respects Short Ascent ----
{
    const s = mk();
    s.eups = { short: 2, afterimage: 1 };
    s.asc = 5;
    s.rebirths = 20;
    const req = ascPlan(s).req;
    ok(req === 10 + 5 - 2, `Short Ascent lowers the ascension requirement (got ${req})`);
    const e = s.ascEver;
    ascend(s);
    ok(s.ascEver === e + 1 && s.asc === 6, "ascend raises both counters");
}

// ---- Run history and the reset cue ----
{
    const s = mk();
    s.playTime = 40000;
    ok(transcend(s), "transcend for the history test");
    ok(s.runs.recs.trans.length === 1 && s.runs.recs.trans[0].gain === 4 && s.runs.recs.trans[0].secs === 40000, "Transcendence is logged with its length and gain");
    ok(s.runs.mark.trans === 40000 && s.runs.mark.rb === 40000 && s.runs.mark.asc === 40000, "a Transcendence restarts every layer's clock");
    s.playTime = 40000 + 3600;
    ok(runSecs(s.runs, "trans", s.playTime) === 3600, "run time counts from the last reset");

    const log = newRunLog();
    // Rate climbs 10 -> 14 (still rising): wait. Then flat at the top: good. Then clearly falling: reset now.
    let t = 0;
    const feed = (gainPerHour: number) => {
        t += 20;
        sample(log, "rb", t, (gainPerHour * runSecs(log, "rb", t)) / 3600);
    };
    feed(10);
    feed(14);
    ok(advise(log, "rb", t, (14 * runSecs(log, "rb", t)) / 3600, true).cue === "wait", "a rising rate says keep going");
    feed(14.1);
    ok(advise(log, "rb", t, (14.1 * runSecs(log, "rb", t)) / 3600, true).cue === "good", "a flat rate near the peak says good time");
    feed(11);
    ok(advise(log, "rb", t, (11 * runSecs(log, "rb", t)) / 3600, true).cue === "now", "a falling rate says reset now");
    ok(advise(log, "rb", t, 0, false).cue === "none", "no cue when nothing is ready");
    logReset(log, "rb", t, 10);
    ok(log.smp.rb.pk === 0 && log.mark.rb === t, "a reset clears the run's readings");
}

// ---- Save round-trip and old saves ----
{
    const s = mk();
    s.ess = 7.5;
    s.eups = { lean: 3, twin: 1 };
    s.vow = ["lone"];
    s.vowNext = ["haste", "poverty"];
    s.auto.asc = true;
    s.auto.ascN = 14;
    const back = parseSave(serialize(s))!;
    ok(back.trans === s.trans && back.ess === 7.5 && back.eups.lean === 3 && back.vow[0] === "lone", "round-trip keeps Transcendence fields");
    ok(back.vowNext.length === 2 && back.auto.asc && back.auto.ascN === 14, "round-trip keeps vowNext and auto settings");
    const old = JSON.parse(serialize(mk()));
    for (const k of ["ascEver", "trans", "ess", "essTotal", "eups", "vow", "vowNext", "pbest"]) delete old[k];
    delete old.auto.asc;
    const loaded = parseSave(JSON.stringify(old))!;
    ok(loaded.ascEver === 10 && loaded.trans === 0 && loaded.pbest.rb >= 14, "an older save loads with sensible defaults");
    const junk = JSON.parse(serialize(mk()));
    junk.eups = { lean: 999, nope: 5 };
    junk.vow = ["zzz", "lone", "lone", "poverty", "haste"];
    const clean = parseSave(JSON.stringify(junk))!;
    ok(clean.eups.lean === 8 && !("nope" in clean.eups), "essence levels are clamped and unknown ids dropped");
    ok(clean.vow.length <= 2 && clean.vow.every((v) => ["lone", "poverty", "haste"].includes(v)), "vows are cleaned");
}

console.log(bad ? `${bad} check(s) failed` : "all Transcendence checks passed");
process.exit(bad ? 1 : 0);
