"use client";

import { useEffect, useState } from "react";
import { layerGain } from "@/lib/fractured-idle/engine";
import { Automation, AUTO_CSS } from "./prestige-auto";
import { Milestones, MILES_CSS } from "./prestige-miles";
import { takePrestigeWant, type PrestigeView } from "./prestige-nav";
import { Overview } from "./prestige-overview";
import { PRESTIGE_CSS } from "./prestige-parts";
import { TranscendView, TRANS_CSS } from "./prestige-trans";
import { AscensionTab } from "./tab-ascension";
import { TabBar, type TabItem } from "./tab-bar";
import { RebirthTab } from "./tab-rebirth";
import type { Ctx } from "./ui";

// Prestige: one place for every reset. Overview is the long-term view (the whole ladder, where your power comes from,
// your reset history); Rebirth and Ascension are the shops you know; Transcendence is the third layer with Essence
// and vows; Milestones is the roadmap of permanent perks; Automation holds every auto-buyer.

export const PRESTIGE_ALL_CSS = PRESTIGE_CSS + TRANS_CSS + MILES_CSS + AUTO_CSS;

const TABS: TabItem<PrestigeView>[] = [
    { id: "overview", label: "Overview", symbol: "flag", group: "", color: "#7dffb8", blurb: "The whole ladder, where your power comes from and your reset history." },
    { id: "rebirth", label: "Rebirth", symbol: "portal", group: "", color: "var(--mc-light-purple)", blurb: "Reset for tokens and a permanent multiplier." },
    { id: "ascension", label: "Ascension", symbol: "comet", group: "", color: "var(--mc-aqua)", blurb: "Trade rebirths for gems and a x3 boost." },
    { id: "transcend", label: "Transcend", symbol: "night", group: "", color: "var(--mc-gold)", blurb: "The third layer: Essence, vows and a lasting multiplier." },
    { id: "milestones", label: "Milestones", symbol: "star", group: "", color: "#ffd23a", blurb: "Permanent perks for how far you have gone." },
    { id: "auto", label: "Automation", symbol: "attackSpeed", group: "", color: "var(--mc-red)", blurb: "Every auto-buyer, in one place." },
];

export function PrestigeTab(ctx: Ctx) {
    const { s, d, F, act, say } = ctx;
    const [view, setView] = useState<PrestigeView>(() => takePrestigeWant() ?? "overview");
    const rb = layerGain(s, "rb");
    const asc = layerGain(s, "asc");
    const tr = layerGain(s, "trans");
    // Another tab can ask for a particular page while this one is already open (a goal, a notice).
    useEffect(() => {
        const w = takePrestigeWant();
        if (w) setView(w);
    });
    const go = (v: PrestigeView) => setView(v);
    const note = (on: boolean, text: string, color: string) => (on ? [{ text, color, act: true, n: 1 }] : []);
    return (
        <div className="pr">
            <style>{PRESTIGE_ALL_CSS}</style>
            <TabBar
                tabs={TABS}
                current={view}
                label="Prestige pages"
                labels="active"
                keys={false}
                onSelect={setView}
                notes={{
                    overview: note(rb.can || asc.can || tr.can, "A reset is ready", "var(--mc-green)"),
                    rebirth: note(rb.can, `Rebirth ready: +${rb.gain} tokens`, "var(--mc-light-purple)"),
                    ascension: note(asc.can, `Ascension ready: +${asc.gain} gems`, "var(--mc-aqua)"),
                    transcend: note(tr.can, `Transcendence ready: +${tr.gain} Essence`, "var(--mc-gold)"),
                }}
            />
            {view === "overview" && <Overview s={s} d={d} F={F} act={act} say={say} go={go} />}
            {view === "rebirth" && <RebirthTab {...ctx} />}
            {view === "ascension" && <AscensionTab {...ctx} />}
            {view === "transcend" && <TranscendView s={s} F={F} act={act} say={say} />}
            {view === "milestones" && <Milestones s={s} />}
            {view === "auto" && <Automation s={s} act={act} />}
        </div>
    );
}
