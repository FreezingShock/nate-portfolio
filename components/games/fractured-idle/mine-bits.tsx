import type { State } from "@/lib/fractured-idle/data";
import { have, isOre, oreIcon, resInfo, type Cost, type ResId } from "@/lib/fractured-idle/mine";
import { iconOf, type Need } from "./skill-kit";

/** One cost line as an icon tile with what you have and what it needs. */
export const mineNeed = (s: State, id: string, n: number): Need => ({
    id,
    name: resInfo(id as ResId).name,
    color: resInfo(id as ResId).color,
    icon: isOre(id) ? (oreIcon[id] ?? "gem") : iconOf(id, "triangle"),
    have: have(s, id as ResId),
    need: n,
});
export const mineNeeds = (s: State, cost: Cost): Need[] => (Object.entries(cost) as [string, number][]).map(([id, n]) => mineNeed(s, id, n));
