// A small history of your resets, so the Prestige page can show how long each run took, what it paid, the gain per
// hour, and whether now is a good moment to reset. All pure data and functions of the save: the engine calls logReset()
// when a reset happens and sample() a few times a minute. Time is `playTime` (seconds played), which also covers offline
// catch-up, so it never depends on the wall clock.

export type Layer = "rb" | "asc" | "trans";
export const LAYERS: Layer[] = ["rb", "asc", "trans"];

export interface RunRec {
    at: number; // playTime when it happened
    secs: number; // how long the run before it lasted
    gain: number; // tokens, gems or Essence it paid
}

interface Sample {
    pk: number; // best gain-per-hour seen this run
    r1: number; // gain-per-hour at the last sample
    r0: number; // and the one before, to see which way it is heading
    t: number; // playTime of the last sample
}

export interface RunLog {
    recs: Record<Layer, RunRec[]>;
    mark: Record<Layer, number>; // playTime at the last reset of each layer
    smp: Record<Layer, Sample>;
}

const none = (): Sample => ({ pk: 0, r1: 0, r0: 0, t: 0 });
export const newRunLog = (): RunLog => ({
    recs: { rb: [], asc: [], trans: [] },
    mark: { rb: 0, asc: 0, trans: 0 },
    smp: { rb: none(), asc: none(), trans: none() },
});

const num = (x: unknown, d = 0) => (typeof x === "number" && isFinite(x) ? x : d);

/** Read a saved log back, tolerating a missing or damaged one. */
export function cleanRunLog(o: unknown): RunLog {
    const out = newRunLog();
    const r = (o ?? {}) as Partial<Record<string, Record<string, unknown>>>;
    for (const k of LAYERS) {
        const list = (r.recs as Record<string, unknown> | undefined)?.[k];
        if (Array.isArray(list)) {
            out.recs[k] = list
                .map((x) => ({ at: Math.max(0, num((x as RunRec)?.at)), secs: Math.max(0, num((x as RunRec)?.secs)), gain: Math.max(0, num((x as RunRec)?.gain)) }))
                .slice(-12);
        }
        out.mark[k] = Math.max(0, num((r.mark as Record<string, unknown> | undefined)?.[k]));
        const m = (r.smp as Record<string, Partial<Sample>> | undefined)?.[k];
        if (m) out.smp[k] = { pk: Math.max(0, num(m.pk)), r1: Math.max(0, num(m.r1)), r0: Math.max(0, num(m.r0)), t: Math.max(0, num(m.t)) };
    }
    return out;
}

/** Seconds since this layer last reset. */
export const runSecs = (log: RunLog, layer: Layer, playTime: number) => Math.max(1, playTime - log.mark[layer]);

/** Record a reset: what the run lasted and paid. Starts the next run's clock. */
export function logReset(log: RunLog, layer: Layer, playTime: number, gain: number) {
    log.recs[layer].push({ at: playTime, secs: runSecs(log, layer, playTime), gain });
    if (log.recs[layer].length > 12) log.recs[layer].shift();
    log.mark[layer] = playTime;
    log.smp[layer] = none();
    // A reset of a deeper layer also restarts every layer under it.
    if (layer === "asc") {
        log.mark.rb = playTime;
        log.smp.rb = none();
    } else if (layer === "trans") {
        log.mark.rb = log.mark.asc = playTime;
        log.smp.rb = none();
        log.smp.asc = none();
    }
}

/** Gain per hour if you reset now, given what the reset would pay. */
export const rateOf = (log: RunLog, layer: Layer, playTime: number, gain: number) => (gain * 3600) / runSecs(log, layer, playTime);

/** Take a reading (about every 20 seconds): keeps the best rate and the trend. */
export function sample(log: RunLog, layer: Layer, playTime: number, gain: number) {
    const m = log.smp[layer];
    if (playTime - m.t < 20) return;
    const rate = rateOf(log, layer, playTime, gain);
    m.r0 = m.r1;
    m.r1 = rate;
    m.t = playTime;
    if (rate > m.pk) m.pk = rate;
}

export type Cue = "none" | "wait" | "good" | "now";

export interface Advice {
    cue: Cue;
    label: string;
    rate: number; // gain per hour if you reset now
    peak: number; // best rate seen this run
    best: number; // best rate of any past run
}

/**
 * When to reset. Gain per hour climbs as a run goes on, then flattens and falls as each extra reward takes longer.
 * Still climbing: keep going. Near the top: a good time. Clearly past it: reset now, you are losing rate.
 */
export function advise(log: RunLog, layer: Layer, playTime: number, gain: number, can: boolean): Advice {
    const m = log.smp[layer];
    const rate = rateOf(log, layer, playTime, gain);
    const best = log.recs[layer].reduce((a, r) => Math.max(a, r.secs > 0 ? (r.gain * 3600) / r.secs : 0), 0);
    const peak = Math.max(m.pk, rate);
    if (!can || gain <= 0) return { cue: "none", label: "Not ready", rate, peak, best };
    if (m.r0 > 0 && m.r1 > m.r0 * 1.03 && rate >= 0.98 * m.r1) return { cue: "wait", label: "Still climbing: keep going", rate, peak, best };
    if (rate >= 0.9 * peak) return { cue: "good", label: "Good time to reset", rate, peak, best };
    return { cue: "now", label: "Past the peak: reset now", rate, peak, best };
}
