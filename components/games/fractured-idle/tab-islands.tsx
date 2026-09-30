import { McSymbol } from "@/components/mc-symbol";
import { ISLANDS } from "@/lib/fractured-idle/data";
import { fmtEta, income } from "@/lib/fractured-idle/engine";
import { Badge, LockedBadge, Progress, lift, tint, type Ctx } from "./ui";

export function IslandsTab({ s, d, F, render }: Ctx) {
    const next = ISLANDS.find((i) => s.total < i.at);
    return (
        <>
            <p className="font-rubik text-xs text-muted-foreground">
                Islands unlock from lifetime shards and survive rebirth. Your multiplier is the best island you have unlocked; pick any unlocked one to change the theme.
            </p>
            {next && (
                <Progress
                    label={`Next: ${next.name}`}
                    color={next.color}
                    pct={Math.log10(Math.max(1, s.total)) / Math.log10(next.at)}
                    right={`${F(s.total)} / ${F(next.at)} · ${fmtEta((next.at - s.total) / Math.max(1e-9, income(d)))}`}
                />
            )}
            <div className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 font-rubik text-xs">
                <span className="text-muted-foreground">Island bonus now</span>
                <span className="font-minecraft text-sm" style={{ color: "var(--mc-gold)" }}>x{F(d.islandMult)}</span>
            </div>
            {ISLANDS.map((i) => {
                const open = s.total >= i.at;
                const active = s.island === i.id;
                return (
                    <button
                        key={i.id}
                        type="button"
                        disabled={!open}
                        onClick={() => {
                            s.island = i.id;
                            render();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors enabled:hover:bg-white/5 disabled:opacity-50"
                        style={{ borderColor: active ? i.color : "rgba(255,255,255,0.1)", backgroundColor: active ? tint(i.color, 12) : undefined }}
                    >
                        <Badge color={i.color}>{open ? <McSymbol name={i.symbol} /> : <LockedBadge />}</Badge>
                        <div className="min-w-0 flex-1">
                            <div className="font-minecraft text-sm" style={{ color: lift(i.color) }}>{i.name}{active && <span className="ml-2 rounded-full border px-1.5 font-rubik text-[10px]" style={{ borderColor: tint(i.color, 55) }}>active</span>}</div>
                            <div className="font-rubik text-[11px] text-muted-foreground">{open ? i.blurb : `Unlocks at ${F(i.at)} lifetime shards`}</div>
                        </div>
                        <div className="font-minecraft text-sm" style={{ color: i.color }}>x{i.mult}</div>
                    </button>
                );
            })}
        </>
    );
}
