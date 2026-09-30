"use client";

import { McSymbol } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import { ENCH_BY_ID, RARITIES, SLOTS, canRoll, rarityColor, slotOpen } from "@/lib/fractured-idle/enchant";
import { fmt } from "@/lib/fractured-idle/engine";
import { tint } from "./ui";

// A small chip under the button: your Arcane Dust and one gem per enchant slot
// (colored by the rarity you wear). It glows when a roll is affordable and
// opens the Enchant tab.

export function EnchantGems({ s, onOpen }: { s: State; onOpen: () => void }) {
    const ready = SLOTS.some((sl) => slotOpen(s, sl.id) && canRoll(s, sl.id).ok);
    const pending = SLOTS.some((sl) => s.enc.pend[sl.id]);
    return (
        <button
            type="button"
            onClick={onOpen}
            title={ready ? "You can roll an enchant: open the Enchant table" : "Open the Enchant table"}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-rubik text-[10px] transition-colors hover:bg-white/10 ${ready || pending ? "fi-afford" : ""}`}
            style={{ borderColor: tint("var(--mc-light-purple)", 55), color: "#e2b8ff", ["--c" as string]: "var(--mc-light-purple)" }}
        >
            <span className="font-minecraft text-[11px]">✧ {fmt(s.enc.dust, s.sci)}</span>
            <span className="flex gap-1">
                {SLOTS.map((sl) => {
                    const e = s.enc.eq[sl.id];
                    const open = slotOpen(s, sl.id);
                    const col = e ? rarityColor(e.r) : "rgba(255,255,255,0.3)";
                    return (
                        <span
                            key={sl.id}
                            title={open ? `${sl.name}: ${e ? `${RARITIES[e.r].name} ${ENCH_BY_ID[e.id].name}` : "empty"}` : `${sl.name}: locked`}
                            className="grid size-4 place-items-center rounded-[5px] text-[10px]"
                            style={{ color: col, border: `1px solid ${col}`, opacity: open ? 1 : 0.35, boxShadow: e && e.r >= 3 ? `0 0 8px ${col}` : undefined }}
                        >
                            <McSymbol name={e ? ENCH_BY_ID[e.id].symbol : sl.symbol} />
                        </span>
                    );
                })}
            </span>
            <span className="text-muted-foreground">{pending ? "candidate!" : ready ? "roll ready" : "Enchant"}</span>
        </button>
    );
}
