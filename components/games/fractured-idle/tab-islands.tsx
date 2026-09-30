import { Lock, Star } from "lucide-react";
import { MINIONS } from "@/lib/fractured-idle/data";
import { activeIsland, islandOpen, islandProgress, masteryInfo, tierMult, visitBonus } from "@/lib/fractured-idle/island-logic";
import { DIMENSIONS, ISLANDS, isSpecial, perkText } from "@/lib/fractured-idle/islands";
import { IslandScene } from "./island-art";
import { tint, type Ctx } from "./ui";

// The compact Islands tab: where you are, your bonuses, and a card per island.
// Tapping a card opens the full-screen travel map on that island.

const NAMES: Record<string, string> = Object.fromEntries(MINIONS.map((m) => [m.id, m.name.replace(" Minion", "")]));

export function IslandsTab({ s, d, F, openMenu }: Ctx & { openMenu: (id: string) => void }) {
    const here = activeIsland(s);
    const open = ISLANDS.filter((i) => islandOpen(s, i)).length;
    const mast = masteryInfo(s.isec[here.id] || 0);
    return (
        <>
            <button
                type="button"
                onClick={() => openMenu(here.id)}
                className="group relative block h-44 w-full overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-px"
                style={{ borderColor: tint(here.color, 55), boxShadow: `0 0 26px -10px ${here.color}` }}
            >
                <IslandScene island={here} variant="backdrop" className="absolute inset-0 size-full" />
                <span className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
                <span className="absolute inset-y-0 left-0 flex max-w-[70%] flex-col justify-center gap-1 p-4">
                    <span className="font-rubik text-[10px] uppercase tracking-widest text-white/70">You are on</span>
                    <span className="font-minecraft font-bold text-xl leading-tight" style={{ color: here.color, textShadow: `0 0 16px ${here.color}` }}>{here.name}</span>
                    <span className="font-rubik text-[11px] text-white/80">{here.blurb}</span>
                    <span className="mt-1 w-fit rounded-full border border-white/30 bg-black/40 px-3 py-1 font-minecraft font-bold text-[11px] text-white transition-colors group-hover:bg-white/20">Open travel map ▸ (I)</span>
                </span>
            </button>

            <div className="grid grid-cols-2 gap-2 font-rubik text-[11px] sm:grid-cols-4">
                {[
                    ["Tier bonus", `x${F(tierMult(s))}`, "best main-path island, always on"],
                    ["Explorer", `+${+(visitBonus(s) * 100).toFixed(1)}%`, `${s.visited.length} islands visited`],
                    ["Unlocked", `${open}/${ISLANDS.length}`, `${ISLANDS.filter(isSpecial).filter((i) => islandOpen(s, i)).length} special`],
                    ["Mastery here", `${mast.level}/10`, `perks x${mast.strength.toFixed(2)}`],
                ].map(([k, v, sub]) => (
                    <div key={k} className="rounded-xl border border-white/10 p-2">
                        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{k}</div>
                        <div className="font-minecraft font-bold text-sm" style={{ color: "var(--mc-gold)" }}>{v}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{sub}</div>
                    </div>
                ))}
            </div>

            {DIMENSIONS.map((dim) => (
                <div key={dim.id}>
                    <div className="mb-1.5 mt-2 flex items-center gap-2 font-minecraft font-bold text-[11px] uppercase tracking-widest" style={{ color: dim.color }}>
                        {dim.name}
                        <span className="h-px flex-1" style={{ backgroundColor: tint(dim.color, 30) }} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ISLANDS.filter((i) => i.dim === dim.id).map((i) => {
                            const ok = islandOpen(s, i);
                            const on = i.id === here.id;
                            return (
                                <button
                                    key={i.id}
                                    type="button"
                                    onClick={() => openMenu(i.id)}
                                    title={ok ? i.perks.filter((p) => p.k !== "affinity").map((p) => perkText(p, 1, NAMES)).join("\n") : (i.need?.label ?? `Reach ${F(i.at)} lifetime shards`)}
                                    className="fi-still relative block h-[5.6rem] overflow-hidden rounded-xl border-2 text-left transition-transform hover:-translate-y-px"
                                    style={{ borderColor: on ? i.color : "rgba(255,255,255,.12)", boxShadow: on ? `0 0 18px -4px ${i.color}` : undefined }}
                                >
                                    <IslandScene island={i} variant="thumb" locked={!ok} className="absolute inset-0 size-full" />
                                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1.5 pt-5">
                                        <span className="block truncate font-minecraft font-bold text-[11px] text-white">{i.name}</span>
                                        {!ok && (
                                            <span className="mt-0.5 block h-[3px] overflow-hidden rounded-full bg-white/15">
                                                <span className="block h-full rounded-full" style={{ width: `${islandProgress(s, i) * 100}%`, backgroundColor: "var(--mc-yellow)" }} />
                                            </span>
                                        )}
                                    </span>
                                    {!ok && <Lock className="absolute right-1.5 top-1.5 size-3.5 text-white/80" />}
                                    {isSpecial(i) && <Star className="absolute left-1.5 top-1.5 size-3" style={{ color: "var(--mc-yellow)", fill: "var(--mc-yellow)" }} />}
                                    {on && <span className="absolute right-1.5 top-1.5 rounded-full bg-white px-1.5 font-rubik text-[8px] font-bold text-black">HERE</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            <p className="pt-1 font-rubik text-[10px] text-muted-foreground">Main-path islands unlock from lifetime shards. Starred islands are special: each asks for something specific and pays bigger, narrower perks.</p>
        </>
    );
}
