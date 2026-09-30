"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import {
    ANIMS,
    CODEX_ALL,
    CODEX_MILES,
    CODEX_TOTAL,
    DUST_BASE,
    ENCH_BY_ID,
    FOCUS_CHANCE,
    FOCUS_COST,
    GCOLORS,
    GLINTS,
    NEED,
    PITY_EPIC,
    PITY_LEGEND,
    RARITIES,
    RARITY_N,
    SLOTS,
    SLOT_BY_ID,
    TABLES,
    canPolish,
    canReforge,
    canRoll,
    codexCount,
    cosOpen,
    discardCand,
    enchLevel,
    enchLines,
    enchOf,
    enchScore,
    equipCand,
    fmtStat,
    glintColor,
    luckOf,
    mustDecide,
    oddsOf,
    polishCost,
    polishSlot,
    reforgeCost,
    reforgeSlot,
    rollCost,
    rollSlot,
    setFocus,
    slotOpen,
    topWorn,
    type CosDef,
    type Ench,
    type EStat,
    type RollOut,
    type SlotId,
} from "@/lib/fractured-idle/enchant";
import { fmtEta, skillXpFor } from "@/lib/fractured-idle/engine";
import { ButtonFace } from "./button-face";
import { shake } from "./button-fx";
import { chargeFx, flashScreen, revealFx } from "./enchant-fx";
import { Glint } from "./enchant-glint";
import { Progress, SectionTitle, tint, type Ctx } from "./ui";

// The Enchant table. Pick a slot, press Roll and watch the ritual: the runes
// spin up, the rarity colors flicker and slow, then the pull lands with
// effects that scale with its rarity (Legendary and up take over the screen).
// The result is a candidate to compare with what you wear. See enchant.ts for
// the rules; everything here is presentation.

const C = "var(--mc-light-purple)";
const RUNES = "ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ";
/** Charge time (ms) by rarity for each animation level. */
const DUR = { full: [520, 650, 900, 1250, 1800, 2400, 3100, 3900], quick: [240, 280, 360, 480, 650, 850, 1100, 1400], off: [0, 0, 0, 0, 0, 0, 0, 0] };

const rar = (r: number) => RARITIES[Math.max(0, Math.min(RARITY_N - 1, r))];
const isCosmic = (r: number) => r >= RARITY_N - 1;
const rcolor = (r: number) => (isCosmic(r) ? "#ffb3f2" : rar(r).color);
const fmtOdds = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(n < 10 ? 1 : 0));

interface Shown {
    out: RollOut;
    phase: "charge" | "reveal";
}
interface Cut {
    r: number;
    id: string;
    odds: number;
    key: number;
}

