"use client";

import { memo, useRef, type ComponentProps, type CSSProperties } from "react";
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
    groups: TabGroup[];
    current: T;
    notes: Partial<Record<T, TipNote[]>>;
    onSelect: (id: T) => void;
}

const sigOf = (notes: Partial<Record<string, TipNote[]>>) =>
    Object.entries(notes)
        .map(([k, v]) => `${k}:${(v ?? []).map((n) => `${n.act ? "!" : ""}${typeof n.text === "string" ? n.text : ""}${n.color}`).join("|")}`)
        .join(";");

function Bar<T extends string>({ tabs, groups, current, notes, onSelect }: Props<T>) {
    const pick = useRef(onSelect);
    pick.current = onSelect;
    return (
        <nav className="fi-tabs" aria-label="Game sections">
            {groups.map((g) => {
                const list = tabs.filter((t) => t.group === g.id);
                const hot = list.some((t) => t.id !== current && notes[t.id]?.some((n) => n.act));
                return (
                    <div key={g.id} className="fi-tg" style={{ ["--g" as string]: g.color } as CSSProperties} data-hot={hot}>
                        <span className="fi-tg-l">{g.label}</span>
                        <div className="fi-tg-row" role="tablist">
                            {list.map((t) => {
                                const on = current === t.id;
                                const n = tabs.indexOf(t) + 1;
                                const tn = notes[t.id] ?? [];
                                const count = on ? 0 : tn.filter((x) => x.act).length;
                                return (
                                    <Tip
                                        key={t.id}
                                        tip={
                                            <TipCard
                                                title={t.label}
                                                color={t.color}
                                                tag={n <= 10 ? `key ${n % 10}` : undefined}
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
                                            aria-label={count ? `${t.label}, ${count} to check` : t.label}
                                            onClick={() => pick.current(t.id)}
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
        </nav>
    );
}

export const TabBar = memo(Bar, (a, b) => a.current === b.current && a.tabs === b.tabs && a.groups === b.groups && sigOf(a.notes) === sigOf(b.notes)) as typeof Bar;

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
@keyframes fi-tab-pop{0%{transform:scale(.9)}60%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes fi-tab-ping{0%{transform:scale(0)}100%{transform:scale(1)}}
@keyframes fi-tab-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.9);opacity:0}}
@media (max-width:480px){.fi-tabs{gap:.3rem;padding:.4rem}.fi-tg-l{display:none}.fi-tab{height:2.3rem;min-width:2.3rem;padding:0 .5rem}}
@media (prefers-reduced-motion:reduce){.fi-tab,.fi-tab-i,.fi-tab-l{transition:none;animation:none!important}.fi-tab-n,.fi-tab-n::before{animation:none}}
`;
