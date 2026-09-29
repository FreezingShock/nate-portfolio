"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RotateCcw, Trophy, Flame } from "lucide-react";
import { GlowCard } from "@/components/glow-card";
import { cn } from "@/lib/utils";

// First playable web game: a starter set of flags, four choices each.
// Flags are served from /public/flags (scripts/copy-flags.mjs); best score
// lives in localStorage.
// Expand COUNTRIES (or move it to its own data file) as the game grows.

const COUNTRIES: [code: string, name: string][] = [
    ["us", "United States"], ["ca", "Canada"], ["mx", "Mexico"], ["br", "Brazil"],
    ["ar", "Argentina"], ["gb", "United Kingdom"], ["fr", "France"], ["de", "Germany"],
    ["it", "Italy"], ["es", "Spain"], ["pt", "Portugal"], ["nl", "Netherlands"],
    ["se", "Sweden"], ["no", "Norway"], ["ch", "Switzerland"], ["gr", "Greece"],
    ["tr", "Turkey"], ["eg", "Egypt"], ["za", "South Africa"], ["ng", "Nigeria"],
    ["ke", "Kenya"], ["in", "India"], ["cn", "China"], ["jp", "Japan"],
    ["kr", "South Korea"], ["th", "Thailand"], ["au", "Australia"], ["nz", "New Zealand"],
];

const ROUND = 10;
const COLOR = "var(--mc-aqua)";
const BEST_KEY = "flag-guesser-best";

interface Question {
    answer: string;
    code: string;
    options: string[];
}

function shuffle<T>(list: T[]): T[] {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildRound(): Question[] {
    return shuffle(COUNTRIES)
        .slice(0, ROUND)
        .map(([code, name]) => {
            const wrong = shuffle(COUNTRIES.filter(([c]) => c !== code))
                .slice(0, 3)
                .map(([, n]) => n);
            return { answer: name, code, options: shuffle([name, ...wrong]) };
        });
}

export function FlagGuesser() {
    // Built after mount so server HTML and first client render match.
    const [round, setRound] = useState<Question[] | null>(null);
    const [index, setIndex] = useState(0);
    const [picked, setPicked] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [best, setBest] = useState<number | null>(null);

    useEffect(() => {
        setRound(buildRound());
        try {
            const saved = localStorage.getItem(BEST_KEY);
            if (saved) setBest(Number(saved));
        } catch {}
    }, []);

    const done = round !== null && index >= round.length;

    useEffect(() => {
        if (!done) return;
        setBest((prev) => {
            const next = Math.max(prev ?? 0, score);
            try {
                localStorage.setItem(BEST_KEY, String(next));
            } catch {}
            return next;
        });
    }, [done, score]);

    const pick = useCallback(
        (option: string) => {
            if (!round || picked) return;
            setPicked(option);
            if (option === round[index].answer) {
                setScore((s) => s + 1);
                setStreak(streak + 1);
                setBestStreak((b) => Math.max(b, streak + 1));
            } else {
                setStreak(0);
            }
        },
        [round, picked, index, streak]
    );

    const next = () => {
        setPicked(null);
        setIndex((i) => i + 1);
    };

    const restart = () => {
        setRound(buildRound());
        setIndex(0);
        setPicked(null);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
    };

    const q = useMemo(
        () => (round && !done ? round[index] : null),
        [round, index, done]
    );

    const stat = (label: string, value: string, icon?: React.ReactNode) => (
        <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-center">
            <p className="flex items-center justify-center gap-1 font-mono text-lg font-bold tabular-nums" style={{ color: COLOR }}>
                {icon}
                {value}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
        </div>
    );

    return (
        <div className="mx-auto max-w-xl">
            <div className="mb-4 grid grid-cols-3 gap-3">
                {stat("Score", `${score}/${ROUND}`)}
                {stat("Streak", String(streak), <Flame className="size-4" />)}
                {stat("Best", best === null ? "-" : `${best}/${ROUND}`, <Trophy className="size-4" />)}
            </div>

            <GlowCard color={COLOR} className="p-5">
                {!round && (
                    <p className="py-16 text-center text-muted-foreground">Shuffling flags...</p>
                )}

                {q && (
                    <>
                        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                            Question {index + 1} of {ROUND}
                        </p>
                        <div className="mt-3 grid place-items-center rounded-xl border border-border/60 bg-background/50 p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`/flags/${q.code}.svg`}
                                alt="Mystery flag"
                                width={320}
                                height={213}
                                className="h-40 w-auto rounded-md shadow-lg"
                            />
                        </div>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            {q.options.map((o) => {
                                const isAnswer = o === q.answer;
                                const isPicked = o === picked;
                                return (
                                    <button
                                        key={o}
                                        type="button"
                                        disabled={picked !== null}
                                        onClick={() => pick(o)}
                                        className={cn(
                                            "rounded-lg border px-3 py-2.5 text-left font-rubik text-sm font-semibold transition-colors",
                                            picked === null &&
                                                "border-border hover:border-[var(--mc-aqua)] hover:bg-[var(--mc-aqua)]/10",
                                            picked !== null && isAnswer &&
                                                "border-[var(--mc-green)] bg-[var(--mc-green)]/15 text-[var(--mc-green)]",
                                            picked !== null && isPicked && !isAnswer &&
                                                "border-[var(--mc-red)] bg-[var(--mc-red)]/15 text-[var(--mc-red)]",
                                            picked !== null && !isAnswer && !isPicked &&
                                                "border-border opacity-50"
                                        )}
                                    >
                                        {o}
                                    </button>
                                );
                            })}
                        </div>
                        {picked && (
                            <button
                                type="button"
                                onClick={next}
                                className="mt-4 w-full rounded-lg border px-4 py-2 font-minecraft text-sm font-bold transition-transform hover:-translate-y-0.5"
                                style={{
                                    color: COLOR,
                                    borderColor: `color-mix(in oklch, ${COLOR} 50%, transparent)`,
                                    backgroundColor: `color-mix(in oklch, ${COLOR} 10%, transparent)`,
                                }}
                            >
                                {index + 1 === ROUND ? "See results" : "Next flag"}
                            </button>
                        )}
                    </>
                )}

                {done && (
                    <div className="py-6 text-center">
                        <p className="font-minecraft text-2xl font-bold" style={{ color: COLOR }}>
                            {score}/{ROUND}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Best streak this round: {bestStreak}.{" "}
                            {score >= 9 ? "Cartographer level." : score >= 6 ? "Solid." : "Keep practicing."}
                        </p>
                        <button
                            type="button"
                            onClick={restart}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-minecraft text-sm font-bold transition-transform hover:-translate-y-0.5"
                            style={{
                                color: COLOR,
                                borderColor: `color-mix(in oklch, ${COLOR} 50%, transparent)`,
                            }}
                        >
                            <RotateCcw className="size-4" /> Play again
                        </button>
                    </div>
                )}
            </GlowCard>
        </div>
    );
}
