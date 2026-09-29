import type { CSSProperties } from "react";

// Glossy "liquid glass" progress bar (the .glass-track / .glass-fill styles
// live in globals.css). Purely presentational, so it works from server or
// client components; the caller supplies the value.
export function GlassBar({
    label,
    value,
    decimals = 0,
    from,
    to,
    gradient,
    sub,
    height = "h-4",
    showValue = true,
}: {
    label: string;
    /** 0–1 */
    value: number;
    decimals?: number;
    from: string;
    to: string;
    /** Overrides the two-stop from→to fill (e.g. a full rainbow). */
    gradient?: string;
    sub?: string;
    height?: string;
    showValue?: boolean;
}) {
    const pct = Math.min(100, Math.max(0, value * 100));
    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <span
                    className="font-minecraft text-sm font-bold"
                    style={{ color: to, textShadow: `0 0 12px ${to}55` }}
                >
                    {label}
                </span>
                {showValue && (
                    <span
                        className="font-mono text-lg font-bold tabular-nums"
                        style={{ color: to }}
                    >
                        {pct.toFixed(decimals)}
                        <span className="text-xs">%</span>
                    </span>
                )}
            </div>
            <div className={`glass-track mt-1.5 ${height}`}>
                <div
                    className="glass-fill"
                    style={
                        {
                            width: `${Math.max(pct, 1.5)}%`,
                            "--from": from,
                            "--to": to,
                            ...(gradient ? { background: gradient } : {}),
                        } as CSSProperties
                    }
                />
            </div>
            {sub && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {sub}
                </p>
            )}
        </div>
    );
}
