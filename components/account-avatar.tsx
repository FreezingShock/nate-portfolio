import { User } from "lucide-react";

// Generated avatar: a gradient picked from the user id with their initial. Nothing is uploaded or stored.
const hue = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
    return h;
};

export function AccountAvatar({ id, name, size = 32, className = "" }: { id?: string | null; name?: string | null; size?: number; className?: string }) {
    if (!id || !name) {
        return (
            <span className={`grid place-items-center rounded-full bg-white/10 text-foreground/80 ${className}`} style={{ width: size, height: size }}>
                <User style={{ width: size * 0.5, height: size * 0.5 }} />
            </span>
        );
    }
    const h = hue(id);
    return (
        <span
            aria-hidden
            className={`grid select-none place-items-center rounded-full font-minecraft font-bold text-black ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.46, background: `linear-gradient(135deg, hsl(${h} 85% 68%), hsl(${(h + 55) % 360} 85% 58%))` }}
        >
            {(name.trim()[0] ?? "?").toUpperCase()}
        </span>
    );
}
