"use client";

import type { ComponentProps } from "react";
import { McSymbol } from "@/components/mc-symbol";
import { Tip, TipCard } from "./tooltip";

// The tab switcher. Tabs are grouped (Play, World, Progress, System), every tab
// is always visible (the strip wraps instead of scrolling), inactive tabs show
// only their icon and the active one expands to show its name in its group's
// color. Keys: 1-9 and 0 jump to a tab, [ and ] step through them.

export interface TabItem<T extends string> {
    id: T;
    label: string;
    symbol: ComponentProps<typeof McSymbol>["name"];
    group: string;
    blurb?: string;
}

export interface TabGroup {
    id: string;
    label: string;
    color: string;
}

export function TabBar<T extends string>({ tabs, groups, current, dots, onSelect }: { tabs: TabItem<T>[]; groups: TabGroup[]; current: T; dots: Partial<Record<T, boolean>>; onSelect: (id: T) => void }) {
    return (
        <nav className="fi-tabs" aria-label="Game sections">
            {groups.map((g) => {
                const list = tabs.filter((t) => t.group === g.id);
                const hot = list.some((t) => dots[t.id] && t.id !== current);
                return (
                    <div key={g.id} className="fi-tg" style={{ ["--g" as string]: g.color } as React.CSSProperties} data-hot={hot}>
                        <span className="fi-tg-l">{g.label}</span>
                        <div className="fi-tg-row" role="tablist">
                            {list.map((t) => {
                                const on = current === t.id;
                                const n = tabs.indexOf(t) + 1;
                                return (
                                    <Tip key={t.id} tip={<TipCard title={t.label} color={g.color} tag={n <= 10 ? `key ${n % 10}` : undefined} lines={t.blurb ? [t.blurb] : undefined} foot={dots[t.id] && !on ? "Something is ready here." : undefined} />}>
                                        <button type="button" role="tab" aria-selected={on} data-on={on} aria-label={t.label} onClick={() => onSelect(t.id)} className="fi-tab">
                                            <span className="fi-tab-i"><McSymbol name={t.symbol} /></span>
                                            <span className="fi-tab-l">{t.label}</span>
                                            {dots[t.id] && !on && <i className="fi-tab-dot" />}
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

export const TABBAR_CSS = `
.fi-tabs{display:flex;flex-wrap:wrap;gap:.35rem .5rem;padding:.5rem .55rem;border-bottom:1px solid rgba(255,255,255,.1);background:linear-gradient(180deg,rgba(255,255,255,.03),transparent)}
.fi-tg{position:relative;display:flex;flex-direction:column;gap:.15rem;min-width:0}
.fi-tg-l{font-family:var(--font-minecraft,inherit);font-size:.5rem;letter-spacing:.2em;text-transform:uppercase;color:color-mix(in oklch,var(--g) 70%,#fff);opacity:.7;padding-left:.2rem;transition:opacity .2s}
.fi-tg[data-hot="true"] .fi-tg-l{opacity:1;text-shadow:0 0 8px var(--g)}
.fi-tg-row{display:flex;gap:.2rem;padding:.2rem;border-radius:.8rem;border:1px solid color-mix(in oklch,var(--g) 22%,transparent);background:color-mix(in oklch,var(--g) 5%,transparent)}
.fi-tab{position:relative;display:flex;align-items:center;gap:0;height:2rem;min-width:2rem;padding:0 .5rem;border-radius:.6rem;color:var(--muted-foreground);font-family:var(--font-minecraft,inherit);font-size:.72rem;white-space:nowrap;transition:background .18s,color .18s,transform .12s,box-shadow .18s;touch-action:manipulation}
.fi-tab-i{display:grid;place-items:center;font-size:1rem;line-height:1;transition:transform .2s cubic-bezier(.2,1.6,.4,1)}
.fi-tab-l{max-width:0;overflow:hidden;opacity:0;transition:max-width .28s cubic-bezier(.2,.9,.3,1),opacity .2s,margin .28s}
.fi-tab:hover{background:color-mix(in oklch,var(--g) 14%,transparent);color:#fff}
.fi-tab:hover .fi-tab-i{transform:scale(1.15)}
.fi-tab:active{transform:scale(.94)}
.fi-tab[data-on="true"]{background:color-mix(in oklch,var(--g) 24%,transparent);color:var(--g);box-shadow:inset 0 0 0 1px color-mix(in oklch,var(--g) 55%,transparent),0 0 14px -4px var(--g)}
.fi-tab[data-on="true"] .fi-tab-l{max-width:7rem;opacity:1;margin-left:.4rem}
.fi-tab-dot{position:absolute;right:.2rem;top:.2rem;width:.4rem;height:.4rem;border-radius:50%;background:var(--mc-green);box-shadow:0 0 6px var(--mc-green);animation:fi-pulse 1.6s ease-in-out infinite}
.fi-tab:focus-visible{outline:2px solid var(--g);outline-offset:1px}
@media (max-width:480px){.fi-tabs{gap:.3rem;padding:.4rem}.fi-tg-l{display:none}.fi-tab{height:1.9rem;min-width:1.9rem;padding:0 .4rem}}
@media (prefers-reduced-motion:reduce){.fi-tab,.fi-tab-i,.fi-tab-l,.fi-tab-dot{transition:none;animation:none}}
`;
