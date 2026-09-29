// Builds lib/data/daily-schedule.json: the fixed order of daily countries.
//
// The list is COMMITTED, so the daily answer for any date never changes,
// whatever gets added to the outline data later (unlike shuffling the live
// data, where adding one country would reshuffle every future day). Day 0 is
// DAILY_EPOCH in lib/outline-game.ts. Difficulty tiers are interleaved
// proportionally so the daily mixes easy, medium, hard and expert days.
//
// Run:  node scripts/build-daily-schedule.mjs [seed] [outFile]
//   outline daily (default): seed 20260928 -> lib/data/daily-schedule.json
//   flag daily: node scripts/build-daily-schedule.mjs 20260929 lib/data/daily-flag-schedule.json
// Regenerating changes every future daily answer, so normally never.

import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("lib/data/outlines.json", "utf8"));

function mulberry32(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const seed = Number(process.argv[2] ?? 20260928);
const outFile = process.argv[3] ?? "lib/data/daily-schedule.json";
const rand = mulberry32(seed);
const shuffle = (a) => {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
};

const pools = [0, 1, 2, 3].map((t) =>
    shuffle(data.filter((c) => c.t === t).map((c) => c.c))
);
const total = data.length;
const order = [];
for (let i = 0; i < total; i++) {
    const remaining = pools.reduce((n, p) => n + p.length, 0);
    let tier;
    if (i === 0) tier = 0; // the very first daily is an easy one
    else {
        let best = -Infinity;
        pools.forEach((p, t) => {
            if (!p.length) return;
            const score = p.length / remaining + (rand() - 0.5) * 0.3;
            if (score > best) {
                best = score;
                tier = t;
            }
        });
    }
    order.push(pools[tier].pop());
}

fs.writeFileSync(outFile, JSON.stringify(order));
console.log(order.length, "days;", "first 12:", order.slice(0, 12).join(" "));
