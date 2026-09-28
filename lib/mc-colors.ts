// Deterministic Minecraft-color-code assignment for freeform strings (tags
// like "Roblox"/"Luau", statuses like "In Development") so every distinct
// label gets its own consistent, on-brand color across the whole site
// instead of one flat gray pill — same string always resolves to the same
// color, no lookup table to maintain as new tags get added in Supabase.
const MC_TAG_COLORS = [
    "var(--mc-aqua)",
    "var(--mc-gold)",
    "var(--mc-green)",
    "var(--mc-blue)",
    "var(--mc-red)",
    "var(--mc-light-purple)",
    "var(--mc-yellow)",
    "var(--mc-dark-aqua)",
    "var(--mc-dark-green)",
    "var(--mc-dark-purple)",
] as const;

export function mcColorFor(label: string): string {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = (hash * 31 + label.charCodeAt(i)) | 0;
    }
    return MC_TAG_COLORS[Math.abs(hash) % MC_TAG_COLORS.length];
}
