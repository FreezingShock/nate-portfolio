import { ACHIEVEMENTS, ISLANDS, MINIONS } from "@/lib/fractured-idle/data";
import { fmtTime, income, offlineEff } from "@/lib/fractured-idle/engine";
import { SectionTitle, type Ctx } from "./ui";

type Row = [label: string, value: string, hint?: string];

export function StatsTab({ s, d, F }: Ctx) {
    const pct = (n: number) => `${(n * 100).toFixed(n * 100 < 10 ? 1 : 0)}%`;
    const owned = s.minions.reduce((a, b) => a + b, 0);
    const unlocked = ISLANDS.filter((i) => s.total >= i.at).length;

    const groups: { title: string; color: string; rows: Row[] }[] = [
        {
            title: "Clicking",
            color: "var(--mc-aqua)",
            rows: [
                ["Press power", F(d.click), "shards per normal click"],
                ["Average click", F(d.avgClick), "including crits"],
                ["Crit chance", pct(d.critChance), "capped at 75%"],
                ["Crit damage", `+${pct(d.critDmg)}`, `crit click = ${F(d.click * (1 + d.critDmg))}`],
                ["Auto-clicks", `${F(d.auto)}/s`],
                ["Total clicks", F(s.clicks)],
                ["Critical hits", F(s.crits)],
            ],
        },
        {
            title: "Production",
            color: "var(--mc-green)",
            rows: [
                ["Minion output", `${F(d.cps)}/s`],
                ["Auto-click output", `${F(d.auto * d.avgClick)}/s`],
                ["Total income", `${F(income(d))}/s`],
                ["Minions owned", F(owned), `${s.minions.filter((n) => n > 0).length}/${MINIONS.length} types`],
                ["Pocket Minion bonus", `+${pct(d.synergy)}`, "of shards/sec added to each click"],
            ],
        },
        {
            title: "Multipliers",
            color: "var(--mc-gold)",
            rows: [
                ["Everything", `x${F(d.all)}`, "all sources combined"],
                ["Rebirths", `x${F(d.rMult)}`],
                ["Island", `x${F(d.islandMult)}`],
                ["Trophies", `x${F(d.achMult)}`],
                ["Talismans & Golden Touch", `x${F(d.allUp)}`],
                ["Click upgrades", `x${F(d.clickUp)}`],
                ["Minion upgrades", `x${F(d.minionUp)}`],
            ],
        },
        {
            title: "Skills",
            color: "var(--mc-light-purple)",
            rows: [
                ["Mining", `Lv ${d.mining}`, `+${d.mining * 3}% click power`],
                ["Farming", `Lv ${d.farming}`, `+${d.farming * 3}% minion output`],
                ["Combat", `Lv ${d.combat}`, `+${d.combat * 2}% crit damage`],
                ["Fishing", `Lv ${d.fishing}`, `+${d.fishing}% all shards`],
                ["Bobbers caught", F(s.bobbers)],
            ],
        },
        {
            title: "Progress",
            color: "var(--mc-yellow)",
            rows: [
                ["Lifetime shards", F(s.total)],
                ["Rebirths", String(s.rebirths)],
                ["Tokens", String(s.tokens)],
                ["Islands", `${unlocked}/${ISLANDS.length}`],
                ["Trophies", `${s.ach.length}/${ACHIEVEMENTS.length}`],
                ["Play time", fmtTime(s.playTime)],
                ["Offline efficiency", pct(offlineEff(s)), "up to 8 hours"],
            ],
        },
    ];

    return (
        <>
            {groups.map((g) => (
                <div key={g.title}>
                    <SectionTitle color={g.color}>{g.title}</SectionTitle>
                    <div className="overflow-hidden rounded-xl border border-white/10">
                        {g.rows.map(([label, value, hint], i) => (
                            <div key={label} className={`flex items-baseline gap-3 px-3 py-1.5 ${i % 2 ? "bg-white/[0.03]" : ""}`}>
                                <span className="font-rubik text-xs text-muted-foreground">{label}</span>
                                {hint && <span className="hidden truncate font-rubik text-[10px] text-muted-foreground/70 sm:block">{hint}</span>}
                                <span className="ml-auto font-minecraft text-sm" style={{ color: g.color }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}
