import { McSymbol } from "@/components/mc-symbol";
import { SKILLS } from "@/lib/fractured-idle/data";
import { SKILL_CAP, fmt, fmtEta, skillLevel, skillXpFor } from "@/lib/fractured-idle/engine";
import { Badge, Progress, Teaser, type Ctx } from "./ui";

export function SkillsTab({ s, d }: Ctx) {
    // Passive xp/sec, the part that keeps ticking without clicks.
    const passive: Record<string, number> = {
        mining: d.auto * d.xpMult,
        farming: (d.cps > 0 ? 1 + 2 * Math.log10(d.cps + 1) : 0) * d.xpMult,
        combat: d.auto * d.critChance * 3 * d.xpMult,
        fishing: 0.2 * d.xpMult,
    };
    return (
        <>
            <p className="font-rubik text-[11px] text-muted-foreground">
                Skill xp gain is x{d.xpMult.toFixed(2)} from trophies and pets. Levels are permanent: rebirth and ascension never touch them.
            </p>
            {SKILLS.map((k) => {
                const xp = s[k.id];
                const lvl = skillLevel(xp);
                const lo = skillXpFor(lvl);
                const hi = skillXpFor(lvl + 1);
                const maxed = lvl >= SKILL_CAP;
                return (
                    <div key={k.id} className="rounded-xl border border-white/10 p-3">
                        <div className="mb-2 flex items-center gap-3">
                            <Badge color={k.color}><McSymbol name={k.symbol} /></Badge>
                            <div className="min-w-0 flex-1">
                                <div className="font-minecraft text-sm" style={{ color: k.color }}>
                                    {k.name} {lvl}<span className="text-muted-foreground">/{SKILL_CAP}</span>
                                </div>
                                <div className="font-rubik text-[11px] text-muted-foreground">{k.perk}</div>
                                <div className="font-rubik text-[10px] text-muted-foreground">XP from: {k.earn}</div>
                            </div>
                            <div className="text-right font-minecraft text-sm">
                                <div style={{ color: k.color }}>{k.bonus(lvl)}</div>
                                {!maxed && (
                                    <div className="text-[11px]" style={{ color: "var(--mc-green)" }}>
                                        <McSymbol name="arrow" /> {k.bonus(lvl + 1)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <Progress
                            label={maxed ? "Maxed" : `Level ${lvl + 1}`}
                            color={k.color}
                            pct={maxed ? 1 : (xp - lo) / (hi - lo)}
                            right={maxed ? "MAX" : `${fmt(xp - lo)} / ${fmt(hi - lo)}${passive[k.id] > 0 ? ` · ${fmtEta((hi - xp) / passive[k.id])} passive` : ""}`}
                        />
                    </div>
                );
            })}
            <Teaser text="Foraging and Enchanting skills: planned" />
        </>
    );
}
