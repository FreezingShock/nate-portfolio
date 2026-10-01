import type { ComponentProps, ReactNode } from "react";
import { Lock } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import type { State } from "@/lib/fractured-idle/data";
import type { Derived } from "@/lib/fractured-idle/engine";

// Shared pieces for every Fractured Idle tab. Tabs receive one Ctx object:
// the live state (mutate it only through engine functions), derived stats,
// a number formatter, and helpers to re-render and show a toast.

export interface Ctx {
    s: State;
    d: Derived;
    F: (n: number) => string;
    /** Run an engine action; re-renders when it returns true. */
    act: (fn: () => boolean) => void;
    render: () => void;
    say: (msg: string) => void;
    tip: TipApi;
}

/** Point (client coords) or an element to anchor the tooltip to. */
export type TipSource = { clientX: number; clientY: number } | Element;

export interface TipApi {
    show: (id: string, src: TipSource) => void;
    move: (src: TipSource) => void;
    hide: () => void;
}

export type SymbolName = ComponentProps<typeof McSymbol>["name"];

export const tint = (c: string, pct: number) => `color-mix(in oklch, ${c} ${pct}%, transparent)`;
/** Lighten a color so dark palette entries (blue, purple) stay readable as text. */
export const lift = (c: string) => `color-mix(in oklch, ${c} 68%, white)`;

export const BUY_OPTIONS = [
    { v: 1, label: "x1" },
    { v: 10, label: "x10" },
    { v: 100, label: "x100" },
    { v: -1, label: "Max" },
];

export const CSS = `
@keyframes fi-pulse{0%,100%{opacity:.55}50%{opacity:1}}
.fi-pulse{animation:fi-pulse 2.4s ease-in-out infinite}
@keyframes fi-afford{0%,100%{box-shadow:0 0 5px -2px var(--c)}50%{box-shadow:0 0 15px 0 var(--c)}}
.fi-afford{animation:fi-afford 1.8s ease-in-out infinite}
@keyframes fi-bob{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-8px) rotate(6deg)}}
.fi-bob{animation:fi-bob 1.1s ease-in-out infinite}
@keyframes fi-pop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
.fi-pop{animation:fi-pop .25s ease-out}
@keyframes fi-shine{0%{background-position:-160% 0}100%{background-position:260% 0}}
.fi-shine{background-image:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.3) 50%,transparent 65%);background-size:200% 100%;animation:fi-shine 3.2s ease-in-out infinite}
/* Touch: every control gets a comfortable minimum height on phones. */
@media (max-width:639px){[data-fi-root] button:not(.fi-orb):not(.fi-tab),[data-fi-root] select,[data-fi-root] [role="tab"]{min-height:32px}[data-fi-root] button.fi-stretch{min-height:0}}
@media (prefers-reduced-motion:reduce){.fi-pulse,.fi-afford,.fi-bob,.fi-pop,.fi-shine{animation:none}}
`;

export function Stat({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <div className="font-minecraft text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="font-minecraft font-bold text-lg leading-none" style={{ color }}>{value}</div>
        </div>
    );
}

export function Kbd({ children }: { children: ReactNode }) {
    return <kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">{children}</kbd>;
}

export function Badge({ color, size = "md", children }: { color: string; size?: "md" | "sm"; children: ReactNode }) {
    return (
        <span
            className={`grid shrink-0 place-items-center rounded-xl ${size === "md" ? "size-10 text-lg" : "size-8 text-base"}`}
            style={{ color, backgroundColor: tint(color, 16), boxShadow: `inset 0 0 0 1px ${tint(color, 35)}` }}
        >
            {children}
        </span>
    );
}

export function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" title={label} aria-label={label} onClick={onClick} className="grid size-9 place-items-center rounded-lg border border-white/15 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
            {children}
        </button>
    );
}