export function EnchantTab({ s, d, F, render, say }: Ctx) {
    const o = s.enc.opts;
    const [view, setView] = useState<"table" | "codex" | "style">("table");
    const [slot, setSlot] = useState<SlotId>("button");
    const [shown, setShown] = useState<Shown | null>(null);
    const [busy, setBusy] = useState(false);
    const [auto, setAuto] = useState(false);
    const [cut, setCut] = useState<Cut | null>(null);
    const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
    const stage = useRef<HTMLDivElement>(null);
    const reel = useRef<HTMLDivElement>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const live = useRef({ s, d, slot, auto, say, render });
    useEffect(() => {
        live.current = { s, d, slot, auto, say, render };
    });

    useLayoutEffect(() => {
        setRootEl((stage.current?.closest("[data-fi-root]") as HTMLElement | null) ?? null);
    }, [view]);
    useEffect(() => {
        const t = timers.current;
        return () => {
            t.forEach(clearTimeout);
            t.length = 0;
        };
    }, []);

    const later = (ms: number, fn: () => void) => {
        const t = setTimeout(fn, ms);
        timers.current.push(t);
    };

    // ---- The ritual ----
    const play = useCallback((out: RollOut, fast: boolean, done?: () => void) => {
        const { s: st } = live.current;
        const r = out.cand.r;
        const level = st.enc.opts.anim;
        const eff = level === "off" ? "off" : fast && r < st.enc.opts.stop ? "quick" : level;
        const charge = DUR[eff][r];
        const host = stage.current;
        setBusy(true);
        setCut(null);
        setShown({ out, phase: "charge" });
        const w = host?.clientWidth ?? 300;
        const h = host?.clientHeight ?? 240;
        if (host && charge > 0) {
            chargeFx(host, w / 2, h / 2, r, charge);
            // Sol's-RNG style flicker: the rarity colors cycle, slowing down until they land.
            const def = enchOf(out.slot);
            let t = 0;
            let gap = 50;
            let i = 0;
            while (t < charge * 0.88) {
                const rr = Math.min(RARITY_N - 1, (i * 3 + (i >> 1)) % (r + 2));
                const pick = def[(i * 7 + 3) % def.length];
                later(t, () => {
                    host.style.setProperty("--rc", rcolor(rr));
                    if (reel.current) {
                        reel.current.textContent = pick.name;
                        reel.current.style.color = rcolor(rr);
                    }
                });
                t += gap;
                gap *= 1.17;
                i++;
            }
        }
        later(charge, () => {
            if (host) {
                host.style.setProperty("--rc", rcolor(r));
                if (reel.current) reel.current.textContent = "";
                if (eff !== "off") revealFx(host, w / 2, h / 2, r);
                if (eff !== "off" && r >= 4) shake(host, r >= 6 ? 2 : 1);
            }
            setShown({ out, phase: "reveal" });
            setBusy(false);
            if (eff === "full" || (eff === "quick" && r >= 5)) {
                const root = host?.closest("[data-fi-root]") as HTMLElement | null;
                flashScreen(root, r);
                if (r >= 4) setCut({ r, id: out.cand.id, odds: out.odds, key: Date.now() });
            }
            if (out.firstRarity && r >= 2) live.current.say(`First ${rar(r).name} enchant discovered: ${ENCH_BY_ID[out.cand.id].name}!`);
            live.current.render();
            done?.();
        });
    }, []);

    const start = (kind: "roll" | "polish" | "reforge", fast = false, done?: () => void) => {
        if (busy) return false;
        const st = live.current.s;
        const sl = live.current.slot;
        const out = kind === "roll" ? rollSlot(st, sl, live.current.d.xpMult) : kind === "polish" ? polishSlot(st, sl, live.current.d.xpMult) : reforgeSlot(st, sl, live.current.d.xpMult);
        if (!out) return false;
        render();
        play(out, fast, done);
        return true;
    };

    // ---- Auto-roll ----
    const stopAuto = (why?: string) => {
        setAuto(false);
        live.current.auto = false;
        if (why) live.current.say(why);
    };
    const step = useCallback(() => {
        const L = live.current;
        if (!L.auto) return;
        const st = L.s;
        const sl = L.slot;
        const cand0 = st.enc.pend[sl];
        if (cand0) {
            if (mustDecide(st, sl)) return stopAuto("Auto-roll paused: decide on your candidate.");
            discardCand(st, sl);
        }
        const why = canRoll(st, sl);
        if (!why.ok) return stopAuto(`Auto-roll stopped: ${why.why?.toLowerCase()}.`);
        const out = rollSlot(st, sl, L.d.xpMult);
        if (!out) return stopAuto();
        L.render();
        play(out, true, () => {
            const c = st.enc.pend[sl];
            if (!c) return;
            const cur = st.enc.eq[sl];
            if (c.r >= st.enc.opts.stop) {
                stopAuto(`Auto-roll stopped on a ${rar(c.r).name} ${ENCH_BY_ID[c.id].name}!`);
                return;
            }
            if (!cur || (st.enc.opts.better && enchScore(c) > enchScore(cur))) equipCand(st, sl);
            else discardCand(st, sl);
            L.render();
            later(st.enc.opts.anim === "off" ? 60 : 140, step);
        });
    }, [play]);

    const toggleAuto = () => {
        if (auto) return stopAuto();
        if (enchLevel(s) < NEED.auto) return;
        setAuto(true);
        live.current.auto = true;
        if (!busy) later(0, step);
    };

    // Dev only: window.__fiPreview(rarityIndex) plays the ritual for a rarity without touching your save.
    useEffect(() => {
        if (process.env.NODE_ENV === "production") return;
        const w = window as unknown as { __fiPreview?: (r: number) => void };
        w.__fiPreview = (r) => {
            const sl = live.current.slot;
            const def = enchOf(sl)[0];
            play({ slot: sl, cand: { id: def.id, r, q: 0.97, x: [], kind: "roll" }, fresh: true, firstRarity: false, odds: oddsOf(r, 1), pity: false, xp: 0 }, false);
        };
        return () => {
            delete w.__fiPreview;
        };
    }, [play]);

    // R rolls the selected slot while the table is open.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if ((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !e.altKey && !(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"))) {
                if (view === "table" && !e.repeat && canRoll(live.current.s, live.current.slot).ok) start("roll");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    // ---- Derived for this render ----
    const sd = SLOT_BY_ID[slot];
    const open = slotOpen(s, slot);
    const worn = s.enc.eq[slot];
    const cand = s.enc.pend[slot];
    const lvl = enchLevel(s);
    const luck = luckOf(s);
    const cost = rollCost(s, slot);
    const roll = canRoll(s, slot);
    const pol = canPolish(s, slot);
    const ref = canReforge(s, slot);
    const showColor = shown ? rcolor(shown.out.cand.r) : worn ? rcolor(worn.r) : "#b98cff";
    const phase = busy ? "charge" : shown ? "reveal" : "idle";
    const glyphName = shown?.phase === "reveal" ? ENCH_BY_ID[shown.out.cand.id].symbol : worn ? ENCH_BY_ID[worn.id].symbol : sd.symbol;
    const dustRate = DUST_BASE * d.dustMult;
    const lo = skillXpFor(lvl, "enchanting");
    const hi = skillXpFor(lvl + 1, "enchanting");
    const reveal = shown?.phase === "reveal" && shown.out.slot === slot ? shown.out : null;
    const showCompare = !!cand && !busy;

    const resolve = (keep: boolean) => {
        const back = keep ? equipCand(s, slot) : discardCand(s, slot);
        if (back > 0) say(`Salvaged for ${back} Arcane Dust`);
        setShown(null);
        render();
    };

    return (
        <div className="fi-en" data-table={o.table}>
            {/* Top strip */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="fi-en-stat" style={{ ["--c" as string]: "#d9a8ff" } as CSSProperties}>
                    <span>Arcane Dust</span>
                    <b>✧ {F(s.enc.dust)}</b>
                    <small>+{dustRate.toFixed(2)}/s</small>
                </div>
                <div className="fi-en-stat" style={{ ["--c" as string]: "var(--mc-green)" } as CSSProperties}>
                    <span>Luck</span>
                    <b>x{luck.toFixed(2)}</b>
                    <small>better odds for rare pulls</small>
                </div>
                <div className="fi-en-stat" style={{ ["--c" as string]: "var(--mc-yellow)" } as CSSProperties}>
                    <span>Rolls</span>
                    <b>{s.enc.rolls.toLocaleString()}</b>
                    <small>{s.enc.polishes} polishes</small>
                </div>
                <div className="fi-en-stat" style={{ ["--c" as string]: "var(--mc-light-purple)" } as CSSProperties}>
                    <span>Codex</span>
                    <b>{codexCount(s)}/{CODEX_TOTAL}</b>
                    <small>+{(CODEX_ALL * codexCount(s) * 100).toFixed(1)}% all shards</small>
                </div>
            </div>
            <Progress label={`Enchanting ${lvl}`} color="var(--mc-light-purple)" pct={lvl >= 60 ? 1 : (s.enchanting - lo) / (hi - lo)} right={lvl >= 60 ? "MAX" : `${F(s.enchanting - lo)} / ${F(hi - lo)} xp`} />

            <div className="fi-en-seg" role="tablist">
                {(["table", "codex", "style"] as const).map((v) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} data-on={view === v}>
                        {v === "table" ? "Table" : v === "codex" ? "Codex" : "Style"}
                    </button>
                ))}
            </div>

            {view === "table" && (
                <>
                    {/* Slots */}
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                        {SLOTS.map((sl) => {
                            const e = s.enc.eq[sl.id];
                            const isOpen = slotOpen(s, sl.id);
                            const on = slot === sl.id;
                            const col = e ? rcolor(e.r) : sl.color;
                            return (
                                <button
                                    key={sl.id}
                                    type="button"
                                    onClick={() => {
                                        if (!busy) setSlot(sl.id);
                                    }}
                                    aria-pressed={on}
                                    className="fi-en-slot"
                                    data-on={on}
                                    data-locked={!isOpen}
                                    data-r={e?.r ?? -1}
                                    style={{ ["--sc" as string]: col } as CSSProperties}
                                >
                                    <span className="fi-en-slot-ic">{isOpen ? <McSymbol name={e ? ENCH_BY_ID[e.id].symbol : sl.symbol} /> : <Lock className="size-4" />}</span>
                                    <span className="min-w-0 flex-1 text-left">
                                        <span className="block truncate font-minecraft text-[12px]" style={{ color: isOpen ? sl.color : undefined }}>{sl.name}</span>
                                        <span className={`block truncate font-rubik text-[10px] ${e && isCosmic(e.r) ? "fi-rainbow" : ""}`} style={{ color: e ? col : "var(--muted-foreground)" }}>
                                            {!isOpen ? `Enchanting ${sl.need}` : e ? `${rar(e.r).name} ${ENCH_BY_ID[e.id].name}` : "Empty"}
                                        </span>
                                    </span>
                                    {s.enc.pend[sl.id] && <i className="fi-en-dot" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Stage */}
                    <div ref={stage} className="fi-en-stage" data-phase={phase} data-r={shown?.out.cand.r ?? worn?.r ?? -1} data-table={o.table} style={{ ["--rc" as string]: showColor } as CSSProperties}>
                        <div className="fi-en-bg" />
                        <svg className="fi-en-rune" viewBox="0 0 200 200" aria-hidden="true">
                            <defs>
                                <path id="fi-en-path" d="M100,100 m-86,0 a86,86 0 1,1 172,0 a86,86 0 1,1 -172,0" />
                            </defs>
                            <g className="fi-en-r1">
                                <circle cx="100" cy="100" r="95" />
                                <circle cx="100" cy="100" r="77" />
                                <text>
                                    <textPath href="#fi-en-path" startOffset="0">{RUNES}</textPath>
                                </text>
                            </g>
                            <g className="fi-en-r2">
                                <polygon points="100,38 153.6,69 153.6,131 100,162 46.4,131 46.4,69" />
                                <polygon points="100,162 46.4,131 46.4,69 100,38 153.6,69 153.6,131" transform="rotate(30 100 100)" />
                            </g>
                            <g className="fi-en-r3">
                                <circle cx="100" cy="100" r="42" />
                                {Array.from({ length: 12 }, (_, i) => (
                                    <line key={i} x1="100" y1="54" x2="100" y2="62" transform={`rotate(${i * 30} 100 100)`} />
                                ))}
                            </g>
                        </svg>
                        <div className="fi-en-glyph" key={`${glyphName}${phase === "reveal" ? shown?.out.cand.r : ""}`}>
                            {open ? <McSymbol name={glyphName} /> : <Lock className="size-10" />}
                        </div>
                        <div ref={reel} className="fi-en-reel" aria-hidden="true" />
                        {!open && (
                            <div className="fi-en-lock">
                                <Lock className="size-4" /> {sd.name} opens at Enchanting {sd.need}
                            </div>
                        )}
                        {reveal && (
                            <div className="fi-en-banner" key={shown?.out.cand.id + String(shown?.out.cand.q) + (shown?.out.cand.kind ?? "")} data-r={reveal.cand.r}>
                                <div className="fi-en-rarity">{rar(reveal.cand.r).name}{reveal.cand.kind !== "roll" ? ` · ${reveal.cand.kind}` : ""}</div>
                                <div className="fi-en-name">{ENCH_BY_ID[reveal.cand.id].name}</div>
                                <div className="fi-en-badges">
                                    {reveal.cand.kind === "roll" && <span>1 in {fmtOdds(reveal.odds)}</span>}
                                    <span>{Math.round(reveal.cand.q * 100)}% quality{reveal.cand.q >= 0.97 ? " · Perfect" : ""}</span>
                                    {reveal.fresh && <span className="fi-en-new">NEW in Codex</span>}
                                    {reveal.pity && <span>Pity</span>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Compare */}
                    {showCompare && cand && (
                        <div className="fi-en-compare">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <EnchCard e={worn} tag="Worn" />
                                <EnchCard e={cand} tag={cand.kind === "roll" ? "New enchant" : cand.kind === "polish" ? "Polished" : "Reforged"} vs={worn} glow />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                <button type="button" className="fi-en-btn fi-en-go" onClick={() => resolve(true)}>
                                    Equip
                                </button>
                                <button type="button" className="fi-en-btn" onClick={() => resolve(false)}>
                                    Keep current
                                </button>
                                <span className="font-rubik text-[10px] text-muted-foreground">
                                    {worn && cand.kind === "roll" ? "The loser is salvaged for dust." : worn ? "Same enchant, new numbers." : "Nothing to lose."}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {open && (
                        <div className="fi-en-actions">
                            <button type="button" disabled={!roll.ok || busy} onClick={() => start("roll")} className="fi-en-roll" data-ready={roll.ok && !busy} data-busy={busy} title="Roll (R)">
                                <span className="fi-en-roll-t">{busy ? "Rolling..." : "Roll"}</span>
                                <span className="fi-en-roll-c">✧ {cost}</span>
                            </button>
                            <button type="button" disabled={!pol.ok || busy} onClick={() => start("polish")} className="fi-en-btn" title={pol.why ?? "Re-roll the quality of what you wear"}>
                                Polish <small>✧ {polishCost(s, slot)}</small>
                            </button>
                            <button type="button" disabled={!ref.ok || busy} onClick={() => start("reforge")} className="fi-en-btn" title={ref.why ?? "Re-roll the affixes of what you wear"}>
                                Reforge <small>✧ {reforgeCost(s, slot)}</small>
                            </button>
                            <button
                                type="button"
                                disabled={lvl < NEED.auto}
                                onClick={toggleAuto}
                                className="fi-en-btn"
                                data-on={auto}
                                title={lvl < NEED.auto ? `Auto-roll opens at Enchanting ${NEED.auto}` : `Rolls this slot until a ${rar(o.stop).name} or better (change in Style)`}
                            >
                                {lvl < NEED.auto ? <><Lock className="mr-1 inline size-3" />Auto</> : auto ? "Stop auto" : "Auto-roll"}
                            </button>
                        </div>
                    )}
                    {open && (
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-rubik text-[10px] text-muted-foreground">
                            <span>
                                {!roll.ok && roll.why ? <span style={{ color: "var(--mc-red)" }}>{roll.why}. </span> : null}
                                {roll.why === "Not enough dust" && dustRate > 0 && <>About {fmtEta((cost - s.enc.dust) / dustRate)} of passive dust. </>}
                                Dust also drops from clicks, popups and rebirths.
                            </span>
                            <span>
                                Epic+ guaranteed in {Math.max(1, PITY_EPIC - s.enc.pe)} · Legendary+ in {Math.max(1, PITY_LEGEND - s.enc.pl)}
                            </span>
                        </div>
                    )}
                    {open && lvl >= NEED.focus && (
                        <label className="flex flex-wrap items-center gap-2 font-rubik text-[11px] text-muted-foreground">
                            Attune:
                            <select
                                value={s.enc.focus[slot] ?? ""}
                                onChange={(e) => {
                                    setFocus(s, slot, e.target.value);
                                    render();
                                }}
                                className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-foreground"
                            >
                                <option value="">Anything</option>
                                {enchOf(slot).map((e) => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <span>{s.enc.focus[slot] ? `${Math.round(FOCUS_CHANCE * 100)}% of rolls land on it, rolls cost x${FOCUS_COST}` : "Choose an enchant to chase"}</span>
                        </label>
                    )}

                    {/* Worn */}
                    {worn && !showCompare && <EnchCard e={worn} tag={`Worn on ${sd.name}`} />}
                    {!worn && open && !showCompare && <div className="rounded-xl border border-dashed border-white/15 p-3 text-center font-rubik text-xs text-muted-foreground">Nothing worn on {sd.name.replace(/^The /, "the ")} yet ({sd.blurb.toLowerCase()}). Roll to find something.</div>}

                    <SectionTitle color={C}>Odds at x{luck.toFixed(2)} luck</SectionTitle>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                        {RARITIES.map((r, i) => (
                            <div key={r.id} className="rounded-lg border px-2 py-1" style={{ borderColor: tint(rcolor(i), 40) }}>
                                <div className={`font-minecraft text-[11px] ${isCosmic(i) ? "fi-rainbow" : ""}`} style={{ color: rcolor(i) }}>{r.name}</div>
                                <div className="font-rubik text-[10px] text-muted-foreground">
                                    1 in {fmtOdds(oddsOf(i, luck))} · x{r.m} · {s.enc.byR[i]} rolled
                                </div>
                            </div>
                        ))}
                    </div>
                    {s.enc.recent.length > 0 && (
                        <>
                            <SectionTitle color={C}>Recent pulls</SectionTitle>
                            <div className="flex flex-wrap gap-1">
                                {[...s.enc.recent].reverse().map((x, i) => (
                                    <span key={`${x.at}${i}`} className="rounded-full border px-2 py-0.5 font-rubik text-[10px]" style={{ borderColor: tint(rcolor(x.r), 55), color: rcolor(x.r) }}>
                                        {ENCH_BY_ID[x.id].name}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            {view === "codex" && <Codex s={s} />}
            {view === "style" && <Style s={s} render={render} />}

            {cut && rootEl && createPortal(<Cutscene key={cut.key} cut={cut} onDone={() => setCut(null)} />, rootEl)}
        </div>
    );
}

// ---- Item card ----

function EnchCard({ e, tag, vs, glow }: { e: Ench | undefined; tag: string; vs?: Ench; glow?: boolean }) {
    if (!e) {
        return (
            <div className="rounded-xl border border-dashed border-white/15 p-3">
                <div className="font-rubik text-[10px] uppercase tracking-widest text-muted-foreground">{tag}</div>
                <div className="py-4 text-center font-rubik text-xs text-muted-foreground">Nothing worn</div>
            </div>
        );
    }
    const def = ENCH_BY_ID[e.id];
    const col = rcolor(e.r);
    const lines = enchLines(e);
    const old: Partial<Record<EStat, number>> = {};
    if (vs) for (const l of enchLines(vs)) old[l.stat] = (old[l.stat] ?? 0) + l.value;
    const mine: Partial<Record<EStat, number>> = {};
    for (const l of lines) mine[l.stat] = (mine[l.stat] ?? 0) + l.value;
    const diffs = vs ? (Object.keys({ ...old, ...mine }) as EStat[]).map((k) => [k, (mine[k] ?? 0) - (old[k] ?? 0)] as const).filter(([, v]) => Math.abs(v) > 1e-9) : [];
    return (
        <div className="fi-en-card" data-glow={!!glow} data-r={e.r} style={{ ["--ec" as string]: col } as CSSProperties}>
            <div className="flex items-center gap-2">
                <span className="fi-en-card-ic" style={{ color: def.color }}><McSymbol name={def.symbol} /></span>
                <div className="min-w-0 flex-1">
                    <div className="font-rubik text-[9px] uppercase tracking-widest text-muted-foreground">{tag}</div>
                    <div className="truncate font-minecraft text-[13px]" style={{ color: def.color }}>{def.name}</div>
                </div>
                <div className="text-right">
                    <div className={`font-minecraft text-[11px] ${isCosmic(e.r) ? "fi-rainbow" : ""}`} style={{ color: col }}>{rar(e.r).name}</div>
                    <div className="font-rubik text-[9px] text-muted-foreground">x{rar(e.r).m}</div>
                </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2 font-rubik text-[10px] text-muted-foreground">
                <span>Quality</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <i className="block h-full rounded-full" style={{ width: `${e.q * 100}%`, backgroundColor: col, boxShadow: `0 0 8px ${col}` }} />
                </span>
                <span style={{ color: e.q >= 0.97 ? "var(--mc-yellow)" : undefined }}>{Math.round(e.q * 100)}%{e.q >= 0.97 ? " ✦" : ""}</span>
            </div>
            <ul className="mt-1.5 space-y-0.5 font-rubik text-[11px]">
                {lines.map((l, i) => (
                    <li key={i} className="flex items-baseline gap-1.5">
                        <span style={{ color: l.affix ? "var(--mc-aqua)" : "var(--mc-green)" }}>{fmtStat(l.stat, l.value)}</span>
                        {l.affix && <em className="text-[9px] not-italic text-muted-foreground">{l.affix}</em>}
                    </li>
                ))}
            </ul>
            {vs !== undefined && diffs.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1 border-t border-white/10 pt-1.5">
                    {diffs.map(([k, v]) => (
                        <span key={k} className="rounded-full px-1.5 py-0.5 font-rubik text-[9px]" style={{ color: v > 0 ? "var(--mc-green)" : "var(--mc-red)", backgroundColor: tint(v > 0 ? "var(--mc-green)" : "var(--mc-red)", 14) }}>
                            {v > 0 ? "▲" : "▼"} {fmtStat(k, Math.abs(v)).replace(/^[+-]/, "")}
                        </span>
                    ))}
                </div>
            )}
            {vs === undefined && glow && null}
            {vs && <div className="mt-1 font-rubik text-[9px] text-muted-foreground">Power {Math.round(enchScore(e) * 100)} vs {Math.round(enchScore(vs) * 100)} worn</div>}
        </div>
    );
}

// ---- Cutscene (Legendary and up) ----

function Cutscene({ cut, onDone }: { cut: Cut; onDone: () => void }) {
    const host = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = host.current;
        if (h) revealFx(h, h.clientWidth / 2, h.clientHeight * 0.42, cut.r);
        const t = setTimeout(onDone, 2300 + cut.r * 200);
        return () => clearTimeout(t);
    }, [cut.r, onDone]);
    return (
        <div ref={host} className="fi-en-cut" data-r={cut.r} onClick={onDone} role="presentation">
            <div className="fi-en-cut-veil" />
            <div className="fi-en-cut-body">
                <div className="fi-en-cut-title">{rar(cut.r).name}</div>
                <div className="fi-en-cut-sub">{ENCH_BY_ID[cut.id].name}</div>
                <div className="fi-en-cut-odds">1 in {fmtOdds(cut.odds)}</div>
            </div>
        </div>
    );
}

// ---- Codex ----

function Codex({ s }: { s: Ctx["s"] }) {
    const n = codexCount(s);
    return (
        <>
            <div className="rounded-xl border p-3" style={{ borderColor: tint(C, 45) }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-minecraft text-sm" style={{ color: C }}>Enchant Codex</span>
                    <span className="font-rubik text-[11px] text-muted-foreground">
                        {n}/{CODEX_TOTAL} found · +{(CODEX_ALL * n * 100).toFixed(1)}% all shards
                    </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full" style={{ width: `${(n / CODEX_TOTAL) * 100}%`, backgroundColor: "var(--mc-light-purple)", boxShadow: "0 0 10px var(--mc-light-purple)" }} />
                </div>
                <div className="mt-2 grid gap-1 sm:grid-cols-3">
                    {CODEX_MILES.map((m) => {
                        const done = n >= m.n;
                        return (
                            <div key={m.n} className="rounded-lg border px-2 py-1 font-rubik text-[10px]" style={{ borderColor: done ? tint("var(--mc-green)", 50) : "rgba(255,255,255,0.1)", opacity: done ? 1 : 0.65 }}>
                                <div className="font-minecraft text-[11px]" style={{ color: done ? "var(--mc-green)" : undefined }}>{done ? "✓ " : ""}{m.n} entries</div>
                                <div className="text-muted-foreground">+{Math.round(m.luck * 100)}% luck, {m.dust} dust</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {SLOTS.map((sl) => (
                <div key={sl.id}>
                    <SectionTitle color={sl.color}>{sl.name}</SectionTitle>
                    <div className="space-y-1">
                        {enchOf(sl.id).map((e) => {
                            const mask = s.enc.codex[e.id] || 0;
                            let have = 0;
                            for (let i = 0; i < RARITY_N; i++) if (mask & (1 << i)) have++;
                            return (
                                <div key={e.id} className="flex items-center gap-2 rounded-lg border px-2 py-1.5" style={{ borderColor: have === RARITY_N ? tint(e.color, 60) : "rgba(255,255,255,0.1)", backgroundColor: have === RARITY_N ? tint(e.color, 8) : undefined }}>
                                    <span className="grid size-7 shrink-0 place-items-center rounded-lg text-base" style={{ color: have ? e.color : "rgba(255,255,255,0.25)", backgroundColor: tint(e.color, have ? 16 : 5) }}>
                                        <McSymbol name={e.symbol} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-minecraft text-[12px]" style={{ color: have ? e.color : "var(--muted-foreground)" }}>{have ? e.name : "???"}</div>
                                        <div className="truncate font-rubik text-[10px] text-muted-foreground">{have ? `${e.blurb} ${e.lines.map(([k, v]) => fmtStat(k, v)).join(", ")} at Common` : "Not discovered yet"}</div>
                                    </div>
                                    <div className="flex shrink-0 gap-[3px]">
                                        {RARITIES.map((r, i) => {
                                            const got = !!(mask & (1 << i));
                                            return (
                                                <i
                                                    key={r.id}
                                                    title={`${r.name}${got ? " (found)" : ""}`}
                                                    className={`size-2.5 rounded-full ${got && isCosmic(i) ? "fi-en-pip-rainbow" : ""}`}
                                                    style={{ backgroundColor: got ? rcolor(i) : "transparent", border: `1px solid ${got ? rcolor(i) : "rgba(255,255,255,0.22)"}`, boxShadow: got ? `0 0 6px ${rcolor(i)}` : undefined }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <span className="w-8 shrink-0 text-right font-minecraft text-[10px] text-muted-foreground">{have}/{RARITY_N}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </>
    );
}

// ---- Style ----

function Style({ s, render }: { s: Ctx["s"]; render: () => void }) {
    const o = s.enc.opts;
    const lvl = enchLevel(s);
    const color = glintColor(s);
    const pick = <K extends keyof typeof o>(k: K, v: (typeof o)[K]) => {
        o[k] = v;
        render();
    };
    const grid = (list: CosDef[], cur: string, key: "glint" | "gcol" | "table", extra?: (c: CosDef) => React.ReactNode) => (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {list.map((c) => {
                const ok = cosOpen(s, c);
                const on = cur === c.id;
                return (
                    <button
                        key={c.id}
                        type="button"
                        disabled={!ok}
                        onClick={() => pick(key, c.id)}
                        aria-pressed={on}
                        title={ok ? c.blurb : `Opens at Enchanting ${c.need}`}
                        className="fi-en-opt"
                        data-on={on}
                    >
                        {extra?.(c)}
                        <span className="block truncate font-minecraft text-[11px]">{c.name}</span>
                        <span className="block truncate font-rubik text-[9px] text-muted-foreground">{ok ? c.blurb || " " : <><Lock className="mr-0.5 inline size-2.5" />Enchanting {c.need}</>}</span>
                    </button>
                );
            })}
        </div>
    );
    const top = Math.max(topWorn(s), 3);
    return (
        <>
            <div className="fi-en-preview">
                <div className="relative size-28">
                    <Glint id={o.glint} color={color} power={top} />
                    <ButtonFace shape={s.btn.shape} skin={s.btn.skin} glyph={s.btn.glyph} color="var(--mc-aqua)" className="relative z-[1] size-28" glint={{ id: o.glint, color, power: top }} />
                </div>
                <div className="font-rubik text-[11px] text-muted-foreground">
                    Live preview. The glint shows on your button when a Button enchant is worn, brighter as its rarity climbs.
                </div>
            </div>

            <SectionTitle color={C}>Button glint</SectionTitle>
            {grid(GLINTS, o.glint, "glint")}
            <SectionTitle color={C}>Glint color</SectionTitle>
            {grid(GCOLORS, o.gcol, "gcol", (c) => {
                const g = GCOLORS.find((x) => x.id === c.id)!;
                return <i className={`mb-1 block h-2 rounded-full ${g.color === "rainbow" ? "fi-en-pip-rainbow" : ""}`} style={{ background: g.id === "auto" ? rcolorMix() : g.color === "rainbow" ? undefined : g.color }} />;
            })}
            <SectionTitle color={C}>Table theme</SectionTitle>
            {grid(TABLES, o.table, "table", (c) => <i className="fi-en-swatch" data-table={c.id} />)}

            <SectionTitle color={C}>Reveal animation</SectionTitle>
            <div className="grid gap-1.5 sm:grid-cols-3">
                {ANIMS.map((a) => (
                    <button key={a.id} type="button" onClick={() => pick("anim", a.id as typeof o.anim)} aria-pressed={o.anim === a.id} className="fi-en-opt" data-on={o.anim === a.id}>
                        <span className="block font-minecraft text-[11px]">{a.name}</span>
                        <span className="block font-rubik text-[9px] text-muted-foreground">{a.blurb}</span>
                    </button>
                ))}
            </div>

            <SectionTitle color={C}>Auto-roll</SectionTitle>
            <div className="space-y-2 rounded-xl border border-white/10 p-3">
                <div className="font-rubik text-[11px] text-muted-foreground">
                    {lvl < NEED.auto ? `Auto-roll opens at Enchanting ${NEED.auto}. ` : ""}Stop automatically when a roll is at least:
                </div>
                <div className="flex flex-wrap gap-1">
                    {RARITIES.map((r, i) =>
                        i < 2 ? null : (
                            <button key={r.id} type="button" onClick={() => pick("stop", i)} aria-pressed={o.stop === i} className="rounded-full border px-2 py-0.5 font-minecraft text-[11px] transition-colors" style={{ borderColor: o.stop === i ? rcolor(i) : "rgba(255,255,255,0.15)", color: rcolor(i), backgroundColor: o.stop === i ? tint(rcolor(i), 18) : undefined }}>
                                {r.name}
                            </button>
                        ),
                    )}
                </div>
                <button type="button" role="switch" aria-checked={o.better} onClick={() => pick("better", !o.better)} className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 font-rubik text-xs">
                    Auto-equip results that are stronger than what you wear
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: tint(o.better ? "var(--mc-green)" : "var(--muted-foreground)", 20), color: o.better ? "var(--mc-green)" : undefined }}>{o.better ? "ON" : "OFF"}</span>
                </button>
            </div>
        </>
    );
}

const rcolorMix = () => `linear-gradient(90deg, ${RARITIES.slice(0, 7).map((r) => r.color).join(",")})`;

export const ENCH_CSS = `
.fi-en{display:flex;flex-direction:column;gap:.55rem}
.fi-en-stat{display:flex;flex-direction:column;border-radius:.75rem;border:1px solid color-mix(in oklch,var(--c) 40%,transparent);background:linear-gradient(140deg,color-mix(in oklch,var(--c) 10%,transparent),transparent);padding:.4rem .6rem;min-width:0}
.fi-en-stat span{font-family:var(--font-minecraft,inherit);font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-foreground)}
.fi-en-stat b{font-family:var(--font-minecraft,inherit);font-weight:400;font-size:1.1rem;line-height:1.15;color:var(--c);text-shadow:0 0 12px color-mix(in oklch,var(--c) 60%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-en-stat small{font-family:var(--font-rubik,inherit);font-size:.58rem;color:var(--muted-foreground);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fi-en-seg{display:flex;border-radius:.6rem;border:1px solid rgba(255,255,255,.14);overflow:hidden}
.fi-en-seg button{flex:1;padding:.35rem;font-family:var(--font-minecraft,inherit);font-size:.72rem;color:var(--muted-foreground);transition:background .15s,color .15s}
.fi-en-seg button[data-on="true"]{background:color-mix(in oklch,var(--mc-light-purple) 22%,transparent);color:var(--mc-light-purple);box-shadow:inset 0 -2px 0 var(--mc-light-purple)}
.fi-en-slot{position:relative;display:flex;align-items:center;gap:.5rem;padding:.45rem .55rem;border-radius:.75rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.02);text-align:left;transition:transform .15s,background .15s,border-color .15s;min-width:0}
.fi-en-slot:hover:not(:disabled){transform:translateY(-1px);background:rgba(255,255,255,.06)}
.fi-en-slot[data-on="true"]{border-color:var(--sc);background:color-mix(in oklch,var(--sc) 12%,transparent);box-shadow:0 0 18px -6px var(--sc)}
.fi-en-slot[data-locked="true"]{opacity:.55}
.fi-en-slot[data-r="4"],.fi-en-slot[data-r="5"],.fi-en-slot[data-r="6"],.fi-en-slot[data-r="7"]{animation:fi-en-glow 2.4s ease-in-out infinite}
.fi-en-slot-ic{display:grid;place-items:center;width:1.9rem;height:1.9rem;flex:none;border-radius:.55rem;font-size:1.1rem;color:var(--sc);background:color-mix(in oklch,var(--sc) 16%,transparent)}
.fi-en-dot{position:absolute;right:.35rem;top:.35rem;width:.45rem;height:.45rem;border-radius:50%;background:var(--mc-yellow);box-shadow:0 0 8px var(--mc-yellow);animation:fi-pulse 1.2s ease-in-out infinite}
@keyframes fi-en-glow{0%,100%{box-shadow:0 0 6px -2px var(--sc)}50%{box-shadow:0 0 18px 0 var(--sc)}}

.fi-en-stage{--t1:#2a1650;--t2:#0b0716;--rune:#b98cff;position:relative;height:15.5rem;border-radius:1.1rem;overflow:hidden;border:1px solid color-mix(in oklch,var(--rc) 55%,transparent);box-shadow:0 0 30px -10px var(--rc),inset 0 0 40px rgba(0,0,0,.5);isolation:isolate;transition:border-color .2s,box-shadow .2s}
.fi-en-stage[data-table="ender"]{--t1:#0e3f3c;--t2:#031110;--rune:#4dffe0}
.fi-en-stage[data-table="nether"]{--t1:#541208;--t2:#140302;--rune:#ff8a4a}
.fi-en-stage[data-table="crystal"]{--t1:#0f3a5a;--t2:#03101a;--rune:#7fe8ff}
.fi-en-stage[data-table="void"]{--t1:#0a0510;--t2:#000;--rune:#ffffff}
.fi-en-stage[data-table="prism"]{--t1:#3a1a5a;--t2:#06020c;--rune:#ffffff}
.fi-en-bg{position:absolute;inset:0;z-index:-1;background:radial-gradient(circle at 50% 46%,color-mix(in oklch,var(--rc) 26%,var(--t1)),var(--t2) 72%)}
.fi-en-stage[data-table="prism"] .fi-en-bg::after{content:"";position:absolute;inset:-30%;background:conic-gradient(from 0deg,#ff5f5f44,#ffd95f44,#6fff5f44,#5fe6ff44,#b05fff44,#ff5f5f44);animation:fi-spin 18s linear infinite}
.fi-en-stage[data-table="void"] .fi-en-bg::after{content:"";position:absolute;inset:0;background:radial-gradient(1.5px 1.5px at 18% 30%,#fff,transparent),radial-gradient(1px 1px at 72% 22%,#fff,transparent),radial-gradient(1.5px 1.5px at 50% 78%,#fff,transparent),radial-gradient(1px 1px at 86% 66%,#fff,transparent),radial-gradient(1px 1px at 10% 80%,#fff,transparent);animation:fi-twinkle 3s ease-in-out infinite alternate}
.fi-en-rune{position:absolute;left:50%;top:50%;width:min(15.5rem,100%);height:auto;aspect-ratio:1;transform:translate(-50%,-50%);fill:none;stroke:var(--rune);stroke-width:.8;opacity:.75;overflow:visible;filter:drop-shadow(0 0 4px var(--rc))}
.fi-en-rune text{fill:var(--rune);stroke:none;font-size:8.6px;letter-spacing:1.6px;opacity:.9}
.fi-en-rune g{transform-origin:100px 100px;transform-box:view-box}
.fi-en-r1{animation:fi-spin 40s linear infinite}
.fi-en-r2{animation:fi-spin 26s linear infinite reverse;stroke:var(--rc)}
.fi-en-r3{animation:fi-spin 16s linear infinite;stroke:var(--rc)}
.fi-en-stage[data-phase="charge"] .fi-en-r1{animation-duration:2.2s}
.fi-en-stage[data-phase="charge"] .fi-en-r2{animation-duration:1.5s}
.fi-en-stage[data-phase="charge"] .fi-en-r3{animation-duration:.9s}
.fi-en-stage[data-phase="charge"] .fi-en-rune{opacity:1;stroke-width:1.3;animation:fi-en-throb .35s ease-in-out infinite alternate}
.fi-en-stage[data-phase="reveal"] .fi-en-rune{animation:fi-en-land .7s ease-out}
.fi-en-stage[data-table="prism"] .fi-en-rune{animation:fi-hue 6s linear infinite}
@keyframes fi-en-throb{from{transform:translate(-50%,-50%) scale(.97)}to{transform:translate(-50%,-50%) scale(1.04)}}
@keyframes fi-en-land{0%{transform:translate(-50%,-50%) scale(1.25);filter:drop-shadow(0 0 22px var(--rc)) brightness(2)}100%{transform:translate(-50%,-50%) scale(1)}}
.fi-en-glyph{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-size:3.6rem;line-height:1;color:var(--rc);text-shadow:0 0 22px var(--rc),0 4px 0 rgba(0,0,0,.5);animation:fi-en-float 3s ease-in-out infinite,fi-en-gin .5s cubic-bezier(.2,1.7,.4,1)}
.fi-en-stage[data-phase="charge"] .fi-en-glyph{animation:fi-en-shiver .08s linear infinite}
.fi-en-stage[data-r="7"] .fi-en-glyph{animation:fi-en-float 3s ease-in-out infinite,fi-hue 3s linear infinite}
@keyframes fi-en-float{0%,100%{margin-top:0}50%{margin-top:-6px}}
@keyframes fi-en-gin{from{transform:translate(-50%,-50%) scale(.2) rotate(-90deg);opacity:0}}
@keyframes fi-en-shiver{0%{transform:translate(-50%,-50%) translate(-2px,1px)}50%{transform:translate(-50%,-50%) translate(2px,-1px)}100%{transform:translate(-50%,-50%) translate(-1px,-2px)}}
.fi-en-reel{position:absolute;left:0;right:0;bottom:.7rem;text-align:center;font-family:var(--font-minecraft,inherit);font-size:1rem;min-height:1.3rem;text-shadow:0 0 12px currentColor,0 2px 0 rgba(0,0,0,.6);pointer-events:none}
.fi-en-lock{position:absolute;inset:auto 0 .8rem;display:flex;justify-content:center;align-items:center;gap:.4rem;font-family:var(--font-rubik,inherit);font-size:.75rem;color:var(--muted-foreground)}
.fi-en-banner{position:absolute;left:0;right:0;bottom:.55rem;text-align:center;pointer-events:none;animation:fi-en-rise .55s cubic-bezier(.2,1.5,.4,1) both}
.fi-en-rarity{font-family:var(--font-minecraft,inherit);font-size:1.45rem;letter-spacing:.14em;text-transform:uppercase;color:var(--rc);text-shadow:0 0 14px var(--rc),0 0 30px var(--rc),0 3px 0 rgba(0,0,0,.6)}
.fi-en-banner[data-r="0"] .fi-en-rarity,.fi-en-banner[data-r="1"] .fi-en-rarity{font-size:1.1rem}
.fi-en-banner[data-r="4"] .fi-en-rarity,.fi-en-banner[data-r="5"] .fi-en-rarity{font-size:1.7rem}
.fi-en-banner[data-r="6"] .fi-en-rarity{font-size:1.9rem}
.fi-en-banner[data-r="7"] .fi-en-rarity{font-size:2rem;background:linear-gradient(90deg,#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5f5f);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;animation:fi-slide 1.6s linear infinite;filter:drop-shadow(0 0 12px #fff)}
.fi-en-name{font-family:var(--font-minecraft,inherit);font-size:.95rem;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.7),0 0 10px rgba(0,0,0,.6)}
.fi-en-badges{display:flex;justify-content:center;gap:.3rem;margin-top:.2rem;flex-wrap:wrap}
.fi-en-badges span{font-family:var(--font-rubik,inherit);font-size:.6rem;padding:.08rem .45rem;border-radius:999px;background:rgba(0,0,0,.55);border:1px solid color-mix(in oklch,var(--rc) 60%,transparent);color:#fff}
.fi-en-new{color:var(--mc-yellow)!important;border-color:var(--mc-yellow)!important;animation:fi-pulse 1s ease-in-out infinite}
@keyframes fi-en-rise{from{transform:translateY(14px) scale(.7);opacity:0}}

.fi-en-card{position:relative;border-radius:.8rem;padding:.6rem .65rem;border:1px solid color-mix(in oklch,var(--ec) 55%,transparent);background:linear-gradient(150deg,color-mix(in oklch,var(--ec) 12%,#0a0812),#0a0812 75%);min-width:0}
.fi-en-card[data-glow="true"]{box-shadow:0 0 22px -6px var(--ec);animation:fi-en-cardin .4s cubic-bezier(.2,1.5,.4,1)}
.fi-en-card[data-r="7"]{border-image:linear-gradient(120deg,#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5fd2) 1}
.fi-en-card-ic{display:grid;place-items:center;width:2rem;height:2rem;border-radius:.6rem;font-size:1.25rem;background:rgba(255,255,255,.06)}
@keyframes fi-en-cardin{from{transform:translateY(8px) scale(.94);opacity:0}}
.fi-en-compare{border-radius:1rem;border:1px solid color-mix(in oklch,var(--mc-light-purple) 40%,transparent);padding:.6rem;background:rgba(255,255,255,.02)}
.fi-en-actions{display:flex;flex-wrap:wrap;gap:.4rem;align-items:stretch}
.fi-en-btn{padding:.45rem .8rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.18);font-family:var(--font-minecraft,inherit);font-size:.75rem;color:#fff;transition:background .15s,transform .1s,opacity .15s;touch-action:manipulation}
.fi-en-btn small{font-family:var(--font-rubik,inherit);font-size:.6rem;color:var(--muted-foreground);margin-left:.25rem}
.fi-en-btn:hover:not(:disabled){background:rgba(255,255,255,.1)}
.fi-en-btn:active:not(:disabled){transform:scale(.96)}
.fi-en-btn:disabled{opacity:.4;cursor:not-allowed}
.fi-en-btn[data-on="true"]{border-color:var(--mc-green);color:var(--mc-green);background:color-mix(in oklch,var(--mc-green) 14%,transparent)}
.fi-en-go{border-color:var(--mc-green);color:var(--mc-green);background:color-mix(in oklch,var(--mc-green) 14%,transparent)}
.fi-en-roll{flex:1 1 9rem;display:flex;align-items:center;justify-content:center;gap:.6rem;padding:.6rem 1rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--mc-light-purple) 60%,transparent);background:linear-gradient(180deg,color-mix(in oklch,var(--mc-light-purple) 38%,#120822),color-mix(in oklch,var(--mc-light-purple) 18%,#120822));color:#fff;font-family:var(--font-minecraft,inherit);box-shadow:0 4px 0 color-mix(in oklch,var(--mc-light-purple) 35%,#000);transition:transform .08s,box-shadow .08s,filter .15s;touch-action:manipulation}
.fi-en-roll-t{font-size:1.05rem;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 2px 0 rgba(0,0,0,.5)}
.fi-en-roll-c{font-size:.8rem;color:#e7c7ff;padding:.1rem .45rem;border-radius:999px;background:rgba(0,0,0,.35)}
.fi-en-roll[data-ready="true"]{animation:fi-en-ready 1.8s ease-in-out infinite}
.fi-en-roll:hover:not(:disabled){filter:brightness(1.15)}
.fi-en-roll:active:not(:disabled){transform:translateY(3px);box-shadow:0 1px 0 color-mix(in oklch,var(--mc-light-purple) 35%,#000)}
.fi-en-roll:disabled{opacity:.5;cursor:not-allowed;animation:none}
@keyframes fi-en-ready{0%,100%{box-shadow:0 4px 0 color-mix(in oklch,var(--mc-light-purple) 35%,#000),0 0 8px -2px var(--mc-light-purple)}50%{box-shadow:0 4px 0 color-mix(in oklch,var(--mc-light-purple) 35%,#000),0 0 24px 2px var(--mc-light-purple)}}
.fi-en-opt{display:block;text-align:left;padding:.4rem .5rem;border-radius:.65rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.02);min-width:0;transition:border-color .15s,background .15s,transform .1s}
.fi-en-opt:hover:not(:disabled){background:rgba(255,255,255,.07);transform:translateY(-1px)}
.fi-en-opt:disabled{opacity:.5;cursor:not-allowed}
.fi-en-opt[data-on="true"]{border-color:var(--mc-light-purple);background:color-mix(in oklch,var(--mc-light-purple) 16%,transparent);box-shadow:0 0 14px -5px var(--mc-light-purple)}
.fi-en-swatch{display:block;height:.9rem;border-radius:.35rem;margin-bottom:.25rem;background:radial-gradient(circle at 50% 50%,#6a3ab0,#0b0716)}
.fi-en-swatch[data-table="ender"]{background:radial-gradient(circle,#2ad6c0,#031110)}
.fi-en-swatch[data-table="nether"]{background:radial-gradient(circle,#ff6a2a,#140302)}
.fi-en-swatch[data-table="crystal"]{background:radial-gradient(circle,#6fe0ff,#03101a)}
.fi-en-swatch[data-table="void"]{background:radial-gradient(circle,#444,#000);box-shadow:inset 0 0 0 1px #fff3}
.fi-en-swatch[data-table="prism"]{background:linear-gradient(90deg,#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff)}
.fi-en-pip-rainbow{background:conic-gradient(#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5f5f)!important;animation:fi-hue 3s linear infinite}
.fi-en-preview{display:flex;align-items:center;gap:1rem;padding:.75rem;border-radius:1rem;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 20% 50%,rgba(150,90,255,.12),transparent 60%)}

.fi-en-cut{position:fixed;inset:0;z-index:70;display:grid;place-items:center;overflow:hidden;cursor:pointer;animation:fi-en-cut 1s ease-out both}
.fi-en-cut[data-r="4"]{--cc:#ffb21f}.fi-en-cut[data-r="5"]{--cc:#ff55e6}.fi-en-cut[data-r="6"]{--cc:#5ff6ff}.fi-en-cut[data-r="7"]{--cc:#ffffff}
.fi-en-cut-veil{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,color-mix(in oklch,var(--cc) 30%,transparent),rgba(0,0,0,.86) 70%);animation:fi-en-veil 2.4s ease-in-out both}
.fi-en-cut-body{position:relative;text-align:center;animation:fi-en-cutbody .9s cubic-bezier(.2,1.4,.4,1) both;pointer-events:none}
.fi-en-cut-title{font-family:var(--font-minecraft,inherit);font-size:clamp(2.4rem,9vw,4.6rem);letter-spacing:.18em;text-transform:uppercase;color:var(--cc);text-shadow:0 0 24px var(--cc),0 0 60px var(--cc),0 5px 0 rgba(0,0,0,.6)}
.fi-en-cut[data-r="7"] .fi-en-cut-title{background:linear-gradient(90deg,#ff5f5f,#ffd95f,#6fff5f,#5fe6ff,#b05fff,#ff5f5f);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:none;animation:fi-slide 1.4s linear infinite;filter:drop-shadow(0 0 24px #fff)}
.fi-en-cut-sub{font-family:var(--font-minecraft,inherit);font-size:clamp(1rem,3.4vw,1.6rem);color:#fff;text-shadow:0 3px 0 #000;margin-top:.3rem}
.fi-en-cut-odds{font-family:var(--font-rubik,inherit);font-size:.85rem;color:var(--muted-foreground);margin-top:.35rem;letter-spacing:.2em}
@keyframes fi-en-cut{from{opacity:0}}
@keyframes fi-en-veil{0%{opacity:0}15%{opacity:1}80%{opacity:1}100%{opacity:0}}
@keyframes fi-en-cutbody{from{transform:scale(.3);opacity:0;filter:blur(10px)}}
@media (prefers-reduced-motion:reduce){.fi-en-r1,.fi-en-r2,.fi-en-r3,.fi-en-glyph,.fi-en-slot,.fi-en-roll,.fi-en-banner,.fi-en-card,.fi-en-cut,.fi-en-cut-body,.fi-en-pip-rainbow,.fi-en-rune{animation:none!important}}
`;
