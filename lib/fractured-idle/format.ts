// Number formatting for the whole game. One switch (Settings > Scientific notation) decides between the two styles,
// and every value goes through `fmt` so the switch changes all of them at once:
//   suffix   1.23K  4.56M  7.89B ... Dc (1e33), UDc, DDc ... Vg (1e63), Tg ... Ce (1e303)
//   science  1.23e3 4.56e6 7.89e9 ...
// `fmt(n)` follows the current setting. The game keeps it up to date with `setNotation`; pass the second argument
// only to force a style (the live preview in Settings does that).

const UNITS = ["", "U", "D", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"];
const TENS = ["Dc", "Vg", "Tg", "Qag", "Qig", "Sxg", "Spg", "Ocg", "Nog", "Ce"];
const BASE = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No"];

/** Suffix for 1000^e. e = 1 is K, 4 is T, 11 is Dc (1e33), 12 is UDc, 21 is Vg (1e63), 102 is UCe (1e306). */
export function suffixFor(e: number): string {
    if (e < BASE.length) return BASE[e];
    const m = e - 11;
    return (m % 10 ? UNITS[m % 10] : "") + (TENS[Math.floor(m / 10)] ?? "");
}

let SCI = false;
const subs = new Set<() => void>();
/**
 * Called by the game on every render with the saved setting. The value changes immediately (so the render in progress
 * already uses it); components that live outside the game's render loop subscribe via `subscribeNotation` and are
 * told right after, so nothing keeps showing the old style.
 */
export const setNotation = (sci: boolean) => {
    if (SCI === sci) return;
    SCI = sci;
    queueMicrotask(() => subs.forEach((f) => f()));
};
export const getNotation = () => SCI;
export const subscribeNotation = (f: () => void) => {
    subs.add(f);
    return () => {
        subs.delete(f);
    };
};

/** Three significant digits (1.23, 12.3, 123) judged after rounding, so 9.999 reads 10.0 not 10.00. */
const trim = (v: number) => {
    const a = v.toFixed(2);
    if (Number(a) < 10) return a;
    const b = v.toFixed(1);
    return Number(b) < 100 ? b : v.toFixed(0);
};

export function fmt(n: number, sci: boolean = SCI): string {
    if (Number.isNaN(n)) return "0";
    if (!isFinite(n)) return n < 0 ? "-∞" : "∞";
    if (n < 0) return n > -0.01 ? "0" : `-${fmt(-n, sci)}`;
    if (n <= 0) return "0";
    if (n < 0.01) return "<0.01";
    if (n < 1000) {
        if (n >= 100) return Math.floor(n).toString();
        return n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "");
    }
    if (sci) {
        // toExponential rounds up across a power of ten correctly (9.999e3 -> 1.00e4)
        return n.toExponential(2).replace("e+", "e");
    }
    let e = Math.floor(Math.log10(n) / 3);
    let v = n / Math.pow(1000, e);
    // Guard against float error in log10 and rounding up to 1000 (999.96K must read 1.00M).
    if (v >= 1000) {
        e++;
        v = n / Math.pow(1000, e);
    } else if (v < 1) {
        e--;
        v = n / Math.pow(1000, e);
    }
    if (Number(trim(v)) >= 1000) {
        e++;
        v = n / Math.pow(1000, e);
    }
    return `${trim(v)}${suffixFor(e)}`;
}

/** Whole-number counts (owned, rolls, clicks): exact below 1000, then the same style as everything else. */
export const fmtInt = (n: number, sci: boolean = SCI) => fmt(Math.floor(n + 1e-9), sci);

/** A fraction as a percentage: 0.1234 -> 12.3%. Huge bonuses use the same style as every other number (2469.1 -> 2.47K%). */
export function fmtPct(frac: number, digits = 1, sci: boolean = SCI): string {
    const p = frac * 100;
    if (!isFinite(p) || Math.abs(p) >= 1000) return `${fmt(p, sci)}%`;
    return `${+p.toFixed(digits)}%`;
}
