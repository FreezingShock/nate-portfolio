"use client";

import { McSymbol } from "@/components/mc-symbol";
import { BADGE_SYMBOLS, PREFIXES, prefixOf, prefixOpen, symbolOf, symbolOpen } from "@/lib/fractured-idle/fxp";
import { SAGA_BY_ID } from "@/lib/fractured-idle/sagas";
import type { State } from "@/lib/fractured-idle/data";
import { LevelBadge } from "./level-badge";
import { css } from "./level-parts";

// Badge symbols (by level, and one for each finished saga) and prefixes. Click one you own to wear it.

const GROUPS: { id: string; title: string; test: (p: (typeof PREFIXES)[number]) => boolean }[] = [
    { id: "lvl", title: "Level", test: (p) => p.need?.stat === "level" },
    { id: "saga", title: "Sagas", test: (p) => p.need?.stat === "sagas" || !!p.need?.stat.startsWith("saga_") },
    { id: "skill", title: "Skills and exploring", test: (p) => ["mining", "farming", "combat", "fishing", "visited", "islands", "pets"].includes(p.need?.stat ?? "") },
    { id: "other", title: "Everything else", test: () => true },
];

export function BadgesView({ s, render }: { s: State; render: () => void }) {
    const sym = symbolOf(s);
    const pfx = prefixOf(s);
    const real = BADGE_SYMBOLS.filter((b) => b.symbol);
    const openN = real.filter((b) => symbolOpen(s, b)).length;
    const byLevel = BADGE_SYMBOLS.filter((b) => !b.saga);
    const bySaga = BADGE_SYMBOLS.filter((b) => b.saga);
    const named = PREFIXES.filter((p) => p.id !== "none");
    const openP = named.filter((p) => prefixOpen(s, p)).length;
    const left = new Set<string>();
    const groups = GROUPS.map((g) => {
        const list = PREFIXES.filter((p) => p.id !== "none" && !left.has(p.id) && g.test(p));
        list.forEach((p) => left.add(p.id));
        return { ...g, list };
    }).filter((g) => g.list.length);

    const symBtn = (b: (typeof BADGE_SYMBOLS)[number]) => {
        const ok = symbolOpen(s, b);
        const on = sym.id === b.id;
        const need = b.saga ? `Finish the ${SAGA_BY_ID[b.saga].name}` : `Level ${b.at}`;
        const k = b.saga ? SAGA_BY_ID[b.saga].color : "var(--mc-light-purple)";
        return (
            <button
                key={b.id}
                type="button"
                className="fi-lv-sym"
                data-on={on}
                disabled={!ok}
                style={css({ "--k": k })}
                title={ok ? b.name : need}
                onClick={() => {
                    s.bsym = b.id;
                    render();
                }}
            >
                <span className="fi-lv-sym-i">{b.symbol ? <McSymbol name={b.symbol} /> : "–"}</span>
                <span className="fi-lv-sym-n">{b.name}</span>
                {!ok && <span className="fi-lv-sym-r">{need}</span>}
            </button>
        );
    };

    return (
        <>
            <div className="fi-lv-prev">
                <LevelBadge level={s.lvl} sym={sym} prefix={pfx} size="lg" />
                <span className="fi-lv-note">Your badge, as others see it. Wear any symbol or prefix you have unlocked.</span>
            </div>

            <div className="fi-lv-h" style={css({ "--hc": "var(--mc-light-purple)" })}>Badge symbols <small>{openN} of {real.length} unlocked</small></div>
            <div className="fi-lv-grid">
                {byLevel.map(symBtn)}
            </div>

            <div className="fi-lv-h" style={css({ "--hc": "#ffd23a" })}>Saga symbols <small>finishing a saga unlocks its symbol</small></div>
            <div className="fi-lv-grid">
                {bySaga.map(symBtn)}
            </div>

            <div className="fi-lv-h" style={css({ "--hc": "var(--mc-gold)" })}>Prefixes <small>{openP} of {named.length} unlocked</small></div>
            {groups.map((g) => (
                <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
                    <span className="fi-lv-note" style={{ fontWeight: 600 }}>{g.title}</span>
                    <div className="fi-lv-pfx">
                        {g.list.map((p) => {
                            const ok = prefixOpen(s, p);
                            const k = p.color === "rainbow" ? "#ffffff" : p.color;
                            return (
                                <button
                                    key={p.id}
                                    type="button"
                                    className="fi-lv-pf"
                                    data-on={pfx.id === p.id}
                                    disabled={!ok}
                                    style={css({ "--k": k })}
                                    onClick={() => {
                                        s.pfx = p.id;
                                        render();
                                    }}
                                >
                                    <span className={p.color === "rainbow" ? "fi-rainbow" : ""} style={p.color === "rainbow" ? undefined : { color: ok ? p.color : undefined }}>{p.name}</span>
                                    {!ok && p.need && <small>{p.need.label}</small>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
            <button type="button" className="fi-lv-btn ghost" style={{ alignSelf: "flex-start" }} onClick={() => { s.pfx = "none"; render(); }}>
                Wear no prefix
            </button>
        </>
    );
}
