// The games that can keep progress in an account. Adding a game to the profile page is one entry here:
// its save-slot id (the `game` string its client passes to putSave/fetchSave), where it lives, and how to
// turn its raw save into a few stats. Nothing else in the account system knows about any particular game.
import type { State } from "@/lib/fractured-idle/data";
import { importSave } from "@/lib/fractured-idle/engine";

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

const num = (n: number) => (n >= 1e6 ? n.toExponential(2).replace("e+", "e") : Math.floor(n).toLocaleString());
const hours = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)}h` : `${Math.floor(s / 60)}m`);

export const fracturedIdleStats = (s: State): GameStat[] => [
    { label: "Lifetime shards", value: num(s.total) },
    { label: "Rebirths", value: String(s.rebirths) },
    { label: "Ascensions", value: String(s.asc) },
    { label: "Clicks", value: num(s.clicks) },
    { label: "Play time", value: hours(s.playTime) },
    { label: "Islands visited", value: String(s.visited.length) },
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
