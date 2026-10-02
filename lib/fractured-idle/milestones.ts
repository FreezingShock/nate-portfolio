import type { McSymbolName } from "@/components/mc-symbol";
import type { State } from "./data";
import type { EStat } from "./enchant";
import type { GrantKind } from "./skills";

// Milestones: the shared shape behind the Mine's and the Farm's Milestones pages.
//
// A ladder is one thing you do or one item you collect, with tiers at fixed amounts.
//  - Item milestones (group "item") are one ladder per item: every crop, ore, good and ingot.
//    Their stat bonus is automatic (see colBonus), and some tiers also pay a grant you claim.
//  - Action milestones (group "action") are the things you do: swings, harvests, crafts, streaks...
//    Every tier pays a grant and/or a permanent stat when you claim it.
// Claimed tiers are remembered by id in the skill's `claimed` list (so older saves keep theirs).

export type MsGroup = "item" | "action";

export interface MsReward {
    grant?: [GrantKind, number];
    stat?: [EStat, number];
}

export interface Ladder {
    key: string;
    group: MsGroup;
    name: string;
    unit: string;
    color: string;
    icon: McSymbolName;
    /** A line that says what the item is for, shown on the card. */
    note?: string;
    metric: (s: State) => number;
    at: number[];
    rewards: MsReward[][];
    /** Item ladders: the automatic stat each tier adds (value is the total at that tier). */
    auto?: (tier: number) => string;
}

export interface Milestone {
    id: string;
    ladder: Ladder;
    tier: number;
    at: number;
    rewards: MsReward[];
}

export const msId = (l: Ladder, tier: number) => (l.group === "item" ? `${l.key}:${tier}` : `${l.key}:${tier}`);

/** The milestones of a list of ladders that have something to claim. */
export const milestonesOf = (ladders: Ladder[]): Milestone[] =>
    ladders.flatMap((l) => l.at.map((at, tier) => ({ id: msId(l, tier), ladder: l, tier, at, rewards: l.rewards[tier] ?? [] })).filter((m) => m.rewards.length > 0));

export const tierOf = (l: Ladder, s: State) => {
    const v = l.metric(s);
    return l.at.filter((n) => v >= n).length;
};

/** Total bonus of the first `tier` tiers of an item collection: tiers 1 to 5 pay the full rate, 6 to 10 half. */
export const colSteps = (tier: number) => Math.min(tier, 5) + 0.5 * Math.max(0, Math.min(tier, 10) - 5);

/** Item collections go to ten tiers. */
export const COLLECT_TIERS = 10;

// ---- Reward tables for item collections ----

const g = (k: GrantKind, n: number): MsReward => ({ grant: [k, n] });

/** What each tier of a crop or ore collection pays: `m` scales it by how deep the item is; `top` adds a gem for late items. */
export function collectionRewards(m: number, top: boolean): MsReward[][] {
    return [
        [g("dust", Math.round(20 * m))],
        [],
        [g("tokens", Math.max(1, Math.round(m)))],
        [],
        [g("eggs", 1)],
        [g("dust", Math.round(100 * m))],
        [g("tokens", Math.max(2, Math.round(2 * m)))],
        [],
        [g("frag", 1)],
        top ? [g("ap", 1), g("tokens", 2)] : [g("tokens", 5)],
    ];
}

/** What each tier of a crafted-item ladder (goods, ingots, drill parts) pays. */
export const craftRewards = (m: number): MsReward[][] => [[g("dust", Math.round(20 * m))], [g("tokens", 1)], [g("eggs", 1)], [g("frag", 1)]];
