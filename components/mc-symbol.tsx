/**
 * Hypixel SkyBlock-style stat symbols, rendered as colored text glyphs.
 *
 * Every glyph gets U+FE0E (text presentation selector) appended plus
 * `font-variant-emoji: text` (see .mc-symbol in globals.css) so symbols
 * like ❤ ☠ ⚔ ☘ never swap to color emoji.
 */
export const MC_SYMBOLS = {
    strength: "❁",
    defense: "❈",
    trueDefense: "❂",
    speed: "✦",
    intelligence: "✎",
    critChance: "☣",
    critDamage: "☠",
    attackSpeed: "⚔",
    magicFind: "✯",
    petLuck: "♣",
    pristine: "✧",
    fortune: "☘",
    heat: "♨",
    regen: "❣",
    location: "⏣",
    night: "☽",
    wisdom: "☯",
    forge: "⚒",
    flower: "✿",
    music: "♫",
    arrow: "➜",
    check: "✔",
    portal: "☬",
    comet: "☄",
    fishing: "☂",
    flag: "⚑",
    day: "☀",
    pick: "⛏",
    gem: "◆",
    star: "★",
    starO: "☆",
    spade: "♠",
    heartS: "♥",
    diamondS: "♦",
    snow: "❄",
    snowman: "☃",
    sun: "☼",
    atom: "⚛",
    peace: "☮",
    radiation: "☢",
    caduceus: "☤",
    ankh: "☥",
    crown: "♔",
    king: "♚",
    queen: "♛",
    rook: "♜",
    knight: "♞",
    anchor: "⚓",
    cog: "⚙",
    fleur: "⚜",
    bolt: "⚡",
    scissors: "✂",
    plane: "✈",
    pencil: "✏",
    plus: "✚",
    maltese: "✠",
    asterisk: "✱",
    daisy: "❀",
    blossom: "❃",
    pinwheel: "✺",
    sunburst: "✹",
    spark8: "✷",
    spark6: "✶",
    spark5: "✵",
    bloom: "❋",
    glint: "❊",
    notes: "♪",
    notes2: "♬",
    scales: "⚖",
    flask: "⚗",
    staff: "⚚",
    smile: "☺",
    smileB: "☻",
    command: "⌘",
    target: "⌖",
    infinity: "∞",
    hourglass: "⌛",
    key: "⚿",
    shield: "⛨",
    ring: "◎",
    eye: "◉",
    square: "▣",
    triangle: "▲",
    hex: "⬢",
    rune: "ᚠ",
    rune2: "ᛟ",
    rune3: "ᛉ",
} as const;

export type McSymbolName = keyof typeof MC_SYMBOLS;

export function McSymbol({
    name,
    color,
    className = "",
}: {
    name: McSymbolName;
    /** CSS color; defaults to the surrounding text color. */
    color?: string;
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={`mc-symbol ${className}`}
            style={color ? { color, ["--glow" as string]: color } : undefined}
        >
            {MC_SYMBOLS[name]}
            {"︎"}
        </span>
    );
}
