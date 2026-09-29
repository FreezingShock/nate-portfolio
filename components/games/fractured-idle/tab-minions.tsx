import { MILESTONES, MINIONS, MINION_GROWTH } from "@/lib/fractured-idle/data";
import { bulk, buyMinion, milestoneMult, minionDiscount } from "@/lib/fractured-idle/engine";
import { ShopRow, Teaser, type Ctx } from "./ui";

export function MinionsTab({ s, d, F, act }: Ctx) {
    const disc = minionDiscount(s);
    // Minions appear once you have earned a quarter of their price.
    const visible = (i: number) => i === 0 || s.minions[i] > 0 || s.total >= MINIONS[i].cost * 0.25;
    const firstHidden = MINIONS.findIndex((_, i) => !visible(i));

    return (
        <>
            {MINIONS.map((m, i) => {
                if (!visible(i)) {
                    return i === firstHidden ? <Teaser key={m.id} text="More minions appear as you grow" /> : null;
                }
                const owned = s.minions[i];
                const base = m.cost * disc;
                const { n, cost } = bulk(base, MINION_GROWTH, owned, s.shards, s.buy);
                const shown = n < 1 ? bulk(base, MINION_GROWTH, owned, s.shards, 1) : { n, cost };
                const can = n >= 1 && cost <= s.shards;
                const next = MILESTONES.find((x) => x > owned);
                const each = d.minionCps[i] / Math.max(1, owned);
                return (
                    <ShopRow
                        key={m.id}
                        color={m.color}
                        symbol={m.symbol}
                        title={m.name}
                        badge={owned > 0 ? `x${owned}` : undefined}
                        sub={`${F(each)}/s each${milestoneMult(owned) > 1 ? `  ·  milestone x${milestoneMult(owned)}` : ""}${next ? `  ·  next x2 at ${next}` : ""}`}
                        price={F(shown.cost)}
                        buyLabel={`Buy ${shown.n > 1 ? shown.n : ""}`.trim()}
                        can={can}
                        onClick={() => act(() => buyMinion(s, i))}
                    />
                );
            })}
        </>
    );
}
