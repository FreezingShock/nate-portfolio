// The games that can keep progress in an account. Adding a game to the profile page is one entry here:
// its save-slot id (the `game` string its client passes to putSave/fetchSave), where it lives, and how to
// turn its raw save into a few stats. Nothing else in the account system knows about any particular game.
import type { State } from "@/lib/fractured-idle/data";
import { importSave } from "@/lib/fractured-idle/engine";
import { fmt, fmtInt } from "@/lib/fractured-idle/format";

export interface GameStat {
    label: string;
    value: string;
}
export interface AccountGame {
    id: string;
    name: string;
    href: string;
    color: string;
    blurb: string;
    /** Parse a cloud save string into display stats; null if it cannot be read. */
    summarize: (data: string) => GameStat[] | null;
}

const num = (n: number) => fmt(n);
const hours = (s: number) => (s >= 3600 ? `${fmt(Math.round((s / 3600) * 10) / 10)}h` : `${Math.floor(s / 60)}m`);

export const fracturedIdleStats = (s: State): GameStat[] => [
    { label: "Lifetime shards", value: num(s.total) },
    { label: "Rebirths", value: fmtInt(s.rebirths) },
    { label: "Ascensions", value: fmtInt(s.ascEver) },
    { label: "Clicks", value: num(s.clicks) },
    { label: "Play time", value: hours(s.playTime) },
    { label: "Islands visited", value: fmtInt(s.visited.length) },
];

export const ACCOUNT_GAMES: AccountGame[] = [
    {
        id: "fractured-idle",
        name: "Fractured Idle",
        href: "/creations/games/fractured-idle",
        color: "var(--mc-light-purple)",
        blurb: "Click the button, hire minions, rebirth and ascend.",
        summarize: (data) => {
            const s = importSave(data);
            return s ? fracturedIdleStats(s) : null;
        },
    },
];