export function ActionBtn({ icon, onClick, danger, children }: { icon?: ReactNode; onClick: () => void; danger?: boolean; children: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-rubik text-xs font-semibold transition-colors hover:bg-white/10"
            style={{ borderColor: danger ? tint("var(--mc-red)", 55) : "rgba(255,255,255,0.15)", color: danger ? "var(--mc-red)" : undefined }}
        >
            {icon} {children}
        </button>
    );
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 font-rubik text-xs">
            {label}
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: tint(on ? "var(--mc-green)" : "var(--muted-foreground)", 20), color: on ? "var(--mc-green)" : undefined }}>
                {on ? "ON" : "OFF"}
            </span>
        </button>
    );
}

export function Teaser({ text }: { text: string }) {
    return <div className="rounded-xl border border-dashed border-white/15 p-3 text-center font-rubik text-xs text-muted-foreground">{text}</div>;
}

export function SectionTitle({ children, color = "var(--mc-aqua)" }: { children: ReactNode; color?: string }) {
    return (
        <div className="mb-1.5 mt-3 flex items-center gap-2 font-minecraft font-bold text-[11px] uppercase tracking-widest first:mt-0" style={{ color }}>
            {children}
            <span className="h-px flex-1" style={{ backgroundColor: tint(color, 30) }} />
        </div>
    );
}

export function Progress({ label, pct, color, right }: { label: string; pct: number; color: string; right: string }) {
    const p = Math.max(0, Math.min(1, isFinite(pct) ? pct : 0));
    return (
        <div>
            <div className="mb-1 flex justify-between font-rubik text-[10px] text-muted-foreground">
                <span>{label}</span>
                <span>{right}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${p * 100}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
            </div>
        </div>
    );
}

export function ShopRow({
    color, symbol, title, badge, sub, price, buyLabel, can, onClick,
}: {
    color: string;
    symbol: SymbolName;
    title: string;
    badge?: string;
    sub: string;
    price: string;
    buyLabel: string;
    can: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={!can}
            onClick={onClick}
            className="group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all enabled:hover:-translate-y-px enabled:hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-55"
            style={{ borderColor: can ? tint(color, 55) : "rgba(255,255,255,0.1)", boxShadow: can ? `0 0 16px -6px ${color}` : undefined }}
        >
            <Badge color={color}><McSymbol name={symbol} /></Badge>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="min-w-0 break-words font-minecraft font-bold text-sm leading-tight sm:truncate" style={{ color }}>{title}</span>
                    {badge && <span className="rounded-full border border-white/15 px-1.5 font-rubik text-[10px] text-muted-foreground">{badge}</span>}
                </div>
                <div className="truncate font-rubik text-[11px] text-muted-foreground">{sub}</div>
            </div>
            <div className="shrink-0 text-right">
                <div className="font-minecraft font-bold text-sm" style={{ color: can ? "var(--mc-yellow)" : undefined }}>{price}</div>
                <div className="font-rubik text-[10px] text-muted-foreground">{buyLabel}</div>
            </div>
        </button>
    );
}

export function LockedBadge() {
    return <Lock className="size-4" />;
}

export const FONT_CSS = `
/* Minecraft Bold: headers, titles, values and primary buttons use the real 700 face of the Minecraft font
   (see app/fonts.css); micro labels and body text stay regular. Icons always stay regular so they keep their shape. */
[data-fi-root] .mc-symbol{font-weight:400}
.fi-num,.fi-combo-name,.fi-combo-surge,.fi-combo-mult,.fi-xg b,.fi-qte-head,.fi-qte-btn,.fi-qte-result,.fi-mash-core,
.fi-sk-title,.fi-sk-mname,.fi-tab-l,
.fi-en-stat b,.fi-en-rarity,.fi-en-name,.fi-en-reel,.fi-en-btn,.fi-en-roll-t,.fi-en-cut-title,.fi-en-cut-sub,.fi-en-seg button[data-on="true"],
.fi-mn-stat b,.fi-mn-name,.fi-mn-pop,.fi-mn-geode-n,.fi-mn-crack,.fi-mn-pick-t,.fi-mn-buy,.fi-mn-up-h b,.fi-mn-maxed,.fi-mn-drill-t,.fi-mn-col-h b,.fi-mn-chip b,.fi-mn-seg button[data-on="true"],
.fi-st-cat-h b,.fi-st-v,.fi-st-chip[data-on="true"],
.fi-tp-h .tl,.fi-tp-r dd{font-weight:700}
`;
