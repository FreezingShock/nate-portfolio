// Run: npx tsx scripts/check-fxp-steps.ts
// Proves the chapter steps add up to exactly what every Fracture EXP source pays, and prints what each chapter holds.
import "../lib/fractured-idle/enchant";
import { fxpSources, FXP_CATS } from "../lib/fractured-idle/fxp";
import { fxpSteps } from "../lib/fractured-idle/fxp-steps";
import { CHAPTER_INFO, chapterPlan, focusOf } from "../lib/fractured-idle/chapters";
import { newState } from "../lib/fractured-idle/engine";

const s = newState();
const steps = fxpSteps();
const bySrc = new Map<string, number>();
for (const st of steps) bySrc.set(st.src, (bySrc.get(st.src) ?? 0) + st.xp);

let bad = 0;
for (const src of fxpSources(s)) {
    const got = bySrc.get(src.id) ?? 0;
    if (src.max === 0) continue; // ascensions pay forever and are not part of any chapter
    if (Math.abs(got - src.max) > 0.5) {
        bad++;
        console.log(`MISMATCH ${src.id}: steps ${got}, source max ${src.max}`);
    }
}
const ids = new Set(steps.map((x) => x.id));
console.log(`steps ${steps.length}, unique ids ${ids.size}, mismatches ${bad}`);

for (const c of chapterPlan()) {
    const info = CHAPTER_INFO[c.n - 1];
    const cats = new Map<string, number>();
    for (const r of c.rows) cats.set(r.cat, (cats.get(r.cat) ?? 0) + r.xp);
    const mix = [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${FXP_CATS.find((x) => x.id === k)?.name} ${v}`).join(", ");
    console.log(`\nCh ${c.n} ${info.name} (levels ${info.from}-${info.to}): ${c.xp} xp, ${c.rows.length} rows, ${c.steps} steps; focus ${focusOf(c.n).map((f) => f.name).join("/")}`);
    console.log("  " + mix);
}
