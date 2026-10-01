import { User } from "lucide-react";
import { McSymbol } from "@/components/mc-symbol";
import type { Cosmetic } from "@/lib/account/cosmetics";
import { avatarColors, avatarUrl, hueOfId, type AvatarSpec } from "@/lib/account/custom";

// A profile picture: an uploaded image, a symbol on a gradient, or the default (the user's initial on a
// gradient picked from their id), optionally wrapped in an unlocked frame (a cosmetic from
// lib/account/cosmetics.ts). Pass `avatar` (the profile's custom.avatar) to show their chosen picture.
export function AccountAvatar({ id, name, size = 32, className = "", frame, avatar }: { id?: string | null; name?: string | null; size?: number; className?: string; frame?: Cosmetic; avatar?: AvatarSpec }) {
    if (!id || !name) {
        return (
            <span className={`grid place-items-center rounded-full bg-white/10 text-foreground/80 ${className}`} style={{ width: size, height: size }}>
                <User style={{ width: size * 0.5, height: size * 0.5 }} />
            </span>
        );
    }
    const spec: AvatarSpec = avatar ?? { kind: "generated" };
    const [c1, c2] = avatarColors(spec.hue ?? hueOfId(id), spec.tone);
    const ink = spec.tone === "deep" || spec.tone === "mono" ? "#fff" : "#000";
    const face =
        spec.kind === "upload" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" aria-hidden draggable={false} src={avatarUrl(id, spec.v)} width={size} height={size} className="size-full select-none rounded-full object-cover" style={{ background: "rgba(255,255,255,.08)" }} />
        ) : (
            <span aria-hidden className="grid size-full select-none place-items-center rounded-full font-minecraft font-bold" style={{ fontSize: size * (spec.kind === "glyph" ? 0.52 : 0.46), color: ink, background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
                {spec.kind === "glyph" && spec.glyph ? <McSymbol name={spec.glyph} /> : (name.trim()[0] ?? "?").toUpperCase()}
            </span>
        );
    if (!frame) return <span className={`inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>{face}</span>;
    return (
        <span className={`relative inline-block shrink-0 rounded-full ${className}`} style={{ width: size, height: size, boxShadow: frame.spin ? undefined : frame.ring }}>
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
