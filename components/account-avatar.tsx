import { User } from "lucide-react";
import type { Cosmetic } from "@/lib/account/cosmetics";

// Generated avatar: a gradient picked from the user id with their initial, optionally wrapped in an unlocked
// frame (a cosmetic from lib/account/cosmetics.ts). Nothing is uploaded or stored.
const hue = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
    return h;
};

export function AccountAvatar({ id, name, size = 32, className = "", frame }: { id?: string | null; name?: string | null; size?: number; className?: string; frame?: Cosmetic }) {
    if (!id || !name) {
        return (
            <span className={`grid place-items-center rounded-full bg-white/10 text-foreground/80 ${className}`} style={{ width: size, height: size }}>
                <User style={{ width: size * 0.5, height: size * 0.5 }} />
            </span>
        );
    }
    const h = hue(id);
    const face = (
        <span
            aria-hidden
            className="grid size-full select-none place-items-center rounded-full font-minecraft font-bold text-black"
            style={{ fontSize: size * 0.46, background: `linear-gradient(135deg, hsl(${h} 85% 68%), hsl(${(h + 55) % 360} 85% 58%))` }}
        >
            {(name.trim()[0] ?? "?").toUpperCase()}
        </span>
    );
    if (!frame) return <span className={`inline-block ${className}`} style={{ width: size, height: size }}>{face}</span>;
    return (
        <span className={`relative inline-block rounded-full ${className}`} style={{ width: size, height: size, boxShadow: frame.spin ? undefined : frame.ring }}>
            {frame.spin && (
                <>
                    <style>{`@keyframes acct-ring{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.acct-ring{animation:none!important}}`}</style>
                    <span aria-hidden className="acct-ring absolute rounded-full" style={{ inset: -Math.max(2, size * 0.05), background: "conic-gradient(from 0deg,#ff55ff,#55ffff,#ffd23a,#55ff55,#ff55ff)", animation: "acct-ring 4s linear infinite", filter: "blur(.3px)" }} />
                    <span aria-hidden className="absolute rounded-full bg-background" style={{ inset: -1 }} />
                </>
            )}
            <span className="relative block size-full">{face}</span>
        </span>
    );
}
