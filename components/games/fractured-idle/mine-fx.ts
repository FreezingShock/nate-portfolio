import { ORE_BY_ID, type OreId, type SwingOut } from "@/lib/fractured-idle/mine";
import { spawnNumber } from "./button-fx";

// What a swing looks like on the big button: the ore it found, batched so a fast
// hold does not bury the button in numbers, plus a pop for the special moments
// (an Ore Rush starting, a triple haul, a geode dropping).

const BATCH_MS = 700;
let batch: Partial<Record<OreId, number>> = {};
let started = 0;

export function oreNote(host: HTMLElement, x: number, y: number, out: SwingOut, style: string) {
    const now = performance.now();
    if (out.whole > 0) {
        if (!started) started = now;
        batch[out.ore] = (batch[out.ore] ?? 0) + out.whole;
    }
    const pop = (text: string, color: string, dy: number, crit = true) => spawnNumber(host, x, y - dy, text, { crit, color, accent: color, style });
    if (out.rushStart) pop("ORE RUSH!", "#ffd23a", 90);
    else if (out.lucky) pop("TRIPLE HAUL!", "#ffe29a", 72);
    if (out.geode) pop("GEODE!", "#c58bff", 108);
    if (started && now - started >= BATCH_MS) {
        const top = (Object.entries(batch) as [OreId, number][]).sort((a, b) => b[1] - a[1]).slice(0, 2);
        batch = {};
        started = 0;
        top.forEach(([id, n], i) => pop(`+${n} ${ORE_BY_ID[id].name}`, ORE_BY_ID[id].color, 58 + i * 20, false));
    }
}
