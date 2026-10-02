// Pacing simulation for the prestige layers. A greedy player clicks a few times a second with the auto-buyers running,
// rebirths when the stack is worth taking, ascends and transcends by simple rules, and spends every currency as it
// comes. It prints when each reset happens so rebirth, ascension and Transcendence can be tuned to their targets
// (rebirth minutes, ascension about an hour, Transcendence about 10 to 15 hours).
//
// Run: npx tsx scripts/prestige-sim.ts [hours=30] [clicksPerSec=4]
// Env: ASC_EXTRA=n   ascend n rebirths past the requirement (default 2)
//      TRANS_EXTRA=n transcend n ascensions past the requirement (default 0)
//      VERBOSE=1     print every reset, not just ascensions and Transcendences
//      BOOST=x       stand-in for everything this sim leaves out (islands, skills, mine, farm, pets, enchants): every shard
//                    you earn is multiplied by x. Calibrate it so the first ascension lands where scripts/fi-sim.ts puts it.
//      SUMMARY=1     print one compact line of milestones instead of the full log
//      ASC_COST GEM_OFF GEM_DIV GEM_EXP GEM_ASC ASC_STEP TRANS_COST TRANS_STEP   override the TUNE knobs in lib/fractured-idle/data.ts
import "../lib/fractured-idle/enchant";
import { GEM_UPS, TOKEN_UPS } from "../lib/fractured-idle/prestige";
import { advance, ascPlan, ascend, bestPrestige, buyPrestige, derive, newState, rebirth, rebirthCap, rebirthPlan, transcend, type Derived } from "../lib/fractured-idle/engine";
import { ESS_UPS, buyEssence, eLv, essLocked, essPrice, transPlan } from "../lib/fractured-idle/trans";
import { fmtTime } from "../lib/fractured-idle/engine";
import { TUNE, type State } from "../lib/fractured-idle/data";

const HOURS = Number(process.argv[2] ?? 30);
const CPS = Number(process.argv[3] ?? 4);
const ASC_EXTRA = Number(process.env.ASC_EXTRA ?? 2);
const TRANS_EXTRA = Number(process.env.TRANS_EXTRA ?? 0);
const DT = 2;
const BOOST = Number(process.env.BOOST ?? 1);
if (process.env.ASC_COST) TUNE.ascCost = Number(process.env.ASC_COST);
if (process.env.ASC_KNEE) TUNE.ascKnee = Number(process.env.ASC_KNEE);
if (process.env.ASC_LATE) TUNE.ascCostLate = Number(process.env.ASC_LATE);
if (process.env.GEM_OFF) TUNE.gemOff = Number(process.env.GEM_OFF);
if (process.env.GEM_DIV) TUNE.gemDiv = Number(process.env.GEM_DIV);
if (process.env.GEM_EXP) TUNE.gemExp = Number(process.env.GEM_EXP);
if (process.env.GEM_ASC) TUNE.gemAsc = Number(process.env.GEM_ASC);
if (process.env.ASC_STEP) TUNE.ascStep = Number(process.env.ASC_STEP);
if (process.env.TRANS_COST) TUNE.transCost = Number(process.env.TRANS_COST);
if (process.env.TRANS_STEP) TUNE.transStep = Number(process.env.TRANS_STEP);

const s: State = newState();
const log: string[] = [];
const stamp = () => fmtTime(s.playTime).padStart(9);
const ev: { k: string; h: number }[] = [];

const click = (d: Derived, n: number) => {
    const v = d.click * (1 + d.critChance * d.critDmg) * n;
    s.shards += v;
    s.total += v;
    s.clicks += n;
};

// A player who has the auto-buyers from the start (the first ascension is the slow one; this models a diligent manual
// player who buys by hand about as well as the Foremen do). Spending tokens and gems is done by value rank.
s.aups = { ...s.aups, autoMin: 3, autoUp: 2, autoTok: 2 };
s.auto.min = true;
s.auto.up = true;

