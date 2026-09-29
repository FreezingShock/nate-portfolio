"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import { UPGRADES, type UpgradeDef } from "@/lib/fractured-idle/data";
import { buyUpgrade, upgradeInfo, upCost } from "@/lib/fractured-idle/engine";
import { ActionBtn, SectionTitle, tint, type Ctx } from "./ui";

// A dense grid of symbol tiles. Hovering (or focusing, or tapping once on
// touch) opens a Minecraft-style tooltip that follows the cursor.

const GROUPS: { title: string; color: string; kinds: UpgradeDef["kind"][] }[] = [
    { title: "Training", color: "var(--mc-red)", kinds: ["auto", "critChance", "critDmg", "synergy"] },
    { title: "Pickaxes", color: "var(--mc-gold)", kinds: ["click"] },
    { title: "Minion fuel", color: "var(--mc-blue)", kinds: ["minion"] },
    { title: "Talismans", color: "var(--mc-green)", kinds: ["all"] },
];

export function UpgradesTab({ s, act, render, tip }: Ctx) {
    const [picked, setPicked] = useState<string | null>(null);
    const pointer = useRef("mouse");
    const costOf = (u: UpgradeDef) => upCost(u.id, s.ups[u.id] || 0);

    // The tooltip belongs to the game root, so close it if this tab goes away.
    useEffect(() => () => tip.hide(), [tip]);

    // Touch: tapping anywhere but a tile dismisses the selection.
    useEffect(() => {
        if (!picked) return;
        const off = (e: PointerEvent) => {
            if (!(e.target as HTMLElement).closest("[data-fi-tile]")) {
                setPicked(null);
                tip.hide();
            }
        };
        document.addEventListener("pointerdown", off);
        return () => document.removeEventListener("pointerdown", off);
    }, [picked, tip]);

    const buyAll = () => {
        let bought = 0;
        const order = [...UPGRADES].sort((a, b) => costOf(a) - costOf(b));
        for (let guard = 0; guard < 300; guard++) {
            const next = order.find((u) => (s.ups[u.id] || 0) < u.max && s.shards >= costOf(u));
            if (!next || !buyUpgrade(s, next.id)) break;
            bought++;
        }
        if (bought) render();
    };

    return (
        <>
            <div className="flex items-center justify-between gap-2">
                <p className="font-rubik text-[11px] text-muted-foreground">Hover an upgrade for details. Glowing tiles are affordable.</p>
                <ActionBtn icon={<ShoppingCart className="size-3.5" />} onClick={buyAll}>Buy all affordable</ActionBtn>
            </div>

            {GROUPS.map((g) => {
                const list = UPGRADES.filter((u) => g.kinds.includes(u.kind)).sort((a, b) => a.cost - b.cost);
                return (
                    <div key={g.title}>
                        <SectionTitle color={g.color}>{g.title}</SectionTitle>
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
                            {list.map((u) => {
                                const lvl = s.ups[u.id] || 0;
                                const maxed = lvl >= u.max;
                                const can = !maxed && s.shards >= costOf(u);
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        data-fi-tile
                                        aria-label={u.name}
                                        onPointerDown={(e) => { pointer.current = e.pointerType; }}
                                        onPointerEnter={(e) => e.pointerType === "mouse" && tip.show(u.id, e)}
                                        onPointerMove={(e) => e.pointerType === "mouse" && tip.move(e)}
                                        onPointerLeave={(e) => e.pointerType === "mouse" && tip.hide()}
                                        onFocus={(e) => e.currentTarget.matches(":focus-visible") && tip.show(u.id, e.currentTarget)}
                                        onBlur={() => tip.hide()}
                                        onClick={(e) => {
                                            if (pointer.current === "touch" && picked !== u.id) {
                                                setPicked(u.id);
                                                return tip.show(u.id, e.currentTarget);
                                            }
                                            act(() => buyUpgrade(s, u.id));
                                        }}
                                        style={{
                                            ["--c" as string]: u.color,
                                            color: u.color,
                                            borderColor: maxed ? tint("var(--mc-yellow)", 55) : can ? u.color : "rgba(255,255,255,0.1)",
                                            backgroundColor: can ? tint(u.color, 16) : tint(u.color, 5),
                                            opacity: can || maxed ? 1 : 0.5,
                                        }}
                                        className={`relative grid aspect-square place-items-center rounded-xl border text-2xl transition-transform hover:-translate-y-0.5 ${can ? "fi-afford" : ""} ${picked === u.id ? "ring-2 ring-white/40" : ""}`}
                                    >
                                        <McSymbol name={u.symbol} />
                                        {u.max > 1 && (
                                            <span className="absolute bottom-0.5 right-1 font-minecraft text-[9px] leading-none text-white">{lvl}</span>
                                        )}
                                        {maxed && (
                                            <span className="absolute right-1 top-0.5 font-minecraft text-[10px] leading-none" style={{ color: "var(--mc-yellow)" }}>
                                                <McSymbol name="check" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </>
    );
}

const GRAY = "#aaaaaa";
const DARK = "#777777";

function TL({ c = GRAY, children }: { c?: string; children?: React.ReactNode }) {
    return <div className="tl" style={{ color: c, minHeight: children ? undefined : "0.7em" }}>{children}</div>;
}

/** Minecraft-style tooltip body for one upgrade (rendered by the game root). */
export function UpgradeTip({ id, s, d, F }: { id: string } & Pick<Ctx, "s" | "d" | "F">) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return null;
    const lvl = s.ups[u.id] || 0;
    const maxed = lvl >= u.max;
    const cost = u.cost * Math.pow(u.growth, lvl);
    const can = s.shards >= cost;
    const info = upgradeInfo(d, u, s.sci);
    return (
        <>
            <TL c={u.color}>
                <McSymbol name={u.symbol} /> {u.name}
                {u.max > 1 && <span style={{ color: DARK }}> Lv {lvl}/{u.max}</span>}
            </TL>
            <TL />
            <TL>{u.desc}</TL>
            <TL />
            <TL>
                {info.label}: <span style={{ color: "#ffffff" }}>{info.cur}</span>
                {!maxed && (
                    <>
                        <span style={{ color: DARK }}> <McSymbol name="arrow" /> </span>
                        <span style={{ color: "#55ff55" }}>{info.next}</span>
                    </>
                )}
            </TL>
            <TL />
            {maxed ? (
                <TL c="#55ff55"><McSymbol name="check" /> Maxed out</TL>
            ) : (
                <>
                    <TL c="#ffaa00">Cost: <span style={{ color: can ? "#55ff55" : "#ff5555" }}>{F(cost)}</span> shards</TL>
                    {can ? <TL c="#ffff55">Click to purchase!</TL> : <TL c="#ff5555">Need {F(cost - s.shards)} more</TL>}
                </>
            )}
        </>
    );
}
