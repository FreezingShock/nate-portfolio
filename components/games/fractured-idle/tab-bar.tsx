"use client";

import { fmtInt } from "@/lib/fractured-idle/format";
import { memo, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { Tip, TipCard, type TipNote } from "./tooltip";

// The tab switcher. Tabs are grouped (Play, World, Progress, More), every tab
// is always visible (the strip wraps instead of scrolling) and every tab has its
// own color, used for its icon, its hover/active glow and its tooltip. Inactive
// tabs show only their icon; the active one expands to show its name. A tab with
// something that needs a click gets a count badge, and its tooltip lists what is
// going on there. Keys: 1-9 and 0 jump to a tab, [ and ] step through them.
//
// The bar is memoized on a signature of the notices, so the game's 10 Hz render
// only touches the DOM here when something on a tab actually changes.

export type { TipNote as TabNote };

export interface TabItem<T extends string> {
    id: T;
    label: string;
    symbol: ComponentProps<typeof McSymbol>["name"];
    group: string;
    color: string;
    blurb?: string;
}

export interface TabGroup {
    id: string;
    label: string;
    color: string;
}

interface Props<T extends string> {
    tabs: TabItem<T>[];
    /** Omit for a plain single row (the tabs' `group` is ignored): the sub-view bars inside a tab use this. */
    groups?: TabGroup[];
    current: T;
    notes?: Partial<Record<T, TipNote[]>>;
    onSelect: (id: T) => void;
    /** Screen-reader name for the bar. */
    label?: string;
    /** Plain single-row bars show every label ("always", the default) or only the active one ("active"). */
    labels?: "always" | "active";
    /** Show "key N" in the tooltips (only the main switcher has number keys). */
    keys?: boolean;
    /** Called when a tab's badge is read (hovered, focused or marked read). */
    onRead?: (id: T) => void;
    /** Called by "Mark all read". */
    onReadAll?: () => void;
}

const sigOf = (notes: Partial<Record<string, TipNote[]>>) =>
    Object.entries(notes)
        .map(([k, v]) => `${k}:${(v ?? []).map((n) => `${n.act ? "!" : ""}${n.n ?? 1}${typeof n.text === "string" ? n.text : ""}${n.color}`).join("|")}`)
        .join(";");

/** What a tab's badge adds up to: every notice that needs a click, weighted by how many things it stands for. */
const countOf = (notes: TipNote[] | undefined) => (notes ?? []).filter((x) => x.act).reduce((a, x) => a + (x.n ?? 1), 0);
const actSig = (notes: TipNote[] | undefined) => (notes ?? []).filter((x) => x.act).map((x) => `${x.n ?? 1}${typeof x.text === "string" ? x.text : ""}`).join("|");

const NO_NOTES = {};
const FLAT: TabGroup[] = [{ id: "", label: "", color: "var(--mc-aqua)" }];

function Bar<T extends string>({ tabs, groups, current, notes = NO_NOTES, onSelect, label = "Game sections", labels = "always", keys = true, onRead, onReadAll }: Props<T>) {
    const flat = !groups;
    const rows = groups ?? FLAT;
    const pick = useRef(onSelect);
    pick.current = onSelect;
    // A badge is read once you hover or focus its tab (or press Mark all read); it comes back when the notices change.
    const [read, setRead] = useState<Record<string, string>>({});
    const shown = (id: T) => (current === id ? 0 : actSig(notes[id]) === read[id] ? 0 : countOf(notes[id]));
    const markRead = (id: T) => {
        const sg = actSig(notes[id]);
        if (!sg) return;
        if (read[id] !== sg) setRead((r) => ({ ...r, [id]: sg }));
        onRead?.(id);
    };
    const total = tabs.reduce((a, t) => a + shown(t.id), 0);
    return (
        <nav className="fi-tabs" data-flat={flat} data-labels={labels} aria-label={label}>
            {rows.map((g) => {
                const list = flat ? tabs : tabs.filter((t) => t.group === g.id);
                const hot = list.some((t) => shown(t.id) > 0);
                return (
                    <div key={g.id} className="fi-tg" style={{ ["--g" as string]: g.color } as CSSProperties} data-hot={hot}>
                        {!flat && <span className="fi-tg-l">{g.label}</span>}
                        <div className="fi-tg-row" role="tablist">
                            {list.map((t) => {
                                const on = current === t.id;
                                const n = tabs.indexOf(t) + 1;
                                const tn = notes[t.id] ?? [];
                                const count = shown(t.id);
                                return (
                                    <Tip
                                        key={t.id}
                                        tip={
                                            <TipCard
                                                title={t.label}
                                                color={t.color}
                                                tag={keys && n <= 10 ? `key ${n % 10}` : undefined}
                                                lines={t.blurb ? [t.blurb] : undefined}
                                                notes={tn}
                                                cta={on ? "You are here" : "Click to switch!"}
                                                ctaDim={on}
                                            />
                                        }
                                    >
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={on}
                                            data-on={on}
                                            aria-label={count ? `${t.label}, ${fmtInt(count)} to check` : t.label}
                                            onClick={() => pick.current(t.id)}
                                            onPointerEnter={(e) => e.pointerType === "mouse" && markRead(t.id)}
                                            onFocus={() => markRead(t.id)}
                                            className="fi-tab"
                                            style={{ ["--c" as string]: t.color } as CSSProperties}
                                        >
                                            <span className="fi-tab-i"><McSymbol name={t.symbol} /></span>
                                            <span className="fi-tab-l">{t.label}</span>
                                            {count > 0 && (
                                                <b key={count} className="fi-tab-n">
                                                    {count > 9 ? "9+" : count}
                                                </b>
                                            )}
                                        </button>
                                    </Tip>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            {(!flat || !!onReadAll) && <Tip
                box
                className="fi-tabs-rw"
                tip={() => {
                    const hot = tabs.filter((t) => shown(t.id) > 0);
                    return (
                        <TipCard
                            title="Notifications"
                            color="var(--mc-green)"
                            tag={total > 0 ? `${fmtInt(total)} new` : "all read"}
                            lines={[total > 0 ? `${fmtInt(total)} thing${total === 1 ? "" : "s"} waiting on ${hot.length} tab${hot.length === 1 ? "" : "s"}.` : "You are all caught up."]}
                            rows={hot.map((t): [string, string, string] => [t.label, String(shown(t.id)), t.color])}
                            cta={total > 0 ? "Click to mark all read!" : undefined}
                        />
                    );
                }}
            >
                <button
                    type="button"
                    className="fi-tabs-read"
                    data-on={total > 0}
                    aria-disabled={total === 0}
                    onClick={() => {
                        if (total === 0) return;
                        setRead(Object.fromEntries(tabs.map((t) => [t.id, actSig(notes[t.id])])));
                        onReadAll?.();
                    }}
                    aria-label={total > 0 ? `Mark all ${fmtInt(total)} notifications as read` : "No notifications"}
                >
                    <span>✓</span>
                </button>
            </Tip>}
        </nav>
    );
}

export const TabBar = memo(Bar, (a, b) => a.current === b.current && a.labels === b.labels && a.tabs === b.tabs && a.groups === b.groups && sigOf(a.notes ?? NO_NOTES) === sigOf(b.notes ?? NO_NOTES)) as typeof Bar;

export const TABBAR_CSS = `
.fi-tabs{display:flex;flex-wrap:wrap;gap:.4rem .55rem;padding:.55rem .6rem;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(255,255,255,.035),transparent)}
.fi-tg{position:relative;display:flex;flex-direction:column;gap:.15rem;min-width:0}
.fi-tg-l{font-family:var(--font-minecraft,inherit);font-size:.5rem;letter-spacing:.2em;text-transform:uppercase;color:color-mix(in oklch,var(--g) 70%,#fff);opacity:.65;padding-left:.25rem;transition:opacity .2s,text-shadow .2s}
.fi-tg[data-hot="true"] .fi-tg-l{opacity:1;text-shadow:0 0 8px var(--g)}
.fi-tg-row{display:flex;gap:.2rem;padding:.2rem;border-radius:.85rem;border:1px solid color-mix(in oklch,var(--g) 24%,transparent);background:color-mix(in oklch,var(--g) 5%,transparent)}
.fi-tab{position:relative;display:flex;align-items:center;justify-content:center;height:2.1rem;min-width:2.1rem;padding:0 .55rem;border-radius:.65rem;color:var(--c);font-family:var(--font-minecraft,inherit);font-size:.72rem;white-space:nowrap;background:color-mix(in oklch,var(--c) 7%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 14%,transparent);transition:background .18s,box-shadow .18s,transform .14s cubic-bezier(.2,1.5,.4,1),filter .18s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
.fi-tab-i{display:grid;place-items:center;flex:none;width:1.3em;height:1.3em;font-size:1.05rem;line-height:1;filter:saturate(.85) brightness(.92);transition:transform .22s cubic-bezier(.2,1.7,.4,1),filter .18s}
.fi-tab-l{max-width:0;overflow:hidden;opacity:0;margin-left:0;transition:max-width .3s cubic-bezier(.2,.9,.3,1),opacity .2s .04s,margin .3s}
.fi-tab:hover{background:color-mix(in oklch,var(--c) 18%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 45%,transparent),0 3px 12px -5px var(--c);transform:translateY(-1px)}
.fi-tab:hover .fi-tab-i{transform:scale(1.18) rotate(-6deg);filter:saturate(1.15) brightness(1.1) drop-shadow(0 0 5px var(--c))}
.fi-tab:active{transform:translateY(0) scale(.93)}
.fi-tab[data-on="true"]{background:color-mix(in oklch,var(--c) 26%,transparent);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--c) 70%,transparent),0 0 16px -4px var(--c);animation:fi-tab-pop .34s cubic-bezier(.2,1.6,.4,1)}
.fi-tab[data-on="true"]::after{content:"";position:absolute;left:22%;right:22%;bottom:.14rem;height:2px;border-radius:2px;background:var(--c);box-shadow:0 0 8px var(--c)}
.fi-tab[data-on="true"] .fi-tab-i{filter:saturate(1.2) brightness(1.15) drop-shadow(0 0 6px var(--c))}
.fi-tab[data-on="true"] .fi-tab-l{max-width:7rem;opacity:1;margin-left:.45rem;text-shadow:0 0 10px color-mix(in oklch,var(--c) 60%,transparent)}
.fi-tab-n{position:absolute;right:-.3rem;top:-.35rem;min-width:.95rem;height:.95rem;padding:0 .2rem;display:grid;place-items:center;border-radius:999px;font:700 .58rem/1 var(--font-rubik,inherit);color:#111;background:var(--mc-green);box-shadow:0 0 0 2px color-mix(in oklch,var(--background) 90%,#000),0 0 9px var(--mc-green);animation:fi-tab-ping .5s cubic-bezier(.2,1.8,.4,1)}
.fi-tab-n::before{content:"";position:absolute;inset:-2px;border-radius:inherit;border:1px solid var(--mc-green);animation:fi-tab-ring 1.8s ease-out infinite}
.fi-tab:focus-visible{outline:2px solid var(--c);outline-offset:2px}
.fi-tabs-rw{align-self:flex-end;margin-left:auto}
.fi-tabs-read{display:grid;place-items:center;width:2.1rem;height:2.1rem;padding:0;border-radius:.65rem;border:1px solid rgba(255,255,255,.12);font-family:var(--font-minecraft,inherit);font-size:.62rem;color:var(--muted-foreground);transition:background .15s,color .15s,border-color .15s,transform .1s;touch-action:manipulation}
.fi-tabs-read span{font-size:.95rem;line-height:1;transition:transform .2s cubic-bezier(.2,1.7,.4,1)}
.fi-tabs-read[data-on="true"]:hover span{transform:scale(1.2) rotate(-6deg)}
.fi-tabs-read[data-on="true"] span{filter:drop-shadow(0 0 5px var(--mc-green))}
.fi-tabs-read[data-on="true"]{color:var(--mc-green);border-color:color-mix(in oklch,var(--mc-green) 55%,transparent);background:color-mix(in oklch,var(--mc-green) 10%,transparent)}
.fi-tabs-read[data-on="true"]:hover{background:color-mix(in oklch,var(--mc-green) 22%,transparent)}
.fi-tabs-read:active:not([aria-disabled="true"]){transform:scale(.93)}
.fi-tabs-read[aria-disabled="true"]{opacity:.4;cursor:default}
@keyframes fi-tab-pop{0%{transform:scale(.9)}60%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes fi-tab-ping{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes fi-tab-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.9);opacity:0}}
.fi-tabs[data-flat="true"]{padding:.3rem 0;border-bottom:0;background:none}
.fi-tabs[data-flat="true"] .fi-tg-row{padding:.2rem;flex-wrap:wrap}
.fi-tabs[data-flat="true"][data-labels="always"] .fi-tab-l{max-width:8rem;opacity:1;margin-left:.4rem}
.fi-tabs[data-flat="true"][data-labels="always"] .fi-tab{padding:0 .65rem}
.fi-tabs[data-flat="true"][data-labels="always"] .fi-tab[data-on="false"] .fi-tab-l{color:color-mix(in oklch,var(--c) 70%,var(--muted-foreground))}
@media (max-width:480px){.fi-tabs{gap:.3rem;padding:.4rem}.fi-tg-l{display:none}.fi-tab{height:2.3rem;min-width:2.3rem;padding:0 .5rem}}
@media (prefers-reduced-motion:reduce){.fi-tab,.fi-tab-i,.fi-tab-l{transition:none;animation:none!important}.fi-tab-n,.fi-tab-n::before{animation:none}}
`;