const spendTokens = () => {
    for (let i = 0; i < 100; i++) {
        const b = bestPrestige(s, "tokens");
        if (!b || buyPrestige(s, "tokens", b.id, 1) < 1) break;
    }
};
const spendGems = () => {
    for (let i = 0; i < 100; i++) {
        const b = bestPrestige(s, "gems");
        if (!b || buyPrestige(s, "gems", b.id, 1) < 1) break;
    }
};
const spendEssence = () => {
    for (let i = 0; i < 100; i++) {
        const open = ESS_UPS.filter((u) => eLv(s, u.id) < u.max && !essLocked(s, u) && essPrice(u, eLv(s, u.id)) <= s.ess).sort((a, b) => essPrice(a, eLv(s, a.id)) - essPrice(b, eLv(s, b.id)));
        if (!open.length || !buyEssence(s, open[0].id)) break;
    }
};

let lastRb = 0;
let lastAsc = 0;
let lastTrans = 0;
let rbThisAsc = 0;
let t = 0;
while (t < HOURS * 3600) {
    const d0 = derive(s);
    const d = BOOST === 1 ? d0 : { ...d0, cps: d0.cps * BOOST, click: d0.click * BOOST, avgClick: d0.avgClick * BOOST };
    click(d, CPS * DT);
    advance(s, d, DT);
    t += DT;

    // Rebirth: take the stack when it is worth it, or after waiting a while.
    const plan = rebirthPlan(s);
    const cap = rebirthCap(s);
    if (plan.count > 0 && (plan.count >= Math.max(1, Math.floor(cap * 0.6)) || t - lastRb > 900)) {
        const before = s.rebirths;
        const tok = plan.tokens;
        rebirth(s, plan.count);
        rbThisAsc++;
        if (process.env.VERBOSE) log.push(`${stamp()}  rebirth ${before} -> ${s.rebirths} (+${tok} tokens, took ${Math.round((t - lastRb) / 60)}m)`);
        lastRb = t;
        spendTokens();
    }
    if (t % 10 === 0) spendTokens();

    // Ascend a little past the requirement.
    const ap = ascPlan(s);
    if (ap.can && s.rebirths >= ap.req + ASC_EXTRA) {
        const gain = ap.ap;
        const at = s.rebirths;
        ascend(s);
        log.push(`${stamp()}  ASCEND #${s.ascEver} (asc ${s.asc}) at rebirth ${at}: +${gain} gems, run ${((t - lastAsc) / 60).toFixed(0)}m, ${rbThisAsc} rebirth actions`);
        ev.push({ k: 'A' + s.ascEver + '@' + s.asc, h: t / 3600 });
        lastAsc = t;
        lastRb = t;
        rbThisAsc = 0;
        spendGems();
    }
    if (t % 10 === 0) spendGems();

    // Transcend once the requirement is met (plus any extra).
    const tp = transPlan(s);
    if (tp.can && s.asc >= tp.req + TRANS_EXTRA) {
        const gain = tp.gain;
        const at = s.asc;
        transcend(s);
        log.push(`${stamp()}  *** TRANSCEND #${s.trans} at ascension ${at}: +${gain} Essence, run ${((t - lastTrans) / 3600).toFixed(1)}h`);
        ev.push({ k: 'T' + s.trans, h: t / 3600 });
        lastTrans = t;
        lastAsc = t;
        lastRb = t;
        rbThisAsc = 0;
        spendEssence();
    }
    if (t % 60 === 0) spendEssence();
}

const d = derive(s);
if (process.env.SUMMARY) {
    const f = (x: number) => x.toFixed(1);
    const asc = ev.filter((e) => e.k[0] === "A");
    const tr = ev.filter((e) => e.k[0] === "T");
    const gaps = asc.slice(0, 10).map((e, i) => f(e.h - (i ? asc[i - 1].h : 0)));
    console.log(`asc gaps(h) [${gaps.join(" ")}]  T@h [${tr.slice(0, 5).map((e) => f(e.h)).join(" ")}]  ascensions ${asc.length}  trans ${s.trans}  all x${d.all.toExponential(1)}`);
    process.exit(0);
}
console.log(log.join("\n"));
console.log(`\nAfter ${HOURS}h @ ${CPS} clicks/s: rebirths ${s.rebirths}, asc ${s.asc} (${s.ascEver} ever), transcendences ${s.trans}, Essence ${s.ess}, all x${d.all.toExponential(2)}`);
console.log(`token levels ${TOKEN_UPS.reduce((a, u) => a + (s.rups[u.id] || 0), 0)}, gem levels ${GEM_UPS.reduce((a, u) => a + (s.aups[u.id] || 0), 0)}, essence levels ${ESS_UPS.reduce((a, u) => a + eLv(s, u.id), 0)}`);
